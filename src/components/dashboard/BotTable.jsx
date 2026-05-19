import { useState } from 'react'
import { Pencil, Camera, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
        className={`inline-flex items-center gap-1 font-bold transition ${active ? 'text-accent-light' : 'text-text-primary hover:text-white'}`}
      >
        {label} <Icon size={11} />
      </button>
    </th>
  )
}

export default function BotTable({ sorted, sortBy, sortDir, toggleSort, onViewBot, onEditBot, onAddSnapshot, onDeleteBot }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  return (
    <section className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
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
                  style={{ background: `color-mix(in srgb, ${m.accentVar} var(--table-header-tint-opacity), transparent)` }}
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
                <td colSpan={7} className="text-center py-12 text-text-muted text-sm">
                  No bots match your filters.
                </td>
              </tr>
            )}
            {sorted.map((bot, idx) => {
              const aura = getAura(bot.id)
              const isEven = idx % 2 === 1
              return (
                <tr
                  key={bot.id}
                  className="hover:!bg-surface-alt/60 transition cursor-pointer"
                  style={isEven ? { background: 'rgba(255, 255, 255, var(--table-banding-alpha))' } : undefined}
                  onClick={() => onViewBot(bot.id)}
                >
                  <td className="pl-5 py-3 font-bold">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-xs num w-6 shrink-0">{idx + 1}</span>
                      {bot.avatar ? (
                        <img
                          src={bot.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary text-xs shrink-0 font-bold"
                          style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
                        >
                          {bot.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
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
                        style={{ background: `color-mix(in srgb, ${m.accentVar} var(--table-row-tint-opacity), transparent)` }}
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
                          <Camera size={13} />
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
