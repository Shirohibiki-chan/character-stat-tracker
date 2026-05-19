// card.* values are CSS var() references consumed by StatCard.
export const METRICS = [
  {
    key: 'messages',
    label: 'Messages',
    color: '#34d399',
    icon: 'MessagesSquare',
    accentVar: 'var(--accent-messages)',
    card: {
      bg:       'var(--color-surface)',
      border:   'var(--color-metric-messages-border)',
      label:    'var(--color-text-secondary)',
      number:   'var(--color-metric-messages)',
      gradient: 'var(--gradient-messages)',
    },
  },
  {
    key: 'chats',
    label: 'Threads',
    color: '#818cf8',
    icon: 'MessageSquare',
    accentVar: 'var(--accent-threads)',
    card: {
      bg:       'var(--color-surface)',
      border:   'var(--color-metric-threads-border)',
      label:    'var(--color-text-secondary)',
      number:   'var(--color-metric-threads)',
      gradient: 'var(--gradient-threads)',
    },
  },
  {
    key: 'favorites',
    label: 'Favorites',
    color: '#fb7185',
    icon: 'Heart',
    accentVar: 'var(--accent-favorites)',
    card: {
      bg:       'var(--color-surface)',
      border:   'var(--color-metric-favorites-border)',
      label:    'var(--color-text-secondary)',
      number:   'var(--color-metric-favorites)',
      gradient: 'var(--gradient-favorites)',
    },
  },
]

export const BOTS_CARD = {
  bg:       'var(--color-surface)',
  border:   'var(--color-metric-bots-border)',
  label:    'var(--color-text-secondary)',
  number:   'var(--color-metric-bots)',
  gradient: 'var(--gradient-bots)',
}
