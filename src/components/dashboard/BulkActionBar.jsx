import { X, Tag } from 'lucide-react'

export default function BulkActionBar({ count, visibleCount, onSelectAllVisible, onAddTags, onRemoveTags, onClear }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-alt border-t border-border shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-text-primary num">{count} selected</span>
          <button
            onClick={onSelectAllVisible}
            className="text-xs text-accent-light hover:text-accent transition underline underline-offset-2"
          >
            Select all visible ({visibleCount})
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onAddTags}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border hover-accent-border-40 rounded transition text-text-secondary hover:text-text-primary"
          >
            <Tag size={12} /> Add tags…
          </button>
          <button
            onClick={onRemoveTags}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border hover-danger-border rounded transition text-text-secondary hover:text-red-400"
          >
            <X size={12} /> Remove tags…
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-secondary transition"
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>
  )
}
