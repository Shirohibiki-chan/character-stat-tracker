import { useState, useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura, getBarColor } from '../../constants/auras.js'
import { fmt, fmtFull } from '../../constants/format.js'

export default function ScatterPlot({ bots, onViewBot }) {
  const [xKey, setXKey] = useState('messages')
  const [yKey, setYKey] = useState('favorites')
  const [zKey, setZKey] = useState('chats')
  const [colorByTag, setColorByTag] = useState(false)

  const rawData = useMemo(() => {
    return bots
      .filter(b => b.latest)
      .map(b => ({
        id: b.id,
        name: b.name,
        x: b[xKey] || 0,
        y: b[yKey] || 0,
        z: b[zKey] || 0,
        messages: b.messages || 0,
        chats: b.chats || 0,
        favorites: b.favorites || 0,
        tag: b.tags?.[0] || '',
      }))
  }, [bots, xKey, yKey, zKey])

  const data = useMemo(() => {
    const maxZ = Math.max(1, ...rawData.map(d => d.z))
    return rawData.map(d => ({
      ...d,
      r: 4 + (d.z / maxZ) * 16,
      color: colorByTag ? getBarColor(d.tag || d.id) : getAura(d.id),
    }))
  }, [rawData, colorByTag])

  const avgX = useMemo(() => data.length ? data.reduce((s, d) => s + d.x, 0) / data.length : 0, [data])
  const avgY = useMemo(() => data.length ? data.reduce((s, d) => s + d.y, 0) / data.length : 0, [data])

  const xM = METRICS.find(m => m.key === xKey)
  const yM = METRICS.find(m => m.key === yKey)
  const zM = METRICS.find(m => m.key === zKey)

  if (data.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm">No bots have stats to plot yet.</p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <Crosshair size={16} className="text-accent opacity-60" />
          {xM?.label} vs {yM?.label}
          <span className="text-text-muted text-xs font-normal ml-1">· {data.length} bots</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-text-muted">X</span>
            <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setXKey(m.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${xKey === m.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                  style={xKey === m.key ? { boxShadow: `inset 0 0 0 1px ${m.color}40` } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-text-muted">Y</span>
            <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setYKey(m.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${yKey === m.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                  style={yKey === m.key ? { boxShadow: `inset 0 0 0 1px ${m.color}40` } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-text-muted">Size</span>
            <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setZKey(m.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${zKey === m.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                  style={zKey === m.key ? { boxShadow: `inset 0 0 0 1px ${m.color}40` } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            <button
              onClick={() => setColorByTag(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${!colorByTag ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              By bot
            </button>
            <button
              onClick={() => setColorByTag(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${colorByTag ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              By tag
            </button>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name={xM?.label}
                tickFormatter={fmt}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                label={{ value: xM?.label, position: 'insideBottom', offset: -10, fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yM?.label}
                tickFormatter={fmt}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                width={52}
                label={{ value: yM?.label, angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
              />
              <ReferenceLine x={avgX} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 4" />
              <ReferenceLine y={avgY} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                      <div className="font-bold text-base mb-1.5 truncate max-w-[220px]">{d.name}</div>
                      {d.tag && <div className="text-xs text-text-muted mb-1.5">#{d.tag}</div>}
                      {METRICS.map(mx => (
                        <div key={mx.key} className="flex justify-between gap-6 text-sm">
                          <span className="text-text-secondary font-medium">{mx.label}</span>
                          <span className="num font-semibold" style={{ color: mx.color }}>{fmtFull(d[mx.key])}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Scatter
                data={data}
                shape={({ cx, cy, payload }) => (
                  <g onClick={() => onViewBot?.(payload.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={payload.r} fill={payload.color} opacity={0.82} />
                    <circle cx={cx} cy={cy} r={Math.max(payload.r + 2, 8)} fill="transparent" />
                  </g>
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-text-muted text-[11px] mt-1 text-center">
          Dashed lines mark averages · bubble size = {zM?.label} · click any dot to open bot details
        </p>
      </div>
    </section>
  )
}
