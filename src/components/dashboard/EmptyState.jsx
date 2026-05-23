import { Plus, Upload, TrendingUp, BarChart3, LineChart } from 'lucide-react'
import BookmarkletInstall from './BookmarkletInstall.jsx'

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Track growth over time',
    desc: 'Record snapshots as you check your stats. Build a history CharSnap doesn\'t keep for you.',
  },
  {
    icon: LineChart,
    title: 'Overlay all your bots',
    desc: 'One chart, one line per bot. See who\'s climbing fastest at a glance.',
  },
  {
    icon: BarChart3,
    title: 'Rank, gain & compare',
    desc: 'Sort by any metric, compare 7-day gains, replay any day\'s leaderboard.',
  },
]

export default function EmptyState({ onAdd, onImport }) {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-faint border border-accent-faint-border rounded-full text-[11px] uppercase tracking-widest text-accent-faint-text mb-6 font-bold">
          Get started
        </div>
        <h2 className="font-display text-4xl font-medium mb-3">
          Your stats, your history.
        </h2>
        <p className="text-text-tertiary text-sm max-w-md mx-auto leading-relaxed">
          CharSnap shows you today's numbers. CharSnap Stats shows you where you've been —
          and who's winning.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="border border-border rounded-lg p-4 bg-surface">
            <Icon size={20} className="text-accent mb-3 opacity-60" />
            <div className="font-bold text-sm text-text-primary mb-1">{title}</div>
            <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg p-6 max-w-md mx-auto bg-surface">
        <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-text-muted mb-4">How to start</div>
        <ol className="space-y-3 text-sm text-text-secondary mb-6">
          <li className="flex gap-3">
            <span className="text-accent font-bold shrink-0">1.</span>
            Open any bot's stats modal in CharSnap and click its copy button.
          </li>
          <li className="flex gap-3">
            <span className="text-accent font-bold shrink-0">2.</span>
            Click <span className="text-text-primary font-bold">Import</span> above and paste — your bot and first snapshot are created automatically.
          </li>
          <li className="flex gap-3">
            <span className="text-accent font-bold shrink-0">3.</span>
            Repeat whenever you want to record a new data point. Charts fill in as history grows.
          </li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onImport}
            className="px-4 py-2 text-[11px] uppercase tracking-[0.12em] font-extrabold rounded-md transition flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))',
              color: '#051018',
            }}
          >
            <Upload size={13} /> Import paste
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 text-[11px] uppercase tracking-[0.12em] font-bold text-text-secondary hover:text-text-primary border border-border hover-accent-border-40 rounded-md transition flex items-center gap-2"
          >
            <Plus size={13} /> Add bot manually
          </button>
        </div>
      </div>

      <BookmarkletInstall />
    </div>
  )
}
