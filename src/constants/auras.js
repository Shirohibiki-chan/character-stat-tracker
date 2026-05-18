// Keep in sync with --color-aura-1..5 in index.css.
export const AURAS = ['#7dd3fc', '#a78bfa', '#f472b6', '#34d399', '#fb923c']

// Deterministic aura color for a bot — same id always gets the same color.
export function getAura(id) {
  if (!id) return AURAS[0]
  const hash = [...String(id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return AURAS[hash % AURAS.length]
}
