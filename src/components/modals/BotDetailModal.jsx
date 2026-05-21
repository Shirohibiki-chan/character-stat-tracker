import { useState, useMemo, useRef } from 'react'
import { X, ChevronLeft, Pencil, Check, Plus, Trash2, TrendingUp, Camera, ClipboardPlus } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt, fmtFull, fmtDate, parseNum } from '../../constants/format.js'
import { createSnapshot, SCOPES } from '../../constants/schema.js'
import Modal from './Modal.jsx'

function avatarGlow(color) {
  return `0 0 0 1.5px ${color}, 0 0 10px 1px ${color}8c, 0 0 18px 2px ${color}38`
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
      <div className="text-xs text-text-muted mb-1">{d.dateLabel}</div>
      {METRICS.map(m => (
        <div key={m.key} className="flex justify-between gap-6 text-xs">
          <span className="text-text-muted">{m.label}</span>
          <span className="num" style={{ color: m.color }}>{fmtFull(d[m.key])}</span>
        </div>
      ))}
    </div>
  )
}

export default function BotDetailModal({ bot, onClose, onAddSnapshot, onDeleteSnapshot, onUpdateMeta, onDelete }) {
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaName, setMetaName] = useState(bot.name)
  const [metaTags, setMetaTags] = useState((bot.tags || []).join(', '))
  const [confirmDeleteBot, setConfirmDeleteBot] = useState(false)
  const [confirmDeleteSnap, setConfirmDeleteSnap] = useState(null)
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

  const latest = sortedSnaps[sortedSnaps.length - 1]
  const prev = sortedSnaps.length > 1 ? sortedSnaps[sortedSnaps.length - 2] : null

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
    onAddSnapshot(createSnapshot({
      date: new Date(newSnap.date + 'T12:00:00').toISOString(),
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
                style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
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
            <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
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
                  className="bg-surface-alt border border-border rounded px-2 py-1 text-lg font-display text-text-primary focus:outline-none focus:border-accent/50"
                />
                <input
                  value={metaTags}
                  onChange={e => setMetaTags(e.target.value)}
                  placeholder="tags, comma-separated"
                  className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent/50"
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
                        background: 'var(--color-accent-faint)',
                        border: '1px solid var(--color-accent-faint-border)',
                        color: 'var(--color-accent-faint-text)',
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
                  className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pfpFileRef.current?.click()}
                  className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/40 text-text-secondary hover:text-text-primary transition shrink-0"
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
                    <div className="text-[10px] num mt-0.5" style={{ color: m.card.label }}>{fmtFull(val)}</div>
                    {delta !== null && delta !== 0 && (
                      <div className={`text-xs mt-1 num ${delta > 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
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

          {/* Growth chart */}
          {chartSnaps.length >= 2 && (
            <div className="mb-6 border border-border rounded-lg p-4 bg-surface">
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
                <TrendingUp size={16} className="text-accent opacity-60" />
                Growth over time
              </div>
              <div style={{ height: 280, overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSnaps} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="var(--color-border-subtle)" />
                    <XAxis
                      dataKey="date"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="var(--color-text-muted)"
                      style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={fmt}
                      stroke="var(--color-text-muted)"
                      style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={fmt}
                      stroke="var(--color-text-muted)"
                      style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {METRICS.map(m => (
                      <Line
                        key={m.key}
                        yAxisId={m.key === 'messages' ? 'right' : 'left'}
                        type="monotone"
                        dataKey={m.key}
                        stroke={m.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={m.label}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-text-muted mt-2">
                Threads &amp; favorites use left axis; messages use right axis (different scales).
              </p>
            </div>
          )}

          {/* Snapshot list */}
          <div className="border border-border rounded-lg bg-surface">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <ClipboardPlus size={14} className="text-accent opacity-60" />
                Snapshots ({sortedSnaps.length})
              </div>
              <button
                onClick={() => setAddingSnap(a => !a)}
                className="text-xs px-2 py-1 border border-border hover:border-accent/40 rounded flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition"
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
                    className="col-span-3 bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent/50"
                  />
                  <input
                    placeholder="threads"
                    value={newSnap.chats}
                    onChange={e => setNewSnap(s => ({ ...s, chats: e.target.value }))}
                    className="col-span-2 num bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent/50"
                  />
                  <input
                    placeholder="messages"
                    value={newSnap.messages}
                    onChange={e => setNewSnap(s => ({ ...s, messages: e.target.value }))}
                    className="col-span-3 num bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent/50"
                  />
                  <input
                    placeholder="favs"
                    value={newSnap.favorites}
                    onChange={e => setNewSnap(s => ({ ...s, favorites: e.target.value }))}
                    className="col-span-2 num bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent/50"
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
                    className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent/50"
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
                  <th className="text-right py-2 px-3">Threads</th>
                  <th className="text-right py-2 px-3">Messages</th>
                  <th className="text-right py-2 px-3">Favorites</th>
                  <th className="text-right py-2 px-3">Scope</th>
                  <th className="py-2 px-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {[...sortedSnaps].reverse().map(s => (
                  <tr key={s.date} className="border-b border-border-subtle hover:bg-surface-alt/50">
                    <td className="py-2 px-4 text-xs text-text-secondary">{fmtDate(s.date)}</td>
                    <td className="py-2 px-3 text-right num text-sm text-text-value">{fmt(s.chats)}</td>
                    <td className="py-2 px-3 text-right num text-sm text-text-value">{fmt(s.messages)}</td>
                    <td className="py-2 px-3 text-right num text-sm text-text-value">{fmt(s.favorites)}</td>
                    <td className="py-2 px-3 text-right text-[10px] text-text-muted">{s.scope || ''}</td>
                    <td className="py-2 px-3 text-right">
                      {confirmDeleteSnap === s.date ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-text-secondary text-[10px] whitespace-nowrap">Delete?</span>
                          <button
                            onClick={() => { onDeleteSnapshot(s.date); setConfirmDeleteSnap(null) }}
                            className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 text-[10px] transition"
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
                          onClick={() => setConfirmDeleteSnap(s.date)}
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
                  className="px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition"
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
