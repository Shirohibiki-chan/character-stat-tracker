import { useSettingsStore } from '../state/settings-store.js'

export function useSettings() {
  return useSettingsStore()
}
