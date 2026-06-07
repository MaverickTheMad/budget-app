# v1.6 — Navigation consolidation, per-month transactions, richer insights

UI/UX pass. No schema changes — purely frontend, safe to deploy by pushing to `main`.

## What changed

### Header
- **Back to Grove home** button added to the topbar, linking to `home.reilly.live`.
  Collapses to just the arrow on narrow screens.

### Navigation consolidated (10 -> 5 top-level items)
The top nav is now **Overview . Money . Plan . Insights . Settings**. Related
sections moved behind in-page sub-tabs:
- **Money** = Transactions . Imports . Rules
- **Plan** = Budgets . Bills . Goals . Snowball

Sub-tabs are driven by a `?view=<id>` query param, so each section is
deep-linkable and the browser back button works. All previous routes
(`/transactions`, `/bills`, `/rules`, ...) now redirect to their new homes, so old
bookmarks and the import "View transactions" link keep working.

### Transactions
- **Date-range filter** — From / To date pickers (native calendar inputs) bounded
  to the span of dates present in the data; inclusive on both ends, and either
  bound can be left open. Stat-card labels reflect the active range.
- **Sortable by category** — new sort dropdown (Newest / Oldest / By category /
  Largest / Smallest) plus a **Group by category** toggle that renders category
  sections with per-category subtotals.
- **Tighter rows** — new `.ledger-tight` table variant: reduced row padding,
  description + note stacked into a compact two-line cell, fixed column widths,
  account column hidden on small phones.
- Filter bar reworked into a grid with a "Clear filters" action and a result count.

### Insights
- Split into two views via a segmented control: **Trends** and **Compare months**.
- **Trends**: year stepper, **Monthly / Quarterly** granularity toggle (quarterly
  cashflow renders as grouped bars, not an interpolated line), and a **Quarter**
  selector that scopes every stat, chart, and the drill-down.
- **Compare months**: two month dropdowns, side-by-side category bar chart, and a
  category delta table (absolute + % change, "new" flag for newly-spent categories).
- Chart colors/tooltips now route through CSS vars so they recolor correctly in
  dark mode (per UI-POLISH-GUIDE section 7).

## Files in this delta

### New
- `src/components/SubTabs.jsx` — in-page segmented sub-navigation + `useSubTab` hook
- `src/lib/period.js` — month-key + quarter helpers (pure, timezone-safe)
- `src/pages/Money.jsx` — wrapper hosting Transactions / Imports / Rules
- `src/pages/Plan.jsx` — wrapper hosting Budgets / Bills / Goals / Snowball

### Replaced
- `src/App.jsx` — consolidated nav, back-to-home button, legacy-route redirects
- `src/pages/Transactions.jsx` — month filter, sorting, grouping, tight rows
- `src/pages/Insights.jsx` — Trends (granularity + quarter) + Compare view
- `src/pages/Settings.jsx` — updated the "where are Rules" footer note
- `src/pages/Imports.jsx` — "View transactions" link points to `/money?view=transactions`
- `src/styles/index.css` — styles for home button, sub-tabs, segmented controls,
  tight ledger rows, transaction filters, compare pickers

## Deploy
1. Drop these files into the repo at matching paths (overwrite where they exist).
2. No `npm install` needed — no new dependencies.
3. No migration — schema is unchanged.
4. Commit and push to `main`; Vercel redeploys in ~60s.
5. Smoke test: header home button, the Money/Plan sub-tabs, the Transactions
   month filter + group-by-category, and the Insights Compare view.

---

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
