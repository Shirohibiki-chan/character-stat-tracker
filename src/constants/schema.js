export const SCOPES = ['Total', 'Last 24h', 'Last 7d', 'Last 30d']

export function createBot(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: '',
    avatar: null,
    avatarIsManual: false,
    tags: [],
    snapshots: [],
    ...overrides,
  }
}

export function createSnapshot(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    chats: 0,
    messages: 0,
    favorites: 0,
    scope: 'Total',
    ...overrides,
    // messagesSolo / messagesGroup are optional — not defaulted
  }
}
