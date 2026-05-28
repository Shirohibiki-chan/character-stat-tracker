import { useState, useMemo } from 'react'
import { parseBotFile } from '../services/backup-service.js'
import { enrichBot } from './use-dashboard.js'

export const COMPARE_TABS = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'table',     label: 'Table'     },
  { id: 'ranking',   label: 'Ranking'   },
  { id: 'gains',     label: 'Gains'     },
  { id: 'tags',      label: 'Tags'      },
  { id: 'breakdown', label: 'Breakdown' },
  { id: '1v1',       label: '1v1'       },
]

export function computeGain(bot, days) {
  const snaps = bot._totalSnaps || []
  if (snaps.length < 1) return { messages: null, chats: null, favorites: null }
  const latest = snaps[snaps.length - 1]
  let baseline = null
  if (days === 0) {
    baseline = snaps[0]
  } else {
    const cutoff = Date.now() - days * 86400000
    for (let i = snaps.length - 2; i >= 0; i--) {
      if (new Date(snaps[i].date).getTime() < cutoff) { baseline = snaps[i]; break }
    }
    if (!baseline && snaps.length >= 2) baseline = snaps[0]
  }
  if (!baseline) return { messages: null, chats: null, favorites: null }
  return {
    messages:  (latest.messages  ?? 0) - (baseline.messages  ?? 0),
    chats:     (latest.chats     ?? 0) - (baseline.chats     ?? 0),
    favorites: (latest.favorites ?? 0) - (baseline.favorites ?? 0),
  }
}

function buildOneVsOneData(myBot, friendBot, metric, relative) {
  if (!myBot || !friendBot) return []
  const mySnaps = myBot._totalSnaps || []
  const friendSnaps = friendBot._totalSnaps || []
  const dateSet = new Set()
  mySnaps.forEach(s => dateSet.add(s.date.slice(0, 10)))
  friendSnaps.forEach(s => dateSet.add(s.date.slice(0, 10)))
  const dates = [...dateSet].sort()
  const myBase = relative && mySnaps.length ? (mySnaps[0][metric] ?? 0) : 0
  const friendBase = relative && friendSnaps.length ? (friendSnaps[0][metric] ?? 0) : 0
  return dates.map(date => {
    const mySnap = [...mySnaps].reverse().find(s => s.date.slice(0, 10) <= date)
    const friendSnap = [...friendSnaps].reverse().find(s => s.date.slice(0, 10) <= date)
    const myRaw = mySnap != null ? (mySnap[metric] ?? null) : null
    const friendRaw = friendSnap != null ? (friendSnap[metric] ?? null) : null
    return {
      date,
      my: myRaw != null ? myRaw - myBase : null,
      friend: friendRaw != null ? friendRaw - friendBase : null,
    }
  })
}

export function useCompare(myBots) {
  const [friendBots, setFriendBots] = useState(null)
  const [friendFileName, setFriendFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [compareTab, setCompareTab] = useState('overview')
  const [metric, setMetric] = useState('messages')
  const [relative, setRelative] = useState(false)
  const [myBotId, setMyBotId] = useState(null)
  const [friendBotId, setFriendBotId] = useState(null)

  async function loadFriendFile(file) {
    try {
      const bots = await parseBotFile(file)
      setFriendBots(bots)
      setFriendFileName(file.name)
      setFriendBotId(null)
      setFileError('')
    } catch (err) {
      setFileError(err.message)
    }
  }

  function reset() {
    setFriendBots(null)
    setFriendFileName('')
    setMyBotId(null)
    setFriendBotId(null)
    setFileError('')
    setCompareTab('overview')
  }

  const myBotList = useMemo(() => Object.values(myBots).map(enrichBot), [myBots])
  const friendBotList = useMemo(
    () => (friendBots ? Object.values(friendBots).map(enrichBot) : []),
    [friendBots]
  )

  const myTotals = useMemo(() => myBotList.reduce(
    (acc, b) => ({
      messages:  acc.messages  + (b.messages  || 0),
      chats:     acc.chats     + (b.chats     || 0),
      favorites: acc.favorites + (b.favorites || 0),
    }),
    { messages: 0, chats: 0, favorites: 0 }
  ), [myBotList])

  const friendTotals = useMemo(() => friendBotList.reduce(
    (acc, b) => ({
      messages:  acc.messages  + (b.messages  || 0),
      chats:     acc.chats     + (b.chats     || 0),
      favorites: acc.favorites + (b.favorites || 0),
    }),
    { messages: 0, chats: 0, favorites: 0 }
  ), [friendBotList])

  const myBot = useMemo(() => myBotList.find(b => b.id === myBotId) ?? null, [myBotList, myBotId])
  const friendBot = useMemo(() => friendBotList.find(b => b.id === friendBotId) ?? null, [friendBotList, friendBotId])

  const oneVsOneData = useMemo(
    () => buildOneVsOneData(myBot, friendBot, metric, relative),
    [myBot, friendBot, metric, relative]
  )

  return {
    friendBots, friendFileName, fileError,
    loadFriendFile, reset,
    compareTab, setCompareTab,
    myBotList, friendBotList,
    myTotals, friendTotals,
    metric, setMetric,
    relative, setRelative,
    myBotId, setMyBotId,
    friendBotId, setFriendBotId,
    myBot, friendBot,
    oneVsOneData,
  }
}
