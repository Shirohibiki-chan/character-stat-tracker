// Rewrites CharSnap CDN avatar URLs to request a face-cropped version via
// Cloudflare Images' gravity=face transform. Falls back to the original URL
// on error so non-CDN avatars (manual uploads, etc.) still display normally.
function faceUrl(url, w, h) {
  if (!url) return null
  const base = 'https://cdn.charsnap.ai/cdn-cgi/image/'
  if (!url.startsWith(base)) return url
  const rest = url.slice(base.length)
  const slash = rest.indexOf('/')
  if (slash === -1) return url
  return `${base}width=${w},height=${h},fit=cover,gravity=face,format=auto${rest.slice(slash)}`
}

export default function BotTooltip({ avatar, name, children }) {
  return (
    <div className="bg-bg border border-border rounded shadow-xl overflow-hidden" style={{ minWidth: 210, maxWidth: 260 }}>
      {avatar && (
        <div className="relative h-24 overflow-hidden">
          <img
            src={faceUrl(avatar, 260, 96) || avatar}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 15%' }}
            onError={e => { if (!e.target.dataset.fb) { e.target.dataset.fb = '1'; e.target.src = avatar } }}
          />
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
