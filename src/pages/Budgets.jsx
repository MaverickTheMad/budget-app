import { useState, useMemo, Fragment } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  getPayCycle, formatCycleLabel, resolvePersonAnchor
} from '../lib/payCycle'

// Budgets are per-person, per-cycle. Each person has their own cycle anchored
// to their primary paycheck. Transactions tagged with a person count fully
// against their cycle; shared (untagged) transactions split 50/50.
//
// Storage (monthly_budgets table):
//   period_type='cycle', person_id=<uuid>, period_start=<YYYY-MM-DD>, amount=<num>
// Per-cycle uniqueness: (category_id, person_id, period_start).

export default function Budgets() {
  const { data: people } = useTable('people', { orderBy: 'name' })
  const { data: paychecks } = useTable('paychecks')
  const { data: categories, refetch: refetchCategories } = useTable('categories', {
    orderBy: 'sort_order',
    filters: [{ col: 'archived', op: 'eq', val: false }]
  })

  // Tab: a person id, or 'both'
  const [activeTab, setActiveTab] = useState(null)   // set on first render once people load
  const [offset, setOffset] = useState(0)
  const [manageOpen, setManageOpen] = useState(false)

  // Default the tab to the first person once people load
  if (activeTab === null && people.length > 0) {
    setActiveTab(people[0].id)
  }

  // Compute each person's cycle window
  const personCycles = useMemo(() => {
    return people.map(person => {
      const anchorISO = resolvePersonAnchor(person, paychecks)
      const cycle = anchorISO ? getPayCycle(anchorISO, new Date(), offset) : null
      return { person, anchorISO, cycle }
    })
  }, [people, paychecks, offset])

  // Date range we need transactions for: widest window across all visible cycles
  const txWindow = useMemo(() => {
    const cycles = personCycles.filter(p => p.cycle).map(p => p.cycle)
    if (cycles.length === 0) return null
    const startISO = cycles.map(c => c.startISO).sort()[0]
    const endISO = cycles.map(c => c.endISO).sort().reverse()[0]
    return { startISO, endISO }
  }, [personCycles])

  const { data: transactions } = useTable('transactions', {
    filters: txWindow ? [
      { col: 'date', op: 'gte', val: txWindow.startISO },
      { col: 'date', op: 'lt',  val: txWindow.endISO }
    ] : [],
    deps: [txWindow?.startISO, txWindow?.endISO]
  })

  // Cycle budgets across all visible person×period combos.
  // We fetch all cycle-type rows and filter client-side; even with years of
  // history this stays small (a few rows per cycle × cycles per year × people).
  const { data: budgets, refetch: refetchBudgets } = useTable('monthly_budgets', {
    filters: [{ col: 'period_type', op: 'eq', val: 'cycle' }]
  })

  const tracked = useMemo(() => categories.filter(c => c.tracked_in_budget), [categories])

  const setBudget = async (categoryId, personId, periodStart, amount, existingId) => {
    if (existingId) {
      await supabase.from('monthly_budgets').update({ amount }).eq('id', existingId)
    } else {
      await supabase.from('monthly_budgets').insert({
        category_id: categoryId,
        person_id: personId,
        period_start: periodStart,
        period_type: 'cycle',
        amount
      })
    }
    refetchBudgets()
  }

  const toggleTracked = async (categoryId, newValue) => {
    await supabase.from('categories').update({ tracked_in_budget: newValue }).eq('id', categoryId)
    refetchCategories()
  }

  // ------ Render ------

  if (people.length === 0) {
    return (
      <div>
        <div className="page-header"><div><h1>Budgets</h1></div></div>
        <div className="empty">
          <h3>No people set up</h3>
          <p>Add at least one person in Settings to start budgeting.</p>
        </div>
      </div>
    )
  }

  // Are any anchors missing?
  const missingAnchors = personCycles.filter(p => !p.cycle)
  if (missingAnchors.length > 0) {
    return (
      <div>
        <div className="page-header"><div><h1>Budgets</h1></div></div>
        <div className="card" style={{ background: 'var(--warning-soft)', borderColor: 'transparent' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Cycle anchors needed</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
            {missingAnchors.map(p => p.person.name).join(' and ')} {missingAnchors.length === 1 ? 'is' : 'are'} missing a primary paycheck. Open <strong>Settings → People</strong> and assign a primary paycheck to each person — that's what anchors their pay cycle.
          </p>
        </div>
      </div>
    )
  }

  const activePerson = personCycles.find(p => p.person.id === activeTab) || personCycles[0]
  const showBoth = activeTab === 'both'

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Pay cycle</p>
          <h1>Budgets</h1>
          <p>
            {showBoth ? (
              personCycles.map(p => `${p.person.name}: ${formatCycleLabel(p.cycle)}`).join(' · ')
            ) : (
              <>{formatCycleLabel(activePerson.cycle)} · {activePerson.cycle.daysLeft} day{activePerson.cycle.daysLeft !== 1 ? 's' : ''} left</>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset - 1)}>← Prev</button>
          {offset !== 0 && <button className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>Today</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset + 1)}>Next →</button>
          <button className="btn btn-sm" onClick={() => setManageOpen(true)}>Manage</button>
        </div>
      </div>

      {/* Person tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', borderBottom: '1px solid var(--line-soft)' }}>
        {people.map(p => (
          <button
            key={p.id}
            className="nav-item"
            style={{
              background: 'transparent',
              fontWeight: 500,
              color: activeTab === p.id ? 'var(--ink)' : 'var(--ink-muted)',
              borderBottom: activeTab === p.id ? `2px solid ${p.color || 'var(--accent)'}` : '2px solid transparent',
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onClick={() => setActiveTab(p.id)}
          >
            <span className="dot" style={{ background: p.color || '#999' }}></span>
            {p.name}
          </button>
        ))}
        {people.length > 1 && (
          <button
            className="nav-item"
            style={{
              fontWeight: 500,
              color: activeTab === 'both' ? 'var(--ink)' : 'var(--ink-muted)',
              borderBottom: activeTab === 'both' ? '2px solid var(--ink)' : '2px solid transparent',
              padding: '0.6rem 1rem'
            }}
            onClick={() => setActiveTab('both')}
          >
            Both
          </button>
        )}
      </div>

      {showBoth ? (
        <BothView
          personCycles={personCycles}
          tracked={tracked}
          budgets={budgets}
          transactions={transactions}
          setBudget={setBudget}
        />
      ) : (
        <SingleView
          person={activePerson.person}
          cycle={activePerson.cycle}
          tracked={tracked}
          budgets={budgets}
          transactions={transactions}
          setBudget={setBudget}
        />
      )}

      {manageOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setManageOpen(false)}>
          <div className="modal">
            <h2>Manage budget categories</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: '1rem' }}>
              Tick the categories you want to track on this page. Both people share the same category list — but each gets their own budget amount.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {categories.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: c.tracked_in_budget ? 'var(--accent-soft)' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={!!c.tracked_in_budget}
                    onChange={(e) => toggleTracked(c.id, e.target.checked)}
                  />
                  <span className="dot" style={{ background: c.color }}></span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{c.kind}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setManageOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------- single-person view -----------------

function SingleView({ person, cycle, tracked, budgets, transactions, setBudget }) {
  const rows = useMemo(() => {
    return tracked.map(c => {
      const budgetRow = budgets.find(b =>
        b.category_id === c.id &&
        b.person_id === person.id &&
        b.period_start === cycle.startISO
      )
      const budgetAmt = Number(budgetRow?.amount || 0)
      // Person-tagged transactions fully + shared (null) at 50%
      let spent = 0
      for (const t of transactions) {
        if (t.category_id !== c.id) continue
        if (Number(t.amount) >= 0) continue
        if (t.date < cycle.startISO || t.date >= cycle.endISO) continue
        const absAmt = Math.abs(Number(t.amount))
        if (t.person_id === person.id) spent += absAmt
        else if (t.person_id == null) spent += absAmt * 0.5
      }
      const pct = budgetAmt > 0 ? Math.min(100, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0)
      const over = budgetAmt > 0 && spent > budgetAmt
      return { ...c, budgetRow, budgetAmt, spent, pct, over }
    })
  }, [tracked, budgets, transactions, person.id, cycle.startISO, cycle.endISO])

  const totals = useMemo(() => ({
    budget: rows.reduce((s, r) => s + r.budgetAmt, 0),
    spent: rows.reduce((s, r) => s + r.spent, 0)
  }), [rows])

  return (
    <>
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total budgeted</div>
          <div className="stat-value">{fmt(totals.budget, { showCents: false })}</div>
          <div className="stat-sub">{person.name}'s cycle</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Spent</div>
          <div className="stat-value">{fmt(totals.spent, { showCents: false })}</div>
          <div className="stat-sub">{totals.budget > 0 ? `${Math.round((totals.spent / totals.budget) * 100)}% of plan` : ''}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">{fmt(totals.budget - totals.spent, { showCents: false })}</div>
          <div className="stat-sub">{cycle.daysLeft > 0 ? `${fmt((totals.budget - totals.spent) / Math.max(1, cycle.daysLeft), { showCents: false })} / day` : 'Cycle ended'}</div>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">
            <h3>No categories tracked</h3>
            <p>Click <strong>Manage</strong> above to pick categories.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rows.map(r => (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="dot" style={{ background: r.color }}></span>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                      {fmt(r.spent, { showCents: false })} of
                    </span>
                    <input
                      className="input mono"
                      type="number"
                      step="any"
                      style={{ width: 100, padding: '0.3rem 0.5rem', fontSize: 13, textAlign: 'right' }}
                      value={r.budgetAmt || ''}
                      placeholder="0"
                      onChange={(e) => setBudget(r.id, person.id, cycle.startISO, parseFloat(e.target.value) || 0, r.budgetRow?.id)}
                    />
                  </div>
                </div>
                <div className="progress">
                  <div className={'progress-fill' + (r.over ? ' over' : '')} style={{ width: `${r.pct}%`, background: r.over ? 'var(--negative)' : r.color }} />
                </div>
                {r.over && (
                  <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4 }}>
                    Over by {fmt(r.spent - r.budgetAmt, { showCents: false })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ----------------- both-people view -----------------

function BothView({ personCycles, tracked, budgets, transactions, setBudget }) {
  // For each category, compute budget + spend for each person in their own cycle
  const rows = useMemo(() => {
    return tracked.map(c => {
      const perPerson = personCycles.map(({ person, cycle }) => {
        const budgetRow = budgets.find(b =>
          b.category_id === c.id &&
          b.person_id === person.id &&
          b.period_start === cycle.startISO
        )
        const budgetAmt = Number(budgetRow?.amount || 0)
        let spent = 0
        for (const t of transactions) {
          if (t.category_id !== c.id) continue
          if (Number(t.amount) >= 0) continue
          if (t.date < cycle.startISO || t.date >= cycle.endISO) continue
          const absAmt = Math.abs(Number(t.amount))
          if (t.person_id === person.id) spent += absAmt
          else if (t.person_id == null) spent += absAmt * 0.5
        }
        return { person, cycle, budgetRow, budgetAmt, spent }
      })
      return { ...c, perPerson }
    })
  }, [tracked, budgets, transactions, personCycles])

  const totals = useMemo(() => {
    const out = {}
    personCycles.forEach(({ person }) => {
      out[person.id] = { budget: 0, spent: 0 }
    })
    rows.forEach(r => {
      r.perPerson.forEach(pp => {
        out[pp.person.id].budget += pp.budgetAmt
        out[pp.person.id].spent += pp.spent
      })
    })
    return out
  }, [rows, personCycles])

  return (
    <>
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {personCycles.map(({ person, cycle }) => {
          const t = totals[person.id] || { budget: 0, spent: 0 }
          return (
            <div key={person.id} className="card" style={{ borderTop: `3px solid ${person.color || 'var(--accent)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{person.name}</h3>
                <span className="eyebrow">{formatCycleLabel(cycle)}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div className="stat-label">Budget</div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 500 }}>{fmt(t.budget, { showCents: false })}</div>
                </div>
                <div>
                  <div className="stat-label">Spent</div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 500, color: t.spent > t.budget && t.budget > 0 ? 'var(--negative)' : 'inherit' }}>{fmt(t.spent, { showCents: false })}</div>
                </div>
                <div>
                  <div className="stat-label">Remaining</div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--accent-deep)' }}>{fmt(t.budget - t.spent, { showCents: false })}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <div className="empty">
            <h3>No categories tracked</h3>
            <p>Click <strong>Manage</strong> to pick categories.</p>
          </div>
        ) : (
          <table className="ledger" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Category</th>
                {personCycles.map(({ person }) => (
                  <th key={person.id} colSpan={2} style={{ textAlign: 'center', borderBottom: `2px solid ${person.color || 'var(--line)'}` }}>
                    {person.name}
                  </th>
                ))}
              </tr>
              <tr style={{ fontSize: 11 }}>
                <th></th>
                {personCycles.map(({ person }) => (
                  <Fragment key={person.id}>
                    <th style={{ textAlign: 'right' }}>Budget</th>
                    <th style={{ textAlign: 'right' }}>Spent</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className="dot" style={{ background: r.color, marginRight: 6 }}></span>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                  </td>
                  {r.perPerson.map(pp => {
                    const over = pp.budgetAmt > 0 && pp.spent > pp.budgetAmt
                    return (
                      <Fragment key={pp.person.id}>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            className="input mono"
                            type="number"
                            step="any"
                            style={{ width: 80, padding: '0.25rem 0.4rem', fontSize: 12, textAlign: 'right' }}
                            value={pp.budgetAmt || ''}
                            placeholder="0"
                            onChange={(e) => setBudget(r.id, pp.person.id, pp.cycle.startISO, parseFloat(e.target.value) || 0, pp.budgetRow?.id)}
                          />
                        </td>
                        <td className="num" style={{ color: over ? 'var(--negative)' : 'inherit' }}>
                          {fmt(pp.spent, { showCents: false })}
                        </td>
                      </Fragment>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
