import { fmt, fmtFull } from '../../constants/format.js'

export default function StatCard({ label, value, card, icon: Icon }) {
  const bg     = card?.bg     ?? 'var(--color-surface)'
  const border = card?.border ?? 'var(--color-border)'
  const labelColor  = card?.label  ?? 'var(--color-text-tertiary)'
  const numberColor = card?.number ?? 'var(--color-text-primary)'

  return (
    <div
      className="rounded-lg text-center"
      style={{ background: bg, border: `1px solid ${border}`, padding: '18px 16px' }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-[0.22em] mb-3"
        style={{ color: labelColor }}
      >
        {label}
      </div>
      {Icon && (
        <div className="flex justify-center mb-2">
          <Icon size={14} style={{ color: numberColor, opacity: 0.6 }} />
        </div>
      )}
      <div
        className="num text-[32px] leading-none"
        style={{ color: numberColor, fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        {fmt(value)}
      </div>
      {value >= 1000 && (
        <div className="num text-[10px] mt-1" style={{ color: labelColor }}>{fmtFull(value)}</div>
      )}
    </div>
  )
}
