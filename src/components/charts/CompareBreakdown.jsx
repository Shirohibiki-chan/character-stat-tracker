import { useMemo } from 'react'
import { fmt } from '../../constants/format.js'

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function BreakdownPanel({ botList, ownerName, color }) {
  const stats = useMemo(() => {
    let totalSolo = 0, totalGroup = 0, botsWithData = 0
    botList.forEach(b => {
      if (b.messagesSolo != null || b.messagesGroup != null) {
        totalSolo  += b.messagesSolo  ?? 0
        totalGroup += b.messagesGroup ?? 0
        botsWithData++
      }
    })
    return { totalSolo, totalGroup, botsWithData }
  }, [botList])

  const total = stats.totalSolo + stats.totalGroup

  if (stats.botsWithData === 0) {
    return (
      <div className="p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color }}>
          {ownerName}
        </div>
        <p className="text-text-muted text-xs">
          No solo/group breakdown data yet. This appears once the userscript captures the expanded messages breakdown.
        </p>
      </div>
    )
  }

  const soloPct = pct(stats.totalSolo, total)
  const groupPct = pct(stats.totalGroup, total)

  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color }}>
        {ownerName} · {stats.botsWithData} bot{stats.botsWithData !== 1 ? 's' : ''} with data
      </div>

      {/* Stacked bar */}
      <div className="flex h-5 rounded overflow-hidden mb-4">
        {soloPct > 0 && (
          <div
            className="h-full flex items-center justify-center text-[10px] font-bold text-black"
            style={{ width: `${soloPct}%`, background: color, opacity: 0.85 }}
            title={`Solo ${soloPct}%`}
          />
        )}
        {groupPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${groupPct}%`, background: color, opacity: 0.35 }}
            title={`Group ${groupPct}%`}
          />
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.85 }} />
            <span className="text-text-secondary">Solo</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="num font-bold" style={{ color }}>{fmt(stats.totalSolo)}</span>
            <span className="text-text-muted text-xs num">{soloPct}%</span>
          </div>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.35 }} />
            <span className="text-text-secondary">Group</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="num font-bold text-text-primary">{fmt(stats.totalGroup)}</span>
            <span className="text-text-muted text-xs num">{groupPct}%</span>
          </div>
        </div>
        <div className="flex justify-between items-center text-sm pt-1 border-t border-border">
          <span className="text-text-muted">Total messages</span>
          <span className="num font-bold text-text-primary">{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

export default function CompareBreakdown({ myBotList, friendBotList, myName, friendName, myColor, friendColor }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
      <div className="bg-surface">
        <BreakdownPanel botList={myBotList} ownerName={myName} color={myColor} />
      </div>
      <div className="bg-surface">
        <BreakdownPanel botList={friendBotList} ownerName={friendName} color={friendColor} />
      </div>
    </div>
  )
}
