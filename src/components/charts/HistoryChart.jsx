import { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getBarColor } from '../../constants/auras.js'
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
  const [subMetric, setSubMetric] = useState('total')

  const m = METRICS.find(mx => mx.key === metric)

  function stepDate(delta) {
    const d = new Date(targetDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setTargetDate(d.toISOString().slice(0, 10))
  }

  const hasBreakdown = useMemo(
    () => bots.some(b => (b.snapshots || []).some(s => s.messagesGroup != null)),
    [bots]
  )

  const effectiveMetric = metric === 'messages' && subMetric !== 'total'
    ? (subMetric === 'group' ? 'messagesGroup' : 'messagesSolo')
    : metric

  const data = useMemo(
    () => computeHistory(bots, effectiveMetric, targetDate),
    [bots, effectiveMetric, targetDate]
  )

  const chartHeight = Math.max(300, data.length * 32 + 40)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <Calendar size={16} className="text-accent opacity-60" />
          Top gainers on {fmtDate(targetDate)} · {effectiveMetric === 'messagesGroup' ? 'Messages (group)' : effectiveMetric === 'messagesSolo' ? 'Messages (solo)' : m?.label}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            {METRICS.map(mx => (
              <button
                key={mx.key}
                onClick={() => { setMetric(mx.key); if (mx.key !== 'messages') setSubMetric('total') }}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition ${metric === mx.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                style={metric === mx.key ? { boxShadow: `inset 0 0 0 1px ${mx.color}40` } : {}}
              >
                {mx.label}
              </button>
            ))}
          </div>
          {metric === 'messages' && hasBreakdown && (
            <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
              {['total', 'solo', 'group'].map(s => (
                <button
                  key={s}
                  onClick={() => setSubMetric(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${subMetric === s ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                  style={subMetric === s ? { boxShadow: `inset 0 0 0 1px ${m?.color}40` } : {}}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center bg-surface-alt border border-border rounded overflow-hidden">
            <button
              onClick={() => stepDate(-1)}
              className="px-1.5 py-1 text-text-muted hover:text-text-secondary hover:bg-surface transition"
              aria-label="Previous day"
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="bg-transparent text-xs text-text-secondary focus:outline-none px-1 py-1"
            />
            <button
              onClick={() => stepDate(1)}
              className="px-1.5 py-1 text-text-muted hover:text-text-secondary hover:bg-surface transition"
              aria-label="Next day"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-muted text-sm text-center max-w-xs">
            No gains found on or before this date.<br />
            <span className="text-text-muted/70 text-xs">
              Each bot needs at least 2 Total-scope snapshots at or before the selected date.
            </span>
          </p>
        </div>
      ) : (
        <div className="p-5">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 80, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
                <XAxis
                  type="number"
                  tickFormatter={n => '+' + fmt(n)}
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
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                        <div className="font-bold text-base mb-1 truncate max-w-[220px]">{d.name}</div>
                        <div className="text-xs text-text-secondary font-medium mb-1.5">
                          {fmtDate(d.prevSnapDate)} → {fmtDate(d.snapDate)}
                        </div>
                        <div className="flex justify-between gap-6 text-sm">
                          <span className="text-text-secondary font-medium">
                            {effectiveMetric === 'messagesGroup' ? 'Group msgs gained' : effectiveMetric === 'messagesSolo' ? 'Solo msgs gained' : `${m?.label} gained`}
                          </span>
                          <span className="num font-semibold" style={{ color: m?.color }}>+{fmtFull(d.gain)}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="_val"
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                  onClick={d => onViewBot?.(d.id)}
                  className="cursor-pointer"
                >
                  {data.map(d => <Cell key={d.id} fill={getBarColor(d.id)} />)}
                  <LabelList
                    dataKey="_val"
                    position="right"
                    formatter={n => '+' + fmt(n)}
                    style={{ fill: 'var(--color-text-primary)', fontSize: 13, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
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
