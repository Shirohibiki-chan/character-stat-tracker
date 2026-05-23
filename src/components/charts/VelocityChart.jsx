import { useState, useMemo } from 'react'
import { Activity } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt, fmtFull } from '../../constants/format.js'

const TOP_N = [
  { label: '10', n: 10 },
  { label: '15', n: 15 },
  { label: '25', n: 25 },
  { label: 'All', n: 0 },
]

function buildVelocityData(bots, metric, topN) {
  const allEligible = bots
    .map(bot => {
      const snaps = bot._totalSnaps || []
      if (snaps.length < 2) return null

      const velocityPoints = []
      for (let i = 1; i < snaps.length; i++) {
        const prev = snaps[i - 1]
        const curr = snaps[i]
        const days = (new Date(curr.date) - new Date(prev.date)) / 86400000
        const delta = (curr[metric] ?? 0) - (prev[metric] ?? 0)
        if (days >= 0.5 && delta >= 0) {
          velocityPoints.push({
            date: new Date(curr.date).getTime(),
            rate: delta / days,
          })
        }
      }

      if (velocityPoints.length === 0) return null
      const latestRate = velocityPoints[velocityPoints.length - 1].rate
      return { bot, velocityPoints, latestRate }
    })
    .filter(Boolean)
    .sort((a, b) => b.latestRate - a.latestRate)

  const eligible = topN === 0 ? allEligible : allEligible.slice(0, topN)
  if (eligible.length === 0) return { data: [], eligibleBots: [], totalEligible: allEligible.length }

  const dateSet = new Set()
  eligible.forEach(({ velocityPoints }) => velocityPoints.forEach(p => dateSet.add(p.date)))
  const dates = [...dateSet].sort((a, b) => a - b)

  const data = dates.map(ts => {
    const entry = { date: ts }
    eligible.forEach(({ bot, velocityPoints }) => {
      const pt = velocityPoints.find(p => p.date === ts)
      if (pt !== undefined) entry[bot.id] = pt.rate
    })
    return entry
  })

  return {
    data,
    eligibleBots: eligible.map(({ bot }) => ({ ...bot, color: getAura(bot.id) })),
    totalEligible: allEligible.length,
  }
}

function VelocityTooltip({ active, payload, label, metricObj }) {
  if (!active || !payload?.length) return null
  const date = new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
            {fmtFull(Math.round(p.value))}/day
          </span>
        </div>
      ))}
      {present.length > 12 && (
        <div className="text-text-muted text-[10px] mt-1">+{present.length - 12} more</div>
      )}
    </div>
  )
}

export default function VelocityChart({ bots, onViewBot }) {
  const [metric, setMetric] = useState('messages')
  const [topN, setTopN] = useState(10)

  const { data, eligibleBots, totalEligible } = useMemo(
    () => buildVelocityData(bots, metric, topN),
    [bots, metric, topN]
  )

  const metricObj = METRICS.find(m => m.key === metric)
  const botsWithHistory = bots.filter(b => (b._totalSnaps || []).length >= 2).length

  if (botsWithHistory === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          Not enough snapshot history yet.<br />
          <span className="text-muted-70 text-xs">Capture at least 2 snapshots per bot to see growth rate over time.</span>
        </p>
      </section>
    )
  }

  if (eligibleBots.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No velocity data for this metric yet.
          <span className="block text-muted-70 text-xs mt-1">Try a different metric or capture more snapshots.</span>
        </p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <Activity size={16} className="text-accent opacity-60" />
          {topN === 0 || eligibleBots.length >= totalEligible
            ? `${eligibleBots.length} bot${eligibleBots.length !== 1 ? 's' : ''}`
            : `Top ${eligibleBots.length} of ${totalEligible}`
          } · {metricObj?.label} per day
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
                tickFormatter={n => fmt(Math.round(n))}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                width={52}
              />
              <Tooltip content={props => <VelocityTooltip {...props} metricObj={metricObj} />} />
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
