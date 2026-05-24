import { useMemo, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt, monthShort, currentMonth } from '../lib/format'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, LineChart, Line, Legend, PieChart, Pie } from 'recharts'

export default function Insights() {
  const { year: thisYear } = currentMonth()
  const [year, setYear] = useState(thisYear)
  const [chartMode, setChartMode] = useState('fytd')   // 'fytd' | 'monthly'
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)

  const { data: transactions } = useTable('transactions', {
    filters: [
      { col: 'date', op: 'gte', val: `${year}-01-01` },
      { col: 'date', op: 'lt',  val: `${year + 1}-01-01` }
    ],
    deps: [year]
  })
  const { data: categories } = useTable('categories', { orderBy: 'sort_order' })
  const { data: accounts } = useTable('accounts')

  /* --- Per-month cashflow (always monthly) --- */
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })
      const income = monthTx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
      const expense = monthTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      return { month: monthShort(month), income: Math.round(income), expense: Math.round(expense), net: Math.round(income - expense) }
    })
  }, [transactions, year])

  const monthsWithData = useMemo(() =>
    monthlyData.filter(m => m.expense > 0).length || 1,
    [monthlyData]
  )

  /* --- Category breakdown (carries id so we can drill in) --- */
  const categoryDataFYTD = useMemo(() => {
    return categories
      .filter(c => c.kind !== 'income')
      .map(c => {
        const spent = transactions
          .filter(t => t.category_id === c.id && Number(t.amount) < 0)
          .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
        return { id: c.id, name: c.name, value: Math.round(spent), color: c.color }
      })
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories])

  const categoryData = useMemo(() => {
    if (chartMode === 'monthly') {
      return categoryDataFYTD.map(c => ({ ...c, value: Math.round(c.value / monthsWithData) }))
    }
    return categoryDataFYTD
  }, [categoryDataFYTD, chartMode, monthsWithData])

  const totalFYTD = useMemo(() => categoryDataFYTD.reduce((s, c) => s + c.value, 0), [categoryDataFYTD])
  const avgMonthly = totalFYTD / monthsWithData
  const modeLabel = chartMode === 'fytd' ? 'FYTD' : 'Monthly avg'

  /* --- Drill-down detail for the selected category --- */
  const detail = useMemo(() => {
    if (!selectedCategoryId) return null
    const cat = categories.find(c => c.id === selectedCategoryId)
    if (!cat) return null
    const txns = transactions
      .filter(t => t.category_id === selectedCategoryId && Number(t.amount) < 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1))   // newest first
    const total = txns.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    // month-by-month spend for this category
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const spent = txns
        .filter(t => { const d = new Date(t.date); return d.getMonth() + 1 === month })
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      return { month: monthShort(month), spent: Math.round(spent) }
    })
    const activeMonths = byMonth.filter(m => m.spent > 0).length || 1
    return {
      cat,
      txns,
      total,
      count: txns.length,
      avgPerMonth: total / activeMonths,
      avgPerTxn: txns.length ? total / txns.length : 0,
      byMonth
    }
  }, [selectedCategoryId, categories, transactions])

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">FY {year}</p>
          <h1>Insights</h1>
          <p>The pattern of where the money goes. Click a category to drill in.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setYear(year - 1); setSelectedCategoryId(null) }}>← {year - 1}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setYear(year + 1); setSelectedCategoryId(null) }}>{year + 1} →</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">FYTD spent</div>
          <div className="stat-value">{fmt(totalFYTD, { showCents: false })}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Monthly average</div>
          <div className="stat-value">{fmt(avgMonthly, { showCents: false })}</div>
          <div className="stat-sub">Across {monthsWithData} active month{monthsWithData !== 1 ? 's' : ''}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Top category</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{categoryDataFYTD[0]?.name || '—'}</div>
          <div className="stat-sub">{categoryDataFYTD[0] ? fmt(categoryDataFYTD[0].value, { showCents: false }) : 'No data yet'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <h3>Monthly cashflow</h3>
          <span className="eyebrow">Income · Expense · Net</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" stroke="#8a7e6f" style={{ fontSize: 12 }} />
            <YAxis stroke="#8a7e6f" style={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#fffdf9', border: '1px solid #e3d8c8', borderRadius: 12, fontSize: 13 }}
              formatter={(v) => fmt(v, { showCents: false })}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="income" stroke="#5a8e6b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="expense" stroke="#a85a5a" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="net" stroke="#6b7a5a" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Toggle for the category charts */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', gap: 4 }}>
        <button className={'btn btn-sm ' + (chartMode === 'fytd' ? '' : 'btn-ghost')} onClick={() => setChartMode('fytd')}>FYTD total</button>
        <button className={'btn btn-sm ' + (chartMode === 'monthly' ? '' : 'btn-ghost')} onClick={() => setChartMode('monthly')}>Monthly avg</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>By category</h3>
            <span className="eyebrow">{modeLabel} · click to drill in</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
              <XAxis type="number" stroke="#8a7e6f" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" stroke="#8a7e6f" style={{ fontSize: 11 }} width={100} />
              <Tooltip
                contentStyle={{ background: '#fffdf9', border: '1px solid #e3d8c8', borderRadius: 12, fontSize: 13 }}
                formatter={(v) => fmt(v, { showCents: false })}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer"
                onClick={(d) => { const id = d?.id || d?.payload?.id; if (id) setSelectedCategoryId(id) }}>
                {categoryData.map((c, i) => (
                  <Cell key={i} fill={c.color}
                    opacity={selectedCategoryId && selectedCategoryId !== c.id ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Share of spend</h3>
            <span className="eyebrow">{modeLabel}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}
                cursor="pointer"
                onClick={(d) => { const id = d?.id || d?.payload?.id; if (id) setSelectedCategoryId(id) }}>
                {categoryData.map((c, i) => (
                  <Cell key={i} fill={c.color}
                    opacity={selectedCategoryId && selectedCategoryId !== c.id ? 0.4 : 1} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#fffdf9', border: '1px solid #e3d8c8', borderRadius: 12, fontSize: 13 }}
                formatter={(v) => fmt(v, { showCents: false })}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clickable category list (works even where charts are fiddly to tap) */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-head">
          <h3>Categories</h3>
          <span className="eyebrow">{modeLabel}</span>
        </div>
        <table className="ledger">
          <tbody>
            {categoryData.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer', background: selectedCategoryId === c.id ? 'var(--paper-warm)' : 'transparent' }}
                onClick={() => setSelectedCategoryId(c.id)}>
                <td style={{ width: 30 }}><span className="dot" style={{ background: c.color }}></span></td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td className="num">{fmt(c.value, { showCents: false })}</td>
                <td style={{ width: 30, textAlign: 'right', color: 'var(--ink-muted)' }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
        {categoryData.length === 0 && <div className="empty"><p>No spending recorded for {year} yet.</p></div>}
      </div>

      {/* Drill-down detail */}
      {detail && (
        <div className="card" style={{ marginTop: '1.5rem', borderTop: `3px solid ${detail.cat.color}` }}>
          <div className="card-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot" style={{ background: detail.cat.color }}></span>
              {detail.cat.name}
            </h3>
            <button className="icon-btn" onClick={() => setSelectedCategoryId(null)} title="Close">×</button>
          </div>

          <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-label">Total {year}</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{fmt(detail.total, { showCents: false })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Transactions</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{detail.count}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg / month</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{fmt(detail.avgPerMonth, { showCents: false })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg / transaction</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{fmt(detail.avgPerTxn, { showCents: false })}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Month by month</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={detail.byMonth} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <XAxis dataKey="month" stroke="#8a7e6f" style={{ fontSize: 11 }} />
                <YAxis stroke="#8a7e6f" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{ background: '#fffdf9', border: '1px solid #e3d8c8', borderRadius: 12, fontSize: 13 }}
                  formatter={(v) => fmt(v, { showCents: false })}
                />
                <Bar dataKey="spent" radius={[4, 4, 0, 0]} fill={detail.cat.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>All transactions ({detail.count})</div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="ledger">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {detail.txns.map(t => {
                  const acct = accounts.find(a => a.id === t.account_id)
                  return (
                    <tr key={t.id}>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t.date}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.description}</div>
                        {t.notes && <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t.notes}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{acct?.name || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                      <td className="num amount amount-neg">{fmt(t.amount, { signed: true })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
