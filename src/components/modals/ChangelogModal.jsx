import { X } from 'lucide-react'
import changelog from '/CHANGELOG.md?raw'

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
          <li key={i} className="flex gap-2 text-sm text-stone-400">
            <span className="text-amber-300/50 mt-0.5 shrink-0">—</span>
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
        <div key={key++} className="text-[10px] uppercase tracking-widest text-stone-500 mt-4 mb-1.5">
          {line.slice(4)}
        </div>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={key++} className="font-display text-lg font-medium text-stone-100 mt-6 mb-1 first:mt-0">
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
      elements.push(<hr key={key++} className="border-stone-800 my-4" />)
    }
    // blank lines: no-op
  }
  flushList()
  return elements
}

export default function ChangelogModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-stone-950 border border-stone-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <h2 className="font-medium text-stone-100">What's new</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {renderChangelog(changelog)}
        </div>
      </div>
    </div>
  )
}
