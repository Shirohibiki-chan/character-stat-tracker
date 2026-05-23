import { useState, useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import { METRICS } from '../../constants/metrics.js'
import { getAura } from '../../constants/auras.js'
import { fmt } from '../../constants/format.js'

const METRIC_COLORS = {
  messages:  'var(--color-metric-messages)',
  chats:     'var(--color-metric-threads)',
  favorites: 'var(--color-metric-favorites)',
}

export default function BotGrid({ sorted, onViewBot, selectMode, selectedIds, onToggleSelect }) {
  const [popoverBotId, setPopoverBotId] = useState(null)
  const popoverRef = useRef(null)

  // Close extra-tags popover on outside click
  useEffect(() => {
    if (!popoverBotId) return
    function close(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverBotId(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [popoverBotId])

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted text-sm border border-border rounded-lg bg-surface">
        No bots match your filters.
      </div>
    )
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
    >
      {sorted.map(bot => {
        const aura = getAura(bot.id)
        const selected = selectedIds?.has(bot.id)
        const tags = bot.tags || []
        const visibleTags = tags.slice(0, 2)
        const extraTags = tags.slice(2)
        const isPopoverOpen = popoverBotId === bot.id

        return (
          <div
            key={bot.id}
            className={`rounded-lg bg-surface border cursor-pointer transition-colors ${
              selected
                ? 'accent-border-60 bg-accent-faint'
                : 'border-border hover-accent-border-40 hover:bg-surface-alt'
            }`}
            onClick={() => selectMode ? onToggleSelect?.(bot.id) : onViewBot?.(bot.id)}
          >
            {/* Hero banner — background-image avoids layout shifts during progressive image loading */}
            <div
              className="relative h-[120px] rounded-t-lg overflow-hidden group bg-surface-edge"
              style={bot.avatar ? {
                backgroundImage: `url(${bot.avatar})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
              } : undefined}
            >
              {!bot.avatar && (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={28} className="text-text-muted opacity-40" />
                </div>
              )}

              {/* PFP edit affordance — bottom-right, visible on hover */}
              <button
                className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-overlay-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Edit PFP"
                onClick={e => { e.stopPropagation(); onViewBot?.(bot.id) }}
              >
                <Camera size={13} className="text-white" />
              </button>

              {/* Bulk-select checkbox — top-left, only in select mode */}
              {selectMode && (
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => onToggleSelect?.(bot.id)}
                    className="w-4 h-4 cursor-pointer accent-accent"
                  />
                </div>
              )}

              {/* Aura glow ring — bottom edge of banner bleeds into card body */}
              <div
                className="absolute inset-x-0 bottom-0 h-px"
                style={{ background: aura, opacity: 0.5 }}
              />
            </div>

            {/* Card body */}
            <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2">
              {/* Name */}
              <p
                className="text-sm font-medium text-text-primary truncate text-center"
                style={{ fontFamily: 'var(--table-text-font)' }}
              >
                {bot.name}
              </p>

              {/* Tag row */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center">
                  {visibleTags.map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide"
                      style={{ background: 'var(--color-accent-faint)', color: 'var(--color-accent-faint-text)' }}
                    >
                      {t}
                    </span>
                  ))}
                  {extraTags.length > 0 && (
                    <div className="relative">
                      <button
                        className="text-[10px] px-2 py-0.5 rounded font-semibold text-text-muted hover:text-text-secondary hover:bg-surface-edge transition"
                        onClick={e => { e.stopPropagation(); setPopoverBotId(isPopoverOpen ? null : bot.id) }}
                      >
                        +{extraTags.length}
                      </button>
                      {isPopoverOpen && (
                        <div
                          ref={popoverRef}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-30 min-w-[120px] max-w-[200px] bg-surface-alt border border-border rounded-lg p-2 shadow-lg"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap gap-1 justify-center">
                            {extraTags.map(t => (
                              <span
                                key={t}
                                className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide"
                                style={{ background: 'var(--color-accent-faint)', color: 'var(--color-accent-faint-text)' }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stats trio */}
              {bot.latest && (
                <div className="grid grid-cols-3 gap-1 mt-0.5">
                  {METRICS.map(m => (
                    <div key={m.key} className="flex flex-col items-center gap-0.5">
                      <span
                        className="text-[10px] text-text-tertiary font-medium leading-tight"
                        style={{ fontFamily: 'var(--table-text-font)' }}
                      >
                        {m.label}
                      </span>
                      <span
                        className="text-sm num font-bold leading-tight"
                        style={{ color: METRIC_COLORS[m.key], fontFamily: 'var(--table-nums-font)' }}
                      >
                        {fmt(bot[m.key])}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
