import { X, Palette, SlidersHorizontal } from 'lucide-react'
import Modal from './Modal.jsx'
import { useSettings } from '../../hooks/use-settings.js'
import { THEMES } from '../../constants/themes.js'
import { VIEWS } from '../../constants/views.js'

export default function SettingsModal({ onClose, onViewChange }) {
  const {
    theme, setTheme,
    defaultView, setDefaultView,
    pageSize, setPageSize,
    compactMode, setCompactMode,
  } = useSettings()

  function handleViewChange(viewId) {
    setDefaultView(viewId)
    onViewChange(viewId)
  }

  return (
    <Modal onClose={onClose}>
      <div
        className="w-full max-w-md bg-bg border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-text-primary">Settings</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Appearance */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted flex items-center gap-1.5">
              <Palette size={11} /> Appearance
            </div>

            <div>
              <p className="text-xs font-bold text-text-secondary mb-2">Theme</p>
              <div className="flex flex-wrap gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`px-3 py-1.5 text-xs rounded font-bold border transition ${
                      theme === t.id
                        ? 'bg-accent-faint text-accent-light border-accent-faint-border'
                        : 'text-text-muted border-border hover:text-text-secondary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-2">More themes coming soon.</p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-text-secondary font-bold">Compact mode</p>
                <p className="text-xs text-text-muted mt-0.5">Tighter spacing on cards and sections</p>
              </div>
              <button
                onClick={() => setCompactMode(!compactMode)}
                role="switch"
                aria-checked={compactMode}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  compactMode ? 'bg-accent' : 'bg-surface-edge'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    compactMode ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted flex items-center gap-1.5">
              <SlidersHorizontal size={11} /> Preferences
            </div>

            <div>
              <p className="text-xs font-bold text-text-secondary mb-2">Opening view</p>
              <div className="flex flex-wrap gap-1.5">
                {VIEWS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleViewChange(v.id)}
                    className={`px-2.5 py-1.5 text-xs rounded font-bold border transition ${
                      defaultView === v.id
                        ? 'bg-accent-faint text-accent-light border-accent-faint-border'
                        : 'text-text-muted border-border hover:text-text-secondary'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-text-secondary mb-2">Rows per page</p>
              <div className="flex gap-1.5">
                {[25, 50, 100].map(n => (
                  <button
                    key={n}
                    onClick={() => setPageSize(n)}
                    className={`px-3 py-1.5 text-xs rounded font-bold border transition ${
                      pageSize === n
                        ? 'bg-accent-faint text-accent-light border-accent-faint-border'
                        : 'text-text-muted border-border hover:text-text-secondary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  )
}
