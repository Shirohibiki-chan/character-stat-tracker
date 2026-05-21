export function parsePasteInput(raw) {
  const text = (raw || '').trim()
  if (!text) return { kind: 'unknown', captures: [] }

  if (text.startsWith('[') || text.startsWith('{')) {
    return parseJSON(text)
  }

  const parsed = parseCopyButtonText(text)
  if (parsed) {
    return {
      kind: 'text',
      captures: [{
        name: null,
        avatarUrl: null,
        scope: parsed.scope,
        chats: parsed.chats,
        messages: parsed.messages,
        favorites: parsed.favorites,
        capturedAt: new Date().toISOString(),
      }],
    }
  }

  return { kind: 'unknown', captures: [] }
}

function parseCopyButtonText(text) {
  if (!/Messages:/i.test(text)) return null
  const scopeRaw = (text.match(/Creator Analytics\s*\((.+?)\)/i) || [])[1] || ''
  const scope = mapScope(scopeRaw)
  const messages = extractNum(text, /Messages:\s*([\d,]+)/i)
  const favorites = extractNum(text, /Favorites:\s*([\d,]+)/i)
  const chats = extractNum(text, /Threads:\s*([\d,]+)/i)
  if (!messages && !favorites && !chats) return null
  return { scope, chats, messages, favorites }
}

function parseJSON(text) {
  try {
    const data = JSON.parse(text)
    const arr = Array.isArray(data) ? data : (data.captures ? data.captures : [data])
    // Filter on the raw object before parseCommaNum so that valid captures with
    // all-zero stats (e.g. a brand-new bot) aren't dropped by a falsy check.
    const valid = arr.filter(c => c && typeof c === 'object' && ('messages' in c || 'chats' in c || 'favorites' in c))
    const captures = valid.map(c => ({
      name: c.name || null,
      avatarUrl: c.avatarUrl || c.avatar || null,
      scope: mapScope(c.scope),
      chats: parseCommaNum(c.chats),
      messages: parseCommaNum(c.messages),
      favorites: parseCommaNum(c.favorites),
      capturedAt: c.capturedAt || new Date().toISOString(),
      ...(c.messagesGroup != null && {
        messagesGroup: parseCommaNum(c.messagesGroup),
        messagesSolo: parseCommaNum(c.messagesSolo),
      }),
    }))
    if (!captures.length) return { kind: 'unknown', captures: [] }
    return { kind: 'json', captures }
  } catch {
    return { kind: 'unknown', captures: [] }
  }
}

// "All Time" and "Total" both mean the Total scope. Check "30" before "7" so
// "30 Days" doesn't accidentally match the "7" branch.
function mapScope(raw) {
  const s = (raw || '').toLowerCase().trim()
  if (!s || s.includes('all time') || s.includes('total')) return 'Total'
  if (s.includes('24')) return 'Last 24h'
  if (s.includes('30')) return 'Last 30d'
  if (s.includes('7')) return 'Last 7d'
  return 'Total'
}

function extractNum(text, re) {
  const m = text.match(re)
  return m ? parseCommaNum(m[1]) : 0
}

function parseCommaNum(v) {
  if (v == null || v === '') return 0
  const n = Number(String(v).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}
