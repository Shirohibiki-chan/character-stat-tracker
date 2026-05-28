import { useState, useMemo } from 'react'
import { parseBotFile } from '../services/backup-service.js'
import { enrichBot } from './use-dashboard.js'

function buildChartData(myBot, friendBot, metric, relative) {
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
  const [myBotId, setMyBotId] = useState(null)
  const [friendBotId, setFriendBotId] = useState(null)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState('messages')
  const [relative, setRelative] = useState(false)

  async function loadFriendFile(file) {
    try {
      const bots = await parseBotFile(file)
      setFriendBots(bots)
      setFriendFileName(file.name)
      setFriendBotId(null)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  function reset() {
    setFriendBots(null)
    setFriendFileName('')
    setMyBotId(null)
    setFriendBotId(null)
    setError('')
  }

  const myBotList = useMemo(() => Object.values(myBots).map(enrichBot), [myBots])
  const friendBotList = useMemo(
    () => (friendBots ? Object.values(friendBots).map(enrichBot) : []),
    [friendBots]
  )

  const myBot = useMemo(() => myBotList.find(b => b.id === myBotId) ?? null, [myBotList, myBotId])
  const friendBot = useMemo(() => friendBotList.find(b => b.id === friendBotId) ?? null, [friendBotList, friendBotId])

  const chartData = useMemo(
    () => buildChartData(myBot, friendBot, metric, relative),
    [myBot, friendBot, metric, relative]
  )

  return {
    friendBots,
    friendFileName,
    friendBotList,
    myBotList,
    myBotId, setMyBotId,
    friendBotId, setFriendBotId,
    myBot,
    friendBot,
    error,
    metric, setMetric,
    relative, setRelative,
    chartData,
    loadFriendFile,
    reset,
  }
}
