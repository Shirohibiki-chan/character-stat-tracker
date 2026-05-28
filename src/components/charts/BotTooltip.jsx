export default function BotTooltip({ avatar, name, children }) {
  return (
    <div className="bg-bg border border-border rounded shadow-xl overflow-hidden" style={{ minWidth: 210, maxWidth: 260 }}>
      {avatar && (
        <div className="relative h-16 overflow-hidden">
          <img src={avatar} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--color-bg) 90%)' }} />
        </div>
      )}
      <div className="px-3 pb-2" style={avatar ? { marginTop: '-12px', position: 'relative' } : { paddingTop: '8px' }}>
        <div className="font-bold text-sm truncate mb-1">{name}</div>
        {children}
      </div>
    </div>
  )
}
