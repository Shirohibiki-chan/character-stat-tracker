import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getBarColor } from '../../constants/auras.js'
import { fmt, fmtFull, fmtDate } from '../../constants/format.js'

function latestTotalDate(bots) {
  let latest = null
  bots.forEach(bot => {
    ;(bot.snapshots || [])
      .filter(s => s.scope === 'Total')
      .forEach(s => { if (!latest || s.date > latest) latest = s.date })
  })
  return latest ? latest.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

function computeHistory(bots, metric, targetDate) {
  const target = new Date(targetDate + 'T23:59:59').getTime()

  return bots
    .map(bot => {
      const totalSnaps = (bot.snapshots || [])
        .filter(s => s.scope === 'Total')
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      if (totalSnaps.length < 2) return null

      const atOrBefore = totalSnaps.filter(s => new Date(s.date).getTime() <= target)
      if (atOrBefore.length < 2) return null

      const snap = atOrBefore[atOrBefore.length - 1]
      const prev = atOrBefore[atOrBefore.length - 2]

      const gain = (snap[metric] ?? 0) - (prev[metric] ?? 0)
      if (gain <= 0) return null

      return {
        ...bot,
        gain,
        _val: gain,
        snapDate: snap.date,
        prevSnapDate: prev.date,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain)
}

export default function HistoryChart({ bots, onViewBot }) {
  const [targetDate, setTargetDate] = useState(() => latestTotalDate(bots))
  const [metric, setMetric] = useState('messages')

  const m = METRICS.find(mx => mx.key === metric)

  const data = useMemo(
    () => computeHistory(bots, metric, targetDate),
    [bots, metric, targetDate]
  )

  const chartHeight = Math.max(300, data.length * 28 + 40)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Calendar size={16} className="text-accent opacity-60" />
          Top gainers on {fmtDate(targetDate)} · {m?.label}
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
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-muted text-sm text-center max-w-xs">
            No gains found on or before this date.<br />
            <span className="text-text-muted/70 text-xs">
              Each bot needs at least 2 Total-scope snapshots at or before the selected date.
            </span>
          </p>
        </div>
      ) : (
        <div className="p-5">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 70, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
                <XAxis
                  type="number"
                  tickFormatter={n => '+' + fmt(n)}
                  stroke="var(--color-text-muted)"
                  style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={{ stroke: 'var(--color-border)' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-primary)', fontWeight: 600, fontSize: 13, fontFamily: 'Poppins, system-ui, sans-serif' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                        <div className="font-bold text-sm mb-1 truncate max-w-[200px]">{d.name}</div>
                        <div className="text-xs text-text-muted mb-1.5">
                          {fmtDate(d.prevSnapDate)} → {fmtDate(d.snapDate)}
                        </div>
                        <div className="flex justify-between gap-6 text-xs">
                          <span className="text-text-muted">{m?.label} gain</span>
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
                    style={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}
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
