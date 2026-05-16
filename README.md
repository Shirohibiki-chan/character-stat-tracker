# CharSnap Stats Tracker

A personal dashboard for CharSnap bot creators. Track your bots' stat history, visualize growth over time, and compare bots in ways CharSnap's own UI doesn't support.

**Live app:** https://shirohibiki-chan.github.io/character-stat-tracker/

---

## Screenshots

### Dashboard — table view
<!-- screenshot: dashboard table with bots, stat cards, search/filter bar -->

### Overlay chart — all bots on one timeline
<!-- screenshot: overlay line chart, one line per bot, growth mode -->

### Gains view — rolling-window ranking
<!-- screenshot: horizontal bar chart showing 30-day message gains -->

---

## Features

- **Paste-import** — open any bot's stats modal in CharSnap, click copy, paste it in. Bot and first snapshot created automatically.
- **Snapshot history** — record as many data points as you like. Charts fill in as history grows.
- **Overlay chart** — one line per bot, absolute totals or growth-from-first-snapshot, togglable.
- **Ranking chart** — top N bots by any metric, configurable N.
- **Gains view** — who grew the most in the last 7 / 30 / 90 days, or all time.
- **History view** — replay any past date's leaderboard from snapshot deltas.
- **Tags view** — sum metrics across all bots sharing a tag.
- **JSON backup** — export everything, import on another browser, no account needed.
- **100% local** — all data lives in your browser's IndexedDB. Nothing is sent anywhere.

---

## Quick start

1. Open the [live app](https://shirohibiki-chan.github.io/character-stat-tracker/).
2. Click **Import** and paste CharSnap copy-button output, or click **Add bot** to enter stats manually.
3. Add more snapshots over time. The overlay chart and gain views become useful once you have a few data points per bot.

To transfer data to another browser: use **Settings → Download backup**, then **Settings → Choose backup file** on the other browser.

---

## Development

```bash
npm install
npm run dev      # hot-reload dev server
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

Requires Node 20+. Deploys automatically to GitHub Pages on push to `main`.

---

## Tech

Vite · React 19 · Tailwind CSS v4 · Zustand · Recharts · lucide-react · IndexedDB
