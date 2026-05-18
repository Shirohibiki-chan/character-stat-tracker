# CharSnap — Implementation Plan

---

## Project Overview

CharSnap Stats Tracker is a personal dashboard for CharSnap bot creators. It runs entirely in the browser — no backend, no account — all data lives in IndexedDB. A companion Tampermonkey userscript captures stats from manually-opened CharSnap stat modals and exports them as JSON for paste-import. The tracker provides snapshot history, overlay charts, gain views, and other visualizations that CharSnap's own UI doesn't support.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase is a meaningful milestone — at the end of any phase, the app should be in a coherent, working state. Phases are sized to be reviewable as user-facing changes, not just internal refactors.

---

## Future Features

**Light theme**

A light-mode counterpart to the shipped dark theme. Needs token value overrides in `index.css` under `[data-theme="light"]`, a theme-switcher UI in Settings, and a light-mode aura palette (see below). Parked because the dark theme shipped first; the CSS token architecture already supports this as a follow-on.

---

**Yume Kawaii theme**

Pastel/kawaii aesthetic token overrides. Same implementation shape as Light theme — token overrides in `index.css`, theme-switcher UI in Settings, and potentially per-theme texture/background treatments. Parked pending theme-switcher UI.

---

**Ocean theme**

Blue/teal aesthetic token overrides. Same shape as other additional themes. Parked pending theme-switcher UI.

---

**Dark Academia theme**

Muted warm-dark aesthetic token overrides. Same shape as other additional themes. Parked pending theme-switcher UI.

---

**Synthwave theme**

Neon/retrowave aesthetic token overrides. May benefit from per-theme texture or background treatments. Parked pending theme-switcher UI.

---

**Light-mode aura palette**

Per-bot aura colors tuned for light backgrounds. The current aura set was designed for the dark theme and will need a separate palette pass once Light theme exists. Depends on Light theme being built first.

---

## Queued Adjustments

*(None currently queued.)*

---

## Known Bugs

*(None documented in plan.md.)*

---

## Phases 0–7 — Completed

### Phase 0 — Project Setup
- Initialized Vite + React project; installed Recharts, lucide-react, Zustand, Tailwind CSS
- Configured `vite.config.js` GitHub Pages base path via `GITHUB_REPOSITORY` env var
- Set up `.github/workflows/main.yml` deploy on push to main
- Created folder structure: `src/{constants,services,state,hooks,components}` + `docs/`
- Added `CHANGELOG.md` at repo root

### Phase 1 — Data Layer
- Defined bot & snapshot schemas in `src/constants/schema.js`
- Defined metric definitions in `src/constants/metrics.js` (chats / messages / favorites, colors, icons)
- Implemented `storage-service.js` — sole IndexedDB access point
- Implemented Zustand state store and `autosave.js` debounced write service (non-hook, timer survives re-renders)
- Implemented `use-bots.js` access hook and avatar URL normalization helper

### Phase 2 — Manual Entry + Basic Dashboard
- Add/edit/delete bots; manual snapshot entry (date picker, three number fields, scope select)
- Bot list table with name, avatar, latest stats, last-captured timestamp, snapshot count
- Search by name/tag, filter by tag pill, sort by any metric ascending/descending
- Aggregate stat cards over filtered set; empty state when no bots exist

### Phase 3 — Paste-Box Import
- Import modal with paste textarea; parsers for CharSnap copy-button format and batch JSON format
- Auto-match captures to bots by name + normalized avatar URL
- Disambiguation UI for ambiguous matches (the "eight Sampos" problem); "Create new bot" option
- Preview screen before apply; scope warning for non-Total-tab captures

### Phase 4 — Per-Bot Detail + Growth Charts
- Bot detail view (open from row click or "view" button); full snapshot list with per-snapshot delete
- Line chart of three metrics over time (Total-scope only), dual-axis for scale
- Delta-since-last-snapshot per metric; add snapshot / edit meta / delete bot from detail view

### Phase 5 — Multi-Bot Visualizations
- Izumael-style overlay chart (flagship): all bots' cumulative growth on one chart, one line per bot, legend, hover highlight
- Top Characters history view: replay past leaderboards by ranking snapshot deltas; day picker, ranked list, clickable to detail
- Daily/weekly/monthly/all-time gain views derived from Total snapshots
- Tag-based aggregate view: sum metrics across all bots sharing a tag
- Configurable ranking chart: top N bots by any metric; tab/dropdown view switching

### Phase 6 — Polish + Share-Readiness
- First-time user empty state; onboarding tooltip for the import box
- About page rendering `CHANGELOG.md` entries; README with screenshots
- JSON backup/import (full data export and restore); reset button with double-confirm
- Mobile-decent layout; favicon and page title
- Dark theme: cool-slate palette, CSS token system (`[data-theme]` architecture), Quicksand/Inter fonts, aura colors (shipped 2026-05-17)

### Phase 7 — Userscript
Shipped 2026-05-16 (v1.0–v1.4), polished through v1.8 (2026-05-17). Lives in `userscript/charsnap-capture.user.js`.
- Reads DOM of manually-opened stats modals; does not auto-open modals
- Refuses to capture if not on the Total tab; warns user rather than queuing bad data
- Captures one bot at a time; outputs JSON to clipboard for paste-import into the main app
- Floating HUD: queue count, Copy queue button, two-step Clear confirm
- Does not share storage with the main app (different origins); clipboard → paste-import is the handoff
- Personal use only until cleared with CharSnap team for wider distribution
