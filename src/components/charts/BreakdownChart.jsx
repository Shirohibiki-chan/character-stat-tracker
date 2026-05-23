import { useState, useMemo } from 'react'
import { BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { fmtFull, fmt } from '../../constants/format.js'

const SORT_OPTIONS = [
  { value: 'total',   label: 'Total'   },
  { value: 'solo%',   label: 'Solo %'  },
  { value: 'group%',  label: 'Group %' },
]

const SOLO_COLOR  = '#7dd3fc'  // sky-300
const GROUP_COLOR = '#a78bfa'  // violet-400

function buildBreakdownData(bots, mode, sortBy) {
  const data = bots
    .filter(b => b.latest && b.messagesGroup != null && b.messagesSolo != null)
    .map(b => {
      const solo  = b.messagesSolo  ?? 0
      const group = b.messagesGroup ?? 0
      const total = solo + group
      return { id: b.id, name: b.name, solo, group, total }
    })
    .filter(d => d.total > 0)

  if (data.length === 0) return []

  if (sortBy === 'solo%')  data.sort((a, b) => (b.solo / b.total) - (a.solo / a.total))
  else if (sortBy === 'group%') data.sort((a, b) => (b.group / b.total) - (a.group / a.total))
  else data.sort((a, b) => b.total - a.total)

  return data.map(d => ({
    ...d,
    soloVal:  mode === 'pct' ? +(d.solo  / d.total * 100).toFixed(1) : d.solo,
    groupVal: mode === 'pct' ? +(d.group / d.total * 100).toFixed(1) : d.group,
  }))
}

export default function BreakdownChart({ bots, onViewBot }) {
  const [mode,   setMode]   = useState('abs')
  const [sortBy, setSortBy] = useState('total')

  const data = useMemo(
    () => buildBreakdownData(bots, mode, sortBy),
    [bots, mode, sortBy]
  )

  const hasBreakdown = bots.some(b => b.latest && b.messagesGroup != null && b.messagesSolo != null)

  if (!hasBreakdown) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No solo/group message breakdown found.<br />
          <span className="text-muted-70 text-xs">Re-capture bots via the userscript — newer captures include the full message breakdown.</span>
        </p>
      </section>
    )
  }

  if (data.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          No bots with message breakdown in the current filter.
        </p>
      </section>
    )
  }

  const chartHeight = Math.max(300, data.length * 32 + 60)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <BarChart2 size={16} className="text-accent opacity-60" />
          Solo vs. Group · {data.length} bot{data.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
            <button
              onClick={() => setMode('abs')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${mode === 'abs' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Absolute
            </button>
            <button
              onClick={() => setMode('pct')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${mode === 'pct' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              100%
            </button>
          </div>
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
      <div className="p-5">
        <div className="flex gap-6 mb-3">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: SOLO_COLOR }} />
            Solo
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: GROUP_COLOR }} />
            Group
          </span>
        </div>
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
              <XAxis
                type="number"
                tickFormatter={n => mode === 'pct' ? `${Math.round(n)}%` : fmt(n)}
                stroke="var(--color-text-muted)"
                style={{ fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={{ stroke: 'var(--color-border)' }}
                domain={mode === 'pct' ? [0, 100] : [0, 'auto']}
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
                  const soloPct = d.total > 0 ? (d.solo / d.total * 100).toFixed(1) : '0.0'
                  const groupPct = d.total > 0 ? (d.group / d.total * 100).toFixed(1) : '0.0'
                  return (
                    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
                      <div className="font-bold text-sm mb-1.5 truncate max-w-[220px]">{d.name}</div>
                      <div className="flex justify-between gap-6 text-xs mb-0.5">
                        <span style={{ color: SOLO_COLOR }}>Solo</span>
                        <span className="num">{fmtFull(d.solo)} ({soloPct}%)</span>
                      </div>
                      <div className="flex justify-between gap-6 text-xs">
                        <span style={{ color: GROUP_COLOR }}>Group</span>
                        <span className="num">{fmtFull(d.group)} ({groupPct}%)</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="soloVal"
                stackId="a"
                fill={SOLO_COLOR}
                isAnimationActive={false}
                onClick={d => onViewBot?.(d.id)}
                className="cursor-pointer"
              />
              <Bar
                dataKey="groupVal"
                stackId="a"
                fill={GROUP_COLOR}
                isAnimationActive={false}
                onClick={d => onViewBot?.(d.id)}
                className="cursor-pointer"
                radius={[0, 3, 3, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
