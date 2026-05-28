# CharSnap — Implementation Plan

---

## Project Overview

CharSnap Stats Tracker is a personal dashboard for CharSnap bot creators. It runs entirely in the browser — no backend, no account — all data lives in IndexedDB. A companion Tampermonkey userscript captures stats from manually-opened CharSnap stat modals and exports them as JSON for paste-import. The tracker provides snapshot history, overlay charts, gain views, and other visualizations that CharSnap's own UI doesn't support.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase is a meaningful milestone — at the end of any phase, the app should be in a coherent, working state. Phases are sized to be reviewable as user-facing changes, not just internal refactors.

---

## Future Features

**Additional theme palettes**

Token-override variants on top of the shipped dark theme. All gated on a theme-switcher UI in Settings (not yet built) and on the `[data-theme]` CSS token architecture already in place. Implementation per theme is a `[data-theme="<name>"]` block in `index.css` plus, for some themes, per-theme texture/background treatments.

- **Light** — light-mode counterpart to dark. Needs its own aura palette pass since the current aura colors were tuned for dark backgrounds. Aura work depends on the light theme shipping first.
- **Yume Kawaii** — pastel/kawaii aesthetic.
- **Ocean** — blue/teal aesthetic.
- **Dark Academia** — muted warm-dark aesthetic.
- **Synthwave** — neon/retrowave; may benefit from per-theme texture/background treatments.

If new parked features get added later that each have substantive rationale + dependency prose, they get their own `---` block per pingus convention. The rule of thumb: a parked item earns its own block when it has at least a paragraph of context to convey; one-line stubs cluster.

---

## Queued Adjustments

- **Avatar banner tooltips — done 2026-05-28.** All single-bot Recharts chart tooltips now show the bot's avatar as a horizontal landscape banner at the top, with a bottom-edge gradient fade into the tooltip background. Shared `BotTooltip.jsx` component. Applies to: Top Gainers, History, Ranking, Scatter, Breakdown, Compare Ranking, Compare Gains. Lifespan hover display updated to show a small avatar circle in the toolbar header (SVG-based, not a Recharts tooltip). Also fixed a pre-existing bug where Lifespan was reading `bot.avatarUrl` instead of `bot.avatar`.
- **Export + Compare suite — done 2026-05-28.** New Compare tab with 7 sub-views: Overview (aggregate totals side by side), Table (two ranked lists), Ranking (combined bar chart colour-coded by owner), Gains (combined gains chart, 7d/30d/all-time), Tags (two tag lists), Breakdown (solo/group split), 1v1 (single bot deep-dive with growth chart). Name labels editable inline. File export description updated to mention sharing for comparison.
- **Activity chart — done 2026-05-25.** New "Activity" tab with day-of-week bar chart. Two modes: Captures (snapshot count per day, shows check-in rhythm) and Growth (average message gain logged per day, proxy for bot activity patterns). Peak day highlighted in accent color. Useful for timing bot launches.
- **Snapshot timestamps — done 2026-05-22.** Snapshot history table now shows exact time alongside date, displayed in local timezone. Manual snapshot save now stamps current time of day rather than hardcoded noon. `fmtDateTime` helper added to `format.js`.
- **Spider chart view — done 2026-05-21.** Replaced the Treemap tab with a radar/spider chart. Six axes (solo msgs, group msgs, threads, favorites, avg msgs/day, favs per 1K msgs), all normalized to dataset max. Gallery mode: small-multiples grid, click to open bot detail. Single mode: primary bot + up to 3 comparison overlays with semi-transparent fills; selected bots persist across navigation. Treemap removed.
- **Dashboard visual refresh (locked design tokens) — done 2026-05-18.** Applied sandbox-finalized tokens: Manrope/Lora/Outfit/Poppins typography, accent-colored table numbers, top-to-bottom gradient overlays on stat cards, row-banding composition fix through colored columns.
- **Tag filter from Tag Totals — done 2026-05-19.** Clicking a tag in the Tags chart navigates to the bot list and applies that tag as a filter, with a removable chip display.
- **Manual PFP override — done 2026-05-19.** Click-to-edit PFP in bot detail view; supports URL or file upload; `avatarIsManual` flag prevents import overwrites; pencil badge indicator.
- **Bulk tag editing — done 2026-05-19.** Multi-select mode on the bot list with add/remove tags action bar; selections persist across pagination.
- **Pagination + grid view — done 2026-05-19.** 25/50/100 page size, localStorage-persisted; page/grid toggle also persisted; full pagination controls with ellipsis.
- **Zero-stat import fix — done 2026-05-20.** Import parser now checks for stat field *presence* rather than truthy values; brand-new bots with all-zero stats no longer get silently rejected.
- **Dashboard scope-contamination fix — done 2026-05-20.** `enrichBot` and `totals` now scope to Total-only snapshots for all stat/delta/ranking arithmetic; `BotMatchDropdown` proximity ranking also scoped. Display-only lint comment added to `fmt()`.
- **Import match dropdown redesign — done 2026-05-19.** Custom dropdown replaces native `<select>` in the review step: PFP thumbnail + name + metadata row (messages, snaps, tags, updated-ago); type-ahead filter input; smart ranking by message-count proximity to the incoming snapshot; "Closest match" badge on top-ranked result; current selection shown with PFP in the trigger button.
- **Settings panel — done 2026-05-20.** Gear-icon modal with Appearance (theme picker, compact mode toggle) and Preferences (opening view, rows per page). Zustand persist store (`charsnap-settings`) replaces the old `charsnap-page-size` localStorage key. Theme switching via `[data-theme]` CSS attribute; compact mode via `[data-compact]`. Backup moved to its own `Database` icon; `Settings2` gear now opens Settings.
- **Grid view hero-banner cards — done 2026-05-19.** Full-width landscape banner (~120 px, center-cropped PFP), card body with name/tags/stats trio. Tag overflow: max 2 chips + `+N` pill with popover for remaining tags. Stats trio: 3 equal columns, full labels (Messages / Threads / Favorites), per-metric color. PFP edit camera icon on banner hover. Bulk-select checkbox overlaid on banner when select mode active. Grid uses `repeat(auto-fill, minmax(220px, 1fr))`.

---

## Known Bugs

*(None documented in plan.md.)*

---

## Phases 0–7 — Completed

- **Phase 0 — Project Setup:** Vite + React init with Recharts, lucide-react, Zustand, Tailwind; Vite GitHub Pages base path config; deploy workflow on push to main; folder structure under `src/`; CHANGELOG.md bootstrapped.
- **Phase 1 — Data Layer:** bot & snapshot schemas in `constants/schema.js`, metric definitions in `constants/metrics.js`, `storage-service.js` as sole IndexedDB access point, Zustand store, debounced `autosave.js`, `use-bots.js` hook with avatar URL normalization.
- **Phase 2 — Manual Entry + Basic Dashboard:** add/edit/delete bots with manual snapshot entry; bot list table with name, avatar, stats, timestamp, snapshot count; search/filter by name/tag, sort by any metric; aggregate stat cards; empty state.
- **Phase 3 — Paste-Box Import:** import modal with paste textarea; parsers for CharSnap copy-button format and batch JSON; auto-match by name + avatar URL; disambiguation UI for ambiguous matches (eight-Sampos problem); "Create new bot" option; preview before apply; scope warning for non-Total captures.
- **Phase 4 — Per-Bot Detail + Growth Charts:** bot detail view open from row; snapshot history list with per-snapshot delete; dual-axis line chart of three metrics (Total-scope only); delta-since-last-snapshot; add snapshot / edit meta / delete bot from detail view.
- **Phase 5 — Multi-Bot Visualizations:** Izumael-style overlay chart (all bots on one timeline, one line per bot); Top Characters history view; daily/weekly/monthly/all-time gain views; tag-based aggregate view; configurable ranking chart (top N by any metric); tab/dropdown view switching.
- **Phase 6 — Polish + Share-Readiness:** first-time empty state and import onboarding tooltip; About page rendering CHANGELOG.md; README with screenshots; JSON backup/import; reset with double-confirm; mobile layout; favicon and page title; dark theme with CSS token system, Quicksand/Inter fonts, aura colors (shipped 2026-05-17).
- **Phase 7 — Userscript:** reads DOM of manually-opened stat modals; refuses to capture off the Total tab; one bot at a time; floating HUD with queue count, Copy queue, and two-step Clear; clipboard → paste-import handoff. Lives in `userscript/charsnap-capture.user.js`. Shipped 2026-05-16 (v1.0–v1.4), polished through v1.8 (2026-05-17); personal use only pending CharSnap team clearance.
