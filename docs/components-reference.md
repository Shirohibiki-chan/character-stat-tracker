# Components Reference

## Component Folders (`src/components/`)

| Folder | Purpose |
|--------|---------|
| `charts/` | Data visualization panels — the full-width content shown when any non-Table view tab is active |
| `dashboard/` | Non-chart elements of the main dashboard surface — the table, stat cards, and banner/empty-state elements |
| `modals/` | Full-screen overlay dialogs and the base modal wrapper they all use |

---

## Feature Map — What You See → Where It Lives

### Charts (`src/components/charts/`)

| What you see | File |
|---|---|
| Rolling-window gain ranking bar chart (Gains tab) — pick 7d / 30d / 90d / All Time and a metric; bots sorted by how much they gained in that window | `src/components/charts/GainsChart.jsx` |
| Day-picker leaderboard bar chart (History tab) — pick a past date; shows each bot's gain between their two most recent Total snapshots at or before that date | `src/components/charts/HistoryChart.jsx` |
| Multi-bot overlay line chart (Timeline tab) — one line per bot on a shared time axis; metric picker; absolute vs. growth-from-first toggle; per-bot aura-color lines; clickable legend opens bot detail | `src/components/charts/OverlayChart.jsx` |
| Top-N ranking bar chart (Ranking tab) — pick any metric and N (10 / 15 / 25 / 50 / All); click a bar to open bot detail | `src/components/charts/RankingChart.jsx` |
| Tag aggregate bar chart (Tags tab) — sums a chosen metric across all bots sharing each tag; bot count shown in tooltip | `src/components/charts/TagsChart.jsx` |

### Dashboard (`src/components/dashboard/`)

| What you see | File |
|---|---|
| Main bot table with sortable columns (Bot, Messages, Threads, Favorites), row-level edit / add-snapshot / delete actions, alternating row shading, hidden columns on narrow screens | `src/components/dashboard/BotTable.jsx` |
| First-time empty state shown when no bots exist — feature highlight cards and a two-step "how to start" guide with Import and Add Bot CTAs | `src/components/dashboard/EmptyState.jsx` |
| Dismissible tip banner shown to returning users who have bots — points to the Import button; dismissal stored in `localStorage` so it only shows once | `src/components/dashboard/OnboardingBanner.jsx` |
| Individual aggregate stat card — metric-tinted background, icon, large formatted number, full unabbreviated number beneath when value ≥ 1,000 | `src/components/dashboard/StatCard.jsx` |

### Modals (`src/components/modals/`)

| What you see | File |
|---|---|
| "Add bot" dialog — name, optional tags, and optional initial snapshot (three stat fields + scope select) | `src/components/modals/AddBotModal.jsx` |
| "Add snapshot" dialog for a specific bot — date picker, Messages / Threads / Favorites fields, scope select | `src/components/modals/AddSnapshotModal.jsx` |
| "Data & Backup" dialog (⚙ icon in header) — export full JSON backup, import from a backup file with replace-all confirmation, reset all data with two-step confirm | `src/components/modals/BackupModal.jsx` |
| Full bot detail overlay (opens on table row click) — metric cards with delta-since-previous, dual-axis growth chart (Total-scope snapshots only), full snapshot history with per-snapshot delete, inline name/tags editing, delete bot | `src/components/modals/BotDetailModal.jsx` |
| "What's new" modal (newspaper icon in header) — renders `CHANGELOG.md` via Vite raw import as a styled list of dated entries | `src/components/modals/ChangelogModal.jsx` |
| "Edit bot" dialog — name and tags fields; opened from the table row edit button as an alternative to inline editing in BotDetailModal | `src/components/modals/EditBotModal.jsx` |
| Paste-import dialog — textarea for CharSnap copy-button text or batch JSON; per-capture preview rows with bot picker / disambiguation select; scope warning for non-Total captures; Apply button commits all changes | `src/components/modals/ImportModal.jsx` |
| Base modal wrapper used by every dialog above — renders a blurred backdrop, handles Escape-to-close, and shows a "Discard changes?" confirm dialog when `isDirty` is true | `src/components/modals/Modal.jsx` |
