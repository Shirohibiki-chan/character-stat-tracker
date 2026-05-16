export function normalizeAvatar(url) {
  if (!url) return null
  const m = url.match(/\/([a-f0-9-]+-image\.[a-z]+)(\?|$)/i)
  return m ? m[1] : url
}
