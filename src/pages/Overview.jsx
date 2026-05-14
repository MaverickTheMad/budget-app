import { useMemo } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt, ordinal, daysUntil } from '../lib/format'
import {
  getPayCycle, formatCycleLabel, resolvePersonAnchor, spendInCycleForPerson
} from '../lib/payCycle'

export default function Overview() {
  const { data: bills } = useTable('bills', { filters: [{ col: 'active', op: 'eq', val: true }] })
  const { data: paychecks } = useTable('paychecks')
  const { data: people } = useTable('people', { orderBy: 'name' })
  const { data: transactions } = useTable('transactions', { orderBy: 'date', ascending: false })
  const { data: goals } = useTable('goals', { filters: [{ col: 'archived', op: 'eq', val: false }] })

  const personCycles = useMemo(() => {
    return people.map(person => {
      const anchorISO = resolvePersonAnchor(person, paychecks)
      const cycle = anchorISO ? getPayCycle(anchorISO) : null
      // Compute per-person cycle stats
      const cycleSpend = cycle
        ? spendInCycleForPerson(transactions, cycle.startISO, cycle.endISO, person.id)
        : 0
      // Their paycheck per cycle (assume biweekly = 1 paycheck/cycle)
      const myPaychecks = paychecks.filter(p => p.person_id === person.id)
      const cycleIncome = myPaychecks.reduce((s, p) => {
        const perCycle = p.cadence === 'biweekly' ? Number(p.amount)
          : p.cadence === 'weekly' ? Number(p.amount) * 2
          : p.cadence === 'semimonthly' ? Number(p.amount) * (14/15.2)
          : Number(p.amount) * (14/30.5)
        return s + perCycle
      }, 0)
      return { person, anchorISO, cycle, cycleSpend, cycleIncome }
    })
  }, [people, paychecks, transactions])

  const monthlyBills = useMemo(() =>
    bills.reduce((s, b) => s + Number(b.amount), 0),
    [bills]
  )

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
          <p className="eyebrow">Today</p>
          <h1>Where we stand</h1>
        </div>
      </div>

      {/* Per-person cycle cards */}
      {personCycles.length > 0 && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          {personCycles.map(({ person, cycle, cycleSpend, cycleIncome }) => (
            <div key={person.id} className="card" style={{ borderTop: `3px solid ${person.color || 'var(--accent)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <h3 style={{ margin: 0 }}>{person.name}</h3>
                <span className="eyebrow">
                  {cycle ? `${cycle.daysLeft}d left` : 'No cycle'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: '0.85rem' }}>
                {cycle ? formatCycleLabel(cycle) : 'Set a primary paycheck in Settings'}
              </p>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div>
                  <div className="stat-label">Income</div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--positive)' }}>
                    {fmt(cycleIncome, { showCents: false })}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Spent</div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 500 }}>
                    {fmt(cycleSpend, { showCents: false })}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Net</div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 500, color: (cycleIncome - cycleSpend) >= 0 ? 'var(--accent-deep)' : 'var(--negative)' }}>
                    {fmt(cycleIncome - cycleSpend, { showCents: false, signed: true })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Household stats */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Bills (monthly)</div>
          <div className="stat-value">{fmt(monthlyBills, { showCents: false })}</div>
          <div className="stat-sub">{bills.length} recurring</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Household income</div>
          <div className="stat-value">{fmt(personCycles.reduce((s, p) => s + p.cycleIncome, 0) * (26/24), { showCents: false })}</div>
          <div className="stat-sub">Per month, estimated</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-label">Goals</div>
          <div className="stat-value">{goals.length}</div>
          <div className="stat-sub">Active sinking funds</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Upcoming bills</h3>
            <span className="eyebrow">Next 5</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty"><p>No bills tracked yet.</p></div>
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
