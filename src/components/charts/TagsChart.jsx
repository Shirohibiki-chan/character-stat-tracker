import { useState, useMemo } from 'react'
import { Tag } from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getBarColor } from '../../constants/auras.js'
import { fmt, fmtFull } from '../../constants/format.js'

// ─── Spider helpers (for detail card mini-spiders) ───────────────────────────

const SPIDER_AXES = [
  { key: 'soloMsgs'  },
  { key: 'groupMsgs' },
  { key: 'threads'   },
  { key: 'favorites' },
  { key: 'avgPerDay' },
  { key: 'favPerK'   },
]

const SPIDER_LABELS = ['Solo', 'Group', 'Thrd', 'Favs', 'Avg/d', 'F/1K']

function computeBotSpiderRaw(bot) {
  const snaps = bot._totalSnaps || []
  let avgPerDay = 0
  if (snaps.length >= 2) {
    const first = snaps[0], last = snaps[snaps.length - 1]
    const days = (new Date(last.date) - new Date(first.date)) / 86400000
    const gain = (last.messages ?? 0) - (first.messages ?? 0)
    if (days >= 1 && gain > 0) avgPerDay = gain / days
  }
  const messages  = bot.messages  ?? 0
  const favorites = bot.favorites ?? 0
  return {
    soloMsgs:  bot.messagesSolo  ?? 0,
    groupMsgs: bot.messagesGroup ?? 0,
    threads:   bot.chats         ?? 0,
    favorites,
    avgPerDay,
    favPerK: messages > 0 ? (favorites / messages * 1000) : 0,
  }
}

function MiniSpider({ normValues, color, size = 120, showLabels = true }) {
  const N     = SPIDER_AXES.length
  const cx    = size / 2
  const cy    = size / 2
  const r     = size * 0.312
  const LR    = size * 0.394

  function ang(i) { return (i / N) * 2 * Math.PI - Math.PI / 2 }

  function gridPoly(scale) {
    return SPIDER_AXES.map((_, i) => {
      const a = ang(i)
      return `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`
    }).join(' ')
  }

  const fillPts = SPIDER_AXES.map((ax, i) => {
    const a = ang(i)
    const v = Math.max(0, Math.min(1, normValues[ax.key] ?? 0))
    return `${cx + r * v * Math.cos(a)},${cy + r * v * Math.sin(a)}`
  }).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map(level => (
        <polygon
          key={level}
          points={gridPoly(level)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={0.75}
        />
      ))}
      {SPIDER_AXES.map((_, i) => {
        const a = ang(i)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={0.75}
          />
        )
      })}
      <polygon
        points={fillPts}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.9}
      />
      {SPIDER_AXES.map((ax, i) => {
        const a = ang(i)
        const v = Math.max(0, Math.min(1, normValues[ax.key] ?? 0))
        return (
          <circle
            key={i}
            cx={cx + r * v * Math.cos(a)}
            cy={cy + r * v * Math.sin(a)}
            r={2.5}
            fill={color}
          />
        )
      })}
      {showLabels && SPIDER_LABELS.map((label, i) => {
        const a    = ang(i)
        const cosA = Math.cos(a)
        const sinA = Math.sin(a)
        const lx   = cx + LR * cosA
        const ly   = cy + LR * sinA
        const anchor = cosA > 0.4 ? 'start' : cosA < -0.4 ? 'end' : 'middle'
        const dy     = sinA < -0.3 ? '0em' : sinA > 0.3 ? '0.85em' : '0.35em'
        return (
          <text
            key={i}
            x={lx} y={ly}
            textAnchor={anchor}
            dy={dy}
            fontSize={Math.max(7, size * 0.053)}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
            fill="rgba(255,255,255,0.45)"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Detail data computation ─────────────────────────────────────────────────

function computeTagDetail(bots, metric) {
  const eligible = bots.filter(b => b.latest)

  // Raw spider values + maxima computed against ALL eligible bots
  const rawMap = {}
  eligible.forEach(b => { rawMap[b.id] = computeBotSpiderRaw(b) })

  const maxima = {}
  SPIDER_AXES.forEach(ax => {
    maxima[ax.key] = Math.max(1, ...Object.values(rawMap).map(r => r[ax.key] ?? 0))
  })

  // Group bots by tag
  const tagMap = {}
  eligible.forEach(bot => {
    ;(bot.tags || []).forEach(tag => {
      if (!tagMap[tag]) tagMap[tag] = []
      tagMap[tag].push(bot)
    })
  })

  const now    = Date.now()
  const WINDOW = 30 * 86400000

  return Object.entries(tagMap).map(([tag, tagBots]) => {
    const n              = tagBots.length
    const totalMessages  = tagBots.reduce((s, b) => s + (b.messages  || 0), 0)
    const totalChats     = tagBots.reduce((s, b) => s + (b.chats     || 0), 0)
    const totalFavorites = tagBots.reduce((s, b) => s + (b.favorites || 0), 0)

    // Sum of 30-day message gains across all bots in this tag
    let gain30d = 0
    tagBots.forEach(bot => {
      const snaps = bot._totalSnaps || []
      if (snaps.length < 1) return
      const latest   = snaps[snaps.length - 1]
      const baseline = [...snaps].reverse().find(s => now - new Date(s.date).getTime() >= WINDOW)
      if (baseline) gain30d += (latest.messages ?? 0) - (baseline.messages ?? 0)
    })

    // Average of each bot's normalized spider values
    const avgNorm = {}
    SPIDER_AXES.forEach(ax => {
      const vals = tagBots.map(b => (rawMap[b.id]?.[ax.key] ?? 0) / maxima[ax.key])
      avgNorm[ax.key] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    })

    const sortVal = metric === 'messages' ? totalMessages
      : metric === 'chats'    ? totalChats
      : totalFavorites

    return {
      tag, n,
      totalMessages, totalChats, totalFavorites,
      avgMessages:  n > 0 ? totalMessages  / n : 0,
      avgFavorites: n > 0 ? totalFavorites / n : 0,
      gain30d, avgNorm, sortVal,
    }
  }).sort((a, b) => b.sortVal - a.sortVal)
}

// ─── Summary data computation ────────────────────────────────────────────────

function computeTagAggregates(bots, metric) {
  const tagMap = {}

  bots.forEach(bot => {
    if (!bot.latest) return
    ;(bot.tags || []).forEach(tag => {
      if (!tagMap[tag]) {
        tagMap[tag] = { tag, name: tag, botCount: 0, chats: 0, messages: 0, favorites: 0 }
      }
      tagMap[tag].botCount++
      tagMap[tag].chats     += bot.chats     || 0
      tagMap[tag].messages  += bot.messages  || 0
      tagMap[tag].favorites += bot.favorites || 0
    })
  })

  return Object.values(tagMap)
    .map(t => ({ ...t, _val: t[metric] || 0 }))
    .sort((a, b) => b._val - a._val)
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TagsChart({ bots, onTagClick }) {
  const [metric,     setMetric]     = useState('messages')
  const [detailMode, setDetailMode] = useState(false)
  const m = METRICS.find(mx => mx.key === metric)

  const summaryData = useMemo(() => computeTagAggregates(bots, metric), [bots, metric])
  const detailData  = useMemo(() => computeTagDetail(bots, metric),     [bots, metric])

  if (summaryData.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No tags found in the current selection.<br />
          <span className="text-muted-70 text-xs">Add tags to your bots to see aggregates here.</span>
        </p>
      </section>
    )
  }

  const tagCount = detailMode ? detailData.length : summaryData.length

  return (
    <section className="border border-border rounded-lg bg-surface">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <Tag size={16} className="text-accent opacity-60" />
          Tag totals · {tagCount} tag{tagCount !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            <button
              onClick={() => setDetailMode(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${!detailMode ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Summary
            </button>
            <button
              onClick={() => setDetailMode(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${detailMode ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Detail
            </button>
          </div>
        </div>
      </div>

      {detailMode ? (

        /* ── Detail mode ─────────────────────────────────────────── */
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {detailData.map(item => {
              const color = getBarColor(item.tag)
              return (
                <div
                  key={item.tag}
                  className={`rounded-lg bg-surface-alt p-4 border border-border hover:bg-surface transition-colors ${onTagClick ? 'cursor-pointer' : ''}`}
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  onClick={() => onTagClick?.(item.tag)}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-sm font-bold truncate" style={{ color }}>#{item.tag}</span>
                    <span className="text-xs text-text-muted shrink-0">
                      {item.n} {item.n === 1 ? 'bot' : 'bots'}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex justify-between text-xs gap-3">
                        <span className="text-text-muted">Messages</span>
                        <span className="num font-bold text-text-primary">{fmt(item.totalMessages)}</span>
                      </div>
                      <div className="flex justify-between text-xs gap-3">
                        <span className="text-text-muted pl-2">avg/bot</span>
                        <span className="num text-text-secondary">{fmt(Math.round(item.avgMessages))}</span>
                      </div>
                      <div className="flex justify-between text-xs gap-3">
                        <span className="text-text-muted">Threads</span>
                        <span className="num font-bold text-text-primary">{fmt(item.totalChats)}</span>
                      </div>
                      <div className="flex justify-between text-xs gap-3">
                        <span className="text-text-muted">Favorites</span>
                        <span className="num font-bold text-text-primary">{fmt(item.totalFavorites)}</span>
                      </div>
                      {item.gain30d > 0 && (
                        <div className="text-xs font-semibold pt-1" style={{ color: '#34d399' }}>
                          +{fmt(item.gain30d)} msgs (30d)
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      <MiniSpider normValues={item.avgNorm} color={color} size={100} showLabels={false} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-text-muted text-[11px] mt-4 text-center">
            Spider shows avg normalized profile across bots in tag · sorted by {m?.label}
          </p>
        </div>

      ) : (

        /* ── Summary mode ────────────────────────────────────────── */
        <div className="p-5">
          <div style={{ height: Math.max(300, summaryData.length * 32 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData} layout="vertical" margin={{ top: 5, right: 80, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
                <XAxis
                  type="number"
                  tickFormatter={fmt}
                  stroke="var(--color-text-muted)"
                  style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={{ stroke: 'var(--color-border)' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={n => n.length > 22 ? n.slice(0, 21) + '…' : n}
                  tick={{ fill: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13, fontFamily: 'Poppins, system-ui, sans-serif' }}
                  onClick={onTagClick ? e => onTagClick(e.value) : undefined}
                  style={{ cursor: onTagClick ? 'pointer' : 'default' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                        <div className="font-bold text-base mb-1">#{d.tag}</div>
                        <div className="text-xs text-text-secondary font-medium mb-2">
                          {d.botCount} {d.botCount === 1 ? 'bot' : 'bots'}
                        </div>
                        {METRICS.map(mx => (
                          <div key={mx.key} className="flex justify-between gap-6 text-sm">
                            <span className="text-text-secondary font-medium">{mx.label}</span>
                            <span className="num font-semibold" style={{ color: mx.color }}>{fmtFull(d[mx.key] || 0)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="_val"
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                  onClick={onTagClick ? d => onTagClick(d.tag) : undefined}
                  className={onTagClick ? 'cursor-pointer' : undefined}
                >
                  {summaryData.map(d => <Cell key={d.tag} fill={getBarColor(d.tag)} />)}
                  <LabelList
                    dataKey="_val"
                    position="right"
                    formatter={fmt}
                    style={{ fill: 'var(--color-text-primary)', fontSize: 13, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      )}
    </section>
  )
}
