import { useState, useMemo } from 'react'

function sortedSnapshots(bot) {
  if (!bot.snapshots?.length) return []
  return [...bot.snapshots].sort((a, b) => new Date(a.date) - new Date(b.date))
}

function enrichBot(bot) {
  const snaps = sortedSnapshots(bot)
  const latest = snaps.length ? snaps[snaps.length - 1] : null
  const prev = snaps.length >= 2 ? snaps[snaps.length - 2] : null
  return {
    ...bot,
    _snaps: snaps,
    latest,
    chats: latest?.chats ?? 0,
    messages: latest?.messages ?? 0,
    favorites: latest?.favorites ?? 0,
    deltaChats: prev != null ? (latest?.chats ?? 0) - (prev.chats ?? 0) : null,
    deltaMessages: prev != null ? (latest?.messages ?? 0) - (prev.messages ?? 0) : null,
    deltaFavorites: prev != null ? (latest?.favorites ?? 0) - (prev.favorites ?? 0) : null,
    snapshotCount: snaps.length,
    lastCapturedAt: latest?.date ?? null,
  }
}

export function useDashboard(bots) {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('chats')
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
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return filtered.reduce((acc, b) => {
      const snaps = b._snaps
      const latest = snaps.length ? snaps[snaps.length - 1] : null
      let baseline = null
      if (snaps.length >= 2) {
        for (let i = snaps.length - 2; i >= 0; i--) {
          if (new Date(snaps[i].date).getTime() <= weekAgo) { baseline = snaps[i]; break }
        }
        if (!baseline) baseline = snaps[0]
      }
      const gain = (key) => latest && baseline ? (latest[key] ?? 0) - (baseline[key] ?? 0) : 0
      return {
        chats:          acc.chats     + (b.chats     || 0),
        messages:       acc.messages  + (b.messages  || 0),
        favorites:      acc.favorites + (b.favorites || 0),
        deltaChats:     acc.deltaChats     + gain('chats'),
        deltaMessages:  acc.deltaMessages  + gain('messages'),
        deltaFavorites: acc.deltaFavorites + gain('favorites'),
        newBots: acc.newBots + (snaps.length > 0 && new Date(snaps[0].date).getTime() > weekAgo ? 1 : 0),
      }
    }, { chats: 0, messages: 0, favorites: 0, deltaChats: 0, deltaMessages: 0, deltaFavorites: 0, newBots: 0 })
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
