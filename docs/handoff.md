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

## Recent App Changes (2026-05-22)

- **BotDetailModal — Report Card 7-day window:** Added `momentum7` alongside `momentum30` in the report card `useMemo`. JSX updated to render both windows side by side when data exists; each window requires ≥2 snapshots within it. Fixed the label/value gap bug (was `flex-1` + `justify-between` stretching the block; now `shrink-0` + `flex gap-3`).
- **GainsChart — 24h window:** Added `{ label: '24h', days: 1 }` as first option in `WINDOWS`; default `windowDays` changed from `30` to `1`.

## Phase 8 App Changes (2026-05-21 — PR A: new chart tabs)

- **6 new chart tabs added** (tab bar now has 14 tabs total, horizontally scrollable):
  - **Velocity** (`VelocityChart.jsx`) — point-to-point growth rate over time (metric/day). Line chart, same shape as OverlayChart. Top N + metric selectors.
  - **Breakdown** (`BreakdownChart.jsx`) — stacked bar: solo vs. group messages per bot. Absolute or 100% normalized. Sort by total/solo%/group%. Empty states when no breakdown data.
  - **Trending** (`TrendingChart.jsx`) — "hot right now" card grid. Ranked by recent gain (7/14/30d). Momentum arrow per bot. Avatar thumbnails.
  - **Bump** (`BumpChart.jsx`) — rank-over-time line chart (Y-axis = rank #1 at top, inverted). Shows bots crossing each other. Top N + metric selectors.
  - **Lifespan** (`LifespanChart.jsx`) — custom SVG Gantt-style chart. Each bot = horizontal bar from first to last snapshot, with dots per snapshot. Sort options. Hover shows date range in header.
  - **Heatmap** (`HeatmapChart.jsx`) — Pearson correlation matrix (7×7 or 5×5 if no breakdown data). Color-coded −1→+1. Hover cells for labels.
- All 6 new charts have graceful empty states with context-specific messages.
- `src/constants/views.js` — 6 new entries added (14 total).
- `src/App.jsx` — 6 new chart imports + render blocks.
- PR B (upgrades to Scatter/Tags/Timeline) and PR C (bot detail report card) still pending.

## Phase 8 App Changes (2026-05-21 — PR B: chart upgrades)

- **Scatter → Bubble chart** (`ScatterPlot.jsx`):
  - Added "Size" axis picker — bubble radius proportional to any of the 3 metrics (4–20px range).
  - Added "By bot / By tag" color toggle — recolors bubbles by each bot's first tag instead of aura.
  - Tooltip shows tag when present; footer text names the active size metric.
  - Removed `<Cell>` in favor of a custom `shape` renderer (SVG `<circle>` with transparent hit area).
- **Tags → Detail mode** (`TagsChart.jsx`):
  - New "Summary / Detail" toggle in header. Summary = existing bar chart; Detail = card grid.
  - Each detail card: tag name (colored by bar color), bot count, total + avg-per-bot stats (messages, threads, favorites), 30-day message gain (green, only shown when > 0), and a 100×100 mini spider chart of the average normalized stat profile across all bots in the tag.
  - Spider normalization uses global maxima across all eligible bots, so shapes are comparable across tags.
  - Metric picker in header sorts both Summary and Detail views by that metric.
  - Mini spider is a local copy of the SpiderChart `MiniSpider` function, with an optional `showLabels` prop (labels hidden for size=100 cards).
- **Timeline → Cohort mode** (`OverlayChart.jsx`):
  - New "Calendar / Cohort" toggle. Calendar = existing date-based X axis. Cohort = X axis shows "Day N" (days since each bot's first Total-scope snapshot).
  - In Cohort mode the data is rebuilt with per-bot day offsets so lines are aligned to their own start dates rather than calendar dates. Tooltip shows "Day N" label. X axis scale switches to `linear`.
## Phase 8 App Changes (2026-05-21 — PR C: report card)

- **BotDetailModal → Report Card section** (`BotDetailModal.jsx`):
  - New collapsible "Report Card" panel between metric cards and growth chart (collapsed by default, click to toggle).
  - **Percentile ranks** — three progress bars (one per metric) each labeled "#N of M · top X%", computed against all bots in the current `sorted` array that have at least one Total snapshot.
  - **30-day momentum** — shows gain for each metric over the last 30 days (needs ≥ 2 Total snapshots in window; hidden if not enough data).
  - **Solo/Group donut** — 2-slice recharts PieChart with count + percentage labels; only rendered when the latest Total snapshot has messagesGroup data.
  - **Snapshot streak** — consecutive days (backward from most recent) with at least one Total snapshot; hidden when streak < 2.
  - `App.jsx` now passes `sorted` array as `allBots` prop to `BotDetailModal` for percentile computation.

## Recent App Changes (2026-05-21)

- **Spider chart:** Treemap tab replaced with Spider. Gallery mode shows a mini-spider per bot (grid); Single mode overlays up to 4 bots on one radar with 6 axes (solo msgs, group msgs, threads, favorites, avg msgs/day, favs per 1K). Selected bots persist across tab navigation via state lifted to App.jsx. `TreemapChart.jsx` is no longer imported or used (file remains on disk but is dead code — can be deleted).
- **History chart date arrows:** ‹ / › buttons flank the date picker for single-day stepping.

## Known Issue (workaround, not a code fix)

Bots imported before the import-side avatar mapping fix landed (Phase 7 late) don't have stored avatar URLs and display as letter-initials in the table. To fix retroactively: re-capture those bots via the userscript and re-import — the import will match them by name and update existing records.

---

# Polish Roadmap — Status

## 1. Aesthetic Unification

**Resolved 2026-05-17 — revised approach.** Rather than unifying to the warm stone/amber palette, the color system was replaced entirely with a cool-slate dark theme (sky accent `#0ea5e9`). Warm stone and amber are gone from all components.

**What shipped:**
- CSS token architecture via Tailwind v4 `@theme` — 40+ semantic tokens (surfaces, borders, text, accent, per-metric, 5 auras)
- Dark theme is the default at `:root`. Future themes scope via `[data-theme="..."]` overrides.
- Quicksand (body) via @fontsource; Manrope/Lora/Outfit/Poppins via Google Fonts (replaces Geist + JetBrains Mono)
- Per-bot aura glow rings on avatars; aura colors carry through to overlay chart lines
- Metric-tinted stat cards with top-to-bottom gradient overlays

**Follow-up fix (2026-05-19) — render variance:**
Stat cards were rendering noticeably different between page reloads — some refreshes showed vivid/saturated gradients with bright avatar rings, others showed flat/subtle gradients. Root cause: the gradient token values used `color-mix()`, which LightningCSS (Tailwind v4's compiler) automatically wraps in `@supports (color:color-mix(in lab, red, red))`, generating two different compiled rules — a full-color vivid fallback for older browsers and a 35% blended version for modern ones. Fixed by replacing all four gradient tokens with `rgba()` equivalents, which compiles to a single consistent rule with no `@supports` split. Also removed unused Inter @fontsource imports (~150 kB) and deduplicated the Quicksand font request (was being loaded twice — once from @fontsource bundle, once from Google Fonts URL).

**Second-round fix (2026-05-22) — render variance continued:**
The 2026-05-19 fix only covered four CSS gradient token variables. The same `@supports` wrapping was being generated for every Tailwind `/N` opacity-modifier class across the codebase — 19 additional blocks in the compiled CSS. Three newly-identified symptoms: table row banding gone entirely (the alternating row highlight in the bot table, driven by `.row-banded`, simply did not paint), per-metric column tints duller than expected (the green/purple/pink shading on stat table columns), and stat tile gradient overlays barely visible (the overlay on each stat card). Fixed by auditing all 20 `@supports (color:color-mix…)` blocks in the compiled bundle, tracing each one back to its source Tailwind class (e.g. `bg-black/70`, `hover:border-accent/40`, `focus:border-accent/50`, `text-text-muted/70`, `bg-surface-alt/30`, `bg-red-500/20`), defining pre-baked `rgba()` utility classes outside any `@layer` in `index.css`, and replacing every `/N` class in JSX across 26 files. Compiled output now has 1 remaining `@supports` block — a Tailwind internal preflight rule for `::placeholder` text, which is overridden by the existing unlayered `input::placeholder` rule and has no visible impact on tracker UI.

**5 remaining themes (queued, not in scope for current work):**
- Light, Yume Kawaii, Ocean, Dark Academia, Synthwave
- Each needs: token value overrides, theme-switcher UI in Settings, possible per-theme texture treatment
- Light-mode aura palette also deferred

## 2. Metric Ordering: Messages First

**Resolved 2026-05-17.** `METRICS` array reordered in `src/constants/metrics.js` — order is now Messages → Threads → Favorites everywhere (stat columns, chart pickers, tooltips, dropdowns).

## 3. Chart White Box Artifact

**Re-resolved 2026-05-20.** First fix (2026-05-17) only targeted `.recharts-surface` and `.recharts-wrapper:focus`, missing the individual SVG child elements (bar rectangles) that receive focus on click. Updated global CSS to also suppress `outline` on `.recharts-surface:focus` and `.recharts-wrapper svg *:focus`. Affects ranking, history, gains, and tags charts.

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

### v1.16 (2026-05-20) — Fix wrong message count; export queue UI reset

- **Messages reading wrong value:** CharSnap's DOM puts the solo count in the large stat element; total is now derived as `solo + group` from the breakdown when present. Breakdown regex no longer requires closing `)` (tolerates ℹ️ icon inside parens). Among multiple matches, highest-total wins to avoid false positives.
- **Export queue "Clear?" UI reverting:** profile-gate `MutationObserver` was watching HUD-internal DOM changes; it now ignores mutations inside `hudEl`/`restoreEl`, so the "Clear?" view persists until the user acts.

### v1.15 (2026-05-20) — Fix zero-stat captures

- `waitForStats` now waits for at least one non-zero stat before resolving. Previously it resolved immediately when the bot name appeared in the h2, even though CharSnap renders `0` placeholder values in the stat elements before real data arrives — causing captures to record all-zero stats.
- After 2-second timeout, resolves with the current DOM reading regardless (handles genuinely zero-stat bots with no activity).

### v1.14 (2026-05-19) — Faster tab switch

- Keyboard-activation fallback reduced from 1 500 ms to 50 ms after initial pointer-click attempt.
- "Click Total manually" prompt reduced from 3 000 ms to 1 500 ms.
- `dispatchPointerClick` now passes `isPrimary: true, pointerId: 1` to satisfy Radix UI event validation.

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

### v2.2 (2026-05-20) — Settings panel

- Settings view behind gear icon: default state on load (Pill/Expanded/Hidden), auto-capture mirror toggle, reset HUD position, reset HUD size, clear all settings (two-step confirm, queue preserved), wipe captures queue (two-step confirm, settings preserved).
- `DEFAULT_STATE_KEY` GM storage key for default-state pref.
- `getDefaultState()`, `resetHudPosition()`, `resetHudSize()`, `clearAllSettings()` helper functions.
- Initial page-load applies default-state pref in `renderHUD()` — sets `hudExpanded = true` for 'expanded', sets `HUD_HIDDEN_KEY = '1'` for 'hidden' (unless force-show active).
- `settingsOpen` module state; collapse and hide both reset it to false.
- Settings gear icon no longer disabled; "Settings (coming soon)" tooltip updated to "Settings".

### v2.8 (2026-05-22) — Fix modal close via React props

- `dispatchPointerClick` and `.click()` are both synthetic events that Radix UI ignores. Added `closeDialog(dialog)` helper that reads the close button's React props directly from the DOM (`__reactProps$...` key) and calls `onClick` without going through event dispatch at all.
- Also fixed the auto-capture path, which still had the old broken `aria-label` selectors from v2.4.

### v2.7 (2026-05-22) — Fix close button dispatch method

- `.click()` is also a synthetic event that Radix UI ignores. Switched to `dispatchPointerClick()` (already used for tab switching) which fires the full pointer event sequence Radix UI responds to.

### v2.6 (2026-05-22) — Fix close button selector

- Previous selectors targeted `aria-label="Close"` and `data-radix-dialog-close`, but CharSnap's close button has neither — it just has the text "Close". Switched to finding the button by text content.

### v2.5 (2026-05-22) — Fix modal auto-close for auto-capture mode

- v2.3 and v2.4 added the close logic only to the manual Capture button path. Auto-capture mode (the default) has no button — it captures silently when you open the modal — so the close never ran. Added the same close-button logic to `performAutoCapture`'s `doCapture` function.

### v2.4 (2026-05-22) — Fix modal auto-close (click close button directly)

- v2.3's Escape keydown approach didn't work because Radix UI ignores synthetic keyboard events (`isTrusted: false`). Switched to finding and clicking the actual close button (`button[aria-label="Close"]` / `[data-radix-dialog-close]`). Logs all dialog buttons to console if no selector matches, so the right selector can be identified.

### v2.3 (2026-05-22) — Auto-close modal after capture

- After a successful capture, the modal now closes automatically after 0.8 s (long enough to see the ✓ Captured flash). Implemented by dispatching an `Escape` keydown event on `document` from the success path of the capture button click handler. Duplicate and error paths are unaffected — the modal stays open so the user can see what happened.

### Still Pending

- Userscript `@updateURL` / `@downloadURL` auto-update metadata — already added in v2.1 header; no remaining work.
- `isOwnProfile()` selector fix — deferred until console diagnostic output (Ctrl+Shift+Alt+H) shows what CharSnap's current profile page contains.

---

## 6. Stat-Card / Dashboard Visual Refresh

**Resolved 2026-05-18.** Applied locked design tokens from sandbox: Manrope/Lora/Outfit/Poppins typography, top-to-bottom gradient overlays on stat cards, column-accented table numbers (Manrope 700, per-column accent color), row banding composition fix through colored columns. Avatar glow preserved. Tokens live in `src/index.css` (`:root` for typography/gradients/tints, `@theme` for colors). Font faces loaded via Google Fonts in `index.html`.

---

## What's Left

1. **Favicon and page `<title>`** — small, unblocking
2. **`isOwnProfile()` selector fix** — deferred until console diagnostic (Ctrl+Shift+Alt+H) shows what CharSnap's current profile page contains; the Ctrl+Shift+Alt+H force-show bypass is the workaround in the meantime
3. **Theme follow-up** — 5 additional themes (Light, Yume Kawaii, Ocean, Dark Academia, Synthwave); requires theme-switcher UI; deferred
4. **Design sandbox** — moved to a separate repo for usage-budget isolation; no longer present in this codebase.

## Recently Shipped (2026-05-20 — v2.2 settings panel)

- Gear icon in expanded HUD header now opens a settings view (was `disabled`).
- Settings: default state on load (Pill/Expanded/Hidden), auto-capture toggle mirror, Reset position, Reset size, Clear all settings (two-step confirm), Wipe captures queue (two-step confirm).
- `DEFAULT_STATE_KEY = 'charsnap_default_state'` — new GM storage key; default is `'pill'`.
- On initial page load, `renderHUD()` applies the default-state pref before first render.
- `clearAllSettings()` wipes all non-queue GM keys and resets in-memory HUD state; queue is explicitly excluded.
- `← Back` button returns from settings to the captures list; collapse and hide both reset `settingsOpen`.

## Recently Shipped (2026-05-20 — v2.1.1 profile gate fix)

- `Ctrl+Shift+Alt+H` (Cmd on Mac) forces the HUD visible on any CharSnap page, bypassing the `isOwnProfile()` profile gate. Persists across page navigations via `GM_setValue`. Clicking × clears the override.
- Pressing the shortcut logs diagnostic info to the browser console: current URL, `isOwnProfile()` result, and all visible button texts — to identify why the gate may be failing.
- Root cause: `isOwnProfile()` detects "Announce" button or analytics icon; if CharSnap changed their profile UI those selectors stop matching. Gate detection fix deferred until console logs show what's actually present.

## Recently Shipped (2026-05-20 — v2.1 part 2)

- Userscript v2.1: captures list in HUD body — scrollable, avatar thumbnails (letter-initials fallback), bot name, relative timestamp / scope / stat summary per row, positive-delta badges when same bot captured multiple times
- Per-row × remove with 8s Undo toast (re-inserts into queue via undoBuffer)
- Inline JSON preview: click row → expands below row, click again to collapse; no modal
- Search/filter input (toolbar, above list): case-insensitive substring match, preserves input focus on queue updates
- Multi-select mode: Select button → checkboxes on rows, footer shows count / All / Remove / Export / Cancel; Remove N and Export N both support single Undo toast

## Recently Shipped (2026-05-20 — v2.0 part 1)

- Userscript v2.0: three-state HUD model (Pill / Expanded / Hidden), new header with icon buttons (collapse, settings placeholder, hide), sticky footer action bar with Export + Clear, confirm states moved to footer, "Reset position" removed from body (moves to settings in part 3), default expanded size 360×480, min size 280×360

## Recently Shipped (2026-05-20)

- Zero-stat import fix: captures with all-zero stats (brand-new bots) no longer silently rejected by the JSON parser
- Userscript v1.15: `waitForStats` no longer resolves on CharSnap's placeholder zeros — waits for non-zero values, with 2s fallback for genuinely empty bots
- Dashboard scope-contamination fix: all stat/delta/ranking computations now read from Total-scope snapshots only; mixed-scope data no longer produces wrong totals or absurd values in stat cards
- Import match "Closest match" ranking now compares against Total-scope message counts only

## Recently Shipped (2026-05-19)

- Import match dropdown redesign (custom dropdown with PFP thumbnails, metadata rows, type-ahead filter, smart ranking by message-count proximity, "Closest match" badge)
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
