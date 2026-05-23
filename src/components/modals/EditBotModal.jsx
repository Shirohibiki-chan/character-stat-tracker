import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from './Modal.jsx'

export default function EditBotModal({ bot, onClose, onSave }) {
  const [name, setName] = useState(bot.name)
  const [tags, setTags] = useState((bot.tags || []).join(', '))

  const originalTags = (bot.tags || []).join(', ')
  const isDirty = name !== bot.name || tags !== originalTags

  function submit() {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && name.trim()) submit()
  }

  return (
    <Modal onClose={onClose} isDirty={isDirty}>
      <div
        className="bg-bg border border-border rounded-lg w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display text-xl">Edit bot</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted block mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full bg-surface-alt border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus-accent-border"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted block mb-1">
              Tags (comma-separated)
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. event, collab"
              className="w-full bg-surface-alt border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus-accent-border"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
            style={{ background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))', color: '#051018' }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
