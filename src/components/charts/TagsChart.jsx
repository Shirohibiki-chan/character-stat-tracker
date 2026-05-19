import { useState, useMemo } from 'react'
import { Tag } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtFull } from '../../constants/format.js'

function computeTagAggregates(bots, metric) {
  const tagMap = {}

  bots.forEach(bot => {
    if (!bot.latest) return
    ;(bot.tags || []).forEach(tag => {
      if (!tagMap[tag]) {
        tagMap[tag] = { tag, name: tag, botCount: 0, chats: 0, messages: 0, favorites: 0 }
      }
      tagMap[tag].botCount++
      tagMap[tag].chats += bot.chats || 0
      tagMap[tag].messages += bot.messages || 0
      tagMap[tag].favorites += bot.favorites || 0
    })
  })

  return Object.values(tagMap)
    .map(t => ({ ...t, _val: t[metric] || 0 }))
    .sort((a, b) => b._val - a._val)
}

function ClickableTick({ x, y, value, onTagClick }) {
  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={() => onTagClick?.(value)}
      style={{ cursor: onTagClick ? 'pointer' : 'default' }}
    >
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="var(--color-text-secondary)"
        style={{ fontSize: 12, fontFamily: 'Quicksand, system-ui, sans-serif' }}
      >
        {value}
      </text>
    </g>
  )
}

export default function TagsChart({ bots, onTagClick }) {
  const [metric, setMetric] = useState('messages')
  const m = METRICS.find(mx => mx.key === metric)

  const data = useMemo(
    () => computeTagAggregates(bots, metric),
    [bots, metric]
  )

  if (data.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No tags found in the current selection.<br />
          <span className="text-text-muted/70 text-xs">Add tags to your bots to see aggregates here.</span>
        </p>
      </section>
    )
  }

  const chartHeight = Math.max(300, data.length * 28 + 40)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Tag size={16} className="text-accent opacity-60" />
          Tag totals · {m?.label}
        </div>
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
      </div>
      <div className="p-5">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 55, left: 0, bottom: 5 }}>
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
                stroke="var(--color-text-secondary)"
                width={100}
                axisLine={false}
                tickLine={false}
                tick={props => <ClickableTick {...props} onTagClick={onTagClick} />}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                      <div className="font-bold text-sm mb-1">#{d.tag}</div>
                      <div className="text-[10px] text-text-muted mb-1.5">
                        {d.botCount} {d.botCount === 1 ? 'bot' : 'bots'}
                      </div>
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
                fill={m?.color}
                radius={[0, 3, 3, 0]}
                onClick={onTagClick ? d => onTagClick(d.tag) : undefined}
                className={onTagClick ? 'cursor-pointer' : undefined}
              >
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
