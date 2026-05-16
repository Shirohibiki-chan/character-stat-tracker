import { create } from 'zustand'
import { scheduleSave } from '../services/autosave.js'

export const useBotStore = create((set, get) => ({
  bots: {},
  initialized: false,

  setBots(bots) {
    set({ bots, initialized: true })
    // no autosave on initial load — data came from disk
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

  deleteSnapshot(botId, date) {
    const bot = get().bots[botId]
    const updated = { ...bot, snapshots: bot.snapshots.filter(s => s.date !== date) }
    const bots = { ...get().bots, [botId]: updated }
    set({ bots })
    scheduleSave(bots)
  },
}))
