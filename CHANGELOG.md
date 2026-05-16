# Changelog

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
