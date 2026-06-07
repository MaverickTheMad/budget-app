import { useNavigate, useLocation } from 'react-router-dom'

/**
 * In-page segmented sub-navigation. Lets one nav destination host several
 * related sections (e.g. Money = Transactions / Imports / Rules) without
 * adding more top-level nav items.
 *
 * Driven by the URL query string `?view=<id>` so a section is deep-linkable
 * and the browser back button works. Falls back to the first tab.
 */
export function useSubTab(tabs, param = 'view') {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const current = params.get(param) || tabs[0].id
  const setTab = (id) => {
    const next = new URLSearchParams(location.search)
    next.set(param, id)
    navigate({ pathname: location.pathname, search: next.toString() }, { replace: false })
  }
  return [current, setTab]
}

export default function SubTabs({ tabs, current, onChange }) {
  return (
    <div className="subtabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={current === t.id}
          className={'subtab' + (current === t.id ? ' active' : '')}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <span className="subtab-icon" aria-hidden>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  )
}
