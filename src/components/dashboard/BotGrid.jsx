import { Pencil } from 'lucide-react'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt } from '../../constants/format.js'

function avatarGlow(color) {
  return `0 0 0 1.5px ${color}, 0 0 10px 1px ${color}8c, 0 0 18px 2px ${color}38`
}

export default function BotGrid({ sorted, onViewBot, selectMode, selectedIds, onToggleSelect }) {
  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted text-sm border border-border rounded-lg bg-surface">
        No bots match your filters.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {sorted.map(bot => {
        const aura = getAura(bot.id)
        const selected = selectedIds?.has(bot.id)
        return (
          <div
            key={bot.id}
            className={`relative border rounded-lg bg-surface p-3 cursor-pointer transition hover:border-accent/40 hover:bg-surface-alt flex flex-col items-center gap-2 text-center ${
              selected ? 'border-accent/60 bg-accent-faint' : 'border-border'
            }`}
            onClick={() => selectMode ? onToggleSelect?.(bot.id) : onViewBot?.(bot.id)}
          >
            {selectMode && (
              <div className="absolute top-2 left-2 z-10" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => onToggleSelect?.(bot.id)}
                  className="w-4 h-4 cursor-pointer accent-accent"
                />
              </div>
            )}

            <div className="relative mt-1">
              {bot.avatar ? (
                <img
                  src={bot.avatar}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover shrink-0"
                  style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-text-secondary shrink-0"
                  style={{ backgroundColor: 'var(--color-surface-edge)', boxShadow: avatarGlow(aura) }}
                >
                  {bot.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
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

            <div className="w-full min-w-0">
              <p
                className="text-sm font-bold text-text-primary truncate"
                style={{ fontFamily: 'var(--table-text-font)' }}
              >
                {bot.name}
              </p>
            </div>

            {bot.latest && (
              <div className="w-full space-y-0.5">
                {METRICS.map(m => (
                  <div key={m.key} className="flex justify-between items-center text-[11px]">
                    <span className="text-text-muted">{m.label.charAt(0)}</span>
                    <span
                      className="num font-bold"
                      style={{ color: 'var(--color-table-nums)', fontFamily: 'var(--table-nums-font)' }}
                    >
                      {fmt(bot[m.key])}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(bot.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {bot.tags.slice(0, 2).map(t => (
                  <span
                    key={t}
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
                    style={{
                      background: 'var(--color-accent-faint)',
                      color: 'var(--color-accent-faint-text)',
                    }}
                  >
                    {t}
                  </span>
                ))}
                {bot.tags.length > 2 && (
                  <span className="text-[9px] text-text-muted">+{bot.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
