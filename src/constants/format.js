// DISPLAY-ONLY — output is a formatted string for the DOM.
// Never pass fmt() output into arithmetic, comparisons, or sorts.
// Always operate on the raw numeric value and call fmt() only at the render site.
export function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 999_950_000) return parseFloat((n / 1e9).toFixed(1)) + 'B'
  if (abs >= 999_950)     return parseFloat((n / 1e6).toFixed(1)) + 'M'
  if (abs >= 1e3)         return parseFloat((n / 1e3).toFixed(1)) + 'K'
  return String(n)
}

export function fmtFull(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US').format(n)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  // Date-only strings (YYYY-MM-DD) parse as UTC midnight, which shows as the previous day in
  // timezones behind UTC. Append local noon to force correct local-date display.
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

export function fmtRelative(iso) {
  if (!iso) return 'never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return fmtDate(iso)
}

export function parseNum(v) {
  if (v === '' || v == null) return 0
  const cleaned = String(v)
    .replace(/[,\s]/g, '')
    .replace(/k$/i, '000')
    .replace(/m$/i, '000000')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}
