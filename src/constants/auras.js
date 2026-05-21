// Keep in sync with --color-aura-1..5 in index.css.
export const AURAS = ['#7dd3fc', '#a78bfa', '#f472b6', '#34d399', '#fb923c']

// Darker variants of the same hues — used for bar chart fills so they're not eye-straining.
const BAR_COLORS = ['#2d8fb5', '#7a55c8', '#c24278', '#29a07a', '#cf6d26']

function _hash(id) {
  return [...String(id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

// Deterministic aura color for a bot — same id always gets the same color.
export function getAura(id) {
  if (!id) return AURAS[0]
  return AURAS[_hash(id) % AURAS.length]
}

// Darker version of the aura color, for use in bar charts.
export function getBarColor(id) {
  if (!id) return BAR_COLORS[0]
  return BAR_COLORS[_hash(id) % BAR_COLORS.length]
}
