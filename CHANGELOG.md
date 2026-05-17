# Changelog

## 2026-05-16 (Phase 7, v1.6)

### Changes
- Userscript: floating HUD pill is now draggable. Click-and-drag from any non-button area to reposition it anywhere on screen. Cursor shows grab/grabbing feedback. Position is saved via GM_setValue and restored on page reload. Dragging is threshold-based (4 px of movement) so a normal click never accidentally starts a drag. The widget is constrained to the viewport so it can't be lost off-screen. A "Reset position" button in the expanded panel snaps it back to the default bottom-right corner.

---

## 2026-05-16

### Fixes
- Import: avatar was not saved when creating a new bot from a userscript capture. The `avatarUrl` field was used for matching existing bots but was never passed into `createBot()`, leaving `bot.avatar` null after import. Fixed by threading `avatarUrl` through to the bot record.
- Userscript (v1.5.1): "Captured X. Undo" toasts moved to the bottom-left corner (pill stays bottom-right). Eliminates overlap when the pill expands upward and removes the z-index ordering dependency between the two injected elements.

---

## 2026-05-16 (Phase 7, v1.5)

### Fixes
- Userscript: HUD pill and toast container are now appended to `<html>` instead of `<body>`, making them siblings of CharSnap's React root rather than descendants of it — this escapes any stacking context the page body creates. Positioning styles are applied as inline `!important` declarations so framework CSS cannot override them. A MutationObserver re-injects the HUD if it is ever evicted from the DOM by a React re-render.

---

## 2026-05-16 (Phase 7, v1.4)

### Changes
- Userscript: floating HUD redesigned as a collapsible widget. Collapsed state is a small pill (📊 N captures queued) pinned to the bottom-right corner; clicking it opens an expanded panel. Panel shows the Auto ON/OFF toggle, an Export queue button (copies JSON to clipboard), and a Clear button. After Export, the panel prompts "Clear the queue now?" with Yes/Keep so you can clean up in one flow. When the queue is empty the pill shows "📊 0 captures" in a muted style so the widget stays discoverable without being intrusive.

---

## 2026-05-16 (Phase 7, v1.3)

### Fixes
- Userscript: auto-switch now tries two techniques before giving up. Primary: full PointerEvent chain (pointerdown → pointerup → click). Fallback at ~1.5 s: keyboard activation (focus + Enter keydown) — Radix tabs are keyboard-accessible by design, so this often succeeds when pointer dispatch is ignored. The "Click the Total tab" hint is now deferred to ~3 s (after both techniques have had time to run) rather than appearing immediately at 1.5 s.

---

## 2026-05-16 (Phase 7, v1.2)

### Fixes
- Userscript: programmatic tab switch now dispatches a full `pointerdown → pointerup → click` PointerEvent chain instead of a bare `.click()` — Radix UI tab components listen on `pointerdown` and were silently ignoring `.click()`.
- Userscript: capture no longer depends on the programmatic switch succeeding. A `MutationObserver` watches for the Total tab's `data-state` to become `"active"` (regardless of what caused it), so the capture fires even if the script's click was ignored and the user clicked manually instead. A hint toast appears after 1.5 s if the tab still hasn't switched, telling the user to click Total themselves.

---

## 2026-05-16 (Phase 7, v1.1)

### Fixes
- Userscript: Total-tab timeout increased from 2 s to 5 s; retries the tab click once at ~1.5 s before giving up; error message now includes which tab was actually active for easier debugging.

### Changes
- Userscript: replaced the manual Capture button with auto-capture on modal open — when a stats modal opens the script automatically switches to Total and queues the capture.
- Userscript: toast notification ("Captured [name]. Undo") replaces in-button feedback for auto mode; Undo removes that specific capture from the queue.
- Userscript: deduplication by normalized avatar URL — re-opening the same bot's modal in the same session is silently skipped with a "Already captured — skipped" toast.
- Userscript: "Auto: ON/OFF" toggle added to the floating HUD (default ON); when OFF, the original manual Capture button reappears in the modal header.

---

## 2026-05-16 (Phase 7)

### Additions
- Tampermonkey userscript (`userscript/charsnap-capture.user.js`) — injects a "Capture" button into CharSnap stats modals opened manually by the user. Automatically switches to the Total tab if needed, reads bot name, avatar, and the three stat values (plus optional solo/group message breakdown), and queues the capture locally. A floating HUD shows the queue count and lets you copy the full queue as JSON (ready to paste into the app's Import modal) or clear it with a two-step confirm.

---

## 2026-05-16 (Phase 6)

### Additions
- Enhanced empty state — richer first-time lander with feature-highlight cards and a two-step "how to start" guide; Import paste is now the primary CTA.
- Onboarding banner — dismissible tip bar that appears for users who already have bots, pointing to the Import button; stored in localStorage so it only shows once.
- Data & Backup modal (⚙ icon in header) — export full JSON backup, import from backup file (with replace-all confirmation), and reset all data (two-step confirm).
- What's New modal (newspaper icon in header) — renders this changelog in-app via Vite raw import; no external dependency.
- Tab bar now scrolls horizontally on narrow screens.
- README with project description, feature list, screenshot placeholders, and quick-start guide.

---

## 2026-05-16 (Phase 5c)

### Additions
- Tags tab — horizontal bar chart summing Threads, Messages, or Favorites across all bots sharing each tag; shows bot count per tag in the tooltip; inherits search and tag filter.

---

## 2026-05-16 (Phase 5b)

### Additions
- Gains tab — rolling-window gain ranking: pick 7d / 30d / 90d / All Time and a metric; shows bots sorted by how much they gained in that window; baseline is the snapshot just before the window opened (or oldest available); click a bar to open bot detail.
- History tab — day-picker snapshot gain ranking: pick any date; shows each bot's gain between their two most recent Total snapshots at or before that date; defaults to the date of the latest Total snapshot in the current filter; click a bar to open bot detail.

---

## 2026-05-16 (Phase 5a)

### Additions
- View switcher — three tabs (Table / Timeline / Ranking) above the filter bar; search and tag filter apply to all three views.
- Timeline view — overlay line chart with one line per bot; pick Threads, Messages, or Favorites; toggle between absolute totals and growth-from-first-snapshot (relative); 20-color bot palette; sparse series connected across gaps; clicking a bot name in the legend opens its detail view.
- Ranking view — horizontal bar chart showing top N bots by any metric; configurable N (10 / 15 / 25 / 50 / All); clicking a bar opens that bot's detail.

---

## 2026-05-16 (Phase 4)

### Additions
- Per-bot detail view — click any row to open; shows metric cards, growth chart, and full snapshot history.
- Growth chart — line chart of all three metrics over time using only Total-scope snapshots; dual Y-axis so messages (much larger scale) doesn't squash threads and favorites.
- Delta display — each metric card shows gain/loss since the previous snapshot, with the date it was captured.
- Snapshot management — add snapshots inline from the detail view; delete individual snapshots with a confirm step.
- Bot management from detail view — edit name/tags inline; delete bot (with confirm) without returning to the table.

---

## 2026-05-16

### Additions
- Phase 3: Paste-box import — paste CharSnap copy-button output to add a snapshot; JSON format (for future userscript) supports batch captures with auto-matching by avatar URL; disambiguation picker for ambiguous name matches; scope warning for non-Total captures.
- Phase 2: Full dashboard — bot list table with sort, search, and tag filter; stat cards for totals; Add Bot modal (with optional initial snapshot and shorthand number parsing); Add Snapshot modal per bot; Edit bot name/tags modal; inline delete confirm; empty state.
- Phase 1: Data layer — IndexedDB persistence, Zustand store, debounced autosave, use-bots hook, avatar URL normalization, bot/snapshot schemas.
- Phase 0: Initial Vite + React scaffolding, Tailwind CSS v4, Zustand, GitHub Pages deploy pipeline.
