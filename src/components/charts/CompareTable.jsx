import { useState, useMemo } from 'react'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtRelative } from '../../constants/format.js'

const PAGE_SIZE = 20

function BotRow({ bot, rank, color }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className="text-[11px] text-text-muted num w-5 shrink-0 text-right">{rank}</span>
      {bot.avatar ? (
        <img
          src={bot.avatar}
          alt={bot.name}
          className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-surface-alt border border-border flex items-center justify-center text-[10px] font-bold text-text-muted shrink-0">
          {bot.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">{bot.name}</div>
        <div className="text-[10px] text-text-muted">last {fmtRelative(bot.lastCapturedAt)}</div>
      </div>
      <span className="num font-bold text-sm shrink-0" style={{ color }}>{fmt(bot._val)}</span>
    </div>
  )
}

function PageControls({ page, pageCount, total, onFirst, onPrev, onNext, onLast }) {
  if (pageCount <= 1) return null
  const from = page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)
  const btn = "px-2 py-1 text-[11px] font-bold text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition"
  return (
    <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
      <div className="flex items-center gap-1">
        <button onClick={onFirst} disabled={page === 0} className={btn}>«</button>
        <button onClick={onPrev}  disabled={page === 0} className={btn}>← Prev</button>
      </div>
      <span className="text-[11px] text-text-muted num">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={onNext} disabled={page === pageCount - 1} className={btn}>Next →</button>
        <button onClick={onLast} disabled={page === pageCount - 1} className={btn}>»</button>
      </div>
    </div>
  )
}

export default function CompareTable({ myBotList, friendBotList, myName, friendName, myColor, friendColor }) {
  const [metric, setMetric] = useState('messages')
  const [myPage, setMyPage] = useState(0)
  const [friendPage, setFriendPage] = useState(0)
  const m = METRICS.find(mx => mx.key === metric)

  function handleMetricChange(key) {
    setMetric(key)
    setMyPage(0)
    setFriendPage(0)
  }

  const myRanked = useMemo(() =>
    [...myBotList]
      .filter(b => b.latest)
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
      .map(b => ({ ...b, _val: b[metric] || 0 })),
    [myBotList, metric]
  )

  const friendRanked = useMemo(() =>
    [...friendBotList]
      .filter(b => b.latest)
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
      .map(b => ({ ...b, _val: b[metric] || 0 })),
    [friendBotList, metric]
  )

  const myPageCount   = Math.ceil(myRanked.length / PAGE_SIZE)
  const friendPageCount = Math.ceil(friendRanked.length / PAGE_SIZE)
  const mySlice     = myRanked.slice(myPage * PAGE_SIZE, (myPage + 1) * PAGE_SIZE)
  const friendSlice = friendRanked.slice(friendPage * PAGE_SIZE, (friendPage + 1) * PAGE_SIZE)

  return (
    <div>
      {/* Metric toggle */}
      <div className="flex items-center justify-center gap-2 px-5 py-3 border-b border-border">
        <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
          {METRICS.map(mx => (
            <button
              key={mx.key}
              onClick={() => handleMetricChange(mx.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${metric === mx.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              style={metric === mx.key ? { boxShadow: `inset 0 0 0 1px ${mx.color}40` } : {}}
            >
              {mx.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        {/* Your bots */}
        <div className="bg-surface p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: myColor }}>
            {myName} · {myRanked.length} bot{myRanked.length !== 1 ? 's' : ''} · {m?.label}
          </div>
          {myRanked.length === 0 ? (
            <p className="text-text-muted text-xs py-4">No bots with snapshot data.</p>
          ) : (
            <>
              {mySlice.map((b, i) => (
                <BotRow key={b.id} bot={b} rank={myPage * PAGE_SIZE + i + 1} color={myColor} />
              ))}
              <PageControls
                page={myPage} pageCount={myPageCount} total={myRanked.length}
                onFirst={() => setMyPage(0)}
                onPrev={() => setMyPage(p => p - 1)}
                onNext={() => setMyPage(p => p + 1)}
                onLast={() => setMyPage(myPageCount - 1)}
              />
            </>
          )}
        </div>

        {/* Friend's bots */}
        <div className="bg-surface p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: friendColor }}>
            {friendName} · {friendRanked.length} bot{friendRanked.length !== 1 ? 's' : ''} · {m?.label}
          </div>
          {friendRanked.length === 0 ? (
            <p className="text-text-muted text-xs py-4">No bots with snapshot data.</p>
          ) : (
            <>
              {friendSlice.map((b, i) => (
                <BotRow key={b.id} bot={b} rank={friendPage * PAGE_SIZE + i + 1} color={friendColor} />
              ))}
              <PageControls
                page={friendPage} pageCount={friendPageCount} total={friendRanked.length}
                onFirst={() => setFriendPage(0)}
                onPrev={() => setFriendPage(p => p - 1)}
                onNext={() => setFriendPage(p => p + 1)}
                onLast={() => setFriendPage(friendPageCount - 1)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
