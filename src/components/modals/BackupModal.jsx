import { useRef, useState } from 'react'
import { X, Download, Upload, Trash2 } from 'lucide-react'
import { useBackup } from '../../hooks/use-backup.js'
import Modal from './Modal.jsx'

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
    <Modal onClose={onClose}>
      <div className="w-full max-w-md bg-bg border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-text-primary">Data &amp; Backup</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Export */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted">Export</div>
            <p className="text-sm text-text-secondary">
              Download all your bots and snapshot history as a JSON file. You can also send this to a friend so they can load it in the Compare tab for a head-to-head.
            </p>
            <button
              onClick={exportBots}
              className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider font-bold bg-surface-alt hover:bg-surface-edge text-text-secondary rounded transition"
            >
              <Download size={13} /> Download backup
            </button>
          </div>

          {/* Import */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted">Import</div>
            <p className="text-sm text-text-secondary">
              Restore from a backup file. This will <span className="text-accent-light font-bold">replace all current data</span>.
            </p>

            {importState === 'idle' && (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider font-bold bg-surface-alt hover:bg-surface-edge text-text-secondary rounded transition"
              >
                <Upload size={13} /> Choose backup file
              </button>
            )}

            {importState === 'confirm' && (
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">
                  Replace all {botCount} current bots with data from <span className="text-text-primary font-bold">{importFile?.name}</span>?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    className="px-3 py-1.5 text-xs font-bold rounded transition"
                    style={{ background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))', color: '#051018' }}
                  >
                    Yes, replace
                  </button>
                  <button
                    onClick={() => setImportState('idle')}
                    className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition"
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
                  className="text-xs text-text-muted hover:text-text-secondary transition"
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
          <div className="border border-danger-30 rounded-lg p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-danger-dim">Danger zone</div>
            <p className="text-sm text-text-secondary">
              Permanently delete all {botCount} bots and their snapshot history.
            </p>

            {resetState === 'idle' && (
              <button
                onClick={() => setResetState('confirm')}
                className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider text-red-400 hover:text-red-300 border border-danger-40 hover:border-red-800 rounded transition"
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
                    className="px-3 py-1.5 text-xs bg-danger-20 text-red-300 hover-danger-bg rounded transition"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setResetState('idle')}
                    className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
