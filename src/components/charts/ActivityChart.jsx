import { useState, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fmt } from '../../constants/format.js'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCaptureData(bots) {
  const counts = new Array(7).fill(0)
  bots.forEach(bot => {
    ;(bot.snapshots || [])
      .filter(s => s.scope === 'Total')
      .forEach(s => { counts[new Date(s.date).getDay()]++ })
  })
  return DAYS.map((label, i) => ({ label, value: counts[i] }))
}

function buildGrowthData(bots) {
  const acc = Array.from({ length: 7 }, () => ({ total: 0, n: 0 }))
  bots.forEach(bot => {
    const snaps = (bot.snapshots || [])
      .filter(s => s.scope === 'Total')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    for (let i = 1; i < snaps.length; i++) {
      const gain = (snaps[i].messages ?? 0) - (snaps[i - 1].messages ?? 0)
      if (gain > 0) {
        const day = new Date(snaps[i].date).getDay()
        acc[day].total += gain
        acc[day].n++
      }
    }
  })
  return DAYS.map((label, i) => ({
    label,
    value: acc[i].n > 0 ? Math.round(acc[i].total / acc[i].n) : 0,
  }))
}

function ActivityTooltip({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
      <div className="text-text-muted text-[10px] mb-1">{label}</div>
      <div className="text-xs font-bold text-text-primary num">
        {mode === 'growth'
          ? val > 0 ? `+${fmt(val)} avg msgs gained` : 'no growth data'
          : `${val} capture${val !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}

export default function ActivityChart({ bots }) {
  const [mode, setMode] = useState('capture')

  const data = useMemo(
    () => mode === 'growth' ? buildGrowthData(bots) : buildCaptureData(bots),
    [bots, mode]
  )

  const maxVal = Math.max(...data.map(d => d.value), 1)
  const hasData = data.some(d => d.value > 0)
  const peakDay = hasData ? data.reduce((best, d) => d.value > best.value ? d : best, data[0]) : null

  if (!hasData) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No snapshot data yet.<br />
          <span className="text-muted-70 text-xs">Capture some stats to see day-of-week patterns.</span>
        </p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <CalendarDays size={16} className="text-accent opacity-60" />
            Activity by day of week
            {peakDay && (
              <span className="text-text-muted text-xs ml-1 font-normal">· peak: {peakDay.label}</span>
            )}
          </div>
          <p className="text-[11px] text-text-muted pl-6">
            {mode === 'capture'
              ? 'How many Total-scope snapshots were captured on each day of the week — shows your check-in rhythm.'
              : 'Average message gain recorded per snapshot by day of week — a rough proxy for when your bots tend to grow.'}
          </p>
        </div>
        <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
          <button
            onClick={() => setMode('capture')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition ${mode === 'capture' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Captures
          </button>
          <button
            onClick={() => setMode('growth')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition ${mode === 'growth' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Growth
          </button>
        </div>
      </div>

      <div className="p-5">
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmt}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                width={48}
              />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={props => <ActivityTooltip {...props} mode={mode} />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill="var(--color-accent)"
                    fillOpacity={d.value === maxVal ? 0.7 : Math.max(0.12, 0.5 * (d.value / maxVal))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {mode === 'growth' && (
          <p className="text-[10px] text-text-muted mt-3 text-center">
            Growth reflects gains logged at capture time vs. the previous snapshot for the same bot — not raw platform traffic.
          </p>
        )}
      </div>
    </section>
  )
}
