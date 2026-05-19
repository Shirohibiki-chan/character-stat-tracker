export function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e9) return parseFloat((n / 1e9).toFixed(1)) + 'B'
  if (abs >= 1e6) return parseFloat((n / 1e6).toFixed(1)) + 'M'
  if (abs >= 1e3) return parseFloat((n / 1e3).toFixed(1)) + 'K'
  return String(n)
}

export function fmtFull(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US').format(n)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
