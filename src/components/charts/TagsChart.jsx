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

export default function TagsChart({ bots }) {
  const [metric, setMetric] = useState('messages')
  const m = METRICS.find(mx => mx.key === metric)

  const data = useMemo(
    () => computeTagAggregates(bots, metric),
    [bots, metric]
  )

  if (data.length === 0) {
    return (
      <section className="border border-stone-800 rounded-lg bg-stone-950/50 flex items-center justify-center py-20">
        <p className="text-stone-500 text-sm text-center max-w-xs">
          No tags found in the current selection.<br />
          <span className="text-stone-600 text-xs">Add tags to your bots to see aggregates here.</span>
        </p>
      </section>
    )
  }

  const chartHeight = Math.max(300, data.length * 28 + 40)

  return (
    <section className="border border-stone-800 rounded-lg bg-stone-950/50">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-stone-800">
        <div className="flex items-center gap-2 text-sm text-stone-300">
          <Tag size={16} className="text-amber-300/70" />
          Tag totals · {m?.label}
        </div>
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
      </div>
      <div className="p-5">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 80, left: 0, bottom: 5 }}>
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
                width={150}
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
                      <div className="font-medium text-sm mb-1">#{d.tag}</div>
                      <div className="text-[10px] text-stone-500 mb-1.5">
                        {d.botCount} {d.botCount === 1 ? 'bot' : 'bots'}
                      </div>
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
