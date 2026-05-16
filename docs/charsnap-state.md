# CharSnap UI State (as of May 2026)

This doc captures what we know about CharSnap's current UI so logic can be written against a known target instead of guessed at. **Update this doc whenever CharSnap changes things** — it's the source of truth for the parser, the future userscript, and any DOM-related work.

## Stats modal (per-bot)

Opened by clicking the stats button on a bot card on the user's creator page. The modal overlays the page; the URL does NOT change when the modal opens.

### Header layout

- Bot avatar (left)
- Bot name as `<h2>`
- Active-tab pill: "Last 24h" / "Last 7d" / "Last 30d" / "All Time"
- Stats View / Graph View toggle button
- Copy button (top-right corner of dialog, `title="Copy stats"`)
- Close X

### Tabs

Four scope tabs in order: **24h / 7d / 30d / Total**

These are hard resets (NOT rolling windows):
- 24h resets at 00:00 UTC daily
- 7d resets every Monday
- 30d resets on the 1st of each month
- Total is cumulative all-time

A banner inside the modal reads:

> THESE NOW RESET at 12:00 AM UTC every day for Daily, every Monday for Weekly, and every 1st of the month for Monthly. You will get a historical view of the data within 'Graph View', which is already compiling your data, and will take a few days to show up.

The tab labeled "Total" in the tab bar displays "All Time" in the header pill when active. Both labels refer to the same thing — accept either in parsing.

### Stats View

Three stat cards side by side. Each shows:
- Icon (chat threads / message square / heart)
- Big number — the value for the selected tab
- Label ("Chat Threads" / "Messages" / "Favorites")

The Messages card has a sub-line when the value is non-zero, showing the breakdown:

```
14,774
(12,004 + 2,770)
Messages
```

The `(X + Y)` is `Regular messages + Group chat messages` per the aria-label on the adjacent info icon.

### Graph View

Available for **24h / 7d / 30d only**. Shows daily/weekly/monthly history going back ~2 weeks. Tooltip on each data point shows date and four values:
- Messages
- Group Chat Messages
- Total Messages
- Threads

**Total tab has no Graph View** — clicking Graph View while on Total either does nothing or shows an empty state. This is precisely why our app exists: to fill the cumulative-over-time gap.

## Copy button format

When pressed, copies text to clipboard. **The format depends on the active tab.** As captured from the reference artifact era:

```
📊 Creator Analytics (All Time)
━━━━━━━━━━━━━━━━
💬 Messages: 2,585,584
❤️ Favorites: 1,221
🗨️ Threads: 8,127
```

**KNOWN UNCERTAINTY:** CharSnap renamed "All Time" to "Total" in the tab bar. We have NOT verified what the copy button now writes — does it say "Total", "All Time", or something else? Does the order of fields change? Are the emojis the same? **Before locking in the Phase 3 parser, have the user paste a real current copy-button output so we know the actual format.**

The copy button output does NOT include:
- The bot's name (read from the modal's `<h2>` if needed by a script; for paste-import, ask the user which bot)
- The bot's avatar URL
- The solo/group breakdown for messages
- The bot's CharSnap UUID

## Creator Analytics page

Reached via the "View Detailed Analytics" button on the Quick Stats overview.

- Same 24h / 7d / 30d / Total tabs as the per-bot modal
- Shows creator-level aggregates at top (total chat threads, messages, favorites for the period)
- Shows **Top Characters list — 24h tab ONLY** — a ranked list of the user's top-performing bots with their 24h numbers inline. Truncated; doesn't include the full catalog
- The Top Characters list does NOT appear in 7d / 30d / Total modes

## Quick Stats page

Creator-level overview:
- Total Followers
- Total Messages
- Msgs/Chat (average)
- Favs/Char (average)
- Threads/Char (average)
- Total Characters (active count)

Links to detailed analytics via a "View Detailed Analytics" button at the bottom.

## DOM selectors (from inspection of stats modal)

These selectors held as of the artifact-era inspection. Verify before using in a userscript:

- **Modal container:** `[role="dialog"][data-state="open"]`
- **Bot name:** first `<h2>` inside the dialog
- **Tab buttons:** `button[role="tab"]`; active tab has `data-state="active"`; tab label is the button's text content
- **Stat values:** `div.text-3xl.font-bold.text-primary` — three of them, in DOM order: chats, messages, favorites
- **Messages breakdown:** `span.text-xs.text-secondary` inside the messages card, containing `(X + Y)`
- **Copy button:** `button[title="Copy stats"]`
- **Avatar:** `<img>` near the dialog header; `src` includes CDN transform params — strip per `data-model.md`

Radix UI generates dynamic IDs like `radix-_r_c5_` that regenerate on each modal open — **do not use them as selectors**.

## Bot identity

CharSnap bots have a stable UUID visible in their public character URL: `https://charsnap.ai/character/<uuid>`. This UUID is NOT present in the stats modal DOM. The userscript (when built) will rely on avatar URL as the stable key instead — see `domain-glossary.md`.

## Policy reminder

CharSnap's API is off-limits per ToS. Reading the rendered DOM of a manually-opened modal is the only sanctioned automation path, and even that is "personal use okay, distribute only with permission." Auto-opening modals counts as API access in effect (each modal-open triggers a server request) and is prohibited.
