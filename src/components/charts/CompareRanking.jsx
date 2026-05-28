import { useState, useMemo } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtFull } from '../../constants/format.js'

export default function CompareRanking({ myBotList, friendBotList, myName, friendName, myColor, friendColor }) {
  const [metric, setMetric] = useState('messages')
  const [topN, setTopN] = useState(15)

  const data = useMemo(() => {
    const myTagged  = myBotList.filter(b => b.latest).map(b => ({ ...b, _owner: 'my',     _val: b[metric] || 0 }))
    const fndTagged = friendBotList.filter(b => b.latest).map(b => ({ ...b, _owner: 'friend', _val: b[metric] || 0 }))
    const all = [...myTagged, ...fndTagged].sort((a, b) => b._val - a._val)
    return topN === 0 ? all : all.slice(0, topN)
  }, [myBotList, friendBotList, metric, topN])

  const m = METRICS.find(mx => mx.key === metric)
  const chartHeight = Math.max(300, data.length * 32 + 40)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-muted text-sm">No bots with snapshot data to rank.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-5 py-3 border-b border-border">
        <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
          {METRICS.map(mx => (
            <button
              key={mx.key}
              onClick={() => setMetric(mx.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${metric === mx.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              style={metric === mx.key ? { boxShadow: `inset 0 0 0 1px ${mx.color}40` } : {}}
            >
              {mx.label}
            </button>
          ))}
        </div>
        <select
          value={topN}
          onChange={e => setTopN(Number(e.target.value))}
          className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus-accent-border"
        >
          <option value={10}>Top 10</option>
          <option value={15}>Top 15</option>
          <option value={25}>Top 25</option>
          <option value={0}>All</option>
        </select>
      </div>

      <div className="p-5">
        {/* Legend */}
        <div className="flex gap-5 mb-4">
          <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: myColor }} />
            {myName}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: friendColor }} />
            {friendName}
          </div>
        </div>

        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 70, left: 0, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
              <XAxis
                type="number"
                tickFormatter={fmt}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                axisLine={false}
                tickLine={false}
                tickFormatter={n => n.length > 22 ? n.slice(0, 21) + '…' : n}
                tick={{ fill: 'var(--color-text-primary)', fontWeight: 700, fontSize: 13, fontFamily: 'Poppins, system-ui, sans-serif' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  const ownerName = d._owner === 'my' ? myName : friendName
                  const ownerColor = d._owner === 'my' ? myColor : friendColor
                  return (
                    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                      <div className="font-bold text-sm mb-0.5 truncate max-w-[220px]">{d.name}</div>
                      <div className="text-[10px] font-bold mb-2" style={{ color: ownerColor }}>{ownerName}</div>
                      {METRICS.map(mx => (
                        <div key={mx.key} className="flex justify-between gap-6 text-sm">
                          <span className="text-text-secondary font-medium">{mx.label}</span>
                          <span className="num font-semibold" style={{ color: mx.color }}>{fmtFull(d[mx.key] || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Bar dataKey="_val" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {data.map(d => (
                  <Cell key={d.id} fill={d._owner === 'my' ? myColor : friendColor} />
                ))}
                <LabelList
                  dataKey="_val"
                  position="right"
                  formatter={fmt}
                  style={{ fill: 'var(--color-text-primary)', fontSize: 13, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-text-muted text-center mt-3">
          All bots from both exports ranked together by {m?.label.toLowerCase()} · colour = owner
        </p>
      </div>
    </div>
  )
}
