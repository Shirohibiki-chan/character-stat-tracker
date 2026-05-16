import { useState } from 'react'
import { Pencil, Camera, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtFull, fmtRelative } from '../../constants/format.js'

function SortHeader({ label, active, dir, onClick, className = '' }) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={`py-3 px-3 text-[11px] uppercase tracking-wider font-medium ${className}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition ${active ? 'text-amber-300' : 'text-stone-500 hover:text-stone-300'}`}
      >
        {label} <Icon size={11} />
      </button>
    </th>
  )
}

export default function BotTable({ sorted, sortBy, sortDir, toggleSort, onViewBot, onEditBot, onAddSnapshot, onDeleteBot }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  return (
    <section className="border border-stone-800 rounded-lg overflow-hidden bg-stone-950/30">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-950/60">
              <SortHeader
                className="text-left pl-5"
                label="Bot"
                active={sortBy === 'name'}
                dir={sortDir}
                onClick={() => toggleSort('name')}
              />
              {METRICS.map(m => (
                <SortHeader
                  key={m.key}
                  className="text-right"
                  label={m.label}
                  active={sortBy === m.key}
                  dir={sortDir}
                  onClick={() => toggleSort(m.key)}
                />
              ))}
              <SortHeader
                className="text-right"
                label="Updated"
                active={sortBy === 'updated'}
                dir={sortDir}
                onClick={() => toggleSort('updated')}
              />
              <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider text-stone-500 font-medium">
                Tags
              </th>
              <th className="py-3 px-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-stone-500 text-sm">
                  No bots match your filters.
                </td>
              </tr>
            )}
            {sorted.map((bot, idx) => (
              <tr
                key={bot.id}
                className="border-b border-stone-900 hover:bg-stone-900/30 transition cursor-pointer"
                onClick={() => onViewBot(bot.id)}
              >
                <td className="pl-5 py-3 font-medium">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-600 text-xs num w-6 shrink-0">{idx + 1}</span>
                    {bot.avatar ? (
                      <img
                        src={bot.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover bg-stone-800 shrink-0"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 text-xs shrink-0">
                        {bot.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="truncate block">{bot.name}</span>
                      {bot.snapshotCount > 0 && (
                        <span className="text-[10px] text-stone-600 num">
                          {bot.snapshotCount} snap{bot.snapshotCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {METRICS.map(m => {
                  const deltaKey = `delta${m.key[0].toUpperCase()}${m.key.slice(1)}`
                  const delta = bot[deltaKey]
                  return (
                    <td key={m.key} className="py-3 px-3 text-right">
                      <div className="num" title={bot.latest ? fmtFull(bot[m.key]) : undefined}>
                        {bot.latest ? fmt(bot[m.key]) : '—'}
                      </div>
                      {delta > 0 && (
                        <div className="text-[10px] text-emerald-400/70 num">+{fmt(delta)}</div>
                      )}
                    </td>
                  )
                })}
                <td className="py-3 px-3 text-right text-xs text-stone-500 num whitespace-nowrap">
                  {fmtRelative(bot.lastCapturedAt)}
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1">
                    {(bot.tags || []).map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                  {confirmDeleteId === bot.id ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-stone-400 text-xs whitespace-nowrap">Delete?</span>
                      <button
                        onClick={() => { onDeleteBot(bot.id); setConfirmDeleteId(null) }}
                        className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 text-xs transition"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 text-stone-500 hover:text-stone-300 text-xs transition"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onEditBot(bot.id)}
                        className="p-1.5 text-stone-600 hover:text-amber-300 hover:bg-stone-800 rounded transition"
                        title="Edit name / tags"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onAddSnapshot(bot.id)}
                        className="p-1.5 text-stone-600 hover:text-amber-300 hover:bg-stone-800 rounded transition"
                        title="Add snapshot"
                      >
                        <Camera size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(bot.id)}
                        className="p-1.5 text-stone-600 hover:text-red-400 hover:bg-stone-800 rounded transition"
                        title="Delete bot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
