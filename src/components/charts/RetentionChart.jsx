import { useState, useMemo } from 'react'

const PAGE_SIZE = 20
const COLOR_WITH    = '#f97316'   // orange  — with group chat (fuller number)
const COLOR_WITHOUT = '#38bdf8'   // sky     — without group chat (solo only)

function calcScore(bot, withoutGroup) {
  if (!bot.chats) return null
  if (withoutGroup) {
    if (bot.messagesSolo == null) return null
    return bot.messagesSolo / bot.chats
  }
  return bot.messages / bot.chats
}

function ScoreBar({ score, max, color }) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0
  return (
    <div className="w-16 h-1.5 bg-surface-alt rounded-full overflow-hidden shrink-0">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function BotRow({ bot, rank, score, max, color }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
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
        <div className="text-[10px] text-text-muted">
          {bot.messages.toLocaleString()} msg · {bot.chats.toLocaleString()} thread{bot.chats !== 1 ? 's' : ''}
        </div>
      </div>
      <ScoreBar score={score} max={max} color={color} />
      <span className="num font-bold text-sm shrink-0 w-12 text-right" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

function PageControls({ page, pageCount, total, onPrev, onNext }) {
  if (pageCount <= 1) return null
  const from = page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)
  return (
    <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="px-2 py-1 text-[11px] font-bold text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        ← Prev
      </button>
      <span className="text-[11px] text-text-muted num">{from}–{to} of {total}</span>
      <button
        onClick={onNext}
        disabled={page === pageCount - 1}
        className="px-2 py-1 text-[11px] font-bold text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        Next →
      </button>
    </div>
  )
}

export default function RetentionChart({ bots }) {
  const [withoutGroup, setWithoutGroup] = useState(false)
  const [page, setPage] = useState(0)

  const botsWithSplit = useMemo(
    () => bots.filter(b => b.messagesSolo != null).length,
    [bots]
  )

  const { ranked, excluded } = useMemo(() => {
    const ranked = []
    let excluded = 0
    for (const bot of bots) {
      if (!bot.latest) continue
      const score = calcScore(bot, withoutGroup)
      if (score == null) { excluded++; continue }
      ranked.push({ ...bot, _score: score })
    }
    ranked.sort((a, b) => b._score - a._score)
    return { ranked, excluded }
  }, [bots, withoutGroup])

  const color = withoutGroup ? COLOR_WITHOUT : COLOR_WITH
  const maxScore = ranked.length > 0 ? ranked[0]._score : 0
  const pageCount = Math.ceil(ranked.length / PAGE_SIZE)
  const slice = ranked.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleToggle(val) {
    setWithoutGroup(val)
    setPage(0)
  }

  return (
    <section className="border border-border rounded-lg bg-surface">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-bold text-text-secondary mb-0.5">Average thread length</div>
            <p className="text-[13px] text-text-muted">
              Average messages per thread. Higher means users are having longer, deeper conversations — not just dropping in once.
            </p>
          </div>
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded shrink-0">
            <button
              onClick={() => handleToggle(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${!withoutGroup ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              style={!withoutGroup ? { boxShadow: `inset 0 0 0 1px ${COLOR_WITH}40` } : {}}
            >
              With group chat
            </button>
            <button
              onClick={() => handleToggle(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${withoutGroup ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              style={withoutGroup ? { boxShadow: `inset 0 0 0 1px ${COLOR_WITHOUT}40` } : {}}
            >
              Without group chat
            </button>
          </div>
        </div>
        {withoutGroup && excluded > 0 && (
          <p className="text-[11px] text-text-muted mt-2.5">
            {excluded} bot{excluded !== 1 ? 's' : ''} hidden — no solo/group split captured yet
            {botsWithSplit > 0 ? ` (${botsWithSplit} bot${botsWithSplit !== 1 ? 's' : ''} have split data)` : ''}.
            Capture with the userscript to get split data.
          </p>
        )}
      </div>

      {/* List */}
      <div className="p-5">
        {ranked.length === 0 ? (
          <p className="text-xs text-text-muted py-10 text-center">
            {withoutGroup
              ? 'No bots have solo/group split data yet. Capture stats with the userscript to unlock this view.'
              : 'No bots with snapshot data yet.'}
          </p>
        ) : (
          <>
            {slice.map((b, i) => (
              <BotRow
                key={b.id}
                bot={b}
                rank={page * PAGE_SIZE + i + 1}
                score={b._score}
                max={maxScore}
                color={color}
              />
            ))}
            <PageControls
              page={page}
              pageCount={pageCount}
              total={ranked.length}
              onPrev={() => setPage(p => p - 1)}
              onNext={() => setPage(p => p + 1)}
            />
          </>
        )}
      </div>
    </section>
  )
}
