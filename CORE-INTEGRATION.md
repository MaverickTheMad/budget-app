# Ledger — Grove core integration

## What changed
- **Theme → core.** `App.jsx` no longer uses `ledger_theme` in localStorage; it
  reads/writes the shared theme via `src/lib/core.js` (per-person, cross-app).
  `main.jsx` paints the cached theme before mount (no flash). The 🌗 toggle works
  exactly as before.
- **Identity → core.people.** `budget.people` is retired. `Settings.jsx`'s People
  card now reads/writes `core.people` (name, color, **email**), and the Paychecks
  owner dropdown lists core people. `budget.paychecks.person_id` and
  `budget.transactions.person_id` now reference `core.people`.
- Added `api/whoami.js` (Cloudflare email → person) and `src/lib/core.js`.
- `supabase-schema.sql` updated for fresh installs (no local people table; FKs
  point at `core.people`; people removed from seed + RLS).

## Run order (one-time, in reilly-home SQL editor)
1. Make sure `core` exists/exposed and `core.people` has **Mav** and **Ren**
   (names must match the current budget.people names). Set their emails in
   Grove → Settings → Household.
2. Run **`supabase-migration-core-people.sql`** (v2, dependency-aware). It:
   - discovers and repoints **every** FK referencing budget.people — paychecks,
     transactions, **and monthly_budgets** (the live DB has more FKs than the
     repo schema showed) — remapping ids to core.people by name;
   - replaces the budget.people **table with a view** over core.people;
   - temporarily drops and then recreates the Calendar app's cross-schema views
     (`almanac.v_paydays`, `almanac.v_timeline`), which read budget.people.
   Atomic and guarded; aborts with a name list if a budget person has no core
   match. Verified end-to-end on Postgres 16.

   **Deploy order:** run this migration BEFORE deploying the new Ledger code —
   the new Settings writes core person ids into paychecks, which the old FK to
   budget.people would reject.

## Notes
- Person **color** now comes from `core.people` (this also recolors the Calendar
  app's payday/timeline rows, since those views now read core). Ledger's old
  colors (Mav `#6b7a5a`, Ren `#c08478`) are replaced by the core identity colors.
  To keep the old ones, uncomment the color-copy block in the migration, or set
  them in Grove → Settings → Household.
- `budget.people` still exists as a **view** over core.people, so the Calendar
  app keeps working with no changes. When you integrate Calendar later, you can
  optionally point its views straight at `core.people` and drop the shim.
- The per-person "primary paycheck" field was removed from the People card — it
  was never wired to the cycle math (which uses the household anchor in
  `app_settings`). The dormant `resolvePersonAnchor()` helper in
  `lib/payCycle.js` is left in place but unused.
- Env vars unchanged (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`); Ledger
  already had Supabase configured.
