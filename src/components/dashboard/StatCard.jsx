import { fmt, fmtFull } from '../../constants/format.js'

export default function StatCard({ label, value, card, icon: Icon, gradient, delta }) {
  const bg           = card?.bg       ?? 'var(--color-surface)'
  const border       = card?.border   ?? 'var(--color-border)'
  const labelColor   = card?.label    ?? 'var(--color-text-tertiary)'
  const numberColor  = card?.number   ?? 'var(--color-text-primary)'
  const cardGradient = card?.gradient ?? gradient ?? null

  const showDelta = delta != null && delta !== 0
  const deltaColor = delta > 0 ? numberColor : '#f87171'

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
        {value >= 1000 && (
          <div
            className="num text-[10px] mt-1"
            style={{ color: labelColor, fontWeight: 'var(--stat-subline-weight)' }}
          >
            {fmtFull(value)}
          </div>
        )}
        {showDelta && (
          <div className="num text-[10px] mt-2" style={{ color: deltaColor }}>
            {delta > 0 ? '+' : ''}{fmt(delta)} this week
          </div>
        )}
      </div>
    </div>
  )
}
