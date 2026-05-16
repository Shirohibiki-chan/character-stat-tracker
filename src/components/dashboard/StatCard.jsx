import { fmt, fmtFull } from '../../constants/format.js'

export default function StatCard({ label, value, accent, icon: Icon }) {
  return (
    <div className="relative overflow-hidden border border-stone-800 rounded-lg p-5 bg-stone-950/40 backdrop-blur hover:border-stone-700 transition">
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: accent, opacity: 0.6 }} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[0.2em] uppercase text-stone-500">{label}</span>
        {Icon && <Icon size={14} style={{ color: accent }} className="opacity-60" />}
      </div>
      <div className="num text-4xl font-medium" style={{ color: accent }}>{fmt(value)}</div>
      {value >= 1000 && (
        <div className="num text-[10px] text-stone-600 mt-1">{fmtFull(value)}</div>
      )}
    </div>
  )
}
