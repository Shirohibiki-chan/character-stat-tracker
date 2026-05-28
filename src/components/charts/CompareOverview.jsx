import { METRICS } from '../../constants/metrics.js'
import { fmt } from '../../constants/format.js'

function StatRow({ label, myVal, friendVal, color }) {
  const myAhead = myVal != null && friendVal != null && myVal > friendVal
  const friendAhead = myVal != null && friendVal != null && friendVal > myVal
  return (
    <div className="grid grid-cols-3 items-center py-3 border-b border-border last:border-0">
      <div
        className="text-right pr-8 num font-bold text-xl"
        style={{ color: myAhead ? color : 'var(--color-text-primary)' }}
      >
        {fmt(myVal)}
      </div>
      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">{label}</div>
      <div
        className="text-left pl-8 num font-bold text-xl"
        style={{ color: friendAhead ? color : 'var(--color-text-primary)' }}
      >
        {fmt(friendVal)}
      </div>
    </div>
  )
}

export default function CompareOverview({ myBotList, friendBotList, myTotals, friendTotals, myName, friendName, myColor, friendColor }) {
  const myCount = myBotList.length
  const friendCount = friendBotList.length

  const myTopBot = [...myBotList].sort((a, b) => (b.messages || 0) - (a.messages || 0))[0] ?? null
  const friendTopBot = [...friendBotList].sort((a, b) => (b.messages || 0) - (a.messages || 0))[0] ?? null

  return (
    <div className="p-5 space-y-0">
      {/* Name headers */}
      <div className="grid grid-cols-3 items-end pb-4 border-b border-border">
        <div className="text-right pr-8">
          <div className="font-bold text-base" style={{ color: myColor }}>{myName}</div>
          <div className="text-[11px] text-text-muted mt-0.5">{myCount} bot{myCount !== 1 ? 's' : ''}</div>
          {myTopBot && (
            <div className="text-[11px] text-text-muted mt-1 truncate">
              top: <span className="text-text-secondary">{myTopBot.name}</span>
            </div>
          )}
        </div>
        <div className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Totals</div>
        <div className="text-left pl-8">
          <div className="font-bold text-base" style={{ color: friendColor }}>{friendName}</div>
          <div className="text-[11px] text-text-muted mt-0.5">{friendCount} bot{friendCount !== 1 ? 's' : ''}</div>
          {friendTopBot && (
            <div className="text-[11px] text-text-muted mt-1 truncate">
              top: <span className="text-text-secondary">{friendTopBot.name}</span>
            </div>
          )}
        </div>
      </div>

      <StatRow label="Bots" myVal={myCount} friendVal={friendCount} color="#4ba8c4" />
      {METRICS.map(m => (
        <StatRow
          key={m.key}
          label={m.label}
          myVal={myTotals[m.key]}
          friendVal={friendTotals[m.key]}
          color={m.color}
        />
      ))}

      <p className="text-[11px] text-text-muted text-center pt-3">
        Higher number in each row is highlighted · combined totals across all bots
      </p>
    </div>
  )
}
