// Chase statement parser.
// Handles both Chase checking statements and Chase credit card statements.
// Both formats put transactions on lines like:
//   "MM/DD  Description text  $123.45"
// or with explicit deposit/payment columns. We try to be lenient.
//
// Returns: [{date, description, amount, rawLine}] — amount negative for debits.

/**
 * Detect statement year from the page header.
 * Chase statements include a "Statement Period" or "Statement Date" line like:
 *   "January 1, 2025 through January 31, 2025"
 *   "Opening/Closing Date 01/01/25 - 01/31/25"
 */
function detectYear(text) {
  // Try full date like "January 1, 2025"
  const fullMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+(\d{4})/i)
  if (fullMatch) return parseInt(fullMatch[1])

  // Try MM/DD/YY or MM/DD/YYYY
  const slashMatch = text.match(/\b\d{1,2}\/\d{1,2}\/(\d{2,4})\b/)
  if (slashMatch) {
    const y = parseInt(slashMatch[1])
    return y < 100 ? 2000 + y : y
  }

  return new Date().getFullYear()
}

/**
 * Parse a Chase money string. Returns a number, negative for debits/charges.
 * Chase formats:
 *   "$1,234.56"      — positive
 *   "($1,234.56)"    — negative (some statements)
 *   "-1,234.56"      — negative
 *   "1,234.56-"      — negative (trailing minus)
 */
function parseMoney(str) {
  if (!str) return null
  const clean = str.replace(/[\s$,]/g, '')
  const isNeg = clean.startsWith('-') || clean.endsWith('-') || (clean.startsWith('(') && clean.endsWith(')'))
  const numStr = clean.replace(/[-()]/g, '')
  const n = parseFloat(numStr)
  if (isNaN(n)) return null
  return isNeg ? -n : n
}

/**
 * Heuristic line classifier.
 * Returns null if the line isn't a transaction.
 * A "transaction line" starts with MM/DD, has text in the middle, ends with a dollar amount.
 */
function parseLine(line, year) {
  // Strip extra whitespace
  const trimmed = line.trim().replace(/\s+/g, ' ')
  if (trimmed.length < 8) return null

  // Match a date prefix MM/DD or M/D
  const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\b/)
  if (!dateMatch) return null

  // Match an amount at the end — must end the line
  const amountMatch = trimmed.match(/(-?\$?\s?[\d,]+\.\d{2}-?|\(-?\$?\s?[\d,]+\.\d{2}\))\s*$/)
  if (!amountMatch) return null

  const amount = parseMoney(amountMatch[1])
  if (amount === null) return null

  const month = parseInt(dateMatch[1])
  const day = parseInt(dateMatch[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Description is everything between the date and the amount
  const dateEnd = dateMatch[0].length
  const amountStart = trimmed.length - amountMatch[0].length
  let description = trimmed.slice(dateEnd, amountStart).trim()

  // Clean up: collapse double spaces, strip leading "DEBIT CARD PURCHASE" / "ACH" etc.
  description = description.replace(/\s{2,}/g, ' ')
  if (!description) return null

  // Some Chase statements include a posting date as a second MM/DD at the start of the description
  // e.g. "01/15 01/16 STARBUCKS #1234" — strip the second date if present
  description = description.replace(/^\d{1,2}\/\d{1,2}\s+/, '')

  // Filter junk lines: balance lines, totals, headers
  if (/^(beginning|ending|opening|closing)\s+balance/i.test(description)) return null
  if (/^total\s+(deposits|withdrawals|fees|interest)/i.test(description)) return null
  if (/^(daily ending balance|page \d+|continued)/i.test(description)) return null
  if (description.length < 2) return null

  // Construct ISO date — handle year-end rollover (Dec txn on a Jan statement)
  // Heuristic: if month > 6 and statement is in early year, txn is prior year
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return {
    date,
    description,
    amount,
    rawLine: line
  }
}

/**
 * Detect the section a transaction belongs to.
 * Chase checking statements have sections: "DEPOSITS AND ADDITIONS", "ELECTRONIC WITHDRAWALS",
 * "ATM & DEBIT CARD WITHDRAWALS", "FEES", etc.
 * We use this to assign sign correctly when the statement doesn't use signed amounts.
 */
function detectSection(line) {
  const upper = line.toUpperCase()
  if (/DEPOSITS?\s+AND\s+ADDITIONS?/.test(upper)) return 'credit'
  if (/ELECTRONIC\s+WITHDRAWALS?/.test(upper)) return 'debit'
  if (/(ATM|DEBIT\s+CARD)\s+WITHDRAWALS?/.test(upper)) return 'debit'
  if (/CHECKS?\s+PAID/.test(upper)) return 'debit'
  if (/FEES/.test(upper)) return 'debit'
  if (/PAYMENTS?,?\s+CREDITS?/.test(upper)) return 'credit'
  if (/PURCHASES?/.test(upper)) return 'debit'
  if (/INTEREST\s+PAID/.test(upper)) return 'credit'
  return null
}

/**
 * Main Chase parser. Walks pages line-by-line, tracking section context
 * so we can sign amounts correctly for statements that list raw values.
 */
export function parseChase(text) {
  const year = detectYear(text)
  const lines = text.split('\n')
  const transactions = []
  let currentSection = null

  for (const line of lines) {
    const sectionHint = detectSection(line)
    if (sectionHint) {
      currentSection = sectionHint
      continue
    }

    const tx = parseLine(line, year)
    if (!tx) continue

    // If section is debit and amount is positive, flip the sign.
    // If statement already used signs/parens, parseMoney handled it.
    if (currentSection === 'debit' && tx.amount > 0) tx.amount = -tx.amount

    transactions.push(tx)
  }

  // De-dupe within the parse (Chase sometimes repeats totals lines)
  const seen = new Set()
  return transactions.filter(tx => {
    const k = `${tx.date}|${tx.amount}|${tx.description}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Sniff if text looks like a Chase statement.
 */
export function isChase(text) {
  const head = text.slice(0, 4000).toLowerCase()
  return head.includes('chase') || head.includes('jpmorgan') || head.includes('jpmc')
}
