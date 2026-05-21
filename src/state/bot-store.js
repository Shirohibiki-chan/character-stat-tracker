import { create } from 'zustand'
import { scheduleSave } from '../services/autosave.js'

export const useBotStore = create((set, get) => ({
  bots: {},
  initialized: false,

  setBots(rawBots) {
    // Assign IDs to any snapshots that predate this field
    const bots = Object.fromEntries(
      Object.entries(rawBots).map(([botId, bot]) => [
        botId,
        { ...bot, snapshots: (bot.snapshots || []).map(s => s.id ? s : { id: crypto.randomUUID(), ...s }) },
      ])
    )
    set({ bots, initialized: true })
    scheduleSave(bots)
  },

  addBot(bot) {
    const bots = { ...get().bots, [bot.id]: bot }
    set({ bots })
    scheduleSave(bots)
  },

  updateBot(id, changes) {
    const bots = { ...get().bots, [id]: { ...get().bots[id], ...changes } }
    set({ bots })
    scheduleSave(bots)
  },

  deleteBot(id) {
    const { [id]: _, ...bots } = get().bots
    set({ bots })
    scheduleSave(bots)
  },

  addSnapshot(botId, snapshot) {
    const bot = get().bots[botId]
    const updated = { ...bot, snapshots: [...bot.snapshots, snapshot] }
    const bots = { ...get().bots, [botId]: updated }
    set({ bots })
    scheduleSave(bots)
  },

  deleteSnapshot(botId, snapId) {
    const bot = get().bots[botId]
    const updated = { ...bot, snapshots: bot.snapshots.filter(s => s.id !== snapId) }
    const bots = { ...get().bots, [botId]: updated }
    set({ bots })
    scheduleSave(bots)
  },

  resetBots() {
    set({ bots: {} })
    scheduleSave({})
  },
}))
