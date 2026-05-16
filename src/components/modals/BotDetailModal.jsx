import { useState, useMemo } from 'react'
import { X, ChevronLeft, Pencil, Check, Plus, Trash2, TrendingUp, Camera } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtFull, fmtDate, parseNum } from '../../constants/format.js'
import { createSnapshot, SCOPES } from '../../constants/schema.js'
import Modal from './Modal.jsx'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-stone-950 border border-stone-700 rounded px-3 py-2 shadow-xl">
      <div className="text-xs text-stone-400 mb-1">{d.dateLabel}</div>
      {METRICS.map(m => (
        <div key={m.key} className="flex justify-between gap-6 text-xs">
          <span className="text-stone-500">{m.label}</span>
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

  const isDirty = addingSnap && !!(newSnap.chats || newSnap.messages || newSnap.favorites)

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
        className="bg-stone-950 border border-stone-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-stone-800 shrink-0">
          <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-200 transition">
            <ChevronLeft size={20} />
          </button>
          {bot.avatar ? (
            <img
              src={bot.avatar}
              alt=""
              className="w-14 h-14 rounded-full object-cover bg-stone-800 shrink-0"
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 font-display text-2xl shrink-0">
              {bot.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {editingMeta ? (
              <div className="flex flex-col gap-2">
                <input
                  value={metaName}
                  onChange={e => setMetaName(e.target.value)}
                  className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-lg font-display focus:outline-none focus:border-amber-300/40"
                />
                <input
                  value={metaTags}
                  onChange={e => setMetaTags(e.target.value)}
                  placeholder="tags, comma-separated"
                  className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40"
                />
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl truncate">{bot.name}</h2>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(bot.tags || []).map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {editingMeta ? (
              <>
                <button onClick={saveMeta} className="p-2 text-emerald-400 hover:bg-stone-800 rounded transition">
                  <Check size={16} />
                </button>
                <button onClick={cancelMeta} className="p-2 text-stone-500 hover:bg-stone-800 rounded transition">
                  <X size={16} />
                </button>
              </>
            ) : (
              <button onClick={() => setEditingMeta(true)} className="p-2 text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded transition">
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto scrollbar-thin px-6 py-5 flex-1">

          {/* Metric cards */}
          {sortedSnaps.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {METRICS.map(m => {
                const val = latest[m.key]
                const delta = prev != null ? val - prev[m.key] : null
                return (
                  <div key={m.key} className="border border-stone-800 rounded-lg p-4 bg-stone-950/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-stone-500">{m.label}</span>
                    </div>
                    <div className="num text-3xl font-medium" style={{ color: m.color }}>{fmt(val)}</div>
                    <div className="text-[10px] text-stone-600 num mt-0.5">{fmtFull(val)}</div>
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
            <p className="text-center py-8 text-stone-500 text-sm mb-6">
              No snapshots yet. Add one below or paste from CharSnap.
            </p>
          )}

          {/* Growth chart */}
          {chartSnaps.length >= 2 && (
            <div className="mb-6 border border-stone-800 rounded-lg p-4 bg-stone-950/40">
              <div className="flex items-center gap-2 text-sm text-stone-300 mb-3">
                <TrendingUp size={16} className="text-amber-300/70" />
                Growth over time
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSnaps} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#292524" />
                    <XAxis
                      dataKey="date"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="#78716c"
                      style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={fmt}
                      stroke="#78716c"
                      style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={fmt}
                      stroke="#78716c"
                      style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
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
              <p className="text-[10px] text-stone-600 mt-2">
                Threads &amp; favorites use left axis; messages use right axis (different scales).
              </p>
            </div>
          )}

          {/* Snapshot list */}
          <div className="border border-stone-800 rounded-lg bg-stone-950/40">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <div className="flex items-center gap-2 text-sm text-stone-300">
                <Camera size={14} className="text-amber-300/70" />
                Snapshots ({sortedSnaps.length})
              </div>
              <button
                onClick={() => setAddingSnap(a => !a)}
                className="text-xs px-2 py-1 border border-stone-700 hover:border-amber-300/40 rounded flex items-center gap-1.5 text-stone-400 hover:text-stone-200 transition"
              >
                <Plus size={12} /> Add manual snapshot
              </button>
            </div>

            {addingSnap && (
              <div className="border-b border-stone-800 p-3 bg-amber-300/5">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="date"
                    value={newSnap.date}
                    onChange={e => setNewSnap(s => ({ ...s, date: e.target.value }))}
                    className="col-span-3 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40"
                  />
                  <input
                    placeholder="threads"
                    value={newSnap.chats}
                    onChange={e => setNewSnap(s => ({ ...s, chats: e.target.value }))}
                    className="col-span-2 num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40"
                  />
                  <input
                    placeholder="messages"
                    value={newSnap.messages}
                    onChange={e => setNewSnap(s => ({ ...s, messages: e.target.value }))}
                    className="col-span-3 num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40"
                  />
                  <input
                    placeholder="favs"
                    value={newSnap.favorites}
                    onChange={e => setNewSnap(s => ({ ...s, favorites: e.target.value }))}
                    className="col-span-2 num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40"
                  />
                  <div className="col-span-2 flex gap-1 justify-end">
                    <button onClick={submitSnap} className="p-1.5 text-emerald-400 hover:bg-stone-800 rounded transition">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setAddingSnap(false)} className="p-1.5 text-stone-500 hover:bg-stone-800 rounded transition">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-stone-600">
                    Shorthand like <code className="text-stone-400">52k</code> works.
                  </span>
                  <select
                    value={newSnap.scope}
                    onChange={e => setNewSnap(s => ({ ...s, scope: e.target.value }))}
                    className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none focus:border-amber-300/40"
                  >
                    {SCOPES.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-stone-500">
                <tr className="border-b border-stone-800">
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
                  <tr key={s.date} className="border-b border-stone-900 hover:bg-stone-900/40">
                    <td className="py-2 px-4 text-xs text-stone-400">{fmtDate(s.date)}</td>
                    <td className="py-2 px-3 text-right num text-sm">{fmt(s.chats)}</td>
                    <td className="py-2 px-3 text-right num text-sm">{fmt(s.messages)}</td>
                    <td className="py-2 px-3 text-right num text-sm">{fmt(s.favorites)}</td>
                    <td className="py-2 px-3 text-right text-[10px] text-stone-600">{s.scope || ''}</td>
                    <td className="py-2 px-3 text-right">
                      {confirmDeleteSnap === s.date ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-stone-400 text-[10px] whitespace-nowrap">Delete?</span>
                          <button
                            onClick={() => { onDeleteSnapshot(s.date); setConfirmDeleteSnap(null) }}
                            className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 text-[10px] transition"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSnap(null)}
                            className="px-1.5 py-0.5 text-stone-500 hover:text-stone-300 text-[10px] transition"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteSnap(s.date)}
                          className="p-1 text-stone-600 hover:text-red-400 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedSnaps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-stone-500 text-xs">No snapshots recorded yet.</td>
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
                className="text-xs text-stone-600 hover:text-red-400 transition flex items-center gap-1.5"
              >
                <Trash2 size={12} /> Delete this bot and its history
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-400">Delete &ldquo;{bot.name}&rdquo; and all snapshots?</span>
                <button
                  onClick={onDelete}
                  className="px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDeleteBot(false)}
                  className="px-2 py-1 text-stone-500 hover:text-stone-300 transition"
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
