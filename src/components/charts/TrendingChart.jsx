import { useState, useMemo } from 'react'
import { Zap, TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmtFull } from '../../constants/format.js'

const WINDOWS = [
  { label: '7d',  days: 7  },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
]

const MOMENTUM = {
  up:   { Icon: TrendingUp,   color: '#34d399', label: 'Accelerating' },
  flat: { Icon: Minus,        color: '#94a3b8', label: 'Steady'       },
  down: { Icon: TrendingDown, color: '#fb7185', label: 'Slowing'      },
}

function computeTrending(bots, metric, windowDays) {
  const now      = Date.now()
  const windowMs = windowDays * 86400000
  const halfMs   = windowMs / 2

  return bots
    .map(bot => {
      const snaps = bot._totalSnaps || []
      if (snaps.length < 1) return null

      const windowStart = now - windowMs
      const halfPoint   = now - halfMs

      const beforeWindow = snaps.filter(s => new Date(s.date).getTime() < windowStart)
      const inWindow     = snaps.filter(s => new Date(s.date).getTime() >= windowStart)

      const baseline = beforeWindow.length > 0
        ? beforeWindow[beforeWindow.length - 1]
        : snaps[0]
      const latest = snaps[snaps.length - 1]

      if (baseline === latest) return null

      const gain = (latest[metric] ?? 0) - (baseline[metric] ?? 0)
      if (gain <= 0) return null

      // Momentum: compare gains in first vs second half of window
      let momentum = 'flat'
      if (inWindow.length >= 2) {
        const firstHalf  = inWindow.filter(s => new Date(s.date).getTime() < halfPoint)
        const secondHalf = inWindow.filter(s => new Date(s.date).getTime() >= halfPoint)
        if (firstHalf.length >= 1 && secondHalf.length >= 1) {
          const pivot = beforeWindow.length > 0 ? beforeWindow[beforeWindow.length - 1] : firstHalf[0]
          const g1 = (firstHalf[firstHalf.length - 1][metric] ?? 0) - (pivot[metric] ?? 0)
          const g2 = (secondHalf[secondHalf.length - 1][metric] ?? 0) - (firstHalf[firstHalf.length - 1][metric] ?? 0)
          if (g1 > 10) {
            const ratio = g2 / g1
            momentum = ratio > 1.2 ? 'up' : ratio < 0.8 ? 'down' : 'flat'
          }
        }
      }

      return { ...bot, gain, momentum }
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain)
}

export default function TrendingChart({ bots, onViewBot }) {
  const [windowDays, setWindowDays] = useState(7)
  const [metric, setMetric] = useState('messages')

  const data = useMemo(
    () => computeTrending(bots, metric, windowDays),
    [bots, metric, windowDays]
  )

  const metricObj = METRICS.find(m => m.key === metric)
  const hasBots   = bots.some(b => (b._totalSnaps || []).length >= 1)

  if (!hasBots) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No snapshot history yet.<br />
          <span className="text-muted-70 text-xs">Capture bot stats via the userscript to start seeing trending data.</span>
        </p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <Zap size={16} className="text-accent opacity-60" />
          Hot right now · {data.length} bot{data.length !== 1 ? 's' : ''} gaining · last {windowDays}d
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition ${metric === m.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                style={metric === m.key ? { boxShadow: `inset 0 0 0 1px ${m.color}40` } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            {WINDOWS.map(w => (
              <button
                key={w.days}
                onClick={() => setWindowDays(w.days)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition ${windowDays === w.days ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-muted text-sm text-center max-w-xs">
            No bots gained {metricObj?.label.toLowerCase()} in the last {windowDays} days.<br />
            <span className="text-muted-70 text-xs">Try a wider window or a different metric.</span>
          </p>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {data.map((bot, i) => {
            const { Icon, color, label } = MOMENTUM[bot.momentum]
            const aura    = getAura(bot.id)
            const initial = (bot.name || '?')[0].toUpperCase()
            return (
              <button
                key={bot.id}
                onClick={() => onViewBot?.(bot.id)}
                className="relative overflow-hidden flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-alt hover-accent-border-40 hover:bg-surface transition text-left"
              >
                <div
                  className="absolute inset-y-0 right-0 w-24 pointer-events-none"
                  style={{ background: `linear-gradient(to right, transparent, ${color}1a)` }}
                />
                <span className="text-[10px] font-bold text-text-muted w-4 shrink-0 text-right num">
                  {i + 1}
                </span>
                <div
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden"
                  style={{ background: aura + '33', color: aura, border: `1.5px solid ${aura}55` }}
                >
                  {bot.avatar
                    ? <img src={bot.avatar} alt={bot.name} className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initial
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-text-primary truncate">{bot.name}</div>
                  <div className="text-[11px] num font-semibold" style={{ color: metricObj?.color }}>
                    +{fmtFull(bot.gain)} {metricObj?.label.toLowerCase()}
                  </div>
                </div>
                <div
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: `${color}22` }}
                  title={label}
                >
                  <Icon size={13} style={{ color }} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
