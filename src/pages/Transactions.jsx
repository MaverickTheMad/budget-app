import { useState, useMemo } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt, todayISO } from '../lib/format'

export default function Transactions() {
  const { data: transactions, insert, update, remove } = useTable('transactions', { orderBy: 'date', ascending: false })
  const { data: categories } = useTable('categories', { orderBy: 'sort_order' })
  const { data: accounts } = useTable('accounts')
  const { data: people } = useTable('people')

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory && t.category_id !== filterCategory) return false
      if (filterAccount && t.account_id !== filterAccount) return false
      if (filterPerson && t.person_id !== filterPerson) return false
      return true
    })
  }, [transactions, search, filterCategory, filterAccount, filterPerson])

  const totals = useMemo(() => {
    const income = filtered.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
    const expense = filtered.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    return { income, expense, net: income - expense }
  }, [filtered])

  const openNew = () => {
    setEditing({ date: todayISO(), description: '', amount: 0, category_id: null, account_id: null, person_id: null, notes: '' })
    setModalOpen(true)
  }
  const openEdit = (t) => { setEditing({ ...t }); setModalOpen(true) }
  const handleSave = async () => {
    const payload = {
      date: editing.date,
      description: editing.description,
      amount: editing.amount,
      category_id: editing.category_id || null,
      account_id: editing.account_id || null,
      person_id: editing.person_id || null,
      notes: editing.notes,
      source: 'manual'
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setModalOpen(false); setEditing(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1>Transactions</h1>
          <p>Every line. Searchable, taggable, editable.</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add transaction</button>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card accent">
          <div className="stat-label">Income (filtered)</div>
          <div className="stat-value">{fmt(totals.income, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Expense (filtered)</div>
          <div className="stat-value">{fmt(totals.expense, { showCents: false })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net</div>
          <div className="stat-value" style={{ color: totals.net >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {fmt(totals.net, { showCents: false, signed: true })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <input className="input" placeholder="Search description..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="select" value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}>
            <option value="">Everyone</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="ledger">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Account</th>
              <th>Who</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const cat = categories.find(c => c.id === t.category_id)
              const acct = accounts.find(a => a.id === t.account_id)
              const person = people.find(p => p.id === t.person_id)
              const isExpense = Number(t.amount) < 0
              return (
                <tr key={t.id}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t.date}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.description}</div>
                    {t.notes && <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t.notes}</div>}
                  </td>
                  <td>
                    {cat ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <span className="dot" style={{ background: cat.color }}></span>{cat.name}
                      </span>
                    ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13 }}>{acct?.name || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                  <td>
                    {person ? <span className="pill" style={{ background: person.color + '22', color: person.color, borderColor: 'transparent' }}>{person.name}</span> : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                  </td>
                  <td className={'num amount ' + (isExpense ? 'amount-neg' : 'amount-pos')}>
                    {fmt(t.amount, { signed: true })}
                  </td>
                  <td style={{ width: 80 }}>
                    <button className="icon-btn" onClick={() => openEdit(t)}>✎</button>
                    <button className="icon-btn" onClick={() => { if (confirm('Delete?')) remove(t.id) }}>×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty">
            <h3>No transactions match</h3>
            <p>Try clearing your filters, or add your first transaction.</p>
          </div>
        )}
      </div>

      {modalOpen && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit transaction' : 'New transaction'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Date</label>
                  <input className="input" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Amount (− for expense)</label>
                  <input className="input mono" type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input className="input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Wegmans, paycheck, etc." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Category</label>
                  <select className="select" value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Account</label>
                  <select className="select" value={editing.account_id || ''} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Who</label>
                <select className="select" value={editing.person_id || ''} onChange={(e) => setEditing({ ...editing, person_id: e.target.value || null })}>
                  <option value="">— Shared —</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Notes</label>
                <input className="input" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
