import { useBotStore } from '../state/bot-store.js'
import { normalizeAvatar } from '../services/avatar.js'
import { createBot, createSnapshot } from '../constants/schema.js'

export function useImport() {
  const bots = useBotStore(s => s.bots)
  const addBot = useBotStore(s => s.addBot)
  const addSnapshot = useBotStore(s => s.addSnapshot)

  function previewCaptures(captures) {
    const botsArr = Object.values(bots)
    return captures.map(capture => {
      if (capture.avatarUrl) {
        const norm = normalizeAvatar(capture.avatarUrl)
        const matches = norm ? botsArr.filter(b => normalizeAvatar(b.avatar) === norm) : []
        if (matches.length === 1) {
          return { capture, status: 'auto', candidates: [], assignedBotId: matches[0].id, newName: '' }
        }
        if (matches.length > 1) {
          return { capture, status: 'ambiguous', candidates: matches, assignedBotId: null, newName: '' }
        }
      }

      if (capture.name) {
        const matches = botsArr.filter(b => b.name.toLowerCase() === capture.name.toLowerCase())
        if (matches.length === 1) {
          return { capture, status: 'auto', candidates: [], assignedBotId: matches[0].id, newName: '' }
        }
        if (matches.length > 1) {
          return { capture, status: 'ambiguous', candidates: matches, assignedBotId: null, newName: '' }
        }
        return { capture, status: 'new', candidates: [], assignedBotId: '__new__', newName: capture.name }
      }

      return { capture, status: 'unassigned', candidates: [], assignedBotId: null, newName: '' }
    })
  }

  function applyCaptures(reviewItems) {
    for (const item of reviewItems) {
      if (!item.assignedBotId) continue
      const snap = createSnapshot({
        date: item.capture.capturedAt,
        chats: item.capture.chats,
        messages: item.capture.messages,
        favorites: item.capture.favorites,
        scope: item.capture.scope,
      })
      if (item.assignedBotId === '__new__') {
        const name = item.capture.name || item.newName.trim() || 'Unnamed bot'
        addBot(createBot({ name, avatar: item.capture.avatarUrl || null, snapshots: [snap] }))
      } else {
        addSnapshot(item.assignedBotId, snap)
      }
    }
  }

  return { bots, previewCaptures, applyCaptures }
}
