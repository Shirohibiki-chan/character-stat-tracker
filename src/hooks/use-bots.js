import { useEffect } from 'react'
import { useBotStore } from '../state/bot-store.js'
import { loadBots } from '../services/storage-service.js'

export function useBots() {
  const { bots, initialized, setBots, addBot, updateBot, deleteBot, addSnapshot, deleteSnapshot } = useBotStore()

  useEffect(() => {
    if (initialized) return
    loadBots().then(setBots)
  }, [initialized, setBots])

  return {
    bots,
    botCount: Object.keys(bots).length,
    addBot,
    updateBot,
    deleteBot,
    addSnapshot,
    deleteSnapshot,
  }
}
