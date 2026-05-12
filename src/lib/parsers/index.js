// Parser registry — sniffs text to detect which bank parser to use.
// Adding a new bank: create src/lib/parsers/<bank>.js with {parse<Bank>, is<Bank>},
// then register here.

import { parseChase, isChase } from './chase'

export const PARSERS = [
  { id: 'chase',   name: 'Chase',   parse: parseChase,  detect: isChase }
]

/**
 * Auto-detect bank from raw PDF text. Returns the parser id, or null.
 */
export function detectBank(text) {
  for (const p of PARSERS) {
    if (p.detect(text)) return p.id
  }
  return null
}

/**
 * Parse with a specific bank parser. If id is null/unknown, returns [].
 */
export function parseWithBank(text, id) {
  const parser = PARSERS.find(p => p.id === id)
  if (!parser) return []
  return parser.parse(text)
}
