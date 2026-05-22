import { useState, useMemo } from 'react'

function sortedSnapshots(bot) {
  if (!bot.snapshots?.length) return []
  return [...bot.snapshots].sort((a, b) => new Date(a.date) - new Date(b.date))
}

function enrichBot(bot) {
  const snaps = sortedSnapshots(bot)
  // Stats and deltas must use only Total-scope snapshots so we always compare
  // cumulative all-time values, never period-specific counts (24h, 7d, 30d).
  const totalSnaps = snaps.filter(s => s.scope === 'Total')
  const latest = totalSnaps.length ? totalSnaps[totalSnaps.length - 1] : null
  const prev = totalSnaps.length >= 2 ? totalSnaps[totalSnaps.length - 2] : null
  return {
    ...bot,
    _snaps: snaps,
    _totalSnaps: totalSnaps,
    latest,
    chats: latest?.chats ?? 0,
    messages: latest?.messages ?? 0,
    favorites: latest?.favorites ?? 0,
    deltaChats: prev != null ? (latest?.chats ?? 0) - (prev.chats ?? 0) : null,
    deltaMessages: prev != null ? (latest?.messages ?? 0) - (prev.messages ?? 0) : null,
    deltaFavorites: prev != null ? (latest?.favorites ?? 0) - (prev.favorites ?? 0) : null,
    messagesGroup: latest?.messagesGroup ?? null,
    deltaMessagesGroup: (prev?.messagesGroup != null && latest?.messagesGroup != null)
      ? latest.messagesGroup - prev.messagesGroup
      : null,
    messagesSolo: latest?.messagesSolo ?? null,
    deltaMessagesSolo: (prev?.messagesSolo != null && latest?.messagesSolo != null)
      ? latest.messagesSolo - prev.messagesSolo
      : null,
    snapshotCount: snaps.length,
    lastCapturedAt: snaps.length ? snaps[snaps.length - 1].date : null,
  }
}

export function useDashboard(bots) {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('messages')
  const [sortDir, setSortDir] = useState('desc')

  const enriched = useMemo(() => Object.values(bots).map(enrichBot), [bots])

  const allTags = useMemo(() => {
    const s = new Set()
    enriched.forEach(b => (b.tags || []).forEach(t => s.add(t)))
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [enriched])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter(b => {
      if (q && !b.name.toLowerCase().includes(q) && !(b.tags || []).some(t => t.toLowerCase().includes(q))) return false
      if (activeTag && !(b.tags || []).includes(activeTag)) return false
      return true
    })
  }, [enriched, search, activeTag])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      if (sortBy === 'updated') {
        const av = a.lastCapturedAt ? new Date(a.lastCapturedAt).getTime() : 0
        const bv = b.lastCapturedAt ? new Date(b.lastCapturedAt).getTime() : 0
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [filtered, sortBy, sortDir])

  const totals = useMemo(() => {
    const now = new Date()
    // Both anchors use UTC to match CharSnap's reset times.
    const utcDay = now.getUTCDay() // 0 = Sun, 1 = Mon …
    const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1
    const weekStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday)
    const todayStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

    return filtered.reduce((acc, b) => {
      // Use Total-scope snapshots so weekly/daily gain compares cumulative values only.
      const totalSnaps = b._totalSnaps
      const latest = totalSnaps.length ? totalSnaps[totalSnaps.length - 1] : null

      let weekBaseline = null
      let dayBaseline = null
      if (totalSnaps.length >= 2) {
        for (let i = totalSnaps.length - 2; i >= 0; i--) {
          const t = new Date(totalSnaps[i].date).getTime()
          if (dayBaseline === null && t < todayStartMs) dayBaseline = totalSnaps[i]
          if (weekBaseline === null && t < weekStartMs) weekBaseline = totalSnaps[i]
          if (dayBaseline !== null && weekBaseline !== null) break
        }
        if (!weekBaseline) weekBaseline = totalSnaps[0]
        if (!dayBaseline) dayBaseline = totalSnaps[0]
      }

      const latestIsThisWeek = latest && new Date(latest.date).getTime() >= weekStartMs
      const latestIsToday    = latest && new Date(latest.date).getTime() >= todayStartMs
      const gain     = (key) => latestIsThisWeek && weekBaseline ? (latest[key] ?? 0) - (weekBaseline[key] ?? 0) : 0
      const gainDay  = (key) => latestIsToday    && dayBaseline  ? (latest[key] ?? 0) - (dayBaseline[key]  ?? 0) : 0

      return {
        chats:              acc.chats          + (b.chats     || 0),
        messages:           acc.messages       + (b.messages  || 0),
        favorites:          acc.favorites      + (b.favorites || 0),
        deltaChats:         acc.deltaChats         + gain('chats'),
        deltaMessages:      acc.deltaMessages      + gain('messages'),
        deltaFavorites:     acc.deltaFavorites     + gain('favorites'),
        dailyDeltaChats:    acc.dailyDeltaChats    + gainDay('chats'),
        dailyDeltaMessages: acc.dailyDeltaMessages + gainDay('messages'),
        dailyDeltaFavorites:acc.dailyDeltaFavorites+ gainDay('favorites'),
        newBots:      acc.newBots      + (totalSnaps.length > 0 && new Date(totalSnaps[0].date).getTime() >= weekStartMs  ? 1 : 0),
        newBotsToday: acc.newBotsToday + (totalSnaps.length > 0 && new Date(totalSnaps[0].date).getTime() >= todayStartMs ? 1 : 0),
      }
    }, {
      chats: 0, messages: 0, favorites: 0,
      deltaChats: 0, deltaMessages: 0, deltaFavorites: 0,
      dailyDeltaChats: 0, dailyDeltaMessages: 0, dailyDeltaFavorites: 0,
      newBots: 0, newBotsToday: 0,
    })
  }, [filtered])

  function toggleSort(key) {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir(key === 'name' ? 'asc' : 'desc') }
  }

  return {
    search, setSearch,
    activeTag, setActiveTag,
    sortBy, sortDir, toggleSort,
    allTags,
    totals,
    sorted,
    filteredCount: filtered.length,
  }
}
