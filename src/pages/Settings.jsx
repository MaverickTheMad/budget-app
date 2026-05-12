import { useState } from 'react'
import { useTable } from '../hooks/useTable'

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

export default function Settings() {
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Setup</p>
          <h1>Settings</h1>
          <p>Accounts, categories, people, rules.</p>
        </div>
      </div>

      <CrudList
        table="people"
        title="People"
        orderBy="name"
        defaults={{ name: '', color: '#6b7a5a' }}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'color', label: 'Color', type: 'color' }
        ]}
      />

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

      <CrudList
        table="rules"
        title="Categorization rules"
        orderBy="priority"
        defaults={{ name: '', match_field: 'description', match_type: 'contains', match_value: '', priority: 100, active: true }}
        fields={[
          { key: 'name', label: 'Rule name' },
          { key: 'match_value', label: 'Match value (e.g. WEGMANS)' },
          { key: 'match_type', label: 'Match type', type: 'select', options: ['contains','equals','starts','regex'] },
          { key: 'priority', label: 'Priority (lower = checked first)', type: 'number' }
        ]}
      />

      <div style={{ marginTop: '2rem', padding: '1rem', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
        <p>Rules become active in v1.1 with statement imports. You can build the list now.</p>
      </div>
    </div>
  )
}
