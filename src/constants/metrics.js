// card.* and tint values use hardcoded rgba/hex — not CSS var() references —
// so inline styles resolve correctly on first paint before the CSS file is cached.
export const METRICS = [
  {
    key: 'messages',
    label: 'Messages',
    color: '#34d399',
    icon: 'MessagesSquare',
    accentVar: 'var(--accent-messages)',
    rowTint:    'rgba(91, 168, 127, 0.10)',
    headerTint: 'rgba(91, 168, 127, 0.14)',
    card: {
      bg:       '#111520',
      border:   'rgba(91, 168, 127, 0.42)',
      label:    '#a7bad2',
      number:   '#5ba87f',
      gradient: 'linear-gradient(to bottom, rgba(91, 168, 127, 0.35), rgba(91, 168, 127, 0))',
    },
  },
  {
    key: 'chats',
    label: 'Threads',
    color: '#818cf8',
    icon: 'MessageSquare',
    accentVar: 'var(--accent-threads)',
    rowTint:    'rgba(157, 143, 212, 0.10)',
    headerTint: 'rgba(157, 143, 212, 0.14)',
    card: {
      bg:       '#111520',
      border:   'rgba(157, 143, 212, 0.42)',
      label:    '#a7bad2',
      number:   '#9d8fd4',
      gradient: 'linear-gradient(to bottom, rgba(157, 143, 212, 0.35), rgba(157, 143, 212, 0))',
    },
  },
  {
    key: 'favorites',
    label: 'Favorites',
    color: '#fb7185',
    icon: 'Heart',
    accentVar: 'var(--accent-favorites)',
    rowTint:    'rgba(212, 138, 160, 0.10)',
    headerTint: 'rgba(212, 138, 160, 0.14)',
    card: {
      bg:       '#111520',
      border:   'rgba(212, 138, 160, 0.42)',
      label:    '#a7bad2',
      number:   '#d48aa0',
      gradient: 'linear-gradient(to bottom, rgba(212, 138, 160, 0.35), rgba(212, 138, 160, 0))',
    },
  },
]

export const BOTS_CARD = {
  bg:       '#111520',
  border:   'rgba(75, 168, 196, 0.42)',
  label:    '#a7bad2',
  number:   '#4ba8c4',
  gradient: 'linear-gradient(to bottom, rgba(75, 168, 196, 0.35), rgba(75, 168, 196, 0))',
}
