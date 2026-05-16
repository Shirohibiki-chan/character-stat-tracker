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
        className="bg-stone-950 border border-stone-700 rounded-lg w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <h2 className="font-display text-xl">Edit bot</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-300/40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">
              Tags (comma-separated)
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. event, collab"
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-300/40"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-stone-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
