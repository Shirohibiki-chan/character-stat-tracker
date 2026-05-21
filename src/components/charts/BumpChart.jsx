import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'

const TOP_N = [
  { label: '10', n: 10 },
  { label: '15', n: 15 },
  { label: '20', n: 20 },
]

function buildBumpData(bots, metric, topN) {
  const eligible = bots.filter(b => (b._totalSnaps || []).length >= 1)
  if (eligible.length < 2) return { data: [], lines: [], maxRank: 0 }

  // Collect all unique calendar days across all eligible bots
  const daySet = new Set()
  eligible.forEach(b => (b._totalSnaps || []).forEach(s => daySet.add(s.date.slice(0, 10))))
  const sortedDays = [...daySet].sort()
  if (sortedDays.length < 2) return { data: [], lines: [], maxRank: 0 }

  // Build per-bot date → value lookup
  const snapMaps = new Map()
  eligible.forEach(b => {
    const snaps = b._totalSnaps || []
    // byDay: last snap on each day
    const byDay = {}
    snaps.forEach(s => { byDay[s.date.slice(0, 10)] = s })
    snapMaps.set(b.id, { byDay, snaps })
  })

  // Get last known metric value for a bot at or before the given day
  function getValueAtDay(botId, day) {
    const { byDay, snaps } = snapMaps.get(botId)
    if (byDay[day]) return byDay[day][metric] ?? 0
    const before = snaps.filter(s => s.date.slice(0, 10) <= day)
    if (before.length === 0) return null
    return before[before.length - 1][metric] ?? 0
  }

  // Determine top N bots by their value on the last day
  const lastDay = sortedDays[sortedDays.length - 1]
  const topBots = eligible
    .map(b => ({ bot: b, val: getValueAtDay(b.id, lastDay) }))
    .filter(x => x.val != null)
    .sort((a, b) => (b.val ?? 0) - (a.val ?? 0))
    .slice(0, topN)
    .map(x => x.bot)

  if (topBots.length === 0) return { data: [], lines: [], maxRank: 0 }

  // Build rank chart data: one entry per day, rank per bot among ALL eligible bots
  const data = sortedDays.map(day => {
    const ts = new Date(day).getTime()
    const entry = { date: ts }

    const vals = eligible
      .map(b => ({ id: b.id, val: getValueAtDay(b.id, day) }))
      .filter(x => x.val != null)
      .sort((a, b) => (b.val ?? 0) - (a.val ?? 0))

    const rankMap = {}
    vals.forEach((v, i) => { rankMap[v.id] = i + 1 })

    topBots.forEach(b => {
      const r = rankMap[b.id]
      if (r != null) entry[b.id] = r
    })

    return entry
  })

  return {
    data,
    lines: topBots.map(b => ({ ...b, color: getAura(b.id) })),
    maxRank: topBots.length,
  }
}

function BumpTooltip({ active, payload, label, lines }) {
  if (!active || !payload?.length) return null
  const date = new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const present = payload
    .filter(p => p.value != null)
    .sort((a, b) => (a.value ?? 99) - (b.value ?? 99))

  return (
    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl max-w-[220px]">
      <div className="text-text-muted text-[10px] mb-1.5">{date}</div>
      {present.slice(0, 12).map(p => {
        const bot = lines.find(l => l.id === p.dataKey)
        return (
          <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
            <span className="text-text-tertiary truncate">{bot?.name || p.name}</span>
            <span className="num shrink-0 font-semibold" style={{ color: p.stroke }}>#{p.value}</span>
          </div>
        )
      })}
      {present.length > 12 && (
        <div className="text-text-muted text-[10px] mt-1">+{present.length - 12} more</div>
      )}
    </div>
  )
}

export default function BumpChart({ bots, onViewBot }) {
  const [metric, setMetric] = useState('messages')
  const [topN,   setTopN]   = useState(10)

  const { data, lines, maxRank } = useMemo(
    () => buildBumpData(bots, metric, topN),
    [bots, metric, topN]
  )

  const eligibleCount = bots.filter(b => (b._totalSnaps || []).length >= 1).length
  const uniqueDays = useMemo(() => {
    const s = new Set()
    bots.forEach(b => (b._totalSnaps || []).forEach(snap => s.add(snap.date.slice(0, 10))))
    return s.size
  }, [bots])

  const metricObj = METRICS.find(m => m.key === metric)

  if (eligibleCount < 2) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          Not enough bots to compare ranks.<br />
          <span className="text-text-muted/70 text-xs">Need at least 2 bots with Total-scope snapshots.</span>
        </p>
      </section>
    )
  }

  if (uniqueDays < 2) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          Need snapshot history across multiple dates to show rank changes.<br />
          <span className="text-text-muted/70 text-xs">Capture snapshots on different days to see the rank chart populate.</span>
        </p>
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No rank data available for this metric.
        </p>
      </section>
    )
  }

  const yTicks = Array.from({ length: Math.min(maxRank, 10) }, (_, i) => i + 1)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <ArrowUpDown size={16} className="text-accent opacity-60" />
          Rank over time · top {lines.length} · {metricObj?.label}
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
            {TOP_N.map(t => (
              <button
                key={t.n}
                onClick={() => setTopN(t.n)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition ${topN === t.n ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-5">
        <div style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                scale="time"
              />
              <YAxis
                reversed
                domain={[1, maxRank]}
                ticks={yTicks}
                allowDecimals={false}
                tickFormatter={n => `#${n}`}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                width={36}
              />
              <Tooltip content={props => <BumpTooltip {...props} lines={lines} />} />
              {lines.map(bot => (
                <Line
                  key={bot.id}
                  type="monotone"
                  dataKey={bot.id}
                  name={bot.name}
                  stroke={bot.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: bot.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
          {lines.map(bot => (
            <button
              key={bot.id}
              onClick={() => onViewBot?.(bot.id)}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary hover:text-text-primary transition min-w-0"
              title={bot.name}
            >
              <div className="w-4 h-[2px] rounded-full shrink-0" style={{ backgroundColor: bot.color }} />
              <span className="truncate max-w-[140px]">{bot.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
