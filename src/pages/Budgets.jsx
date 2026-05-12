import { useState, useMemo } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt, monthName, currentMonth } from '../lib/format'
import { supabase } from '../lib/supabase'

export default function Budgets() {
  const initial = currentMonth()
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)

  const { data: categories } = useTable('categories', { orderBy: 'sort_order', filters: [{ col: 'archived', op: 'eq', val: false }] })
  const { data: budgets, refetch: refetchBudgets } = useTable('monthly_budgets', {
    filters: [{ col: 'year', op: 'eq', val: year }, { col: 'month', op: 'eq', val: month }],
    deps: [year, month]
  })
  const { data: transactions } = useTable('transactions', {
    filters: [
      { col: 'date', op: 'gte', val: `${year}-${String(month).padStart(2,'0')}-01` },
      { col: 'date', op: 'lt',  val: month === 12 ? `${year+1}-01-01` : `${year}-${String(month+1).padStart(2,'0')}-01` }
    ],
    deps: [year, month]
  })

  const rows = useMemo(() => {
    return categories.filter(c => c.kind !== 'income').map(c => {
      const budgetRow = budgets.find(b => b.category_id === c.id)
      const budgetAmt = Number(budgetRow?.amount || 0)
      const spent = transactions
        .filter(t => t.category_id === c.id && Number(t.amount) < 0)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      const pct = budgetAmt > 0 ? Math.min(100, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0)
      const over = budgetAmt > 0 && spent > budgetAmt
      return { ...c, budgetRow, budgetAmt, spent, pct, over, remaining: budgetAmt - spent }
    })
  }, [categories, budgets, transactions])

  const totals = useMemo(() => ({
    budget: rows.reduce((s, r) => s + r.budgetAmt, 0),
    spent: rows.reduce((s, r) => s + r.spent, 0)
  }), [rows])

  const setBudget = async (categoryId, amount, existingId) => {
    if (existingId) {
      await supabase.from('monthly_budgets').update({ amount }).eq('id', existingId)
    } else {
      await supabase.from('monthly_budgets').insert({ category_id: categoryId, year, month, amount })
    }
    refetchBudgets()
  }

  const prev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12) } else { setMonth(month - 1) }
  }
  const next = () => {
    if (month === 12) { setYear(year + 1); setMonth(1) } else { setMonth(month + 1) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Monthly</p>
          <h1>Budgets</h1>
          <p>What you planned to spend, vs what you actually did.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={prev}>← Prev</button>
          <span style={{ fontWeight: 500, minWidth: 140, textAlign: 'center' }}>{monthName(month)} {year}</span>
          <button className="btn btn-ghost btn-sm" onClick={next}>Next →</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total budgeted</div>
          <div className="stat-value">{fmt(totals.budget, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Spent</div>
          <div className="stat-value">{fmt(totals.spent, { showCents: false })}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">{fmt(totals.budget - totals.spent, { showCents: false })}</div>
        </div>
      </div>

      <div className="card">
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
                    style={{ width: 100, padding: '0.3rem 0.5rem', fontSize: 13, textAlign: 'right' }}
                    value={r.budgetAmt || ''}
                    placeholder="0"
                    onChange={(e) => setBudget(r.id, parseFloat(e.target.value) || 0, r.budgetRow?.id)}
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
      </div>
    </div>
  )
}
