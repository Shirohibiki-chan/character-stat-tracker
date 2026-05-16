export function exportBots(bots) {
  const blob = new Blob([JSON.stringify({ bots }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `charsnap-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBotFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result)
        const bots = parsed.bots ?? parsed
        if (typeof bots !== 'object' || Array.isArray(bots)) {
          reject(new Error('Invalid backup file — expected a bots object.'))
          return
        }
        resolve(bots)
      } catch {
        reject(new Error('Could not parse file — is this a CharSnap Stats backup?'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsText(file)
  })
}
