import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt } from '../../constants/format.js'

const TOP_N = [
  { label: '10', n: 10 },
  { label: '15', n: 15 },
  { label: '25', n: 25 },
  { label: 'All', n: 0 },
]

function buildData(bots, metric, relative, topN, cohortMode) {
  const allEligible = bots
    .map(bot => {
      const totalSnaps = (bot.snapshots || [])
        .filter(s => s.scope === 'Total')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      return { bot, totalSnaps }
    })
    .filter(({ totalSnaps }) => totalSnaps.length >= 1)
    .sort((a, b) => {
      const aVal = a.totalSnaps[a.totalSnaps.length - 1][metric] ?? 0
      const bVal = b.totalSnaps[b.totalSnaps.length - 1][metric] ?? 0
      return bVal - aVal
    })

  const eligible = topN === 0 ? allEligible : allEligible.slice(0, topN)

  if (eligible.length === 0) return { data: [], eligibleBots: [], totalEligible: 0 }

  const xSet = new Set()
  eligible.forEach(({ totalSnaps }) => {
    if (cohortMode) {
      const firstTs = new Date(totalSnaps[0].date).getTime()
      totalSnaps.forEach(s => {
        xSet.add(Math.round((new Date(s.date).getTime() - firstTs) / 86400000))
      })
    } else {
      totalSnaps.forEach(s => xSet.add(new Date(s.date).getTime()))
    }
  })
  const xs = [...xSet].sort((a, b) => a - b)

  const data = xs.map(x => {
    const entry = { date: x }
    eligible.forEach(({ bot, totalSnaps }) => {
      if (cohortMode) {
        const firstTs = new Date(totalSnaps[0].date).getTime()
        const snap = totalSnaps.find(s =>
          Math.round((new Date(s.date).getTime() - firstTs) / 86400000) === x
        )
        if (snap !== undefined) {
          const base = relative ? (totalSnaps[0][metric] ?? 0) : 0
          entry[bot.id] = (snap[metric] ?? 0) - base
        }
      } else {
        const snap = totalSnaps.find(s => new Date(s.date).getTime() === x)
        if (snap !== undefined) {
          const base = relative ? (totalSnaps[0][metric] ?? 0) : 0
          entry[bot.id] = (snap[metric] ?? 0) - base
        }
      }
    })
    return entry
  })

  return {
    data,
    eligibleBots: eligible.map(({ bot }) => ({
      ...bot,
      color: getAura(bot.id),
    })),
    totalEligible: allEligible.length,
  }
}

function OverlayTooltip({ active, payload, label, relative, cohortMode }) {
  if (!active || !payload?.length) return null

  const date = cohortMode
    ? `Day ${label}`
    : new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const present = payload
    .filter(p => p.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  return (
    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl max-w-[220px]">
      <div className="text-text-muted text-[10px] mb-1.5">{date}</div>
      {present.slice(0, 12).map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
          <span className="text-text-tertiary truncate">{p.name}</span>
          <span className="num shrink-0" style={{ color: p.stroke }}>
            {relative && p.value > 0 ? '+' : ''}{fmt(p.value)}
          </span>
        </div>
      ))}
      {present.length > 12 && (
        <div className="text-text-muted text-[10px] mt-1">+{present.length - 12} more</div>
      )}
    </div>
  )
}

export default function OverlayChart({ bots, onViewBot }) {
  const [metric, setMetric] = useState('messages')
  const [relative, setRelative] = useState(false)
  const [topN, setTopN] = useState(() => {
    const saved = localStorage.getItem('overlay-topN')
    const n = saved ? Number(saved) : 10
    return TOP_N.some(t => t.n === n) ? n : 10
  })
  const [cohortMode, setCohortMode] = useState(false)

  const handleSetTopN = (n) => {
    setTopN(n)
    localStorage.setItem('overlay-topN', String(n))
  }

  const { data, eligibleBots, totalEligible } = useMemo(
    () => buildData(bots, metric, relative, topN, cohortMode),
    [bots, metric, relative, topN, cohortMode]
  )

  const metricObj = METRICS.find(m => m.key === metric)

  if (eligibleBots.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No bots have Total-scope snapshots to plot.<br />
          <span className="text-text-muted/70 text-xs">Add snapshots from the CharSnap "Total" tab.</span>
        </p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <TrendingUp size={16} className="text-accent opacity-60" />
          {topN === 0 || eligibleBots.length >= totalEligible
            ? `${eligibleBots.length} bot${eligibleBots.length !== 1 ? 's' : ''}`
            : `Top ${eligibleBots.length} of ${totalEligible}`
          } · {metricObj?.label}
          {relative && <span className="text-text-muted text-xs ml-1">(growth from first snapshot)</span>}
          {cohortMode && !relative && <span className="text-text-muted text-xs ml-1">(days since first capture)</span>}
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
            <button
              onClick={() => setRelative(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${!relative ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Total
            </button>
            <button
              onClick={() => setRelative(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${relative ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Growth
            </button>
          </div>
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            <button
              onClick={() => setCohortMode(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${!cohortMode ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setCohortMode(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${cohortMode ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Cohort
            </button>
          </div>
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            {TOP_N.map(t => (
              <button
                key={t.n}
                onClick={() => handleSetTopN(t.n)}
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
                tickFormatter={cohortMode
                  ? d => `Day ${d}`
                  : ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                scale={cohortMode ? 'linear' : 'time'}
              />
              <YAxis
                tickFormatter={fmt}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                width={52}
              />
              <Tooltip
                content={(props) => (
                  <OverlayTooltip {...props} eligibleBots={eligibleBots} relative={relative} cohortMode={cohortMode} />
                )}
              />
              {eligibleBots.map(bot => (
                <Line
                  key={bot.id}
                  type="monotone"
                  dataKey={bot.id}
                  name={bot.name}
                  stroke={bot.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
          {eligibleBots.map(bot => (
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
