import { useBotStore } from '../state/bot-store.js'
import { exportBots as exportBotsService, parseBotFile } from '../services/backup-service.js'

export function useBackup() {
  const { bots, setBots, resetBots } = useBotStore()

  function exportBots() {
    exportBotsService(bots)
  }

  async function importBotsFromFile(file) {
    const parsed = await parseBotFile(file)
    setBots(parsed)
  }

  return { exportBots, importBotsFromFile, resetBots, botCount: Object.keys(bots).length }
}
