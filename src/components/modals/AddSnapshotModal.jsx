import { useState } from 'react'
import { X } from 'lucide-react'
import { createSnapshot, SCOPES } from '../../constants/schema.js'
import { parseNum } from '../../constants/format.js'
import Modal from './Modal.jsx'

export default function AddSnapshotModal({ bot, onClose, onAdd }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [chats, setChats] = useState('')
  const [messages, setMessages] = useState('')
  const [favorites, setFavorites] = useState('')
  const [scope, setScope] = useState('Total')

  const isDirty = !!(chats || messages || favorites)

  function submit() {
    onAdd(createSnapshot({
      date: new Date(date + 'T12:00:00').toISOString(),
      chats: parseNum(chats),
      messages: parseNum(messages),
      favorites: parseNum(favorites),
      scope,
    }))
  }

  return (
    <Modal onClose={onClose} isDirty={isDirty}>
      <div
        className="bg-stone-950 border border-stone-700 rounded-lg w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div>
            <h2 className="font-display text-xl">Add snapshot</h2>
            <p className="text-xs text-stone-500 mt-0.5">{bot.name}</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-300/40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">Stats</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                placeholder="threads"
                value={chats}
                onChange={e => setChats(e.target.value)}
                autoFocus
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
                Shorthand like <code className="text-stone-400">52k</code> works.
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
            className="px-4 py-2 text-sm bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded font-medium transition"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
