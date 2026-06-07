import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { whoami, loadTheme, setTheme as saveTheme, cachedTheme } from './lib/core.js'
import Overview from './pages/Overview'
import Money from './pages/Money'
import Plan from './pages/Plan'
import Insights from './pages/Insights'
import Settings from './pages/Settings'

// Home dashboard for the whole Grove suite.
const HOME_URL = 'https://home.reilly.live'

// Consolidated top-level nav. Related sections now live together behind
// in-page sub-tabs (see Money / Plan) so the bar stays short.
const NAV = [
  { to: '/overview',     label: 'Overview' },
  { to: '/money',        label: 'Money' },     // Transactions . Imports . Rules
  { to: '/plan',         label: 'Plan' },      // Budgets . Bills . Goals . Snowball
  { to: '/insights',     label: 'Insights' },
  { to: '/settings',     label: 'Settings' },
]

export default function App() {
  // Theme now lives in the shared `core` schema so it follows the logged-in
  // person across every Grove app. Seed from the local cache for instant paint,
  // then reconcile from core.prefs once we know who's signed in.
  const [theme, setTheme] = useState(() => cachedTheme())
  const [personId, setPersonId] = useState(null)

  useEffect(() => {
    whoami().then((w) => {
      setPersonId(w.person?.id ?? null)
      loadTheme(w.person?.id).then(setTheme)
    })
  }, [])

  const cycleTheme = () => {
    const next = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
    setTheme(next)
    saveTheme(personId, next) // applies classes + caches locally + persists to core.prefs
  }
  const themeIcon = theme === 'auto' ? '\u{1F317}' : theme === 'light' ? '\u2600\uFE0F' : '\u{1F319}'
  const themeLabel = theme === 'auto' ? 'System theme' : theme === 'light' ? 'Light theme' : 'Dark theme'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="home-btn"
            href={HOME_URL}
            aria-label="Back to Grove home"
            title="Back to Grove home"
          >
            <span className="home-btn-arrow" aria-hidden>&larr;</span>
            <span className="home-btn-label">Grove</span>
          </a>
          <div className="brand">
            {/* leaf-mark is injected by .brand-mark::before in CSS */}
            <span className="brand-mark">Ledger</span>
          </div>
          <nav className="nav" aria-label="Sections">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="icon-btn"
            onClick={cycleTheme}
            aria-label={themeLabel}
            title={themeLabel}
            style={{ flexShrink: 0 }}
          >
            {themeIcon}
          </button>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/money"    element={<Money />} />
          <Route path="/plan"     element={<Plan />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />

          {/* Legacy deep links -> new consolidated homes (keeps old bookmarks,
              the import "View transactions" link, etc. working). */}
          <Route path="/transactions" element={<Navigate to="/money?view=transactions" replace />} />
          <Route path="/imports"      element={<Navigate to="/money?view=imports" replace />} />
          <Route path="/rules"        element={<Navigate to="/money?view=rules" replace />} />
          <Route path="/budgets"      element={<Navigate to="/plan?view=budgets" replace />} />
          <Route path="/bills"        element={<Navigate to="/plan?view=bills" replace />} />
          <Route path="/goals"        element={<Navigate to="/plan?view=goals" replace />} />
          <Route path="/snowball"     element={<Navigate to="/plan?view=snowball" replace />} />

          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>
    </div>
  )
}
