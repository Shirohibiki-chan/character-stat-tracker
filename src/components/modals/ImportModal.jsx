import { useState, useMemo, useRef, useEffect } from 'react'
import { X, ArrowLeft, AlertTriangle, Check, ChevronDown } from 'lucide-react'
import { parsePasteInput } from '../../services/parser.js'
import { useImport } from '../../hooks/use-import.js'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtRelative } from '../../constants/format.js'
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

function BotMatchDropdown({ value, onChange, capture, allBots }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    function close(e) {
      if (!containerRef.current?.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [isOpen])

  // Top 3 by message-count proximity, then remaining alphabetically.
  // Compare against Total-scope snapshots only — incoming captures are Total-scope,
  // so comparing against 24h/7d/30d values would give a misleading proximity score.
  const ranked = useMemo(() => {
    const captureMessages = capture.messages ?? 0
    const withDist = allBots.map(bot => {
      const snaps = [...(bot.snapshots || [])]
        .filter(s => s.scope === 'Total')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      const latest = snaps.at(-1)
      return { bot, dist: Math.abs((latest?.messages ?? 0) - captureMessages) }
    })
    withDist.sort((a, b) => a.dist - b.dist)
    const top = withDist.slice(0, 3).map(x => x.bot)
    const rest = withDist.slice(3).map(x => x.bot).sort((a, b) => a.name.localeCompare(b.name))
    return [...top, ...rest]
  }, [allBots, capture.messages])

  const filtered = useMemo(() => {
    if (!search.trim()) return ranked
    const q = search.trim().toLowerCase()
    return ranked.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.tags || []).some(t => t.toLowerCase().includes(q))
    )
  }, [ranked, search])

  function select(v) {
    onChange(v)
    setIsOpen(false)
    setSearch('')
  }

  const selectedBot = value && value !== '__new__' ? allBots.find(b => b.id === value) : null
  const triggerLabel = value == null
    ? '— skip this entry —'
    : value === '__new__'
      ? (capture.name ? `✦ Create new: "${capture.name}"` : '✦ Create new bot…')
      : (selectedBot?.name ?? '…')

  const showClosestBadge = (capture.messages ?? 0) > 0 && allBots.length > 1

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between bg-surface-alt border border-border rounded px-2 py-1.5 text-xs focus:outline-none hover-accent-border-30 transition"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {selectedBot?.avatar && (
            <img
              src={selectedBot.avatar}
              alt=""
              className="w-4 h-4 rounded-full object-cover shrink-0"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <span className={`truncate text-xs ${value == null ? 'text-text-muted' : 'text-text-primary'}`}>
            {triggerLabel}
          </span>
        </div>
        <ChevronDown size={12} className="shrink-0 ml-2 text-text-muted" />
      </button>

      {isOpen && (
        <div className="mt-1 border border-border rounded bg-surface-alt overflow-hidden">
          <div className="px-2 pt-2 pb-1">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter bots…"
              className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus-accent-border"
            />
          </div>

          <div className="max-h-[240px] overflow-y-auto scrollbar-thin">
            {/* Pinned options — always visible */}
            <button
              type="button"
              onClick={() => select(null)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-edge transition ${value === null ? 'text-text-secondary font-medium' : 'text-text-muted'}`}
            >
              — skip this entry —
            </button>
            <button
              type="button"
              onClick={() => select('__new__')}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-edge transition ${value === '__new__' ? 'font-medium' : ''}`}
              style={{ color: 'var(--color-accent-faint-text)' }}
            >
              {capture.name ? `✦ Create new: "${capture.name}"` : '✦ Create new bot…'}
            </button>

            {filtered.length > 0 && (
              <div className="border-t border-border my-1 mx-2" />
            )}

            {filtered.map((bot, idx) => {
              const snaps = [...(bot.snapshots || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
              const latest = snaps.at(-1) ?? null
              const messages = latest?.messages ?? 0
              const snapshotCount = snaps.length
              const tags = (bot.tags || []).slice(0, 2)
              const lastDate = latest?.date ?? null
              const isSelected = value === bot.id
              const isClosest = showClosestBadge && idx === 0

              const metaParts = [
                `${fmt(messages)} messages`,
                `${snapshotCount} snap${snapshotCount !== 1 ? 's' : ''}`,
                ...tags,
                lastDate ? `updated ${fmtRelative(lastDate)}` : null,
              ].filter(Boolean)

              return (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => select(bot.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-surface-edge transition ${isSelected ? 'bg-surface-edge' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-surface-edge mt-0.5">
                      {bot.avatar ? (
                        <img
                          src={bot.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-text-muted">
                          {bot.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-text-primary font-medium">{bot.name}</span>
                        {isClosest && (
                          <span
                            className="text-[8px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                            style={{ background: 'var(--color-accent-faint)', color: 'var(--color-accent-faint-text)' }}
                          >
                            Closest match
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                        {metaParts.join(' · ')}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}

            {filtered.length === 0 && search.trim() && (
              <div className="px-3 py-3 text-xs text-text-muted text-center">
                No bots match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewRow({ item, allBots, onChange, onNameChange }) {
  const { capture, status, candidates, assignedBotId, newName } = item
  const isCreatingNew = assignedBotId === '__new__'

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
        <BotMatchDropdown
          value={assignedBotId}
          onChange={onChange}
          capture={capture}
          allBots={allBots}
        />
        {isCreatingNew && !capture.name && (
          <input
            value={newName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Bot name…"
            className="w-full bg-surface-alt border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus-accent-border"
          />
        )}
      </div>

      {status === 'auto' && assignedBotId && assignedBotId !== '__new__' && (
        <div className="text-[10px] text-emerald-dim flex items-center gap-1">
          <Check size={9} /> Auto-matched
        </div>
      )}
      {status === 'ambiguous' && (
        <div className="text-[10px] text-accent-faint-text flex items-center gap-1">
          <AlertTriangle size={9} /> {candidates.length === 1 ? 'Bot found — please confirm or reassign' : 'Multiple bots with this name — please pick one'}
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
                className="w-full h-36 bg-surface-alt border border-border rounded px-3 py-2 text-sm font-mono text-text-primary resize-none focus:outline-none focus-accent-border scrollbar-thin"
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
