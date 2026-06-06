import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Overview from './pages/Overview'
import Bills from './pages/Bills'
import Budgets from './pages/Budgets'
import Transactions from './pages/Transactions'
import Goals from './pages/Goals'
import Snowball from './pages/Snowball'
import Insights from './pages/Insights'
import Imports from './pages/Imports'
import Rules from './pages/Rules'
import Settings from './pages/Settings'

const NAV = [
  { to: '/overview',     label: 'Overview' },
  { to: '/bills',        label: 'Bills' },
  { to: '/budgets',      label: 'Budgets' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/goals',        label: 'Goals' },
  { to: '/snowball',     label: 'Snowball' },
  { to: '/insights',     label: 'Insights' },
  { to: '/imports',      label: 'Imports' },
  { to: '/rules',        label: 'Rules' },
  { to: '/settings',     label: 'Settings' }
]

export default function App() {
  // Theme: auto (system) | light | dark — persisted per app.
  const [theme, setTheme] = useState(() => localStorage.getItem('ledger_theme') || 'auto')

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    if (theme === 'dark')  root.classList.add('theme-dark')
    if (theme === 'light') root.classList.add('theme-light')
    localStorage.setItem('ledger_theme', theme)
  }, [theme])

  const cycleTheme = () =>
    setTheme(t => t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto')
  const themeIcon = theme === 'auto' ? '🌗' : theme === 'light' ? '☀️' : '🌙'
  const themeLabel = theme === 'auto' ? 'System theme' : theme === 'light' ? 'Light theme' : 'Dark theme'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            {/* leaf-mark is injected by .brand-mark::before in CSS — keeps JSX simple */}
            <span className="brand-mark">Ledger</span>
            <span className="brand-meta">· part of Grove</span>
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
          <Route path="/overview"     element={<Overview />} />
          <Route path="/bills"        element={<Bills />} />
          <Route path="/budgets"      element={<Budgets />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals"        element={<Goals />} />
          <Route path="/snowball"     element={<Snowball />} />
          <Route path="/insights"     element={<Insights />} />
          <Route path="/imports"      element={<Imports />} />
          <Route path="/rules"        element={<Rules />} />
          <Route path="/settings"     element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
