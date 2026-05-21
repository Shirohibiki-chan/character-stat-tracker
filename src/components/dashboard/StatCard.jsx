import { fmt } from '../../constants/format.js'

export default function StatCard({ label, value, card, icon: Icon, gradient, delta, deltaDay }) {
  const bg           = card?.bg       ?? 'var(--color-surface)'
  const border       = card?.border   ?? 'var(--color-border)'
  const labelColor   = card?.label    ?? 'var(--color-text-tertiary)'
  const numberColor  = card?.number   ?? 'var(--color-text-primary)'
  const cardGradient = card?.gradient ?? gradient ?? null

  const showDelta    = delta    != null && delta    !== 0
  const showDeltaDay = deltaDay != null && deltaDay !== 0
  const deltaColor    = delta    > 0 ? 'var(--color-positive)' : 'var(--color-negative)'
  const deltaDayColor = deltaDay > 0 ? 'var(--color-positive)' : 'var(--color-negative)'

  return (
    <div
      className="rounded-lg text-center relative overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}`, padding: 'var(--card-padding) 16px' }}
    >
      {cardGradient && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, background: cardGradient, pointerEvents: 'none', zIndex: 0 }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="uppercase tracking-[0.22em] mb-3"
          style={{
            fontFamily: 'var(--card-label-font)',
            fontWeight: 'var(--stat-label-weight)',
            fontSize: 'var(--label-size)',
            color: labelColor,
          }}
        >
          {label}
        </div>
        {Icon && (
          <div className="flex justify-center mb-2">
            <Icon size={18} style={{ color: numberColor }} />
          </div>
        )}
        <div
          className="leading-none"
          style={{
            fontFamily: 'var(--stat-font-family)',
            fontWeight: 'var(--stat-font-weight)',
            fontSize: 'var(--stat-font-size)',
            letterSpacing: 'var(--stat-letter-spacing)',
            color: numberColor,
          }}
        >
          {fmt(value)}
        </div>
        {showDelta && (
          <div
            className="text-[11px] font-semibold mt-2"
            style={{ fontFamily: 'var(--table-text-font)', color: deltaColor }}
          >
            {delta > 0 ? '+' : ''}{fmt(delta)} this week
          </div>
        )}
        {showDeltaDay && (
          <div
            className="text-[11px] font-semibold mt-0.5"
            style={{ fontFamily: 'var(--table-text-font)', color: deltaDayColor }}
          >
            {deltaDay > 0 ? '+' : ''}{fmt(deltaDay)} today
          </div>
        )}
      </div>
    </div>
  )
}
