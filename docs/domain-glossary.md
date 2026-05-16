# Domain Glossary

Terms specific to this project and CharSnap. Read this before naming variables, designing UI labels, or making assumptions about how the data behaves.

## Bot

A character on CharSnap. Each bot has a name, an avatar (URL), optional tags (defined inside our app — not on CharSnap), and a history of snapshots.

Bots are identified internally by a generated `id` (uid), not by name or CharSnap UUID. CharSnap UUIDs are NOT in the modal DOM, so we can't reliably capture them.

## Snapshot

A timestamped capture of a bot's stats. Three metrics + scope + date:

```js
{
  date: "2026-05-15T22:30:00.000Z",
  chats: 8888,
  messages: 3044106,
  favorites: 1271,
  scope: "Total"
}
```

A bot's `snapshots` array is its full history. Sort by `date` before charting.

## Metrics

The three numbers tracked per bot:
- **Chats** (called "Threads" in CharSnap's UI; both terms appear in the codebase — chats is the internal name, "Threads" is what we show users)
- **Messages**
- **Favorites**

Messages may have a sub-breakdown (regular + group chat) when captured from the current CharSnap UI — see `data-model.md`.

## Scope

CharSnap's stats modal has four tabs that determine what window the numbers cover:

- **Total** — cumulative all-time. Was previously labeled "All Time"; both labels should be accepted by the parser.
- **Last 24h** — resets at 00:00 UTC daily.
- **Last 7d** — resets every Monday.
- **Last 30d** — resets on the 1st of each month.

These are hard resets, not rolling windows. CharSnap shows historical graphs for 24h/7d/30d in its own Graph View, but not for Total — which is the gap our tracker fills.

Every snapshot stores its `scope`. The main growth chart filters to `scope === "Total"` because mixing scopes draws meaningless lines.

## Eight-Sampos Problem

CharSnap allows duplicate bot names. The user has eight bots named "Sampo Koski." Therefore name alone is not a stable identifier.

**Solution:** the normalized **avatar URL** is the primary key for matching captures to existing bots. If two bots have the same name but different avatars, they're different bots. If the avatar URL hasn't been seen before but the name matches an existing bot, ask the user which one.

Avatar normalization details in `data-model.md`.

## Capture

A single act of recording stats from CharSnap into our app. A capture becomes a snapshot once saved. Captures may come from:

1. Manual entry via the "Add snapshot" UI
2. Paste-box parse of CharSnap's copy-button output
3. (Future) Userscript outputting JSON to clipboard, pasted into the import box

## Top Characters list

A ranked list of the user's top-performing bots, shown on CharSnap's Creator Analytics page. **Only visible in 24h mode** — switch to 7d / 30d / Total and the list disappears. **Truncated** — does not include all of the user's bots, only top N. We don't know N.

Because it's 24h-only and truncated, we can't use it as a bulk-data source for tracking all bots. We CAN, however, reconstruct historical Top Characters rankings from our own snapshot data once we have enough captures.

## Creator Analytics page

The page reached via the "View Detailed Analytics" button on CharSnap's Quick Stats overview. Shows creator-aggregate stats at top (for the selected tab's window), plus the 24h-only Top Characters list.

## Quick Stats page

A higher-level CharSnap overview showing all-time creator totals: total followers, total messages, msgs/chat, favs/char, threads/char, total characters. Links to Creator Analytics via "View Detailed Analytics."

## Stats View vs Graph View

Each bot's stats modal has two display modes, toggled by a button in the header:

- **Stats View** — three big numbers for the selected tab
- **Graph View** — a chart with daily/weekly/monthly history (24h/7d/30d only; Total has no graph)

## Copy button

A button in CharSnap's stats modal (top-right corner of the dialog) that copies the visible stats as formatted text to clipboard. This text is what the user pastes into our app's import box. Format details in `charsnap-state.md`.
