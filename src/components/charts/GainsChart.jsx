import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getBarColor } from '../../constants/auras.js'
import { fmt, fmtFull, fmtDate } from '../../constants/format.js'

const WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0 },
]

function computeGains(bots, metric, windowDays) {
  const now = Date.now()
  const windowMs = windowDays === 0 ? Infinity : windowDays * 24 * 60 * 60 * 1000
  const windowStart = now - windowMs

  return bots
    .map(bot => {
      const totalSnaps = (bot.snapshots || [])
        .filter(s => s.scope === 'Total')
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      if (totalSnaps.length < 2) return null

      const recent = totalSnaps[totalSnaps.length - 1]

      const beforeWindow = totalSnaps.filter(s => new Date(s.date).getTime() <= windowStart)
      const baseline = beforeWindow.length > 0
        ? beforeWindow[beforeWindow.length - 1]
        : totalSnaps[0]

      if (baseline === recent) return null

      const gain = (recent[metric] ?? 0) - (baseline[metric] ?? 0)
      if (gain <= 0) return null

      return {
        ...bot,
        gain,
        _val: gain,
        fromDate: baseline.date,
        toDate: recent.date,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain)
}

export default function GainsChart({ bots, onViewBot }) {
  const [windowDays, setWindowDays] = useState(30)
  const [metric, setMetric] = useState('messages')

  const m = METRICS.find(mx => mx.key === metric)

  const data = useMemo(
    () => computeGains(bots, metric, windowDays),
    [bots, metric, windowDays]
  )

  const windowLabel = WINDOWS.find(w => w.days === windowDays)?.label ?? ''

  if (data.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No gains found in this window.<br />
          <span className="text-text-muted/70 text-xs">
            Bots need at least 2 Total-scope snapshots to compute gains. Try a wider window.
          </span>
        </p>
      </section>
    )
  }

  const chartHeight = Math.max(300, data.length * 32 + 40)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <TrendingUp size={16} className="text-accent opacity-60" />
          Top gainers · {m?.label} · {windowDays === 0 ? 'all time' : `last ${windowLabel}`}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            {METRICS.map(mx => (
              <button
                key={mx.key}
                onClick={() => setMetric(mx.key)}
                className={`px-2.5 py-1 text-xs rounded transition ${metric === mx.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                style={metric === mx.key ? { boxShadow: `inset 0 0 0 1px ${mx.color}40` } : {}}
              >
                {mx.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            {WINDOWS.map(w => (
              <button
                key={w.days}
                onClick={() => setWindowDays(w.days)}
                className={`px-2.5 py-1 text-xs rounded transition ${windowDays === w.days ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-5">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 70, left: 0, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
              <XAxis
                type="number"
                tickFormatter={n => '+' + fmt(n)}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-primary)', fontWeight: 700, fontSize: 14, fontFamily: 'Poppins, system-ui, sans-serif' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                      <div className="font-bold text-base mb-1 truncate max-w-[220px]">{d.name}</div>
                      <div className="text-xs text-text-muted mb-1.5">
                        {fmtDate(d.fromDate)} → {fmtDate(d.toDate)}
                      </div>
                      <div className="flex justify-between gap-6 text-sm">
                        <span className="text-text-secondary font-medium">{m?.label} gain</span>
                        <span className="num font-semibold" style={{ color: m?.color }}>+{fmtFull(d.gain)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="_val"
                radius={[0, 3, 3, 0]}
                onClick={d => onViewBot?.(d.id)}
                className="cursor-pointer"
              >
                {data.map(d => <Cell key={d.id} fill={getBarColor(d.id)} />)}
                <LabelList
                  dataKey="_val"
                  position="right"
                  formatter={n => '+' + fmt(n)}
                  style={{ fill: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
