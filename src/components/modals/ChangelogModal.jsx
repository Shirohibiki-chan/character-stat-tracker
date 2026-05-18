import { X } from 'lucide-react'
import changelog from '/CHANGELOG.md?raw'
import Modal from './Modal.jsx'

function renderChangelog(raw) {
  const lines = raw.split('\n')
  const elements = []
  let listBuffer = []
  let key = 0

  function flushList() {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={key++} className="space-y-1 mb-3">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-text-secondary">
            <span className="text-accent-faint-text mt-0.5 shrink-0">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <div key={key++} className="text-[10px] uppercase tracking-widest font-bold text-text-muted mt-4 mb-1.5">
          {line.slice(4)}
        </div>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={key++} className="font-display text-lg font-medium text-text-primary mt-6 mb-1 first:mt-0">
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('# ')) {
      flushList()
      // top-level title — skip, we have the modal header
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
    } else if (line === '---') {
      flushList()
      elements.push(<hr key={key++} className="border-border my-4" />)
    }
    // blank lines: no-op
  }
  flushList()
  return elements
}

export default function ChangelogModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="w-full max-w-lg bg-bg border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-text-primary">What's new</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 scrollbar-thin">
          {renderChangelog(changelog)}
        </div>
      </div>
    </Modal>
  )
}
