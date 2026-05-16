import { Plus, Sparkles } from 'lucide-react'

export default function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-20 border border-dashed border-stone-800 rounded-lg">
      <Sparkles size={32} className="mx-auto text-amber-300/60 mb-4" />
      <h2 className="font-display text-3xl mb-2">Start tracking</h2>
      <p className="text-stone-400 text-sm mb-6 max-w-md mx-auto">
        Add your bots to start building a stat history. Record snapshots manually as you check your numbers in CharSnap.
      </p>
      <button
        onClick={onAdd}
        className="px-4 py-2 text-sm bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded flex items-center gap-2 font-medium mx-auto transition"
      >
        <Plus size={14} /> Add bot manually
      </button>
    </div>
  )
}
