import { useState, useMemo, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, ChevronDown, Award, Pencil, Check, Plus, Trash2, TrendingUp, Camera, ClipboardPlus } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt, fmtFull, fmtDate, fmtDateTime, parseNum } from '../../constants/format.js'
import { createSnapshot, SCOPES } from '../../constants/schema.js'
import Modal from './Modal.jsx'

function avatarGlow(color) {
  return `0 0 0 1.5px ${color}, 0 0 10px 1px ${color}8c, 0 0 18px 2px ${color}38`
}

function ChartTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const rows = metric ? [metric] : METRICS
  return (
    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
      <div className="text-xs text-text-secondary font-medium mb-1">{d.dateLabel}</div>
      {rows.map(m => (
        <div key={m.key} className="flex justify-between gap-6 text-xs">
          <span className="text-text-secondary font-medium">{m.label}</span>
          <span className="num font-semibold" style={{ color: m.color }}>{fmtFull(d[m.key])}</span>
        </div>
      ))}
    </div>
  )
}

export default function BotDetailModal({ bot, allBots, onClose, onAddSnapshot, onDeleteSnapshot, onUpdateMeta, onDelete }) {
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaName, setMetaName] = useState(bot.name)
  const [metaTags, setMetaTags] = useState((bot.tags || []).join(', '))
  const [confirmDeleteBot, setConfirmDeleteBot] = useState(false)
  const [confirmDeleteSnap, setConfirmDeleteSnap] = useState(null)
  const [snapPage, setSnapPage] = useState(0)
  const [addingSnap, setAddingSnap] = useState(false)
  const [newSnap, setNewSnap] = useState({
    date: new Date().toISOString().slice(0, 10),
    chats: '', messages: '', favorites: '', scope: 'Total',
  })

  const [editingPfp, setEditingPfp] = useState(false)
  const [pfpUrl, setPfpUrl] = useState('')
  const [pfpFileName, setPfpFileName] = useState('')
  const [pfpDataUrl, setPfpDataUrl] = useState(null)
  const pfpFileRef = useRef(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [chartView, setChartView] = useState(() => localStorage.getItem('bot-chart-view') || 'all')

  function setChartViewPersisted(v) {
    setChartView(v)
    localStorage.setItem('bot-chart-view', v)
  }

  const activeMetric = chartView === 'all' ? null : (METRICS.find(m => m.key === chartView) ?? METRICS[0])

  const isDirty = addingSnap && !!(newSnap.chats || newSnap.messages || newSnap.favorites)

  function handlePfpFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPfpFileName(file.name)
    setPfpUrl('')
    const reader = new FileReader()
    reader.onload = ev => setPfpDataUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handlePfpSave() {
    const newAvatar = pfpDataUrl || pfpUrl.trim()
    if (!newAvatar) return
    onUpdateMeta({ avatar: newAvatar, avatarIsManual: true })
    setEditingPfp(false)
    setPfpUrl('')
    setPfpFileName('')
    setPfpDataUrl(null)
  }

  function handlePfpReset() {
    onUpdateMeta({ avatarIsManual: false })
    setEditingPfp(false)
  }

  function closePfpEditor() {
    setEditingPfp(false)
    setPfpUrl('')
    setPfpFileName('')
    setPfpDataUrl(null)
  }

  const aura = getAura(bot.id)

  const sortedSnaps = useMemo(
    () => [...(bot.snapshots || [])].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [bot.snapshots]
  )

  const chartSnaps = useMemo(
    () => sortedSnaps
      .filter(s => s.scope === 'Total')
      .map(s => ({
        date: new Date(s.date).getTime(),
        dateLabel: fmtDate(s.date),
        chats: s.chats,
        messages: s.messages,
        favorites: s.favorites,
      })),
    [sortedSnaps]
  )

  const SNAP_PAGE_SIZE = 15
  const snapReversed = useMemo(() => [...sortedSnaps].reverse(), [sortedSnaps])
  const snapPageCount = Math.max(1, Math.ceil(snapReversed.length / SNAP_PAGE_SIZE))
  const safePage = Math.min(snapPage, snapPageCount - 1)
  const pagedSnaps = snapReversed.slice(safePage * SNAP_PAGE_SIZE, (safePage + 1) * SNAP_PAGE_SIZE)

  const dailyTicks = useMemo(() => {
    if (chartSnaps.length < 2) return undefined
    const first = chartSnaps[0].date
    const last = chartSnaps[chartSnaps.length - 1].date
    const DAY = 86400000
    const ticks = []
    for (let t = first; t <= last; t += DAY) ticks.push(t)
    const interval = ticks.length > 30 ? Math.ceil(ticks.length / 10) : 1
    return ticks.filter((_, i) => i % interval === 0 || i === ticks.length - 1)
  }, [chartSnaps])

  const latest = sortedSnaps[sortedSnaps.length - 1]
  const prev = sortedSnaps.length > 1 ? sortedSnaps[sortedSnaps.length - 2] : null

  const reportCard = useMemo(() => {
    if (!allBots?.length) return null
    const eligible = allBots.filter(b => b.latest)
    if (!eligible.length) return null
    const n = eligible.length
    if (!eligible.some(b => b.id === bot.id)) return null

    // Percentile rank for each metric
    const ranks = METRICS.map(m => {
      const byRank = [...eligible].sort((a, b) => (b[m.key] || 0) - (a[m.key] || 0))
      const rank = byRank.findIndex(b => b.id === bot.id) + 1
      const topPct = Math.max(1, Math.round((rank / n) * 100))
      const barFill = n > 1 ? Math.max(1, Math.round((1 - (rank - 1) / (n - 1)) * 100)) : 100
      return { ...m, rank, topPct, barFill, total: n }
    })

    // 7-day and 30-day momentum
    const totalSnps = sortedSnaps.filter(s => s.scope === 'Total')
    const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)
    const cutoff7 = new Date(); cutoff7.setDate(cutoff7.getDate() - 7)
    const recent30 = totalSnps.filter(s => new Date(s.date) >= cutoff30)
    const recent7 = totalSnps.filter(s => new Date(s.date) >= cutoff7)
    let momentum30 = null, momentum7 = null
    if (recent30.length >= 2) {
      const first = recent30[0], last = recent30[recent30.length - 1]
      momentum30 = METRICS.map(m => ({ ...m, delta: (last[m.key] || 0) - (first[m.key] || 0) }))
    }
    if (recent7.length >= 2) {
      const first = recent7[0], last = recent7[recent7.length - 1]
      momentum7 = METRICS.map(m => ({ ...m, delta: (last[m.key] || 0) - (first[m.key] || 0) }))
    }

    // Solo/Group donut
    const latestTotal = totalSnps[totalSnps.length - 1]
    let donut = null
    if (latestTotal?.messagesGroup != null) {
      const solo = latestTotal.messagesSolo ?? (latestTotal.messages - latestTotal.messagesGroup)
      const group = latestTotal.messagesGroup
      if (solo + group > 0) {
        donut = [
          { name: 'Solo', value: solo, fill: '#34d399' },
          { name: 'Group', value: group, fill: '#818cf8' },
        ]
      }
    }

    // Snapshot streak — consecutive days from most recent backward
    const dates = [...new Set(totalSnps.map(s => s.date.slice(0, 10)))].sort().reverse()
    let streak = 0
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) { streak = 1; continue }
      const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000
      if (diff <= 1) streak++
      else break
    }

    return { ranks, momentum7, momentum30, donut, streak }
  }, [allBots, bot.id, sortedSnaps])

  function saveMeta() {
    onUpdateMeta({
      name: metaName.trim() || bot.name,
      tags: metaTags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setEditingMeta(false)
  }

  function cancelMeta() {
    setMetaName(bot.name)
    setMetaTags((bot.tags || []).join(', '))
    setEditingMeta(false)
  }

  function submitSnap() {
    const now = new Date()
    const [y, m, d] = newSnap.date.split('-').map(Number)
    const dt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
    onAddSnapshot(createSnapshot({
      date: dt.toISOString(),
      chats: parseNum(newSnap.chats),
      messages: parseNum(newSnap.messages),
      favorites: parseNum(newSnap.favorites),
      scope: newSnap.scope,
    }))
    setNewSnap({ date: new Date().toISOString().slice(0, 10), chats: '', messages: '', favorites: '', scope: 'Total' })
    setAddingSnap(false)
  }

  return (
    <Modal onClose={onClose} isDirty={isDirty}>
      <div
        className="bg-bg border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-border shrink-0">
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition">
            <ChevronLeft size={20} />
          </button>
          <div
            className="relative w-14 h-14 shrink-0 group cursor-pointer"
            onClick={() => setEditingPfp(p => !p)}
            title="Change profile picture"
          >
            {bot.avatar ? (
              <img
                src={bot.avatar}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
                style={{ width: '3.5rem', height: '3.5rem', objectFit: 'cover', borderRadius: '9999px', backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
                onError={e => { e.target.style.display = 'none' }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-text-secondary font-display text-2xl"
                style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
              >
                {bot.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-overlay-60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
            {bot.avatarIsManual && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-accent)', boxShadow: '0 0 0 2px var(--color-bg)' }}
                title="PFP manually set"
              >
                <Pencil size={9} style={{ color: '#051018' }} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingMeta ? (
              <div className="flex flex-col gap-2">
                <input
                  value={metaName}
                  onChange={e => setMetaName(e.target.value)}
                  className="bg-surface-alt border border-border rounded px-2 py-1 text-lg font-display text-text-primary focus:outline-none focus-accent-border"
                />
                <input
                  value={metaTags}
                  onChange={e => setMetaTags(e.target.value)}
                  placeholder="tags, comma-separated"
                  className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus-accent-border"
                />
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl truncate">{bot.name}</h2>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(bot.tags || []).map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-[7px] py-[2px] rounded-[3px] font-bold uppercase tracking-[0.1em]"
                      style={{
                        background: `${getAura(t)}1a`,
                        border: `1px solid ${getAura(t)}40`,
                        color: getAura(t),
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {editingMeta ? (
              <>
                <button onClick={saveMeta} className="p-2 text-emerald-400 hover:bg-surface-alt rounded transition">
                  <Check size={16} />
                </button>
                <button onClick={cancelMeta} className="p-2 text-text-muted hover:bg-surface-alt rounded transition">
                  <X size={16} />
                </button>
              </>
            ) : (
              <button onClick={() => setEditingMeta(true)} className="p-2 text-text-tertiary hover:text-accent-light hover:bg-surface-alt rounded transition">
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>

        {/* PFP editor (inline below header) */}
        {editingPfp && (
          <div className="border-b border-border bg-surface-alt px-6 py-4 shrink-0">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted mb-3">Change profile picture</div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Image URL</label>
                <input
                  value={pfpUrl}
                  onChange={e => { setPfpUrl(e.target.value); setPfpDataUrl(null); setPfpFileName('') }}
                  placeholder="https://…"
                  className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus-accent-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pfpFileRef.current?.click()}
                  className="text-xs px-3 py-1.5 border border-border rounded hover-accent-border-40 text-text-secondary hover:text-text-primary transition shrink-0"
                >
                  Browse file…
                </button>
                <span className="text-[10px] text-text-muted truncate">{pfpFileName || 'No file chosen'}</span>
                <input ref={pfpFileRef} type="file" accept="image/*" onChange={handlePfpFile} className="hidden" />
              </div>
              {bot.avatarIsManual && (
                <button
                  onClick={handlePfpReset}
                  className="text-[10px] text-text-muted hover:text-text-secondary transition underline underline-offset-2"
                >
                  Allow future imports to update PFP (clear manual lock)
                </button>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={closePfpEditor} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition">
                Cancel
              </button>
              <button
                onClick={handlePfpSave}
                disabled={!pfpUrl.trim() && !pfpDataUrl}
                className="px-3 py-1.5 text-xs font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))', color: '#051018' }}
              >
                Save PFP
              </button>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto scrollbar-thin px-6 py-5 flex-1">

          {/* Metric cards */}
          {sortedSnaps.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {METRICS.map(m => {
                const val = latest[m.key]
                const delta = prev != null ? val - prev[m.key] : null
                return (
                  <div
                    key={m.key}
                    className="rounded-lg p-4"
                    style={{
                      background: m.card.bg,
                      border: `1px solid ${m.card.border}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] tracking-[0.22em] uppercase font-bold"
                        style={{ color: m.card.label }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <div className="num text-3xl font-bold" style={{ color: m.card.number }}>{fmt(val)}</div>
                    <div className="text-[10px] num font-semibold mt-0.5" style={{ color: m.card.label }}>{fmtFull(val)}</div>
                    {m.key === 'messages' && latest.messagesGroup != null && (
                      <div className="text-[10px] num font-semibold mt-0.5" style={{ color: m.card.label }}>
                        {fmt(latest.messagesSolo ?? (latest.messages - latest.messagesGroup))} solo
                        {' + '}
                        {fmt(latest.messagesGroup)} grp
                      </div>
                    )}
                    {delta !== null && delta !== 0 && (
                      <div className={`text-xs mt-1 num font-semibold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {delta > 0 ? '+' : ''}{fmt(delta)} since {fmtDate(prev.date)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-text-muted text-sm mb-6">
              No snapshots yet. Add one below or paste from CharSnap.
            </p>
          )}

          {/* Report Card */}
          {reportCard && (
            <div className="mb-6 border border-border rounded-lg bg-surface overflow-hidden">
              <button
                onClick={() => setReportOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover-bg-dim-40 transition"
              >
                <div className="flex items-center gap-2 text-sm text-text-secondary font-semibold">
                  <Award size={16} className="text-accent opacity-60" />
                  Report Card
                </div>
                <ChevronDown size={14} className={`text-text-muted transition-transform ${reportOpen ? 'rotate-180' : ''}`} />
              </button>

              {reportOpen && (
                <div className="px-4 pt-3 pb-4 space-y-4 border-t border-border">

                  {/* Percentile ranks */}
                  <div className="space-y-2.5">
                    {reportCard.ranks.map(r => (
                      <div key={r.key}>
                        <div className="flex justify-between items-baseline text-xs mb-1">
                          <span className="text-text-secondary font-medium">{r.label}</span>
                          <span className="num font-bold tabular-nums" style={{ color: r.color }}>
                            #{r.rank} of {r.total} · top {r.topPct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${r.barFill}%`, background: r.color, opacity: 0.65 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Momentum windows + solo/group donut */}
                  {(reportCard.momentum7 || reportCard.momentum30 || reportCard.donut) && (
                    <div className="flex flex-wrap gap-4">
                      {(reportCard.momentum7 || reportCard.momentum30) && (
                        <div className="flex gap-5 shrink-0">
                          {[
                            { label: 'Last 7 days', data: reportCard.momentum7 },
                            { label: 'Last 30 days', data: reportCard.momentum30 },
                          ].filter(w => w.data).map(w => (
                            <div key={w.label}>
                              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted mb-2">{w.label}</div>
                              <div className="space-y-1.5">
                                {w.data.map(m => (
                                  <div key={m.key} className="flex items-center gap-3">
                                    <span className="text-xs text-text-secondary font-semibold">{m.label}</span>
                                    <span
                                      className={`num text-xs font-bold ${m.delta > 0 ? 'text-emerald-400' : m.delta < 0 ? 'text-red-400' : 'text-text-muted'}`}
                                    >
                                      {m.delta > 0 ? '+' : ''}{fmt(m.delta)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {reportCard.donut && (
                        <div className="flex items-center gap-3 flex-1 min-w-[160px]">
                          <div style={{ width: 72, height: 72, flexShrink: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={reportCard.donut}
                                  dataKey="value"
                                  innerRadius={20}
                                  outerRadius={34}
                                  strokeWidth={0}
                                  startAngle={90}
                                  endAngle={-270}
                                >
                                  {reportCard.donut.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} opacity={0.8} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-1.5">
                            {reportCard.donut.map(d => {
                              const total = reportCard.donut.reduce((s, x) => s + x.value, 0)
                              return (
                                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                                  <span className="text-text-secondary">{d.name}</span>
                                  <span className="num font-bold">{fmt(d.value)}</span>
                                  <span className="num font-semibold text-text-secondary">({Math.round(d.value / total * 100)}%)</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Snapshot streak */}
                  {reportCard.streak >= 2 && (
                    <p className="text-xs text-text-muted">
                      <span className="text-text-secondary font-semibold num">{reportCard.streak}</span>{' '}
                      consecutive day{reportCard.streak !== 1 ? 's' : ''} with a snapshot captured
                    </p>
                  )}

                </div>
              )}
            </div>
          )}

          {/* Growth chart */}
          {chartSnaps.length >= 2 && (
            <div className="mb-6 border border-border rounded-lg p-4 bg-surface">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-text-secondary font-semibold">
                  <TrendingUp size={16} className="text-accent opacity-60" />
                  Growth over time
                </div>
                <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
                  <button
                    onClick={() => setChartViewPersisted('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition ${chartView === 'all' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                  >
                    All
                  </button>
                  {METRICS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setChartViewPersisted(m.key)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition ${chartView === m.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                      style={chartView === m.key ? { boxShadow: `inset 0 0 0 1px ${m.color}40` } : {}}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 280, overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'all' ? (
                    <AreaChart data={chartSnaps} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        {METRICS.map(m => (
                          <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={m.color} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="var(--color-border-subtle)" />
                      <XAxis
                        dataKey="date"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={dailyTicks}
                        tickFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        stroke="var(--color-text-muted)"
                        style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                      />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={fmt}
                        stroke="var(--color-text-muted)"
                        style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={fmt}
                        stroke="var(--color-text-muted)"
                        style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                      {METRICS.map(m => (
                        <Area
                          key={m.key}
                          yAxisId={m.key === 'messages' ? 'right' : 'left'}
                          type="monotone"
                          dataKey={m.key}
                          stroke={m.color}
                          strokeWidth={2}
                          fill={`url(#grad-${m.key})`}
                          fillOpacity={1}
                          dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                          name={m.label}
                        />
                      ))}
                    </AreaChart>
                  ) : (
                    <AreaChart data={chartSnaps} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="grad-single" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeMetric.color} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={activeMetric.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--color-border-subtle)" />
                      <XAxis
                        dataKey="date"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={dailyTicks}
                        tickFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        stroke="var(--color-text-muted)"
                        style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                      />
                      <YAxis
                        tickFormatter={fmt}
                        stroke="var(--color-text-muted)"
                        style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
                        width={52}
                      />
                      <Tooltip content={<ChartTooltip metric={activeMetric} />} />
                      <Area
                        type="monotone"
                        dataKey={activeMetric.key}
                        stroke={activeMetric.color}
                        strokeWidth={2}
                        fill="url(#grad-single)"
                        fillOpacity={1}
                        dot={{ r: 3, fill: activeMetric.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        name={activeMetric.label}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
              {chartView === 'all' && (
                <p className="text-xs text-text-muted mt-2">
                  Threads &amp; favorites use left axis; messages use right axis (different scales).
                </p>
              )}
            </div>
          )}

          {/* Snapshot list */}
          <div className="border border-border rounded-lg bg-surface">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-text-secondary font-semibold">
                <ClipboardPlus size={14} className="text-accent opacity-60" />
                Snapshots ({sortedSnaps.length})
              </div>
              <button
                onClick={() => setAddingSnap(a => !a)}
                className="text-xs px-2 py-1 border border-border hover-accent-border-40 rounded flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition"
              >
                <Plus size={12} /> Add manual snapshot
              </button>
            </div>

            {addingSnap && (
              <div className="border-b border-border p-3 bg-accent-faint">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="date"
                    value={newSnap.date}
                    onChange={e => setNewSnap(s => ({ ...s, date: e.target.value }))}
                    className="col-span-3 bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus-accent-border"
                  />
                  <input
                    placeholder="threads"
                    value={newSnap.chats}
                    onChange={e => setNewSnap(s => ({ ...s, chats: e.target.value }))}
                    className="col-span-2 num bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus-accent-border"
                  />
                  <input
                    placeholder="messages"
                    value={newSnap.messages}
                    onChange={e => setNewSnap(s => ({ ...s, messages: e.target.value }))}
                    className="col-span-3 num bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus-accent-border"
                  />
                  <input
                    placeholder="favs"
                    value={newSnap.favorites}
                    onChange={e => setNewSnap(s => ({ ...s, favorites: e.target.value }))}
                    className="col-span-2 num bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus-accent-border"
                  />
                  <div className="col-span-2 flex gap-1 justify-end">
                    <button onClick={submitSnap} className="p-1.5 text-emerald-400 hover:bg-surface-alt rounded transition">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setAddingSnap(false)} className="p-1.5 text-text-muted hover:bg-surface-alt rounded transition">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-text-muted">
                    Shorthand like <code className="text-text-secondary">52k</code> works.
                  </span>
                  <select
                    value={newSnap.scope}
                    onChange={e => setNewSnap(s => ({ ...s, scope: e.target.value }))}
                    className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus-accent-border"
                  >
                    {SCOPES.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-right py-2 px-3">Messages</th>
                  <th className="text-right py-2 px-3">Threads</th>
                  <th className="text-right py-2 px-3">Favorites</th>
                  <th className="text-right py-2 px-3">Scope</th>
                  <th className="py-2 px-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {pagedSnaps.map(s => (
                  <tr key={s.id} className="border-b border-border-subtle hover-bg-dim-50">
                    <td className="py-2 px-4 text-xs text-text-secondary font-semibold">{fmtDateTime(s.date)}</td>
                    <td className="py-2 px-3 text-right num text-sm text-text-value font-bold">{fmtFull(s.messages)}</td>
                    <td className="py-2 px-3 text-right num text-sm text-text-value font-bold">{fmtFull(s.chats)}</td>
                    <td className="py-2 px-3 text-right num text-sm text-text-value font-bold">{fmtFull(s.favorites)}</td>
                    <td className="py-2 px-3 text-right text-[10px] text-text-secondary font-medium">{s.scope || ''}</td>
                    <td className="py-2 px-3 text-right">
                      {confirmDeleteSnap === s.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-text-secondary text-[10px] whitespace-nowrap">Delete?</span>
                          <button
                            onClick={() => { onDeleteSnapshot(s.id); setConfirmDeleteSnap(null) }}
                            className="px-1.5 py-0.5 bg-danger-20 text-red-300 rounded hover-danger-bg text-[10px] transition"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSnap(null)}
                            className="px-1.5 py-0.5 text-text-muted hover:text-text-secondary text-[10px] transition"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteSnap(s.id)}
                          className="p-1 text-text-muted hover:text-red-400 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedSnaps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-text-muted text-xs">No snapshots recorded yet.</td>
                  </tr>
                )}
              </tbody>
              {snapPageCount > 1 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} className="px-4 py-2.5 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted num">
                          {safePage * SNAP_PAGE_SIZE + 1}–{Math.min((safePage + 1) * SNAP_PAGE_SIZE, sortedSnaps.length)} of {sortedSnaps.length}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSnapPage(p => Math.max(0, p - 1))}
                            disabled={safePage === 0}
                            className="p-1 rounded border border-border text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            onClick={() => setSnapPage(p => Math.min(snapPageCount - 1, p + 1))}
                            disabled={safePage >= snapPageCount - 1}
                            className="p-1 rounded border border-border text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Delete bot */}
          <div className="mt-6 flex justify-end">
            {!confirmDeleteBot ? (
              <button
                onClick={() => setConfirmDeleteBot(true)}
                className="text-xs text-text-muted hover:text-red-400 transition flex items-center gap-1.5"
              >
                <Trash2 size={12} /> Delete this bot and its history
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary">Delete &ldquo;{bot.name}&rdquo; and all snapshots?</span>
                <button
                  onClick={onDelete}
                  className="px-2 py-1 bg-danger-20 text-red-300 rounded hover-danger-bg transition"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDeleteBot(false)}
                  className="px-2 py-1 text-text-muted hover:text-text-secondary transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </Modal>
  )
}
