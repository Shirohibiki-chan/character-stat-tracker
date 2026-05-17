import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
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

      // All snapshots at or before the target date
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
    <section className="border border-stone-800 rounded-lg bg-stone-950/50">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-stone-800">
        <div className="flex items-center gap-2 text-sm text-stone-300">
          <Calendar size={16} className="text-amber-300/70" />
          Top gainers on {fmtDate(targetDate)} · {m?.label}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-0.5 bg-stone-900 rounded">
            {METRICS.map(mx => (
              <button
                key={mx.key}
                onClick={() => setMetric(mx.key)}
                className={`px-2.5 py-1 text-xs rounded transition ${metric === mx.key ? 'bg-stone-800 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}
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
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none focus:border-amber-300/40"
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-stone-500 text-sm text-center max-w-xs">
            No gains found on or before this date.<br />
            <span className="text-stone-600 text-xs">
              Each bot needs at least 2 Total-scope snapshots at or before the selected date.
            </span>
          </p>
        </div>
      ) : (
        <div className="p-5">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 55, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal={false} stroke="#292524" />
                <XAxis
                  type="number"
                  tickFormatter={n => '+' + fmt(n)}
                  stroke="#78716c"
                  style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: '#44403c' }}
                  tickLine={{ stroke: '#44403c' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#a8a29e"
                  width={100}
                  style={{ fontSize: 12, fontFamily: 'Geist, system-ui, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a8a29e' }}
                />
                <Tooltip
                  cursor={{ fill: '#ffffff08' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-stone-950 border border-stone-700 rounded px-3 py-2 shadow-xl">
                        <div className="font-medium text-sm mb-1 truncate max-w-[200px]">{d.name}</div>
                        <div className="text-[10px] text-stone-500 mb-1.5">
                          {fmtDate(d.prevSnapDate)} → {fmtDate(d.snapDate)}
                        </div>
                        <div className="flex justify-between gap-6 text-xs">
                          <span className="text-stone-500">{m?.label} gain</span>
                          <span className="num" style={{ color: m?.color }}>+{fmtFull(d.gain)}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="_val"
                  fill={m?.color}
                  radius={[0, 3, 3, 0]}
                  onClick={d => onViewBot?.(d.id)}
                  className="cursor-pointer"
                >
                  <LabelList
                    dataKey="_val"
                    position="right"
                    formatter={n => '+' + fmt(n)}
                    style={{ fill: '#a8a29e', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
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
