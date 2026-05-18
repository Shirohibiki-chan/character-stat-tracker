import { useState } from 'react'
import { X, ArrowLeft, AlertTriangle, Check } from 'lucide-react'
import { parsePasteInput } from '../../services/parser.js'
import { useImport } from '../../hooks/use-import.js'
import { METRICS } from '../../constants/metrics.js'
import { fmt } from '../../constants/format.js'
import Modal from './Modal.jsx'

function ScopePill({ scope }) {
  const isTotal = scope === 'Total'
  return (
    <span
      className={`inline-block text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest font-bold ${
        isTotal ? 'bg-surface-alt text-text-muted' : 'bg-accent-faint text-accent-light border border-accent-faint-border'
      }`}
    >
      {scope}
    </span>
  )
}

function ReviewRow({ item, allBots, onChange, onNameChange }) {
  const { capture, status, candidates, assignedBotId, newName } = item
  const isCreatingNew = assignedBotId === '__new__'
  const candidateIds = new Set(candidates.map(b => b.id))
  const orderedBots = [
    ...candidates,
    ...allBots.filter(b => !candidateIds.has(b.id)),
  ]

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <ScopePill scope={capture.scope} />
        <div className="flex items-center gap-3 num">
          {METRICS.map(m => (
            <span key={m.key} className="text-xs">
              <span className="text-text-muted mr-0.5 text-[10px]">{m.label.charAt(0)}</span>
              <span style={{ color: m.color }}>{fmt(capture[m.key])}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <select
          value={assignedBotId || ''}
          onChange={e => onChange(e.target.value || null)}
          className="w-full bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
        >
          <option value="">— skip this entry —</option>
          <option value="__new__">
            {capture.name ? `✦ Create new: "${capture.name}"` : '✦ Create new bot…'}
          </option>
          {orderedBots.length > 0 && <option disabled>──────────────</option>}
          {orderedBots.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {isCreatingNew && !capture.name && (
          <input
            value={newName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Bot name…"
            className="w-full bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
          />
        )}
      </div>

      {status === 'auto' && assignedBotId && assignedBotId !== '__new__' && (
        <div className="text-[10px] text-emerald-400/60 flex items-center gap-1">
          <Check size={9} /> Auto-matched
        </div>
      )}
      {status === 'ambiguous' && (
        <div className="text-[10px] text-accent-faint-text flex items-center gap-1">
          <AlertTriangle size={9} /> Multiple bots with this name — please pick one
        </div>
      )}
    </div>
  )
}

export default function ImportModal({ onClose }) {
  const { bots, previewCaptures, applyCaptures } = useImport()
  const [step, setStep] = useState('input')
  const [raw, setRaw] = useState('')
  const [parseError, setParseError] = useState(null)
  const [reviewItems, setReviewItems] = useState([])

  const isDirty = step === 'preview' || raw.trim() !== ''

  const allBots = Object.values(bots).sort((a, b) => a.name.localeCompare(b.name))

  function handleParse() {
    setParseError(null)
    const result = parsePasteInput(raw)
    if (result.kind === 'unknown' || !result.captures.length) {
      setParseError("Couldn't find any stats in that text. Try pasting the CharSnap copy-button output directly.")
      return
    }
    setReviewItems(previewCaptures(result.captures))
    setStep('preview')
  }

  function setAssignment(idx, botId) {
    setReviewItems(items =>
      items.map((item, i) => i === idx ? { ...item, assignedBotId: botId } : item)
    )
  }

  function setNewName(idx, name) {
    setReviewItems(items =>
      items.map((item, i) => i === idx ? { ...item, newName: name } : item)
    )
  }

  function handleApply() {
    applyCaptures(reviewItems)
    onClose()
  }

  const assignedCount = reviewItems.filter(i => i.assignedBotId).length
  const hasNonTotal = reviewItems.some(i => i.capture.scope !== 'Total')

  return (
    <Modal onClose={onClose} isDirty={isDirty}>
      <div
        className="bg-bg border border-border rounded-lg w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-5 py-4 border-b border-border gap-3 shrink-0">
          {step === 'preview' && (
            <button
              onClick={() => setStep('input')}
              className="text-text-muted hover:text-text-primary transition"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="font-display text-xl flex-1">Import stats</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {step === 'input' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-text-secondary">
                Paste CharSnap copy-button output, or JSON from the userscript.
              </p>
              <textarea
                autoFocus
                value={raw}
                onChange={e => { setRaw(e.target.value); setParseError(null) }}
                className="w-full h-36 bg-surface-alt border border-border rounded px-3 py-2 text-sm font-mono text-text-primary resize-none focus:outline-none focus:border-accent/50 scrollbar-thin"
                placeholder={"📊 Creator Analytics (All Time)\n━━━━━━━━━━━━━━━━\n💬 Messages: 1,234,567\n❤️ Favorites: 890\n🗨️ Threads: 1,234"}
              />
              {parseError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {parseError}
                </p>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="p-5 space-y-3">
              {hasNonTotal && (
                <div className="px-3 py-2.5 bg-accent-faint border border-accent-faint-border rounded text-xs text-accent-faint-text flex items-start gap-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5 text-accent" />
                  <span>One or more captures aren't from the Total tab. They'll be stored, but won't appear on growth charts.</span>
                </div>
              )}
              {reviewItems.map((item, idx) => (
                <ReviewRow
                  key={idx}
                  item={item}
                  allBots={allBots}
                  onChange={botId => setAssignment(idx, botId)}
                  onNameChange={name => setNewName(idx, name)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
          >
            Cancel
          </button>
          {step === 'input' ? (
            <button
              onClick={handleParse}
              disabled={!raw.trim()}
              className="px-4 py-2 text-sm font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
              style={{ background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))', color: '#051018' }}
            >
              Parse
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text-muted">
                {assignedCount} of {reviewItems.length} {reviewItems.length === 1 ? 'entry' : 'entries'} will apply
              </span>
              <button
                onClick={handleApply}
                disabled={assignedCount === 0}
                className="px-4 py-2 text-sm font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))', color: '#051018' }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
