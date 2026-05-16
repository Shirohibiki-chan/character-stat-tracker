import { saveBots } from './storage-service.js'

const DEBOUNCE_MS = 400

// Timer lives in module scope — survives React re-renders as a singleton
let timer = null

export function scheduleSave(bots) {
  clearTimeout(timer)
  timer = setTimeout(() => saveBots(bots), DEBOUNCE_MS)
}
