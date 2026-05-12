# Ledger — Family Budget

A budgeting tool built for Ren &amp; Mav, mirroring the structure of your Family_Budget.xlsx with bills, paychecks, budgets, transactions, sinking funds, snowball debt payoff, FYTD insights, and PDF statement imports.

## What's in v1.1

**New:**
- **Statement imports** — drag-drop a Chase PDF, parser extracts transactions, rules engine auto-categorizes, review screen lets you edit/skip/approve, commit writes to the ledger as a batch
- **Rules tab** — first-class page for building categorization rules with category dropdowns, live preview, and a description tester
- **Duplicate detection** — strict date+amount match flags rows that already exist in your ledger
- **Undoable imports** — every import gets a batch ID; the recent-imports table on the Imports page has an Undo button that nukes the entire batch

**v1.0 (still there):**
- Overview · Bills · Budgets · Transactions · Goals · Snowball · Insights · Settings

## Stack

- **Frontend:** React + Vite, pdfjs-dist for PDF text extraction (all client-side)
- **Backend:** Supabase (Postgres)
- **Hosting:** Vercel
- **Domain:** budget.reilly.live

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

## What's next (v1.2 ideas)

- More bank parsers (Ally, Capital One, Discover)
- Per-account starting balances + reconciliation view
- Recurring transaction templates
- Export to CSV / Excel
- Generic CSV import for banks that don't offer PDF exports

## How statement imports work

1. **Drop a Chase PDF** on the Imports page (or pick from file picker)
2. **pdf.js extracts** the raw text in your browser — nothing uploads anywhere unprivileged
3. **Chase parser** walks the text, identifies date/description/amount per line, sections (deposits vs withdrawals) drive the sign
4. **Rules engine** runs over each parsed row — first matching rule (by priority) assigns the category
5. **Duplicate detector** flags any parsed row whose date+amount already exists in your ledger; those get auto-skipped (you can override)
6. **Review screen** — edit any row, toggle import, see net total, then commit
7. **Commit** creates a `statement_imports` batch row, inserts all approved transactions tagged with that batch ID, bumps `hits` count on used rules

To **undo an import**, scroll down to "Recent imports" on the Imports page (before uploading a new one) and hit Undo. It deletes every transaction with that batch ID.

### A note on credit card signs

Chase credit card statements list charges as positive ("$47.99 Amazon") and payments as negative ("-$350 Payment Thank You"). The parser preserves that — a charge becomes a negative transaction in your ledger (money out), and a payment becomes... also negative, since from the credit card's perspective the payment reduces the balance. If you track credit cards as debt accounts (as in Snowball), this is correct. If you track them as expense flow-through, you may want to flip payment signs in the review screen — easy to do, just toggle the amount field.

### Adding a new bank parser

1. Create `src/lib/parsers/<bank>.js` exporting `parse<Bank>(text)` and `is<Bank>(text)`
2. Register it in `src/lib/parsers/index.js`
3. The Imports UI picks it up automatically
