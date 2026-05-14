import { useMemo, useEffect, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt, monthName, currentMonth, ordinal, daysUntil } from '../lib/format'
import { supabase } from '../lib/supabase'
import { getPayCycle, formatCycleLabel, toISODate } from '../lib/payCycle'

const ANCHOR_KEY = 'pay_cycle_anchor'

export default function Overview() {
  const { year, month } = currentMonth()
  const [anchorISO, setAnchorISO] = useState(null)

  useEffect(() => {
    let mounted = true
    supabase.from('app_settings').select('value').eq('key', ANCHOR_KEY).maybeSingle()
      .then(({ data }) => {
        if (!mounted) return
        const v = data?.value
        setAnchorISO(typeof v === 'string' ? v : (v?.date || toISODate(new Date())))
      })
    return () => { mounted = false }
  }, [])

  const cycle = useMemo(() => anchorISO
    ? { ...getPayCycle(anchorISO), label: formatCycleLabel(getPayCycle(anchorISO)) }
    : null, [anchorISO])

  const { data: bills } = useTable('bills', { filters: [{ col: 'active', op: 'eq', val: true }] })
  const { data: paychecks } = useTable('paychecks')
  const { data: transactions } = useTable('transactions', { orderBy: 'date', ascending: false })
  const { data: goals } = useTable('goals', { filters: [{ col: 'archived', op: 'eq', val: false }] })
  const { data: cycleBudgets } = useTable('monthly_budgets', {
    filters: cycle ? [
      { col: 'year', op: 'eq', val: cycle.index },
      { col: 'month', op: 'eq', val: 0 }
    ] : [],
    deps: [cycle?.index]
  })

  const totals = useMemo(() => {
    const monthlyIncome = paychecks.reduce((s, p) => {
      const multiplier = p.cadence === 'biweekly' ? 26 / 12 : p.cadence === 'weekly' ? 52 / 12 : p.cadence === 'semimonthly' ? 2 : 1
      return s + Number(p.amount) * multiplier
    }, 0)
    const cycleIncome = paychecks.reduce((s, p) => {
      // For biweekly, one paycheck per cycle. For others, prorate.
      const perCycle = p.cadence === 'biweekly' ? Number(p.amount)
        : p.cadence === 'weekly' ? Number(p.amount) * 2
        : p.cadence === 'semimonthly' ? Number(p.amount) * (14/15.2)
        : Number(p.amount) * (14/30.5)
      return s + perCycle
    }, 0)
    const monthlyBills = bills.reduce((s, b) => s + Number(b.amount), 0)

    const cycleTx = cycle ? transactions.filter(t => t.date >= cycle.startISO && t.date < cycle.endISO) : []
    const spentThisCycle = cycleTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const budgetedThisCycle = cycleBudgets.reduce((s, b) => s + Number(b.amount), 0)

    return {
      monthlyIncome,
      cycleIncome,
      monthlyBills,
      budgetedThisCycle,
      spentThisCycle,
      leftover: cycleIncome - (monthlyBills / 2)   // half of monthly bills per cycle
    }
  }, [paychecks, bills, transactions, cycleBudgets, cycle])

  const upcoming = useMemo(() =>
    [...bills]
      .map(b => ({ ...b, _days: daysUntil(b.due_day || 1) }))
      .sort((a, b) => a._days - b._days)
      .slice(0, 5),
    [bills]
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">{cycle ? cycle.label : `${monthName(month)} ${year}`}</p>
          <h1>Where we stand</h1>
          {cycle && <p>{cycle.daysLeft} day{cycle.daysLeft !== 1 ? 's' : ''} left in this cycle</p>}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card accent">
          <div className="stat-label">Cycle income</div>
          <div className="stat-value">{fmt(totals.cycleIncome, { showCents: false })}</div>
          <div className="stat-sub">{fmt(totals.monthlyIncome, { showCents: false })}/mo · {paychecks.length} paycheck{paychecks.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bills (monthly)</div>
          <div className="stat-value">{fmt(totals.monthlyBills, { showCents: false })}</div>
          <div className="stat-sub">{bills.length} recurring</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Spent this cycle</div>
          <div className="stat-value">{fmt(totals.spentThisCycle, { showCents: false })}</div>
          <div className="stat-sub">of {fmt(totals.budgetedThisCycle, { showCents: false })} budgeted</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-label">Left after bills</div>
          <div className="stat-value">{fmt(totals.leftover, { showCents: false })}</div>
          <div className="stat-sub">Per cycle, post-bills estimate</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Upcoming bills</h3>
            <span className="eyebrow">Next 5</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty">
              <p>No bills tracked yet. Add some on the Bills page.</p>
            </div>
          ) : (
            <table className="ledger">
              <tbody>
                {upcoming.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        Due {ordinal(b.due_day || 1)}
                        {b.autopay && <span className="pill pill-auto" style={{ marginLeft: 8 }}>Autopay</span>}
                      </div>
                    </td>
                    <td className="num">{fmt(b.amount, { showCents: false })}</td>
                    <td style={{ width: 80, textAlign: 'right' }}>
                      <span className={b._days <= 3 ? 'pill pill-due' : 'pill'}>
                        {b._days === 0 ? 'Today' : `${b._days}d`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Goals</h3>
            <span className="eyebrow">{goals.length} active</span>
          </div>
          {goals.length === 0 ? (
            <div className="empty"><p>Create goals to start saving toward something.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {goals.slice(0, 5).map(g => {
                const pct = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{g.name}</span>
                      <span className="mono" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                        {fmt(g.current_amount, { showCents: false })} / {fmt(g.target_amount || 0, { showCents: false })}
                      </span>
                    </div>
                    <div className="progress">
                      <div className="progress-fill gold" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
