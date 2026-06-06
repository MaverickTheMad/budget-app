# Ledger → Grove visual refresh

Brings Ledger in line with the Grove brand and the UI polish guide.
**No page rewrites** — pages keep their existing class vocabulary; the
design tokens, primitives, shell, and identity assets change underneath.

## What changed

### Surfaces, type, colour (Brand Guide §1–5)
- Dark-first green-black surfaces (`#10140E` base, never `#000`)
- Light theme becomes the secondary mode (auto via prefers-color-scheme, manual override via theme toggle)
- Fonts: **Fraunces** (headings) + **Plus Jakarta Sans** (body) + **JetBrains Mono** (numerals) — replaces DM Serif Display / DM Sans
- House green `#4FA06F` reserved for primary action / active tab (polish-guide §2)
- App accent: **Dusk `#6F86C2`** (light `#4E66A6`) — for identity moments only, not on the primary button
- Earthy purple `#9B82BE` as secondary highlight (used in the leaf mark's branch detail and ledger-rule overlay)
- Type scale (1.25 ratio): `--fs-xs` … `--fs-3xl`; radius scale `--r-sm` … `--r-xl`; spacing scale `--sp-1` … `--sp-8` — all in the token block

### Shell + nav
- Sticky top brand bar with the Grove · Ledger lockup (leaf mark + wordmark)
- Theme toggle (auto / light / dark) in the top right, persisted to `localStorage('ledger_theme')`
- Desktop: horizontal nav with active-state pill in `--accent-weak`
- Mobile (<720px): nav collapses to a sticky bottom tabbar with the active item underlined in house green (polish-guide §8). Bottom safe-area padding respected for notched devices.

### Hero numbers (polish-guide §1)
- `.stat-value` now uses `--fs-3xl` JetBrains Mono; labels demoted to `--fs-xs` upper-case
- Stat-card variants (`.accent`, `.warm`, `.rose`, `.gold`) tinted with the suite tokens

### New app icon
- Leaf silhouette in Dusk + two earthy-purple horizontal ledger rules inside the leaf body
- Reads as a sibling of the other Grove app icons (same dark tile, same leaf form) but distinct: the rules say "this one's the ledger"
- Generated as `favicon.svg`, `icon-192.png`, `icon-512.png` on the `#10140E` tile
- `manifest.json` updated with Grove naming, theme/background `#10140E`, "any maskable" purpose
- `index.html`: meta theme-color, manifest link, Grove fonts preload, title "Grove · Ledger"

## Files

```
src/styles/index.css           REPLACE   (718 lines, full token block + primitives)
src/App.jsx                    REPLACE   (adds theme toggle + Grove lockup)
index.html                     REPLACE   (Grove fonts + theme color + manifest link)
public/favicon.svg             REPLACE   (Dusk leaf with ledger rules)
public/manifest.json           NEW       (PWA manifest, dark tile)
public/icons/icon-192.png      NEW       (PWA icon, dark tile + Dusk leaf-ledger mark)
public/icons/icon-512.png      NEW       (same, 512×512 maskable)
```

## Deploy

1. Drop the files into the repo at matching paths
2. Commit + push — Vercel rebuilds in ~60s
3. First load may show old icon — clear PWA / browser cache to see the new tile

## What this doesn't change

- Page logic (Overview/Bills/Budgets/Transactions/etc. all keep their existing JSX)
- Database schema
- The class vocabulary the pages use — every class is still defined, just with Grove tokens underneath

## Why this is enough without rewriting pages

The existing pages use a small set of shared classes (`card`, `btn`, `stat-card`, `pill`, etc.). Replacing the CSS replaces the look across every page in one move. Per-page polish from the UI guide (consequence-copy on destructive buttons, undo toasts on imports, drill-down empty states, etc.) is a separate per-page pass — let me know which page to start with and I'll layer that in next.
