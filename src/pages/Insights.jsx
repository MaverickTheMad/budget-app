import { useMemo, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt, monthShort, currentMonth } from '../lib/format'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, LineChart, Line, Legend, PieChart, Pie } from 'recharts'

export default function Insights() {
  const { year: thisYear } = currentMonth()
  const [year, setYear] = useState(thisYear)
  // 'fytd' = total spent this fiscal year to date
  // 'monthly' = same total divided by months with activity
  const [chartMode, setChartMode] = useState('fytd')

  const { data: transactions } = useTable('transactions', {
    filters: [
      { col: 'date', op: 'gte', val: `${year}-01-01` },
      { col: 'date', op: 'lt',  val: `${year + 1}-01-01` }
    ],
    deps: [year]
  })
  const { data: categories } = useTable('categories', { orderBy: 'sort_order' })

  /* --- Per-month totals (for cashflow line chart, always monthly) --- */
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

  /* --- Category breakdown — always compute the FYTD totals, divide when needed --- */
  const categoryDataFYTD = useMemo(() => {
    return categories
      .filter(c => c.kind !== 'income')
      .map(c => {
        const spent = transactions
          .filter(t => t.category_id === c.id && Number(t.amount) < 0)
          .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
        return { name: c.name, value: Math.round(spent), color: c.color }
      })
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories])

  // The data the charts actually plot — divided by months when in monthly mode
  const categoryData = useMemo(() => {
    if (chartMode === 'monthly') {
      return categoryDataFYTD.map(c => ({ ...c, value: Math.round(c.value / monthsWithData) }))
    }
    return categoryDataFYTD
  }, [categoryDataFYTD, chartMode, monthsWithData])

  const totalFYTD = useMemo(() => categoryDataFYTD.reduce((s, c) => s + c.value, 0), [categoryDataFYTD])
  const avgMonthly = totalFYTD / monthsWithData

  // Label suffix used in chart headers
  const modeLabel = chartMode === 'fytd' ? 'FYTD' : 'Monthly avg'

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">FY {year}</p>
          <h1>Insights</h1>
          <p>The pattern of where the money goes.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setYear(year - 1)}>← {year - 1}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setYear(year + 1)}>{year + 1} →</button>
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

      {/* Toggle for the two category charts below */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', gap: 4 }}>
        <button
          className={'btn btn-sm ' + (chartMode === 'fytd' ? '' : 'btn-ghost')}
          onClick={() => setChartMode('fytd')}
        >
          FYTD total
        </button>
        <button
          className={'btn btn-sm ' + (chartMode === 'monthly' ? '' : 'btn-ghost')}
          onClick={() => setChartMode('monthly')}
        >
          Monthly avg
        </button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>By category</h3>
            <span className="eyebrow">{modeLabel}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
              <XAxis type="number" stroke="#8a7e6f" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" stroke="#8a7e6f" style={{ fontSize: 11 }} width={100} />
              <Tooltip
                contentStyle={{ background: '#fffdf9', border: '1px solid #e3d8c8', borderRadius: 12, fontSize: 13 }}
                formatter={(v) => fmt(v, { showCents: false })}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {categoryData.map((c, i) => <Cell key={i} fill={c.color} />)}
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
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}>
                {categoryData.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#fffdf9', border: '1px solid #e3d8c8', borderRadius: 12, fontSize: 13 }}
                formatter={(v) => fmt(v, { showCents: false })}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
