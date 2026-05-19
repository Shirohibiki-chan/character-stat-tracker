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

- **Dashboard visual refresh (locked design tokens) — done 2026-05-18.** Applied sandbox-finalized tokens: Manrope/Lora/Outfit/Poppins typography, accent-colored table numbers, top-to-bottom gradient overlays on stat cards, row-banding composition fix through colored columns.

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
