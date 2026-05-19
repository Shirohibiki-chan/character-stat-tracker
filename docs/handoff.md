# Handoff: Phases 0–7 → Polish Roadmap

## Where We Are

Phases 0–7 from `docs/plan.md` are complete. Polish roadmap (this doc) is mostly done as of 2026-05-17. Live app at `https://shirohibiki-chan.github.io/character-stat-tracker/`. The Tampermonkey userscript (v1.8) on `charsnap.ai` captures bot stats with effectively one click — open a bot's stats modal → auto-captures to a queue → export queue as JSON → paste into the tracker's import box.

## Repo Snapshot

- `src/` — React app (constants → services → state → hooks → components)
- `userscript/charsnap-capture.user.js` — Tampermonkey userscript (v1.8)
- `docs/` — architecture, data model, glossary, plan, charsnap-state, reference artifact
- `CLAUDE.md` — project rules
- `CHANGELOG.md` — phase-by-phase log

## What Phases 0–7 Delivered

- **Phase 0:** Vite + React + Tailwind v4 + Zustand scaffold, GitHub Pages CI deploy
- **Phase 1:** IndexedDB-backed data layer with autosave, schema factories, avatar normalization
- **Phase 2:** Manual entry dashboard — table, sort, filter, search, stat cards, Add/Edit/AddSnapshot modals
- **Phase 3:** Paste-box import — parser for CharSnap copy-button text, parser for batch JSON, avatar-URL-keyed disambiguation, preview-before-apply
- **Phase 4:** Per-bot detail modal with dual-axis line chart of Total snapshots
- **Phase 5:** Multi-bot visualizations — izumael-style overlay chart, configurable ranking chart, daily/weekly/monthly gain views, top-characters history, tag aggregates
- **Phase 6 (complete):** Enhanced empty state, onboarding banner, Data & Backup modal (export JSON / import from file / reset all data), What's New modal (renders changelog in-app), README, horizontal tab bar scroll; mobile layout finalized 2026-05-17
- **Phase 7:** Tampermonkey userscript — auto-capture on Total tab activation, draggable floating queue pill, toast notifications, JSON export to clipboard; v1.8 (2026-05-17) added strict on-load position clamp and Ctrl+Shift+Alt+R pill recovery shortcut

## Known Issue (workaround, not a code fix)

Bots imported before the import-side avatar mapping fix landed (Phase 7 late) don't have stored avatar URLs and display as letter-initials in the table. To fix retroactively: re-capture those bots via the userscript and re-import — the import will match them by name and update existing records.

---

# Polish Roadmap — Status

## 1. Aesthetic Unification

**Resolved 2026-05-17 — revised approach.** Rather than unifying to the warm stone/amber palette, the color system was replaced entirely with a cool-slate dark theme (sky accent `#0ea5e9`). Warm stone and amber are gone from all components.

**What shipped:**
- CSS token architecture via Tailwind v4 `@theme` — 40+ semantic tokens (surfaces, borders, text, accent, per-metric, 5 auras)
- Dark theme is the default at `:root`. Future themes scope via `[data-theme="..."]` overrides.
- Quicksand (body) + Inter (numerals) via @fontsource replace Geist + JetBrains Mono
- Per-bot aura glow rings on avatars; aura colors carry through to overlay chart lines
- Metric-tinted stat cards (green/indigo/pink backgrounds)

**5 remaining themes (queued, not in scope for current work):**
- Light, Yume Kawaii, Ocean, Dark Academia, Synthwave
- Each needs: token value overrides, theme-switcher UI in Settings, possible per-theme texture treatment
- Light-mode aura palette also deferred

## 2. Metric Ordering: Messages First

**Resolved 2026-05-17.** `METRICS` array reordered in `src/constants/metrics.js` — order is now Messages → Threads → Favorites everywhere (stat columns, chart pickers, tooltips, dropdowns).

## 3. Chart White Box Artifact

**Resolved 2026-05-17.** Recharts default focus outline removed via global CSS.

## 4. Deferred Phase 6 Items

All resolved as of 2026-05-16–17:

- ~~Better empty state for first-time users~~ — done 2026-05-16 (feature highlight cards, two-step "how to start" guide)
- ~~Onboarding tooltip on the Import button~~ — done 2026-05-16 (dismissible banner pointing to Import; localStorage-persisted)
- ~~About / lander page rendering `CHANGELOG.md` entries~~ — done 2026-05-16 (What's New modal, Vite `?raw` import)
- ~~`README.md` at repo root~~ — done 2026-05-16
- ~~Export full data (JSON download) for backup~~ — done 2026-05-16 (Data & Backup modal, ⚙ icon in header)
- ~~Import from backup file~~ — done 2026-05-16 (same modal)
- ~~Reset-all-data button with two-step confirm~~ — done 2026-05-16 (same modal)
- ~~Mobile-decent layout audit and patching~~ — done 2026-05-17 (table column hiding on narrow screens, chart Y-axis width, header scaling, modal max-height)
- **Favicon and page `<title>`** — still pending

## 5. Userscript Polish

### Draggable Pill Bounds / Recovery — Resolved v1.5–v1.8

- **v1.5** (2026-05-16): HUD appended to `<html>` instead of `<body>` to escape page stacking context; `!important` inline styles; MutationObserver re-injection
- **v1.6** (2026-05-16): Draggable pill with viewport clamp during drag; "Reset position" button in expanded panel; `GM_setValue` position save/restore
- **v1.7** (2026-05-17): On-load position re-clamp (soft — keeps 10px visible via `clampPos`); pill position re-clamped on page load after window resize
- **v1.8** (2026-05-17): Strict on-load visibility check — any pixel offscreen discards saved position and falls back to default bottom-right; Ctrl+Shift+Alt+R (Cmd on Mac) keyboard shortcut to force-reset pill position
- **v1.9** (2026-05-17): `isStatsModal` gate in `onDialogOpen` — checks for `button[title="Copy stats"]` before doing anything; suppresses nuisance toasts on character cards, share dialogs, and other unrelated modals
- **v1.10** (2026-05-17): `NON_BOT_STATS_MODAL_TITLES` blocklist added to `isStatsModal`; Creator Analytics modal excluded by h2 title — resolves bug 3

### v1.13 (2026-05-19) — Faster auto-capture

- Replaced two fixed 200 ms waits with a `waitForStats()` function that resolves the instant stat DOM elements are present and populated — using MutationObserver + immediate check + 2 s timeout fallback.
- Applies to both auto-capture mode (no fixed delay after tab switch) and manual Capture button mode (no fixed delay after `waitForTotalTab` resolves).
- Net result: capture toast appears as soon as the browser finishes rendering the Total tab's numbers, not 200 ms after.

### v1.12 (2026-05-19) — Toast anchor to HUD box

- **Toast repositioning:** all userscript toasts now render inside the capture box, overlaying its bottom edge (~8 px margin). Toasts adapt to box width when resized.
- **Stacking / cap:** up to 3 toasts stack vertically (newest at bottom); oldest is removed when a 4th arrives.
- **Suppress + dismiss on hide:** toasts suppressed when box is hidden (×) or collapsed to pill; existing toasts dismissed immediately on hide, collapse, and profile-gate-off (navigate away).
- **Auto-dismiss:** 4 s (was 5 s).

### v1.11 (2026-05-19) — Profile gate, resize, hide/restore

- **Profile gate:** HUD only visible on own creator profile page (gates on "Announce" button / analytics icon). SPA navigation handled via URL polling + debounced MutationObserver.
- **Resizable:** bottom-right corner drag grip; min 280×200 px; size persisted via `GM_setValue`.
- **Hide/restore:** header × hides HUD entirely; small 📊 restore pill in corner; state persisted; restore pill respects profile gate.
- **Position persistence:** already existed from v1.6; unchanged.

### Still Pending

- `@updateURL` and `@downloadURL` metadata in the userscript header pointing at the raw GitHub URL — needed for Tampermonkey auto-update without manual re-install

---

## 6. Stat-Card / Dashboard Visual Refresh

**Resolved 2026-05-18.** Applied locked design tokens from sandbox: Manrope/Lora/Outfit/Poppins typography, top-to-bottom gradient overlays on stat cards, column-accented table numbers (Manrope 700, per-column accent color), row banding composition fix through colored columns. Avatar glow preserved. Tokens live in `src/index.css` (`:root` for typography/gradients/tints, `@theme` for colors). Font faces loaded via Google Fonts in `index.html`.

---

## What's Left

1. **Favicon and page `<title>`** — small, unblocking
2. **Userscript `@updateURL` / `@downloadURL`** — one-line metadata addition
3. **Theme follow-up** — 5 additional themes (Light, Yume Kawaii, Ocean, Dark Academia, Synthwave); requires theme-switcher UI; deferred
4. **Design sandbox** — moved to a separate repo for usage-budget isolation; no longer present in this codebase.

## Recently Shipped (2026-05-19)

- Tag filter from Tags chart (click tag/bar → navigate to table with filter applied)
- Manual PFP override in bot detail view (URL / file upload; `avatarIsManual` lock; pencil badge)
- Bulk tag editing (multi-select mode, Add/Remove tags action bar, persistent across pages)
- Pagination + grid view (25/50/100 page size, List/Grid toggle, both localStorage-persisted)

## Process Notes

- Read `CLAUDE.md` first — architecture rules, layer order, naming conventions, don't-do's
- Read `docs/charsnap-state.md` for CharSnap UI specifics if any userscript work comes up
- Commit and push after each meaningful change so the GitHub Pages deploy fires automatically
- Show plan before executing — user approves before code lands
- User is non-technical — explain choices in plain language, not just code
- Update `docs/plan.md`, `docs/handoff.md`, and `CHANGELOG.md` when shipping changes (see CLAUDE.md `## Tracking Docs`)

## Not In Scope (policy boundary)

- Anything that reaches CharSnap's servers programmatically (no API calls, no fetch interception, no auto-walking through modals)
- Multi-user features, accounts, shared state — this is a single-user browser-only tool
