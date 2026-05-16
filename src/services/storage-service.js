// IndexedDB coordinates — the ONLY place these are defined
// DB: charsnap-tracker  |  version: 1  |  store: data  |  record key: 1
const DB_NAME = 'charsnap-tracker'
const DB_VERSION = 1
const STORE = 'data'
const RECORD_KEY = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE)
    }

    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function loadBots() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(RECORD_KEY)
    req.onsuccess = (e) => resolve(e.target.result?.bots ?? {})
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function saveBots(bots) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put({ bots }, RECORD_KEY)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}
