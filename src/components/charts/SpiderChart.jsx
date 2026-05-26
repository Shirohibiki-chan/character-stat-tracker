import { useState, useMemo, useRef, useEffect } from 'react'
import { Hexagon, Grid2X2, User, ChevronDown, Search, X } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { getAura } from '../../constants/auras.js'
import { fmt, fmtFull } from '../../constants/format.js'

const SPIDER_COLORS = ['#7dd3fc', '#a78bfa', '#f472b6', '#34d399']
const MAX_BOTS = 4

const AXES = [
  { key: 'soloMsgs',  label: 'Solo msgs'  },
  { key: 'groupMsgs', label: 'Group msgs' },
  { key: 'threads',   label: 'Threads'    },
  { key: 'favorites', label: 'Favorites'  },
  { key: 'avgPerDay', label: 'Msgs / day' },
  { key: 'favPerK',   label: 'Favs / 1K'  },
]

function computeRaw(bot) {
  const snaps = bot._totalSnaps || []
  let avgPerDay = 0
  if (snaps.length >= 2) {
    const first = snaps[0]
    const last = snaps[snaps.length - 1]
    const days = (new Date(last.date) - new Date(first.date)) / 86400000
    const gain = (last.messages ?? 0) - (first.messages ?? 0)
    if (days >= 1 && gain > 0) avgPerDay = gain / days
  }
  const messages = bot.messages ?? 0
  const favorites = bot.favorites ?? 0
  return {
    soloMsgs:  bot.messagesSolo  ?? 0,
    groupMsgs: bot.messagesGroup ?? 0,
    threads:   bot.chats         ?? 0,
    favorites,
    avgPerDay,
    favPerK:   messages > 0 ? (favorites / messages * 1000) : 0,
  }
}

function buildMaps(bots) {
  const rawMap = {}
  bots.forEach(b => { rawMap[b.id] = computeRaw(b) })

  const maxima = {}
  AXES.forEach(ax => {
    maxima[ax.key] = Math.max(1, ...Object.values(rawMap).map(r => r[ax.key]))
  })

  const normMap = {}
  Object.entries(rawMap).forEach(([id, raw]) => {
    normMap[id] = {}
    AXES.forEach(ax => {
      normMap[id][ax.key] = raw[ax.key] / maxima[ax.key]
    })
  })

  return { rawMap, normMap }
}

// ─── Searchable bot picker ──────────────────────────────────────────────────

function BotPicker({ bots, value, onChange, placeholder, excludeIds = [] }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setQ('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected = bots.find(b => b.id === value)
  const options = bots.filter(
    b => !excludeIds.includes(b.id) && b.name.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setQ('') }}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt border border-border rounded text-sm hover-accent-border-40 transition min-w-[160px] max-w-[240px]"
      >
        <span className={`truncate flex-1 text-left ${selected ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown size={12} className="text-text-muted shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-64 bg-bg border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search bots…"
                className="w-full bg-surface-alt rounded pl-8 pr-6 py-1.5 text-xs text-text-primary focus:outline-none"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-xs text-text-muted p-3 text-center">No bots found</p>
            ) : (
              options.map(b => (
                <button
                  key={b.id}
                  onClick={() => { onChange(b.id); setOpen(false); setQ('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-surface transition flex items-center justify-between gap-2 ${b.id === value ? 'text-accent-light' : 'text-text-primary'}`}
                >
                  <span className="truncate">{b.name}</span>
                  <span className="text-xs text-text-muted num shrink-0">{fmt(b.messages || 0)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pure SVG mini radar (gallery cards) ────────────────────────────────────

// Short axis labels — same order as AXES
const MINI_LABELS = ['Solo', 'Group', 'Thrd', 'Favs', 'Avg/d', 'F/1K']

function MiniSpider({ normValues, color }) {
  const N = AXES.length
  // 160×160 viewBox gives enough room for axis labels around the outside
  const cx = 80, cy = 80, r = 50, LABEL_R = 63

  function ang(i) {
    return (i / N) * 2 * Math.PI - Math.PI / 2
  }

  function gridPoly(scale) {
    return AXES.map((_, i) => {
      const a = ang(i)
      return `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`
    }).join(' ')
  }

  const fillPts = AXES.map((ax, i) => {
    const a = ang(i)
    const v = Math.max(0, Math.min(1, normValues[ax.key] ?? 0))
    return `${cx + r * v * Math.cos(a)},${cy + r * v * Math.sin(a)}`
  }).join(' ')

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map(level => (
        <polygon
          key={level}
          points={gridPoly(level)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={0.75}
        />
      ))}
      {AXES.map((_, i) => {
        const a = ang(i)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={0.75}
          />
        )
      })}
      <polygon
        points={fillPts}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.9}
      />
      {AXES.map((ax, i) => {
        const a = ang(i)
        const v = Math.max(0, Math.min(1, normValues[ax.key] ?? 0))
        return (
          <circle
            key={i}
            cx={cx + r * v * Math.cos(a)}
            cy={cy + r * v * Math.sin(a)}
            r={2.5}
            fill={color}
          />
        )
      })}
      {/* Axis labels */}
      {MINI_LABELS.map((label, i) => {
        const a = ang(i)
        const cosA = Math.cos(a)
        const sinA = Math.sin(a)
        const lx = cx + LABEL_R * cosA
        const ly = cy + LABEL_R * sinA
        const anchor = cosA > 0.4 ? 'start' : cosA < -0.4 ? 'end' : 'middle'
        const dy = sinA < -0.3 ? '0em' : sinA > 0.3 ? '0.85em' : '0.35em'
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dy={dy}
            fontSize={8.5}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
            fill="rgba(255,255,255,0.45)"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SpiderChart({ bots, onViewBot, mode, setMode, selectedIds, setSelectedIds }) {
  const { rawMap, normMap } = useMemo(() => buildMaps(bots), [bots])

  // Auto-select the first bot (highest messages) when nothing is selected yet
  useEffect(() => {
    if (selectedIds.length === 0 && bots.length > 0) {
      setSelectedIds([bots[0].id])
    }
  }, [bots, selectedIds, setSelectedIds])

  const selectedBots = useMemo(
    () => selectedIds.map(id => bots.find(b => b.id === id)).filter(Boolean),
    [selectedIds, bots]
  )

  const radarData = useMemo(() => AXES.map(ax => {
    const row = { axis: ax.label, fullMark: 1 }
    selectedIds.forEach(id => { row[id] = normMap[id]?.[ax.key] ?? 0 })
    return row
  }), [selectedIds, normMap])

  function setPrimary(id) {
    setSelectedIds(prev => [id, ...prev.filter(x => x !== id).slice(0, MAX_BOTS - 1)])
  }

  function addCompare(id) {
    if (!id || selectedIds.includes(id) || selectedIds.length >= MAX_BOTS) return
    setSelectedIds(prev => [...prev, id])
  }

  function removeBot(id) {
    setSelectedIds(prev => prev.filter(x => x !== id))
  }

  if (bots.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm">No bots have stats to display yet.</p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg bg-surface">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <Hexagon size={16} className="text-accent opacity-60" />
            Spider chart · {bots.length} bot{bots.length !== 1 ? 's' : ''}
          </div>
          <p className="text-[13px] text-text-muted pl-6">Shows a bot's profile across six metrics at once. The further a point extends from the center, the higher that metric is relative to your other bots. Compare up to four bots side by side.</p>
        </div>
        <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
          <button
            onClick={() => setMode('single')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${mode === 'single' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <User size={11} /> Single
          </button>
          <button
            onClick={() => setMode('gallery')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${mode === 'gallery' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Grid2X2 size={11} /> Gallery
          </button>
        </div>
      </div>

      {mode === 'single' ? (

        /* ── Single mode ─────────────────────────────────────────────── */
        <div className="p-5">

          {/* Bot selection row */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Primary</span>
              <BotPicker
                bots={bots}
                value={selectedIds[0] ?? null}
                onChange={setPrimary}
                placeholder="Pick a bot…"
                excludeIds={selectedIds.slice(1)}
              />
            </div>

            {/* Comparison chips */}
            {selectedIds.slice(1).map((id, i) => {
              const b = bots.find(bot => bot.id === id)
              return (
                <div
                  key={id}
                  className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded border text-xs font-semibold"
                  style={{ borderColor: SPIDER_COLORS[i + 1] + '60', color: SPIDER_COLORS[i + 1] }}
                >
                  <span className="truncate max-w-[100px]">{b?.name ?? '—'}</span>
                  <button onClick={() => removeBot(id)} className="opacity-60 hover:opacity-100 transition ml-0.5">
                    <X size={10} />
                  </button>
                </div>
              )
            })}

            {/* Add comparison picker */}
            {selectedIds.length < MAX_BOTS && selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Compare</span>
                <BotPicker
                  bots={bots}
                  value={null}
                  onChange={addCompare}
                  placeholder="+ Add bot…"
                  excludeIds={selectedIds}
                />
              </div>
            )}
          </div>

          {selectedIds.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-text-muted text-sm">Pick a bot above to see its spider chart.</p>
            </div>
          ) : (
            <>
              <div style={{ height: 480 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <PolarGrid stroke="var(--color-border-subtle)" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600 }}
                    />
                    <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                    <Tooltip
                      content={({ active, label }) => {
                        if (!active || !label) return null
                        const axisObj = AXES.find(a => a.label === label)
                        if (!axisObj) return null
                        return (
                          <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                            <div className="text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">{label}</div>
                            {selectedBots.map((bot, i) => {
                              const raw = rawMap[bot.id]?.[axisObj.key] ?? 0
                              const display = axisObj.key === 'favPerK'
                                ? raw.toFixed(1)
                                : fmtFull(Math.round(raw))
                              return (
                                <div key={bot.id} className="flex justify-between gap-4 text-sm">
                                  <span className="font-semibold truncate max-w-[130px]" style={{ color: SPIDER_COLORS[i] }}>{bot.name}</span>
                                  <span className="num text-text-primary">{display}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      }}
                    />
                    {selectedBots.map((bot, i) => (
                      <Radar
                        key={bot.id}
                        name={bot.name}
                        dataKey={bot.id}
                        stroke={SPIDER_COLORS[i]}
                        fill={SPIDER_COLORS[i]}
                        fillOpacity={i === 0 ? 0.25 : 0.15}
                        strokeWidth={i === 0 ? 2 : 1.5}
                        dot={{ r: 3, fill: SPIDER_COLORS[i], strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3 flex-wrap">
                {selectedBots.map((bot, i) => (
                  <div key={bot.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block w-3 rounded-full"
                      style={{ height: 2, background: SPIDER_COLORS[i] }}
                    />
                    <span className="font-semibold truncate max-w-[120px]" style={{ color: SPIDER_COLORS[i] }}>
                      {bot.name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-text-muted text-xs mt-2 text-center">
                Axes normalized to dataset max · hover a vertex to see raw values
              </p>
            </>
          )}
        </div>

      ) : (

        /* ── Gallery mode ────────────────────────────────────────────── */
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {bots.map(bot => (
              <div
                key={bot.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-surface-alt hover-accent-border-40 hover:bg-surface transition group"
              >
                {/* Click the spider → Single mode with this bot */}
                <div
                  onClick={() => { setSelectedIds([bot.id]); setMode('single') }}
                  className="cursor-pointer rounded hover:opacity-80 transition"
                  title="View in Single mode"
                >
                  <MiniSpider normValues={normMap[bot.id] || {}} color={getAura(bot.id)} />
                </div>
                {/* Click the name/count → bot detail modal */}
                <button
                  onClick={() => onViewBot?.(bot.id)}
                  className="w-full text-center hover:opacity-80 transition"
                >
                  <span className="text-xs font-bold text-text-primary truncate block w-full group-hover:text-accent-light transition leading-tight">
                    {bot.name}
                  </span>
                  <span className="text-[10px] text-text-muted num">{fmt(bot.messages || 0)} msgs</span>
                </button>
              </div>
            ))}
          </div>
          <p className="text-text-muted text-xs mt-4 text-center">
            Axes normalized to dataset max · click a spider to open Single view · click the name to open bot details
          </p>
        </div>

      )}
    </section>
  )
}
