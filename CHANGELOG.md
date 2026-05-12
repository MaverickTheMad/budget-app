# v1.1 — Statement imports

## Files in this delta

### New
- `src/lib/pdfParser.js` — pdf.js text extraction wrapper
- `src/lib/parsers/chase.js` — Chase statement parser (checking + credit card)
- `src/lib/parsers/index.js` — bank registry / auto-detect
- `src/lib/rulesEngine.js` — applies categorization rules
- `src/lib/duplicateDetector.js` — strict date+amount dupe matching
- `src/pages/Rules.jsx` — dedicated rules page with live preview + tester
- `supabase-migration-v1.1.sql` — idempotent migration (safe to run on existing DB)

### Replaced
- `src/pages/Imports.jsx` — was a placeholder, now the real upload→review→commit flow
- `src/App.jsx` — added Rules route and nav item
- `src/pages/Settings.jsx` — removed the weak rules CRUD (it has its own page now)
- `package.json` — added pdfjs-dist
- `vite.config.js` — added pdfjs chunking + optimizeDeps
- `README.md` — v1.1 docs

## Deploy

1. **Drop these files into your repo** at matching paths (overwrite where they exist)
2. **Install:** `npm install` to pull in pdfjs-dist
3. **(Optional) Run the migration:** in Supabase SQL Editor, paste `supabase-migration-v1.1.sql` and Run — it's idempotent so it's safe even if those tables exist
4. **Commit and push** — Vercel redeploys in ~60 seconds
5. **Test locally first** if you can: `npm run dev` and try the import flow with a real Chase PDF
