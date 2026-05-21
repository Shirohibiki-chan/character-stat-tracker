import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { getAura } from '../../constants/auras.js'
import { fmtDate } from '../../constants/format.js'

const SORT_OPTIONS = [
  { value: 'messages', label: 'Messages'      },
  { value: 'start',    label: 'First capture' },
  { value: 'end',      label: 'Last capture'  },
  { value: 'duration', label: 'Duration'      },
]

const ROW_H    = 40
const LABEL_W  = 156   // px, for bot name column
const CHART_W  = 900   // logical px for date axis
const AXIS_H   = 26
const BAR_H    = 8
const DOT_R    = 3.5

function buildLifespanData(bots, sortBy) {
  const data = bots
    .map(bot => {
      const snaps = bot._totalSnaps || []
      if (snaps.length === 0) return null
      const firstDate = new Date(snaps[0].date)
      const lastDate  = new Date(snaps[snaps.length - 1].date)
      return {
        id:       bot.id,
        name:     bot.name,
        avatarUrl: bot.avatarUrl,
        firstDate,
        lastDate,
        snapDates: snaps.map(s => new Date(s.date)),
        messages:  snaps[snaps.length - 1].messages ?? 0,
        duration:  lastDate - firstDate,
        snapCount: snaps.length,
      }
    })
    .filter(Boolean)

  if (sortBy === 'start')    data.sort((a, b) => a.firstDate - b.firstDate)
  else if (sortBy === 'end') data.sort((a, b) => b.lastDate  - a.lastDate)
  else if (sortBy === 'duration') data.sort((a, b) => b.duration - a.duration)
  else                        data.sort((a, b) => b.messages - a.messages)

  return data
}

function msToHuman(ms) {
  const days = Math.round(ms / 86400000)
  if (days < 2)   return '< 2 days'
  if (days < 30)  return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export default function LifespanChart({ bots, onViewBot }) {
  const [sortBy, setSortBy] = useState('messages')
  const [hovered, setHovered] = useState(null)

  const data = useMemo(() => buildLifespanData(bots, sortBy), [bots, sortBy])

  if (data.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No snapshot history yet.<br />
          <span className="text-text-muted/70 text-xs">Capture bot stats via the userscript to see the lifespan chart.</span>
        </p>
      </section>
    )
  }

  // Overall date range with 3% padding on each side
  const minDate = data.reduce((m, d) => d.firstDate < m ? d.firstDate : m, data[0].firstDate)
  const maxDate = data.reduce((m, d) => d.lastDate  > m ? d.lastDate  : m, data[0].lastDate)
  const rawRange = Math.max(maxDate - minDate, 86400000) // at least 1 day
  const padMs  = rawRange * 0.03
  const pMin   = new Date(minDate.getTime() - padMs)
  const pMax   = new Date(maxDate.getTime() + padMs)
  const pRange = pMax - pMin

  function toX(date) { return ((date - pMin) / pRange) * CHART_W }

  // X-axis ticks
  const tickCount = 5
  const ticks = Array.from({ length: tickCount }, (_, i) => new Date(pMin.getTime() + (pRange * i) / (tickCount - 1)))

  const svgW = LABEL_W + CHART_W + 40  // 40 for snap-count label overflow
  const svgH = data.length * ROW_H + AXIS_H

  const hoveredBot = hovered ? data.find(d => d.id === hovered) : null

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <Calendar size={16} className="text-accent opacity-60" />
          Capture lifespan · {data.length} bot{data.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hoveredBot && (
            <span className="text-xs text-text-muted mr-1">
              <span className="text-text-secondary font-semibold">{hoveredBot.name}</span>
              {' · '}
              {fmtDate(hoveredBot.firstDate.toISOString())} → {fmtDate(hoveredBot.lastDate.toISOString())}
              {' · '}
              {msToHuman(hoveredBot.duration)}
              {' · '}
              {hoveredBot.snapCount} snapshot{hoveredBot.snapCount !== 1 ? 's' : ''}
            </span>
          )}
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            {SORT_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => setSortBy(s.value)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition ${sortBy === s.value ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-5 overflow-x-auto">
        <svg
          width={svgW}
          height={svgH}
          style={{ display: 'block', userSelect: 'none' }}
        >
          {/* Grid lines at tick positions */}
          {ticks.map((tick, i) => {
            const x = LABEL_W + toX(tick)
            return (
              <g key={i}>
                <line
                  x1={x} y1={0} x2={x} y2={data.length * ROW_H}
                  stroke="var(--color-border-subtle)" strokeWidth={1} strokeDasharray="3 3"
                />
                <text
                  x={x} y={data.length * ROW_H + 18}
                  textAnchor="middle" fontSize={10}
                  fill="var(--color-text-muted)"
                >
                  {tick.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            )
          })}

          {/* Bot rows */}
          {data.map((bot, idx) => {
            const y     = idx * ROW_H
            const cy    = y + ROW_H / 2
            const color = getAura(bot.id)
            const x1    = LABEL_W + toX(bot.firstDate)
            const x2    = LABEL_W + toX(bot.lastDate)
            const barW  = Math.max(x2 - x1, 4)
            const isHov = hovered === bot.id

            return (
              <g
                key={bot.id}
                onMouseEnter={() => setHovered(bot.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onViewBot?.(bot.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hover background */}
                <rect
                  x={0} y={y} width={svgW} height={ROW_H}
                  fill={isHov ? 'rgba(255,255,255,0.03)' : 'transparent'}
                />
                {/* Bot name */}
                <text
                  x={LABEL_W - 8} y={cy + 4}
                  textAnchor="end" fontSize={12} fontWeight={700}
                  fill={isHov ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}
                  style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
                >
                  {bot.name.length > 18 ? bot.name.slice(0, 17) + '…' : bot.name}
                </text>
                {/* Track */}
                <rect
                  x={LABEL_W} y={cy - BAR_H / 2}
                  width={CHART_W} height={BAR_H} rx={BAR_H / 2}
                  fill="var(--color-surface-alt)"
                />
                {/* Active bar */}
                <rect
                  x={x1} y={cy - BAR_H / 2}
                  width={barW} height={BAR_H} rx={BAR_H / 2}
                  fill={color} opacity={isHov ? 0.9 : 0.65}
                />
                {/* Snapshot dots */}
                {bot.snapDates.map((sd, di) => (
                  <circle
                    key={di}
                    cx={LABEL_W + toX(sd)} cy={cy}
                    r={DOT_R} fill={color} opacity={0.95}
                  />
                ))}
                {/* Snap count to the right */}
                <text
                  x={x2 + 8} y={cy + 4}
                  fontSize={10} fill="var(--color-text-muted)"
                >
                  {bot.snapCount}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
