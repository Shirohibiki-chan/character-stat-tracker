import { useState } from 'react'
import { Pencil, ClipboardPlus, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt, fmtFull, fmtRelative } from '../../constants/format.js'

function avatarGlow(color) {
  return `0 0 0 1.5px ${color}, 0 0 10px 1px ${color}8c, 0 0 18px 2px ${color}38`
}

function SortHeader({ label, active, dir, onClick, className = '', style }) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={`py-3 px-3 text-[11px] uppercase tracking-[0.22em] font-bold ${className}`} style={style}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 font-bold uppercase transition ${active ? 'text-accent-light' : 'text-text-primary hover:text-white'}`}
      >
        {label} <Icon size={11} />
      </button>
    </th>
  )
}

export default function BotTable({ sorted, sortBy, sortDir, toggleSort, onViewBot, onEditBot, onAddSnapshot, onDeleteBot, selectMode, selectedIds, onToggleSelect }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  return (
    <section className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
              {selectMode && <th className="py-3 pl-4 w-8" />}
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
                  style={{ background: m.headerTint }}
                />
              ))}
              <SortHeader
                className="text-right hidden md:table-cell"
                label="Updated"
                active={sortBy === 'updated'}
                dir={sortDir}
                onClick={() => toggleSort('updated')}
              />
              <th className="text-left py-3 px-3 text-[11px] uppercase tracking-[0.22em] text-text-tertiary font-bold hidden md:table-cell">
                Tags
              </th>
              <th className="py-3 px-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={selectMode ? 8 : 7} className="text-center py-12 text-text-muted text-sm">
                  No bots match your filters.
                </td>
              </tr>
            )}
            {sorted.map((bot, idx) => {
              const aura = getAura(bot.id)
              const isEven = idx % 2 === 1
              const isSelected = selectMode && selectedIds?.has(bot.id)
              return (
                <tr
                  key={bot.id}
                  className={`transition cursor-pointer${isEven ? ' row-banded' : ''}${isSelected ? ' !bg-accent-faint' : ''}`}
                  onClick={() => selectMode ? onToggleSelect?.(bot.id) : onViewBot(bot.id)}
                >
                  {selectMode && (
                    <td className="pl-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => onToggleSelect?.(bot.id)}
                        className="w-4 h-4 cursor-pointer accent-accent"
                      />
                    </td>
                  )}
                  <td className="pl-5 py-3 font-bold">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-xs num w-6 shrink-0">{idx + 1}</span>
                      <div className="relative shrink-0">
                        {bot.avatar ? (
                          <div
                            className="w-8 h-8 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
                          >
                            <img
                              src={bot.avatar}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={e => { e.target.parentElement.style.display = 'none' }}
                            />
                          </div>
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary text-xs font-bold"
                            style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
                          >
                            {bot.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        {bot.avatarIsManual && (
                          <div
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--color-accent)', boxShadow: '0 0 0 1.5px var(--color-bg)' }}
                            title="PFP manually set"
                          >
                            <Pencil size={8} style={{ color: '#051018' }} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span
                          className="truncate block"
                          style={{
                            fontFamily: 'var(--table-text-font)',
                            fontWeight: 'var(--table-text-weight)',
                            fontSize: 'var(--table-size)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {bot.name}
                        </span>
                        {bot.snapshotCount > 0 && (
                          <span className="text-[10px] text-text-muted num">
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
                      <td
                        key={m.key}
                        className="py-3 px-3 text-right"
                        style={{ background: m.rowTint }}
                      >
                        <div
                          className="leading-none"
                          title={bot.latest ? fmtFull(bot[m.key]) : undefined}
                          style={{
                            fontFamily: 'var(--table-nums-font)',
                            fontWeight: 'var(--table-nums-weight)',
                            fontSize: 'var(--table-size)',
                            color: 'var(--color-table-nums)',
                          }}
                        >
                          {bot.latest ? fmt(bot[m.key]) : '—'}
                        </div>
                        {delta > 0 && (
                          <div className="text-[10px] num" style={{ color: m.color }}>+{fmt(delta)}</div>
                        )}
                        {m.key === 'messages' && bot.latest?.messagesGroup != null && bot.latest.messages > 0 && (
                          <div className="text-[10px] num text-text-muted">
                            {Math.round((bot.latest.messagesGroup / bot.latest.messages) * 100)}% grp
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td
                    className="py-3 px-3 text-right whitespace-nowrap hidden md:table-cell"
                    style={{
                      fontFamily: 'var(--table-text-font)',
                      fontWeight: 'var(--table-text-weight)',
                      fontSize: 'var(--table-size)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {fmtRelative(bot.lastCapturedAt)}
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
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
                  </td>
                  <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                    {confirmDeleteId === bot.id ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-text-secondary text-xs whitespace-nowrap">Delete?</span>
                        <button
                          onClick={() => { onDeleteBot(bot.id); setConfirmDeleteId(null) }}
                          className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 text-xs transition"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 text-text-muted hover:text-text-secondary text-xs transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onEditBot(bot.id)}
                          className="p-1.5 text-text-muted hover:text-accent-light hover:bg-surface-alt rounded transition"
                          title="Edit name / tags"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onAddSnapshot(bot.id)}
                          className="p-1.5 text-text-muted hover:text-accent-light hover:bg-surface-alt rounded transition"
                          title="Add snapshot"
                        >
                          <ClipboardPlus size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(bot.id)}
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-surface-alt rounded transition"
                          title="Delete bot"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
