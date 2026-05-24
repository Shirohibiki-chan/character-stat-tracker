import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import Modal from './Modal.jsx'
import { getAura } from '../../constants/auras.js'

export default function EditBotModal({ bot, allTags = [], onClose, onSave }) {
  const [name, setName]       = useState(bot.name)
  const [tags, setTags]       = useState(bot.tags || [])
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef(null)

  const originalTagsStr = (bot.tags || []).join(',')
  const isDirty = name !== bot.name || tags.join(',') !== originalTagsStr

  const suggestions = allTags.filter(t => !tags.includes(t))

  function addTag(raw) {
    const t = raw.trim()
    if (!t || tags.includes(t)) return
    setTags(prev => [...prev, t])
  }

  function removeTag(t) {
    setTags(prev => prev.filter(x => x !== t))
  }

  function flushInput() {
    inputVal.split(',').forEach(t => addTag(t))
    setInputVal('')
  }

  function onTagKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); flushInput() }
    if (e.key === ',')     { e.preventDefault(); flushInput() }
    if (e.key === 'Backspace' && !inputVal && tags.length) removeTag(tags[tags.length - 1])
  }

  function submit() {
    if (!name.trim()) return
    // Commit anything still in the text box without waiting for a state flush
    const extra = inputVal.split(',').map(t => t.trim()).filter(t => t && !tags.includes(t))
    onSave({ name: name.trim(), tags: [...tags, ...extra] })
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
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) submit() }}
              className="w-full bg-surface-alt border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus-accent-border"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-text-muted block mb-1">Tags</label>
            <div
              className="w-full bg-surface-alt border border-border rounded px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text focus-within:[border-color:rgba(75,168,196,0.5)]"
              onClick={() => inputRef.current?.focus()}
            >
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${getAura(t)}1a`, border: `1px solid ${getAura(t)}40`, color: getAura(t) }}>
                  {t}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeTag(t) }}
                    className="hover:text-text-primary transition leading-none"
                    aria-label={`Remove ${t}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                autoFocus
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={onTagKeyDown}
                placeholder={tags.length ? '' : 'Type a tag, press Enter…'}
                className="flex-1 min-w-[80px] bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted py-0.5"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {suggestions.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { addTag(t); inputRef.current?.focus() }}
                    className="px-2 py-0.5 rounded-full text-xs font-bold text-text-muted hover:text-accent-light border border-border hover:border-accent-faint-border hover:bg-accent-faint transition"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
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
