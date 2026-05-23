import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from './Modal.jsx'

export default function BulkTagModal({ mode, existingTags, allTags, onConfirm, onClose }) {
  const [selected, setSelected] = useState([])
  const [input, setInput] = useState('')

  const pool = mode === 'add' ? allTags : existingTags
  const suggestions = pool.filter(
    t => !selected.includes(t) && (!input.trim() || t.toLowerCase().includes(input.toLowerCase()))
  )

  function addTag(tag) {
    const clean = tag.trim().toLowerCase()
    if (!clean || selected.includes(clean)) return
    setSelected(s => [...s, clean])
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!input.trim()) return
    if (mode === 'add') addTag(input)
    else if (suggestions.length === 1) addTag(suggestions[0])
  }

  const canConfirm = selected.length > 0

  return (
    <Modal onClose={onClose}>
      <div
        className="bg-bg border border-border rounded-lg w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg">
            {mode === 'add' ? 'Add tags to selected' : 'Remove tags from selected'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-text-muted">
            {mode === 'add'
              ? 'Tags will be added to all selected bots. Type to create new tags.'
              : 'Selected tags will be removed from any selected bot that has them.'}
          </p>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(t => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded font-bold"
                  style={{
                    background: 'var(--color-accent-faint)',
                    border: '1px solid var(--color-accent-faint-border)',
                    color: 'var(--color-accent-faint-text)',
                  }}
                >
                  {t}
                  <button
                    onClick={() => setSelected(s => s.filter(x => x !== t))}
                    className="ml-0.5 hover:text-text-primary transition"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'add' ? 'Type tag name, press Enter…' : 'Filter tags…'}
            className="w-full bg-surface-alt border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus-accent-border"
          />

          {suggestions.length > 0 && (
            <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto scrollbar-thin">
              {suggestions.slice(0, 10).map(t => (
                <button
                  key={t}
                  onClick={() => addTag(t)}
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-alt hover:text-text-primary transition border-b border-border last:border-0"
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {mode === 'add' && input.trim() && !allTags.includes(input.trim().toLowerCase()) && !selected.includes(input.trim().toLowerCase()) && (
            <p className="text-[10px] text-text-muted">
              Press Enter to create new tag &ldquo;{input.trim()}&rdquo;
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
            style={{ background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))', color: '#051018' }}
          >
            {mode === 'add'
              ? `Add ${selected.length} tag${selected.length !== 1 ? 's' : ''}`
              : `Remove ${selected.length} tag${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
