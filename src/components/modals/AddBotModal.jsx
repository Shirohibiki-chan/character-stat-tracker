import { useState } from 'react'
import { X } from 'lucide-react'
import { createBot, createSnapshot, SCOPES } from '../../constants/schema.js'
import { parseNum } from '../../constants/format.js'
import Modal from './Modal.jsx'

export default function AddBotModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [chats, setChats] = useState('')
  const [messages, setMessages] = useState('')
  const [favorites, setFavorites] = useState('')
  const [scope, setScope] = useState('Total')

  const isDirty = !!(name || tags || chats || messages || favorites)

  function submit() {
    if (!name.trim()) return
    const hasNumbers = chats || messages || favorites
    const bot = createBot({
      name: name.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      snapshots: hasNumbers ? [createSnapshot({
        chats: parseNum(chats),
        messages: parseNum(messages),
        favorites: parseNum(favorites),
        scope,
      })] : [],
    })
    onAdd(bot)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && name.trim()) submit()
  }

  return (
    <Modal onClose={onClose} isDirty={isDirty}>
      <div
        className="bg-stone-950 border border-stone-700 rounded-lg w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <h2 className="font-display text-xl">Add bot manually</h2>
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
              Tags (comma-separated, optional)
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. event, collab"
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-300/40"
            />
          </div>
          <div className="border-t border-stone-800 pt-4">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">
              Initial snapshot (optional)
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                placeholder="threads"
                value={chats}
                onChange={e => setChats(e.target.value)}
                className="num bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-300/40"
              />
              <input
                placeholder="messages"
                value={messages}
                onChange={e => setMessages(e.target.value)}
                className="num bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-300/40"
              />
              <input
                placeholder="favorites"
                value={favorites}
                onChange={e => setFavorites(e.target.value)}
                className="num bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-300/40"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-stone-600">
                Shorthand like <code className="text-stone-400">52k</code> or <code className="text-stone-400">1.2m</code> works.
              </span>
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none focus:border-amber-300/40"
              >
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
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
            Add
          </button>
        </div>
      </div>
    </Modal>
  )
}
