import { useRef, useState } from 'react'
import { X, Download, Upload, Trash2 } from 'lucide-react'
import { useBackup } from '../../hooks/use-backup.js'

export default function BackupModal({ onClose }) {
  const { exportBots, importBotsFromFile, resetBots, botCount } = useBackup()

  const fileRef = useRef(null)
  const [importState, setImportState] = useState('idle') // idle | confirm | error
  const [importFile, setImportFile] = useState(null)
  const [importError, setImportError] = useState('')
  const [resetState, setResetState] = useState('idle') // idle | confirm

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImportFile(file)
    setImportState('confirm')
    e.target.value = ''
  }

  async function confirmImport() {
    try {
      await importBotsFromFile(importFile)
      onClose()
    } catch (err) {
      setImportError(err.message)
      setImportState('error')
    }
  }

  function confirmReset() {
    resetBots()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-stone-950 border border-stone-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <h2 className="font-medium text-stone-100">Data &amp; Backup</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Export */}
          <div className="border border-stone-800 rounded-lg p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-stone-500">Export</div>
            <p className="text-sm text-stone-400">
              Download all your bots and snapshot history as a JSON file.
            </p>
            <button
              onClick={exportBots}
              className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider bg-stone-800 hover:bg-stone-700 text-stone-200 rounded transition"
            >
              <Download size={13} /> Download backup
            </button>
          </div>

          {/* Import */}
          <div className="border border-stone-800 rounded-lg p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-stone-500">Import</div>
            <p className="text-sm text-stone-400">
              Restore from a backup file. This will <span className="text-amber-300/80">replace all current data</span>.
            </p>

            {importState === 'idle' && (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider bg-stone-800 hover:bg-stone-700 text-stone-200 rounded transition"
              >
                <Upload size={13} /> Choose backup file
              </button>
            )}

            {importState === 'confirm' && (
              <div className="space-y-2">
                <p className="text-xs text-stone-400">
                  Replace all {botCount} current bots with data from <span className="text-stone-200">{importFile?.name}</span>?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    className="px-3 py-1.5 text-xs bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded transition font-medium"
                  >
                    Yes, replace
                  </button>
                  <button
                    onClick={() => setImportState('idle')}
                    className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {importState === 'error' && (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{importError}</p>
                <button
                  onClick={() => setImportState('idle')}
                  className="text-xs text-stone-500 hover:text-stone-300 transition"
                >
                  Try again
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Reset */}
          <div className="border border-red-900/30 rounded-lg p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-red-400/70">Danger zone</div>
            <p className="text-sm text-stone-400">
              Permanently delete all {botCount} bots and their snapshot history.
            </p>

            {resetState === 'idle' && (
              <button
                onClick={() => setResetState('confirm')}
                className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-800 rounded transition"
              >
                <Trash2 size={13} /> Reset all data
              </button>
            )}

            {resetState === 'confirm' && (
              <div className="space-y-2">
                <p className="text-xs text-red-300">
                  Delete all {botCount} bots? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmReset}
                    className="px-3 py-1.5 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded transition"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setResetState('idle')}
                    className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
