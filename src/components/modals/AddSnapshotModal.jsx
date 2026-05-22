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
    const now = new Date()
    const [y, m, d] = date.split('-').map(Number)
    const dt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
    onAdd(createSnapshot({
      date: dt.toISOString(),
      chats: parseNum(chats),
      messages: parseNum(messages),
      favorites: parseNum(favorites),
      scope,
    }))
  }

  return (
    <Modal onClose={onClose} isDirty={isDirty}>
      <div
        className="bg-bg border border-border rounded-lg w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-xl">Add snapshot</h2>
            <p className="text-xs text-text-muted mt-0.5">{bot.name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-surface-alt border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted block mb-1">Stats</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                placeholder="threads"
                value={chats}
                onChange={e => setChats(e.target.value)}
                autoFocus
                className="num bg-surface-alt border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
              />
              <input
                placeholder="messages"
                value={messages}
                onChange={e => setMessages(e.target.value)}
                className="num bg-surface-alt border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
              />
              <input
                placeholder="favorites"
                value={favorites}
                onChange={e => setFavorites(e.target.value)}
                className="num bg-surface-alt border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted">
                Shorthand like <code className="text-text-secondary">52k</code> works.
              </span>
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent/50"
              >
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 text-sm font-bold rounded transition"
            style={{ background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))', color: '#051018' }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
