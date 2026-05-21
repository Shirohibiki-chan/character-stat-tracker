import { useState, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
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
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm">No bots have stats to rank yet.</p>
      </section>
    )
  }

  const chartHeight = Math.max(300, data.length * 28 + 40)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <BarChart3 size={16} className="text-accent opacity-60" />
          Top {data.length} by {m?.label.toLowerCase()}
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
          <select
            value={topN}
            onChange={e => setTopN(Number(e.target.value))}
            className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent/50"
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
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 70, left: 0, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
              <XAxis
                type="number"
                tickFormatter={fmt}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
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
                      <div className="font-bold text-sm mb-1.5 truncate max-w-[200px]">{d.name}</div>
                      {METRICS.map(mx => (
                        <div key={mx.key} className="flex justify-between gap-6 text-xs">
                          <span className="text-text-muted">{mx.label}</span>
                          <span className="num" style={{ color: mx.color }}>{fmtFull(d[mx.key] || 0)}</span>
                        </div>
                      ))}
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
                {data.map(d => <Cell key={d.id} fill={getAura(d.id)} />)}
                <LabelList
                  dataKey="_val"
                  position="right"
                  formatter={fmt}
                  style={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
