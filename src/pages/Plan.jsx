import SubTabs, { useSubTab } from '../components/SubTabs'
import Budgets from './Budgets'
import Bills from './Bills'
import Goals from './Goals'
import Snowball from './Snowball'

// "Plan" groups the forward-looking money tools: what you intend to spend
// (Budgets), what's owed on a schedule (Bills), what you're saving toward
// (Goals), and how you'll clear debt (Snowball). All are "the plan" as
// opposed to the recorded reality in Money.
const TABS = [
  { id: 'budgets',  label: 'Budgets' },
  { id: 'bills',    label: 'Bills' },
  { id: 'goals',    label: 'Goals' },
  { id: 'snowball', label: 'Snowball' },
]

export default function Plan() {
  const [view, setView] = useSubTab(TABS)
  return (
    <div>
      <SubTabs tabs={TABS} current={view} onChange={setView} />
      {view === 'budgets'  && <Budgets />}
      {view === 'bills'    && <Bills />}
      {view === 'goals'    && <Goals />}
      {view === 'snowball' && <Snowball />}
    </div>
  )
}
