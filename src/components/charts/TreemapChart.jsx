import { useState, useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import { Treemap, ResponsiveContainer } from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt, fmtFull } from '../../constants/format.js'

function TreeCell({ x, y, width, height, name, value, id, color, depth, onViewBot }) {
  if (depth === 0 || !width || !height || width < 2 || height < 2) return null

  const showName = width > 50 && height > 26
  const showValue = width > 60 && height > 46
  const fontSize = Math.min(13, Math.max(9, Math.floor(width / 9)))
  const maxChars = Math.max(4, Math.floor(width / (fontSize * 0.62)))
  const label = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name

  return (
    <g>
      <rect
        x={x + 1} y={y + 1}
        width={Math.max(0, width - 2)} height={Math.max(0, height - 2)}
        fill={color}
        rx={4}
        opacity={0.75}
        style={{ cursor: 'pointer' }}
        onClick={() => onViewBot?.(id)}
      />
      {showName && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showValue ? 7 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fontWeight={700}
          fontFamily="Poppins, system-ui, sans-serif"
          fill="rgba(255,255,255,0.92)"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 9}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.max(9, fontSize - 2)}
          fontFamily="Manrope, system-ui, sans-serif"
          fill="rgba(255,255,255,0.55)"
          style={{ pointerEvents: 'none' }}
        >
          {fmt(value)}
        </text>
      )}
    </g>
  )
}

export default function TreemapChart({ bots, onViewBot }) {
  const [metric, setMetric] = useState('messages')
  const m = METRICS.find(mx => mx.key === metric)

  const data = useMemo(() => {
    return bots
      .filter(b => b.latest && (b[metric] || 0) > 0)
      .map(b => ({
        name: b.name,
        size: b[metric] || 0,
        id: b.id,
        color: getAura(b.id),
      }))
      .sort((a, b) => b.size - a.size)
  }, [bots, metric])

  if (data.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm">No bots have stats to display yet.</p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <LayoutGrid size={16} className="text-accent opacity-60" />
            All bots · {m?.label}
            <span className="text-text-muted text-xs font-normal ml-1">· {data.length} bots</span>
          </div>
          <p className="text-[11px] text-text-muted pl-6">Each box is one bot — bigger box means a higher value in the selected metric. Gives a quick visual sense of who dominates your collection at a glance.</p>
        </div>
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
      </div>
      <div className="p-5">
        <div style={{ height: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              aspectRatio={4 / 3}
              isAnimationActive={false}
              content={({ x, y, width, height, name, value, id, color, depth }) => (
                <TreeCell
                  x={x} y={y} width={width} height={height}
                  name={name} value={value} id={id} color={color} depth={depth}
                  onViewBot={onViewBot}
                />
              )}
            />
          </ResponsiveContainer>
        </div>
        <p className="text-text-muted text-[11px] mt-1 text-center">
          Box size = {m?.label.toLowerCase()} · click any box to open bot details
        </p>
      </div>
    </section>
  )
}
