import { useState, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtFull } from '../../constants/format.js'

export default function RankingChart({ bots, onViewBot }) {
  const [metric, setMetric] = useState('messages')
  const [topN, setTopN] = useState(15)

  const m = METRICS.find(mx => mx.key === metric)

  const data = useMemo(() => {
    return [...bots]
      .filter(b => b.latest)
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
      .slice(0, topN === 9999 ? undefined : topN)
      .map(b => ({ ...b, _val: b[metric] || 0 }))
  }, [bots, metric, topN])

  if (data.length === 0) {
    return (
      <section className="border border-stone-800 rounded-lg bg-stone-950/50 flex items-center justify-center py-20">
        <p className="text-stone-500 text-sm">No bots have stats to rank yet.</p>
      </section>
    )
  }

  const chartHeight = Math.max(300, data.length * 28 + 40)

  return (
    <section className="border border-stone-800 rounded-lg bg-stone-950/50">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-stone-800">
        <div className="flex items-center gap-2 text-sm text-stone-300">
          <BarChart3 size={16} className="text-amber-300/70" />
          Top {data.length} by {m?.label.toLowerCase()}
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
          <select
            value={topN}
            onChange={e => setTopN(Number(e.target.value))}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none focus:border-amber-300/40"
          >
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={9999}>All</option>
          </select>
        </div>
      </div>
      <div className="p-5">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke="#292524" />
              <XAxis
                type="number"
                tickFormatter={fmt}
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
                      <div className="font-medium text-sm mb-1.5 truncate max-w-[200px]">{d.name}</div>
                      {METRICS.map(mx => (
                        <div key={mx.key} className="flex justify-between gap-6 text-xs">
                          <span className="text-stone-500">{mx.label}</span>
                          <span className="num" style={{ color: mx.color }}>{fmtFull(d[mx.key] || 0)}</span>
                        </div>
                      ))}
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
                  formatter={fmt}
                  style={{ fill: '#a8a29e', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
