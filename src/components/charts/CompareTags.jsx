import { useState, useMemo } from 'react'
import { METRICS } from '../../constants/metrics.js'
import { fmt } from '../../constants/format.js'

function computeTagTotals(botList, metric) {
  const tagMap = {}
  botList.forEach(bot => {
    if (!bot.latest) return
    ;(bot.tags || []).forEach(tag => {
      if (!tagMap[tag]) tagMap[tag] = { tag, messages: 0, chats: 0, favorites: 0, botCount: 0 }
      tagMap[tag].botCount++
      tagMap[tag].messages  += bot.messages  || 0
      tagMap[tag].chats     += bot.chats     || 0
      tagMap[tag].favorites += bot.favorites || 0
    })
  })
  return Object.values(tagMap).sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
}

function TagList({ tags, metric, color, emptyMsg }) {
  const m = METRICS.find(mx => mx.key === metric)
  if (tags.length === 0) {
    return <p className="text-text-muted text-xs py-4">{emptyMsg}</p>
  }
  return (
    <div className="space-y-0">
      {tags.map(t => (
        <div key={t.tag} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: color }}
          />
          <span className="text-sm font-semibold text-text-primary flex-1 min-w-0 truncate">#{t.tag}</span>
          <span className="text-[11px] text-text-muted shrink-0">{t.botCount}b</span>
          <span className="num font-bold text-sm shrink-0" style={{ color }}>{fmt(t[metric])}</span>
        </div>
      ))}
    </div>
  )
}

export default function CompareTags({ myBotList, friendBotList, myName, friendName, myColor, friendColor }) {
  const [metric, setMetric] = useState('messages')

  const myTags = useMemo(() => computeTagTotals(myBotList, metric), [myBotList, metric])
  const friendTags = useMemo(() => computeTagTotals(friendBotList, metric), [friendBotList, metric])

  return (
    <div>
      {/* Metric toggle */}
      <div className="flex items-center justify-center gap-2 px-5 py-3 border-b border-border">
        <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
          {METRICS.map(mx => (
            <button
              key={mx.key}
              onClick={() => setMetric(mx.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${metric === mx.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              style={metric === mx.key ? { boxShadow: `inset 0 0 0 1px ${mx.color}40` } : {}}
            >
              {mx.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        <div className="bg-surface p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: myColor }}>
            {myName} · tags
          </div>
          <TagList
            tags={myTags}
            metric={metric}
            color={myColor}
            emptyMsg="No tags on your bots yet."
          />
        </div>
        <div className="bg-surface p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: friendColor }}>
            {friendName} · tags
          </div>
          <TagList
            tags={friendTags}
            metric={metric}
            color={friendColor}
            emptyMsg="No tags on their bots."
          />
        </div>
      </div>
    </div>
  )
}
