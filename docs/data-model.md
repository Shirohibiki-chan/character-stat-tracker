# Data Model

## Bot

```js
{
  id: string,           // generated uid, immutable, never reuse
  name: string,         // display name, mirrors CharSnap (not unique)
  avatar: string|null,  // raw avatar URL; normalize before using as match key
  tags: string[],       // user-defined tags
  snapshots: Snapshot[] // chronological history (sort by date on read)
}
```

## Snapshot

```js
{
  date: string,         // ISO 8601 timestamp
  chats: number,        // "Threads" in CharSnap's UI
  messages: number,     // total (includes solo + group)
  favorites: number,
  scope: "Total" | "Last 24h" | "Last 7d" | "Last 30d",

  // Optional, when available from current CharSnap UI:
  messagesSolo: number|undefined,   // regular messages component
  messagesGroup: number|undefined   // group chat messages component
}
```

Invariant when the breakdown is present: `messagesSolo + messagesGroup === messages`.

## Storage shape (IndexedDB)

Single object store, single record:

```js
{
  bots: { [botId]: Bot }
}
```

Written wholesale on autosave (debounced). For Phase 1's scale this is fine; partition if performance becomes a concern later (it won't for years).

`storage-service.js` is the only file that reads/writes IndexedDB. Other code goes through hooks.

## Avatar URL normalization

CharSnap serves avatars through a CDN with transform params:

```
https://cdn.charsnap.ai/cdn-cgi/image/width=1440,quality=85,format=auto,onerror=redirect/prod/cfdeacb5-7ed8-45b8-b014-98609f835d9f-image.png
```

The transform-params segment changes based on viewport, but the underlying asset filename is stable. Use that filename as the match key.

Implementation:

```js
function normalizeAvatar(url) {
  if (!url) return null;
  const m = url.match(/\/([a-f0-9-]+-image\.[a-z]+)(\?|$)/i);
  return m ? m[1] : url;
}
```

Falls back to raw URL if the pattern doesn't match (so non-CharSnap URLs still work).

## Capture matching algorithm

Given an incoming capture `{ name, avatarUrl, ... }`:

1. **Normalize** the avatar URL.
2. **If a bot has this normalized avatar:** match. Update that bot.
3. **Else if name matches exactly one bot AND no avatar was provided:** match. Update that bot.
4. **Else if name matches multiple bots:** ambiguous — ask user to pick from candidates, or create new.
5. **Else if name doesn't match any bot:** propose creating a new bot.
6. **Else (no name, no avatar match):** ambiguous — ask user to assign manually.

The user always has final say in the import preview UI — show what the auto-match decided, let them override.

## Migration

From the reference artifact's older shape (single row per bot with current numbers, no history):

- Each old bot becomes a new bot with one snapshot dated at migration time
- Scope defaults to `"Total"` since v1 only tracked all-time numbers
- Bots with zero stats get an empty `snapshots` array, not a zero-value snapshot

The reference artifact's v1 storage key was `charsnap-bots-v1`; the new schema lives under `dashboard:v2` (or whatever Phase 1 picks — document it in `storage-service.js`).
