import { useState, useMemo } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt, monthShort } from '../lib/format'

/**
 * Snowball schedule projection.
 * Generates a month-by-month payoff projection.
 * - Each debt pays its `snowball_payment` until paid off.
 * - When a debt finishes, its payment cascades to the next debt in payoff_order.
 */
function projectSnowball(debts) {
  const sorted = [...debts].filter(d => !d.paid_off && Number(d.current_balance) > 0)
    .sort((a, b) => (a.payoff_order || 99) - (b.payoff_order || 99))
  const state = sorted.map(d => ({ ...d, _balance: Number(d.current_balance) }))
  const months = []
  let freed = 0
  const startDate = new Date()
  for (let i = 0; i < 120 && state.some(d => d._balance > 0); i++) {
    const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    const row = { date: monthDate, debts: {}, totalBalance: 0, totalPaid: 0 }
    let extra = freed
    for (const d of state) {
      if (d._balance <= 0) continue
      const interest = (d._balance * Number(d.apr || 0)) / 12
      let payment = Number(d.snowball_payment || d.min_payment || 0) + extra
      extra = 0
      if (payment > d._balance + interest) {
        extra = payment - (d._balance + interest)
        payment = d._balance + interest
      }
      const principal = payment - interest
      d._balance = Math.max(0, d._balance + interest - payment)
      row.debts[d.id] = { balance: d._balance, payment, interest, principal, cleared: d._balance === 0 }
      row.totalPaid += payment
      if (d._balance === 0 && !d._wasZero) {
        d._wasZero = true
        freed += Number(d.snowball_payment || d.min_payment || 0)
      }
    }
    row.totalBalance = state.reduce((s, d) => s + d._balance, 0)
    months.push(row)
  }
  return { months, debts: state }
}

export default function Snowball() {
  const { data: debts, update } = useTable('debts', { orderBy: 'payoff_order' })
  const [view, setView] = useState('schedule') // schedule | summary

  const projection = useMemo(() => projectSnowball(debts), [debts])
  const activeDebts = debts.filter(d => !d.paid_off)

  const totals = useMemo(() => ({
    balance: activeDebts.reduce((s, d) => s + Number(d.current_balance), 0),
    monthly: activeDebts.reduce((s, d) => s + Number(d.snowball_payment || d.min_payment || 0), 0),
    monthsToFree: projection.months.length,
    payoffDate: projection.months[projection.months.length - 1]?.date
  }), [activeDebts, projection])

  const totalInterest = useMemo(() =>
    projection.months.reduce((s, m) =>
      s + Object.values(m.debts).reduce((ss, d) => ss + d.interest, 0), 0
    ),
    [projection]
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Debt payoff</p>
          <h1>Snowball</h1>
          <p>Smallest balance first. As each clears, its payment cascades to the next.</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={'btn btn-sm ' + (view === 'schedule' ? '' : 'btn-ghost')} onClick={() => setView('schedule')}>Schedule</button>
          <button className={'btn btn-sm ' + (view === 'summary' ? '' : 'btn-ghost')} onClick={() => setView('summary')}>Summary</button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total balance</div>
          <div className="stat-value">{fmt(totals.balance, { showCents: false })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly payment</div>
          <div className="stat-value">{fmt(totals.monthly, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Total interest</div>
          <div className="stat-value">{fmt(totalInterest, { showCents: false })}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Debt-free in</div>
          <div className="stat-value">{totals.monthsToFree} mo</div>
          <div className="stat-sub">{totals.payoffDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      {view === 'summary' && (
        <div className="card">
          <table className="ledger">
            <thead>
              <tr>
                <th>#</th><th>Debt</th><th>Balance</th><th>APR</th><th>Payment</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...debts].sort((a, b) => (a.payoff_order || 99) - (b.payoff_order || 99)).map(d => (
                <tr key={d.id} style={{ opacity: d.paid_off ? 0.5 : 1 }}>
                  <td className="mono">{d.payoff_order}</td>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td className="num">{fmt(d.current_balance, { showCents: false })}</td>
                  <td className="num">{(Number(d.apr) * 100).toFixed(2)}%</td>
                  <td className="num">{fmt(d.snowball_payment || d.min_payment, { showCents: false })}</td>
                  <td>
                    {d.paid_off ? <span className="pill pill-paid">Paid off</span> : <span className="pill">Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'schedule' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ledger" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th>Month</th>
                {activeDebts.map(d => <th key={d.id} style={{ textAlign: 'right' }}>{d.name}</th>)}
                <th style={{ textAlign: 'right' }}>Total Bal.</th>
              </tr>
            </thead>
            <tbody>
              {projection.months.slice(0, 36).map((m, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    {monthShort(m.date.getMonth() + 1)} {String(m.date.getFullYear()).slice(2)}
                  </td>
                  {activeDebts.map(d => {
                    const row = m.debts[d.id]
                    if (!row) return <td key={d.id} className="num" style={{ color: 'var(--ink-faint)' }}>—</td>
                    return (
                      <td key={d.id} className="num" style={{ color: row.cleared ? 'var(--positive)' : 'inherit' }}>
                        {fmt(row.balance, { showCents: false })}
                        {row.cleared && <div style={{ fontSize: 10, color: 'var(--positive)' }}>✓ cleared</div>}
                      </td>
                    )
                  })}
                  <td className="num" style={{ fontWeight: 500 }}>{fmt(m.totalBalance, { showCents: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {projection.months.length > 36 && (
            <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: 12, color: 'var(--ink-muted)' }}>
              Showing first 36 months · payoff in month {projection.months.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
