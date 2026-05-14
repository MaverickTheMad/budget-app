// Pay cycle math. A pay cycle is a 14-day window anchored to a known start date
// (typically a paycheck date). Cycle N is [anchor + 14*N, anchor + 14*(N+1)).

const MS_PER_DAY = 24 * 60 * 60 * 1000
const CYCLE_DAYS = 14

/**
 * Parse a YYYY-MM-DD string into a Date at midnight LOCAL time.
 * Using local time (not UTC) so cycles align with calendar days the user sees.
 */
export function parseISODate(iso) {
  if (!iso) return new Date()
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Days between two dates (ignoring time of day).
 */
function daysBetween(a, b) {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((b0 - a0) / MS_PER_DAY)
}

/**
 * Given an anchor date and a reference date, return the pay-cycle window
 * containing the reference date.
 * @param {string} anchorISO   "YYYY-MM-DD"
 * @param {Date}   ref         reference date (defaults to today)
 * @param {number} offset      shift by N cycles (negative = past, positive = future)
 * @returns {{ start: Date, end: Date, startISO: string, endISO: string,
 *             daysIn: number, daysLeft: number, index: number }}
 *   start  inclusive
 *   end    exclusive (next cycle's start)
 *   index  number of cycles since anchor (can be negative)
 */
export function getPayCycle(anchorISO, ref = new Date(), offset = 0) {
  const anchor = parseISODate(anchorISO)
  const days = daysBetween(anchor, ref)
  // Floor division that works for negatives:
  const baseIndex = Math.floor(days / CYCLE_DAYS)
  const index = baseIndex + offset
  const start = new Date(anchor.getTime() + index * CYCLE_DAYS * MS_PER_DAY)
  const end = new Date(start.getTime() + CYCLE_DAYS * MS_PER_DAY)
  const todayDays = daysBetween(start, ref)
  return {
    start,
    end,
    startISO: toISODate(start),
    endISO: toISODate(end),
    daysIn: Math.max(0, Math.min(CYCLE_DAYS, todayDays + 1)),
    daysLeft: Math.max(0, CYCLE_DAYS - todayDays - 1),
    index
  }
}

/**
 * Human label for a cycle.
 * "May 14 – May 27" or "May 28 – Jun 10, 2026"
 */
export function formatCycleLabel(cycle) {
  const sameYear = cycle.start.getFullYear() === cycle.end.getFullYear()
  const startStr = cycle.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  // The end Date is exclusive — show end-1 as the inclusive last day
  const lastDay = new Date(cycle.end.getTime() - MS_PER_DAY)
  const endStr = lastDay.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: sameYear && cycle.start.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  })
  return `${startStr} – ${endStr}`
}
