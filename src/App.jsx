import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
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
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">Ledger</span>
            <span className="brand-meta">· Ren &amp; Mav</span>
          </div>
          <nav className="nav">
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
