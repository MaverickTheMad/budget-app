# Ledger — Family Budget

A budgeting tool built for Ren &amp; Mav, mirroring the structure of your Family_Budget.xlsx with bills, paychecks, budgets, transactions, sinking funds, snowball debt payoff, and FYTD insights.

## What's in v1.0

- **Overview** — monthly cashflow, upcoming bills, goal progress
- **Bills** — master list with paid/unpaid checkboxes per month, due dates, autopay flags
- **Budgets** — monthly budget per category vs actual spending, with progress bars
- **Transactions** — full ledger with filters by category, account, person, and search
- **Goals** — sinking funds (envelopes) with contributions log and target dates
- **Snowball** — debt list with auto-projected month-by-month payoff schedule
- **Insights** — monthly cashflow chart, category breakdown bar &amp; pie, FYTD totals
- **Imports** — placeholder for v1.1 (PDF statement import + rules engine)
- **Settings** — CRUD for people, accounts, categories, and rules

Seeded with your existing data: 13 categories, 11 sinking-fund envelopes, 12 bills with due dates from your spreadsheet, 5 debts with current balances and APRs, and 2 paycheck definitions.

## Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (Postgres)
- **Hosting:** Vercel
- **Domain:** budget.reilly.live (via Namecheap)

## Local setup

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:5173.

## Deploy steps

### 1. Create the Supabase project

1. Go to **supabase.com** → New Project
2. Name it `family-budget`, US East, set a password → Create
3. Wait ~2 minutes for it to spin up
4. **SQL Editor** → paste contents of `supabase-schema.sql` → Run
5. **SQL Editor** → paste contents of `supabase-seed.sql` → Run
6. **Project Settings → API** → copy the **Project URL** and **anon public key**

### 2. Add env vars locally

Create `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> Make sure you copy the **anon public** key, not the service_role secret. The anon key's decoded JWT payload contains `"role":"anon"`.

### 3. Push to GitHub

Create a new repo at github.com (e.g. `MaverickTheMad/family-budget`, public), then:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/MaverickTheMad/family-budget.git
git push -u origin main
```

### 4. Deploy to Vercel

1. **vercel.com** → Add New → Project → import `family-budget`
2. Framework: Vite (auto-detected) → Deploy
3. **Settings → Environment Variables** → add both env vars → Save
4. Trigger a redeploy (Deployments → ⋯ → Redeploy without build cache)

### 5. Connect budget.reilly.live

**In Vercel:** Project → Settings → Domains → add `budget.reilly.live`

**In Namecheap:** Domain List → Manage `reilly.live` → Advanced DNS → add:
- Type: **CNAME**, Host: `budget`, Value: `cname.vercel-dns.com`

DNS propagates in 5–30 minutes.

### 6. Update the home dashboard

In `MaverickTheMad/home`, change the Budget card in `public/index.html` from "soon" to a live link pointing at `https://budget.reilly.live`, push, and Vercel will redeploy `home.reilly.live` automatically.

## Schema overview

| Table | Purpose |
|-------|---------|
| `accounts` | Chase, Ally, cash, etc. — for tagging transactions |
| `people` | Ren and Mav, color-coded |
| `categories` | The 13 spending categories from the FY sheets |
| `paychecks` | Recurring income definitions |
| `bills` | Master bill list with due day, amount, autopay |
| `bill_payments` | One row per month per bill — drives the "paid?" checkboxes |
| `monthly_budgets` | Budget amount per category per month |
| `transactions` | The ledger — every line item |
| `goals` / `goal_contributions` | Sinking funds with contribution log |
| `debts` / `debt_payments` | Snowball debt list and payment log |
| `rules` | Categorization rules (active in v1.1) |
| `statement_imports` | Statement upload records (v1.1) |

Row Level Security is enabled with anonymous access on all tables, matching the pattern used in `rens-journal` and `shopping`. If you ever want stricter auth, swap to Supabase Auth later — the schema is ready for it.

## What's next (v1.1)

- PDF statement upload with text extraction
- Per-bank parsing templates (Chase, Ally, etc.)
- Rules engine running on parsed transactions
- Side-by-side review screen before commit
- Duplicate detection against existing ledger
- Budget-vs-actual diff after import
