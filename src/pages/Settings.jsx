import { useState } from 'react'
import { useTable } from '../hooks/useTable'
import { fmt } from '../lib/format'
import { toISODate } from '../lib/payCycle'

// Generic CRUD list used for simple tables
function CrudList({ table, title, fields, defaults, orderBy }) {
  const { data, insert, update, remove } = useTable(table, { orderBy })
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  const handleSave = async () => {
    const payload = {}
    fields.forEach(f => { payload[f.key] = editing[f.key] })
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setOpen(false); setEditing(null)
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-head">
        <h3>{title}</h3>
        <button className="btn btn-sm" onClick={() => { setEditing({ ...defaults }); setOpen(true) }}>+ Add</button>
      </div>
      <table className="ledger">
        <tbody>
          {data.map(row => (
            <tr key={row.id}>
              {fields.slice(0, 3).map(f => (
                <td key={f.key}>
                  {f.type === 'color' ? <span className="dot" style={{ background: row[f.key], marginRight: 6 }}></span> : null}
                  {row[f.key]?.toString()}
                </td>
              ))}
              <td style={{ width: 80, textAlign: 'right' }}>
                <button className="icon-btn" onClick={() => { setEditing({ ...row }); setOpen(true) }}>✎</button>
                <button className="icon-btn" onClick={() => { if (confirm('Delete?')) remove(row.id) }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="empty"><p>None yet.</p></div>}

      {open && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? `Edit ${title.toLowerCase().replace(/s$/,'')}` : `New ${title.toLowerCase().replace(/s$/,'')}`}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {fields.map(f => (
                <div key={f.key} className="field">
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="select" value={editing[f.key] || ''} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'color' ? (
                    <input className="input" type="color" value={editing[f.key] || '#888888'} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} style={{ height: 38 }} />
                  ) : (
                    <input
                      className="input"
                      type={f.type || 'text'}
                      value={editing[f.key] || ''}
                      onChange={(e) => setEditing({ ...editing, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// People card — custom because we need a paycheck dropdown for primary_paycheck_id
function PeopleCard() {
  const { data: people, insert, update, remove } = useTable('people', { orderBy: 'name' })
  const { data: paychecks } = useTable('paychecks')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  const blank = () => ({ name: '', color: '#6b7a5a', primary_paycheck_id: null })

  const handleSave = async () => {
    const payload = {
      name: editing.name,
      color: editing.color,
      primary_paycheck_id: editing.primary_paycheck_id || null
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setOpen(false); setEditing(null)
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-head">
        <h3>People</h3>
        <button className="btn btn-sm" onClick={() => { setEditing(blank()); setOpen(true) }}>+ Add</button>
      </div>
      {people.length === 0 ? (
        <div className="empty"><p>None yet.</p></div>
      ) : (
        <table className="ledger">
          <thead>
            <tr>
              <th>Name</th>
              <th>Primary paycheck</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {people.map(p => {
              const pc = paychecks.find(x => x.id === p.primary_paycheck_id)
              return (
                <tr key={p.id}>
                  <td>
                    <span className="dot" style={{ background: p.color, marginRight: 6 }}></span>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {pc ? (
                      <>
                        {pc.label} <span style={{ color: 'var(--ink-muted)' }}>· {pc.next_date}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--negative)' }}>None set — pick one to anchor their pay cycle</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => { setEditing({ ...p }); setOpen(true) }}>✎</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {open && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit person' : 'New person'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="field">
                <label>Name</label>
                <input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
              </div>
              <div className="field">
                <label>Color</label>
                <input className="input" type="color" value={editing.color || '#6b7a5a'} onChange={(e) => setEditing({ ...editing, color: e.target.value })} style={{ height: 38 }} />
              </div>
              <div className="field">
                <label>Primary paycheck (anchors pay cycle)</label>
                <select className="select" value={editing.primary_paycheck_id || ''} onChange={(e) => setEditing({ ...editing, primary_paycheck_id: e.target.value || null })}>
                  <option value="">— None —</option>
                  {paychecks.map(pc => (
                    <option key={pc.id} value={pc.id}>
                      {pc.label} ({pc.next_date || 'no date'})
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                  The pay date you pick anchors this person's 14-day budget cycle. Add paychecks below first if the dropdown is empty.
                </small>
              </div>
            </div>
            <div className="modal-actions">
              {editing.id && (
                <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }}
                  onClick={() => { if (confirm('Delete person?')) { remove(editing.id); setOpen(false) } }}>Delete</button>
              )}
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={!editing.name?.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Custom Paychecks card — has FK to people, date input, cadence dropdown
function PaychecksCard() {
  const { data: paychecks, insert, update, remove } = useTable('paychecks', { orderBy: 'label' })
  const { data: people } = useTable('people')
  const { data: accounts } = useTable('accounts')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  const blank = () => ({
    label: '',
    amount: 0,
    cadence: 'biweekly',
    person_id: '',
    account_id: '',
    next_date: toISODate(new Date())
  })

  const handleSave = async () => {
    const payload = {
      label: editing.label,
      amount: Number(editing.amount) || 0,
      cadence: editing.cadence,
      person_id: editing.person_id || null,
      account_id: editing.account_id || null,
      next_date: editing.next_date || null
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setOpen(false); setEditing(null)
  }

  const monthly = paychecks.reduce((s, p) => {
    const mult = p.cadence === 'biweekly' ? 26/12 : p.cadence === 'weekly' ? 52/12
      : p.cadence === 'semimonthly' ? 2 : 1
    return s + Number(p.amount) * mult
  }, 0)

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-head">
        <h3>Paychecks</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{fmt(monthly, { showCents: false })}/mo</span>
          <button className="btn btn-sm" onClick={() => { setEditing(blank()); setOpen(true) }}>+ Add</button>
        </div>
      </div>
      {paychecks.length === 0 ? (
        <div className="empty"><p>No paychecks yet. Add one to set a pay-cycle anchor.</p></div>
      ) : (
        <table className="ledger">
          <thead>
            <tr>
              <th>Label</th>
              <th>Who</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Cadence</th>
              <th>Next date</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {paychecks.map(p => {
              const person = people.find(pp => pp.id === p.person_id)
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.label}</td>
                  <td>
                    {person ? (
                      <span className="pill" style={{ background: (person.color || '#999') + '22', color: person.color, borderColor: 'transparent' }}>{person.name}</span>
                    ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                  </td>
                  <td className="num">{fmt(p.amount, { showCents: false })}</td>
                  <td>{p.cadence}</td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{p.next_date || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => { setEditing({ ...p }); setOpen(true) }}>✎</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {open && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit paycheck' : 'New paycheck'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="field">
                <label>Label</label>
                <input className="input" value={editing.label || ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Mav Paycheck (Chase)" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Amount</label>
                  <input className="input mono" type="number" step="0.01" value={editing.amount ?? ''} onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label>Cadence</label>
                  <select className="select" value={editing.cadence} onChange={(e) => setEditing({ ...editing, cadence: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="semimonthly">Semi-monthly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Who</label>
                  <select className="select" value={editing.person_id || ''} onChange={(e) => setEditing({ ...editing, person_id: e.target.value || null })}>
                    <option value="">— Pick person —</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                <label>Next pay date</label>
                <input className="input" type="date" value={editing.next_date || ''} onChange={(e) => setEditing({ ...editing, next_date: e.target.value || null })} />
                <small style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                  This is the anchor for the pay cycle when this is someone's primary paycheck.
                </small>
              </div>
            </div>
            <div className="modal-actions">
              {editing.id && (
                <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }}
                  onClick={() => { if (confirm('Delete paycheck?')) { remove(editing.id); setOpen(false) } }}>Delete</button>
              )}
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={!editing.label?.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Setup</p>
          <h1>Settings</h1>
          <p>Accounts, paychecks, people, categories.</p>
        </div>
      </div>

      <PaychecksCard />

      <PeopleCard />

      <CrudList
        table="accounts"
        title="Accounts"
        orderBy="name"
        defaults={{ name: '', kind: 'checking', owner: 'shared' }}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'kind', label: 'Kind', type: 'select', options: ['checking','savings','cash','credit','loan'] },
          { key: 'owner', label: 'Owner', type: 'select', options: ['shared','mav','ren'] }
        ]}
      />

      <CrudList
        table="categories"
        title="Categories"
        orderBy="sort_order"
        defaults={{ name: '', kind: 'expense', color: '#c08478', sort_order: 50 }}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'color', label: 'Color', type: 'color' },
          { key: 'kind', label: 'Kind', type: 'select', options: ['expense','income','savings','debt'] },
          { key: 'sort_order', label: 'Sort order', type: 'number' }
        ]}
      />

      <div style={{ marginTop: '2rem', padding: '1rem', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
        <p>Categorization rules live on their own page — see <strong>Rules</strong> in the nav.</p>
      </div>
    </div>
  )
}
