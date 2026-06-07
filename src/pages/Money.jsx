import SubTabs, { useSubTab } from '../components/SubTabs'
import Transactions from './Transactions'
import Imports from './Imports'
import Rules from './Rules'

// "Money" groups the day-to-day ledger work: the transactions themselves,
// importing statements that create them, and the rules that auto-categorize
// imports. They share categories/accounts and flow into each other, so they
// belong behind one nav item.
const TABS = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'imports',      label: 'Imports' },
  { id: 'rules',        label: 'Rules' },
]

export default function Money() {
  const [view, setView] = useSubTab(TABS)
  return (
    <div>
      <SubTabs tabs={TABS} current={view} onChange={setView} />
      {view === 'transactions' && <Transactions />}
      {view === 'imports'      && <Imports />}
      {view === 'rules'        && <Rules />}
    </div>
  )
}
