# CharSnap Stats Tracker — Project Summary

> This file is for pasting into a regular Claude chat to provide project context when planning features. Last updated: 2026-05-18.

---

## What It Is

CharSnap Stats Tracker is a personal dashboard for CharSnap bot creators. It runs entirely in the browser — no backend, no account — and stores all data in IndexedDB. A companion Tampermonkey userscript captures stats from manually-opened CharSnap stat modals and exports them as JSON for paste-import into the tracker.

The tracker provides snapshot history, growth charts, and multi-bot visualizations that CharSnap's own UI doesn't support: an overlay chart with one line per bot, rolling-window gain rankings, a history view that replays any past date's leaderboard, tag-based aggregates, and a configurable ranking chart. All data stays in the user's browser; nothing is sent anywhere.

---

## What The User Sees

**Main dashboard** — a bot table showing each bot's name, avatar, latest stats (Messages / Threads / Favorites), last-captured timestamp, and snapshot count. Above the table: three aggregate stat cards (summed totals across the filtered set). Below the header: a search box, tag-filter chips, and column sort controls. All filter/sort state applies to every view tab.

**Bot detail view** — opens on row click. Shows metric cards with the delta since the previous snapshot (e.g. "+12 K since May 14"), a dual-axis growth chart of all three metrics over time (Total-scope snapshots only), and a full snapshot history list with per-snapshot delete. Bot name/tags can be edited here; bot can be deleted here.

**Timeline tab** (overlay chart) — one line per bot on a shared time axis. Metric picker (Messages / Threads / Favorites); toggle between absolute totals and growth-from-first-snapshot. Each bot line uses that bot's aura color. Clicking a bot name in the legend opens its detail view.

**Ranking tab** — horizontal bar chart of top N bots by any metric. N is configurable (10 / 15 / 25 / 50 / All). Clicking a bar opens bot detail.

**Gains tab** — rolling-window gain ranking: pick 7d / 30d / 90d / All Time and a metric; bots sorted by how much they gained in that window.

**History tab** — day-picker snapshot gain ranking: pick any past date; shows each bot's gain between their two most recent Total snapshots at or before that date. Defaults to the date of the latest Total snapshot in the active filter.

**Tags tab** — horizontal bar chart summing Messages, Threads, or Favorites across all bots sharing each tag. Shows bot count per tag in the tooltip.

**Import modal** — paste CharSnap copy-button output (plain text) or batch JSON from the userscript. Auto-matches captures to existing bots by avatar URL. Shows a disambiguation picker when a name is ambiguous, a "Create new bot" option, and a preview of what will happen for each capture before applying. Warns if captures are from a non-Total tab.

**Userscript HUD** — a collapsible pill pinned to the bottom-right corner of CharSnap pages. Collapsed: shows queue count. Expanded: Auto ON/OFF toggle, Export queue button (copies JSON to clipboard), and a two-step Clear confirm. Draggable; position saved across page loads. Keyboard shortcut (Ctrl+Shift+Alt+R) snaps it back if it goes off-screen.

---

## Tech Stack

- **Vite 8** — build tool and dev server; GitHub Pages base path configured via `GITHUB_REPOSITORY` env var
- **React 19** — UI framework
- **Recharts 3** — charting library (line charts, bar charts)
- **lucide-react 1.16** — icon set
- **Zustand 5** — client-side state management
- **Tailwind CSS v4** — utility styling via `@tailwindcss/vite`; CSS token architecture with `[data-theme]` selector for theme variants
- **IndexedDB** (browser API, not localStorage) — sole persistence layer; accessed only through `storage-service.js`
- **GitHub Pages** — deployment; triggers automatically on push to `main`

---

## Project Structure

```
src/
  constants/          — static app-wide definitions (bot/snapshot schemas, metric
                        definitions, aura color map, chart color palette, formatters)
  services/           — plain JS modules; zero React imports allowed (see services-reference.md)
  hooks/              — React hooks; the only layer components import
  state/              — Zustand store (bot-store.js)
  components/
    charts/           — chart view components (OverlayChart, RankingChart, GainsChart,
                        HistoryChart, TagsChart)
    dashboard/        — main dashboard components (BotTable, StatCard, EmptyState,
                        OnboardingBanner)
    modals/           — all modal dialogs (AddBot, AddSnapshot, EditBot, BotDetail,
                        Import, Backup, Changelog, Modal base)
  index.css           — Tailwind base + CSS token definitions; [data-theme="..."] overrides go here
  App.jsx             — root component
  main.jsx            — entry point
```

---

## Current Features

**Bot management**
- Add, edit (name + tags), and delete bots
- Manual snapshot entry with date picker, three stat fields, and scope select
- Search by name or tag; filter by tag chip; sort by any metric ascending/descending

**Snapshots**
- Per-bot snapshot history with per-snapshot delete
- Deduplication by avatar URL in the userscript; scope warning on import for non-Total captures

**Per-bot charts**
- Dual-axis line chart of Messages, Threads, and Favorites over time (Total-scope only)
- Delta-since-last-snapshot on metric cards

**Multi-bot visualizations**
- Timeline (overlay) chart: all bots on one axis, absolute or growth-from-first mode, per-bot aura colors
- Ranking chart: top N bots by any metric, configurable N
- Gains view: rolling-window rankings (7d / 30d / 90d / All Time)
- History view: replay any past date's leaderboard from snapshot deltas
- Tags view: sum any metric across all bots sharing a tag

**Import**
- Paste CharSnap copy-button text or batch JSON
- Auto-match by avatar URL; disambiguation picker; preview before apply; scope warning

**Userscript** (`userscript/charsnap-capture.user.js`)
- Auto-captures on stats modal open (manual-open only; no auto-walk)
- Switches to Total tab automatically; deduplicates by avatar URL within a session
- Floating collapsible HUD: queue count, Export queue, Clear, Auto toggle
- Draggable; position persisted via `GM_setValue`

**Theming**
- Dark theme: cool-slate base, sky accent, metric-tinted stat cards, per-bot aura colors (sky / violet / pink / emerald / orange)
- CSS token architecture (`[data-theme]` in `index.css`) supports additional themes without a full CSS rewrite
- Quicksand (body/labels) + Inter with tabular numerals (numbers)

**Data management**
- JSON backup export (downloads dated `.json` file)
- JSON backup import (full replace with confirmation)
- Reset all data (two-step confirm)

---

## What's Next

All planned phases (0–7) are shipped. Remaining work is gated on a **theme-switcher UI** in Settings that doesn't exist yet. Once built, it unlocks:

- **Light** — needs its own aura palette pass (current aura colors tuned for dark backgrounds)
- **Yume Kawaii** — pastel/kawaii aesthetic
- **Ocean** — blue/teal aesthetic
- **Dark Academia** — muted warm-dark aesthetic
- **Synthwave** — neon/retrowave; may benefit from per-theme texture/background treatments

The light-mode aura palette is also deferred; it depends on the Light theme shipping first.

---

## Known Limitations

- Data lives in IndexedDB only — clearing browser data (or the site's storage) permanently deletes everything
- No cloud sync, no accounts, no collaboration — one browser, one user's data
- Userscript requires the user to manually open each bot's stats modal; it does not auto-open modals
- Userscript captures one bot per modal open (no auto-walk across a creator's catalog)
- Userscript refuses to capture when not on the Total tab (warns instead of queuing bad data)
- Userscript is for personal use only until cleared with CharSnap team for wider distribution

---

## For Planning Conversations

Reference docs in the repo:

- `docs/plan.md` — full phase-by-phase roadmap with Future Features and Queued Adjustments
- `CHANGELOG.md` (repo root) — full change history, user-visible entries only
- `docs/services-reference.md` — service module responsibilities and architecture rules
- `CLAUDE.md` (repo root) — architecture rules, naming conventions, policy boundary (no CharSnap API calls)

When bringing a plan into a Claude Code session, include:

1. A plain-language description of the feature — what the user clicks, what they see, what changes
2. Which part of the UI it affects (which tab, which modal, which component area)
3. Any behavior decisions made during planning (e.g. edge cases, scope choices, constraints agreed on)
