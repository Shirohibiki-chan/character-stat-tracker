// card.* values are CSS var() references consumed by StatCard.
export const METRICS = [
  {
    key: 'messages',
    label: 'Messages',
    color: '#34d399',
    icon: 'MessagesSquare',
    card: {
      bg:     'var(--color-metric-messages-bg)',
      border: 'var(--color-metric-messages-border)',
      label:  'var(--color-metric-messages-label)',
      number: 'var(--color-metric-messages)',
    },
  },
  {
    key: 'chats',
    label: 'Threads',
    color: '#818cf8',
    icon: 'MessageSquare',
    card: {
      bg:     'var(--color-metric-threads-bg)',
      border: 'var(--color-metric-threads-border)',
      label:  'var(--color-metric-threads-label)',
      number: 'var(--color-metric-threads)',
    },
  },
  {
    key: 'favorites',
    label: 'Favorites',
    color: '#fb7185',
    icon: 'Heart',
    card: {
      bg:     'var(--color-metric-favorites-bg)',
      border: 'var(--color-metric-favorites-border)',
      label:  'var(--color-metric-favorites-label)',
      number: 'var(--color-metric-favorites)',
    },
  },
]
