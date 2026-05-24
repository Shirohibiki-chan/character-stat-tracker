import { useState, useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'

const ALL_METRICS = [
  { key: 'messages',      label: 'Messages',   short: 'Msgs'  },
  { key: 'chats',         label: 'Threads',    short: 'Thrd'  },
  { key: 'favorites',     label: 'Favorites',  short: 'Favs'  },
  { key: 'messagesSolo',  label: 'Solo msgs',  short: 'Solo'  },
  { key: 'messagesGroup', label: 'Group msgs', short: 'Group' },
  { key: 'avgPerDay',     label: 'Avg/day',    short: 'Avg/d' },
  { key: 'favPerK',       label: 'Favs/1K',    short: 'F/1K'  },
]

function pearson(xs, ys) {
  const n = xs.length
  if (n < 3) return null
  const mx = xs.reduce((a, b) => a + b) / n
  const my = ys.reduce((a, b) => a + b) / n
  const num = xs.map((x, i) => (x - mx) * (ys[i] - my)).reduce((a, b) => a + b)
  const varX = xs.map(x => (x - mx) ** 2).reduce((a, b) => a + b)
  const varY = ys.map(y => (y - my) ** 2).reduce((a, b) => a + b)
  const den = Math.sqrt(varX * varY)
  return den < 1e-10 ? null : num / den
}

function computeMatrix(bots) {
  const eligible = bots.filter(b => b.latest)

  // Enrich with derived metrics
  const enriched = eligible.map(b => {
    const snaps = b._totalSnaps || []
    let avgPerDay = 0
    if (snaps.length >= 2) {
      const first = snaps[0], last = snaps[snaps.length - 1]
      const days = (new Date(last.date) - new Date(first.date)) / 86400000
      const gain = (last.messages ?? 0) - (first.messages ?? 0)
      if (days >= 1 && gain > 0) avgPerDay = gain / days
    }
    const messages  = b.messages  ?? 0
    const favorites = b.favorites ?? 0
    return {
      ...b,
      avgPerDay,
      favPerK: messages > 0 ? (favorites / messages * 1000) : 0,
    }
  })

  const hasSoloGroup = enriched.some(b => b.messagesSolo != null && b.messagesGroup != null)
  const metrics = ALL_METRICS.filter(m => {
    if (m.key === 'messagesSolo' || m.key === 'messagesGroup') return hasSoloGroup
    return true
  })

  const matrix = {}
  metrics.forEach(mx => {
    matrix[mx.key] = {}
    metrics.forEach(my => {
      if (mx.key === my.key) { matrix[mx.key][my.key] = 1; return }
      const pairs = enriched
        .filter(b => b[mx.key] != null && b[my.key] != null)
        .map(b => [+(b[mx.key] ?? 0), +(b[my.key] ?? 0)])
      matrix[mx.key][my.key] = pairs.length >= 3
        ? pearson(pairs.map(p => p[0]), pairs.map(p => p[1]))
        : null
    })
  })

  return { matrix, metrics, n: enriched.length }
}

function describeCorrelation(r, rowLabel, colLabel) {
  if (r === null) return 'Not enough data to calculate.'
  if (r === 1) return 'This is the same metric compared with itself — always a perfect match.'
  const abs = Math.abs(r)
  if (abs < 0.1) return `${rowLabel} and ${colLabel} show no meaningful connection across your bots.`
  const strength = abs >= 0.8 ? 'almost always' : abs >= 0.6 ? 'strongly tend to' : abs >= 0.4 ? 'tend to' : 'slightly tend to'
  if (r > 0) return `Bots with more ${rowLabel} ${strength} also have more ${colLabel}.`
  return `Bots with more ${rowLabel} ${strength} have fewer ${colLabel}.`
}

function rToBackground(r) {
  if (r === null) return 'var(--color-surface-alt)'
  if (r === 1) return 'rgba(148, 163, 184, 0.15)'
  const abs = Math.abs(r)
  if (r > 0) return `rgba(52, 211, 153, ${abs * 0.6})`
  return `rgba(251, 113, 133, ${abs * 0.6})`
}

function rToTextColor(r) {
  if (r === null) return 'var(--color-text-muted)'
  return Math.abs(r) > 0.4 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
}

export default function HeatmapChart({ bots }) {
  const [hovered, setHovered] = useState(null) // [rowKey, colKey] | null

  const { matrix, metrics, n } = useMemo(() => computeMatrix(bots), [bots])

  const eligibleCount = bots.filter(b => b.latest).length

  if (eligibleCount < 3) {
    return (
      <section className="border border-border rounded-lg bg-surface flex items-center justify-center py-20">
        <p className="text-text-muted text-sm text-center max-w-xs">
          Not enough bots for correlation analysis.<br />
          <span className="text-muted-70 text-xs">Need at least 3 bots with snapshot data to compute meaningful correlations.</span>
        </p>
      </section>
    )
  }

  const [hr, hc] = hovered ?? [null, null]
  const hovR     = hr && hc ? matrix[hr]?.[hc] : null
  const hovRowM  = metrics.find(m => m.key === hr)
  const hovColM  = metrics.find(m => m.key === hc)

  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <LayoutGrid size={16} className="text-accent opacity-60" />
          Metric correlations · {n} bot{n !== 1 ? 's' : ''}
        </div>
        {hovered && hovRowM && hovColM && (
          <div className="text-xs text-right max-w-xs">
            <div>
              <span className="text-text-secondary font-semibold">{hovRowM.label}</span>
              <span className="text-text-muted"> ↔ </span>
              <span className="text-text-secondary font-semibold">{hovColM.label}</span>
              {hovR !== null && hovR !== 1 && (
                <span
                  className="font-bold num ml-1.5"
                  style={{ color: (hovR ?? 0) >= 0 ? '#34d399' : '#fb7185' }}
                >
                  {hovR.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-text-muted text-[11px] mt-0.5">
              {describeCorrelation(hovR, hovRowM.label, hovColM.label)}
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="overflow-x-auto">
          <div className="flex justify-center">
          <table style={{ borderCollapse: 'separate', borderSpacing: '5px' }}>
            <thead>
              <tr>
                <th style={{ width: 52 }} />
                {metrics.map(m => (
                  <th key={m.key} style={{ width: 52, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {m.short}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(rowM => (
                <tr key={rowM.key}>
                  <td style={{ textAlign: 'right', paddingRight: 6, whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {rowM.short}
                    </span>
                  </td>
                  {metrics.map(colM => {
                    const r       = matrix[rowM.key]?.[colM.key]
                    const isHov   = hr === rowM.key && hc === colM.key
                    const display = r === null ? '—' : r === 1 ? '·' : r.toFixed(2)
                    return (
                      <td
                        key={colM.key}
                        onMouseEnter={() => setHovered([rowM.key, colM.key])}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          width: 52, height: 40,
                          background: rToBackground(r),
                          borderRadius: 6,
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          outline: isHov ? '1.5px solid var(--color-accent)' : 'none',
                          cursor: 'default',
                          transition: 'outline 0.1s',
                        }}
                      >
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'Inter, system-ui, sans-serif',
                          color: rToTextColor(r),
                        }}>
                          {display}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5 flex-wrap text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <div
              className="w-20 h-3 rounded"
              style={{ background: 'linear-gradient(to right, rgba(251,113,133,0.6), rgba(148,163,184,0.15), rgba(52,211,153,0.6))' }}
            />
            <span>−1 · 0 · +1</span>
          </div>
          <span className="text-muted-60">
            Green = these metrics rise together · Red = when one rises the other tends to fall · Hover any cell for a plain-English explanation
          </span>
        </div>
      </div>
    </section>
  )
}
