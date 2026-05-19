import { useState } from 'react'
import { Plus, Upload, Search, Hash, MessageSquare, MessagesSquare, Heart, Settings2, Newspaper } from 'lucide-react'
import { useBots } from './hooks/use-bots.js'
import { useDashboard } from './hooks/use-dashboard.js'
import { METRICS, BOTS_CARD } from './constants/metrics.js'
import StatCard from './components/dashboard/StatCard.jsx'
import EmptyState from './components/dashboard/EmptyState.jsx'
import OnboardingBanner from './components/dashboard/OnboardingBanner.jsx'
import BotTable from './components/dashboard/BotTable.jsx'
import OverlayChart from './components/charts/OverlayChart.jsx'
import RankingChart from './components/charts/RankingChart.jsx'
import GainsChart from './components/charts/GainsChart.jsx'
import HistoryChart from './components/charts/HistoryChart.jsx'
import TagsChart from './components/charts/TagsChart.jsx'
import AddBotModal from './components/modals/AddBotModal.jsx'
import AddSnapshotModal from './components/modals/AddSnapshotModal.jsx'
import EditBotModal from './components/modals/EditBotModal.jsx'
import ImportModal from './components/modals/ImportModal.jsx'
import BotDetailModal from './components/modals/BotDetailModal.jsx'
import BackupModal from './components/modals/BackupModal.jsx'
import ChangelogModal from './components/modals/ChangelogModal.jsx'

const ICON_MAP = { MessageSquare, MessagesSquare, Heart }

const VIEWS = [
  { id: 'table',    label: 'Table'    },
  { id: 'timeline', label: 'Timeline' },
  { id: 'ranking',  label: 'Ranking'  },
  { id: 'gains',    label: 'Gains'    },
  { id: 'history',  label: 'History'  },
  { id: 'tags',     label: 'Tags'     },
]

export default function App() {
  const { bots, addBot, updateBot, deleteBot, addSnapshot, deleteSnapshot } = useBots()
  const {
    search, setSearch,
    activeTag, setActiveTag,
    sortBy, sortDir, toggleSort,
    allTags, totals, sorted, filteredCount,
  } = useDashboard(bots)

  const [activeView, setActiveView] = useState('table')
  const [showImport, setShowImport] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [adding, setAdding] = useState(false)
  const [detailBotId, setDetailBotId] = useState(null)
  const [editingBotId, setEditingBotId] = useState(null)
  const [addingSnapshotForId, setAddingSnapshotForId] = useState(null)

  const totalBotCount = Object.keys(bots).length
  const detailBot = detailBotId ? bots[detailBotId] : null
  const editingBot = editingBotId ? bots[editingBotId] : null
  const snapshotBot = addingSnapshotForId ? bots[addingSnapshotForId] : null

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">

        {/* Header */}
        <header className="flex items-end justify-between mb-10 pb-6 border-b border-border flex-wrap gap-4">
          <div>
            <div className="text-[11px] tracking-[0.25em] text-accent-faint-text uppercase mb-2 font-bold">
              Creator dashboard
            </div>
            <h1
              className="leading-none"
              style={{ fontFamily: 'var(--wordmark-font)', fontWeight: 'var(--wordmark-weight)', fontSize: 'var(--wordmark-size)' }}
            >
              CharSnap <span className="italic text-accent">stats</span>
            </h1>
            <p className="text-text-tertiary text-sm mt-3">
              {totalBotCount} {totalBotCount === 1 ? 'bot' : 'bots'} tracked
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setShowChangelog(true)}
              className="p-2 text-text-muted hover:text-text-secondary transition"
              title="What's new"
            >
              <Newspaper size={15} />
            </button>
            <button
              onClick={() => setShowBackup(true)}
              className="p-2 text-text-muted hover:text-text-secondary transition"
              title="Data & Backup"
            >
              <Settings2 size={15} />
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] font-bold text-text-secondary hover:text-text-primary border border-border hover:border-accent/40 rounded-md transition flex items-center gap-2"
            >
              <Upload size={14} /> Import
            </button>
            <button
              onClick={() => setAdding(true)}
              className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] font-extrabold rounded-md transition flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-dark))',
                color: '#051018',
              }}
            >
              <Plus size={14} /> Add bot
            </button>
          </div>
        </header>

        {totalBotCount === 0 ? (
          <EmptyState onAdd={() => setAdding(true)} onImport={() => setShowImport(true)} />
        ) : (
          <>
            <OnboardingBanner onImport={() => setShowImport(true)} />

            {/* Stat cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Total bots" value={filteredCount} card={BOTS_CARD} delta={totals.newBots} />
              {METRICS.map(m => (
                <StatCard
                  key={m.key}
                  label={`Total ${m.label.toLowerCase()}`}
                  value={totals[m.key]}
                  card={m.card}
                  icon={ICON_MAP[m.icon]}
                  delta={totals[`delta${m.key.charAt(0).toUpperCase()}${m.key.slice(1)}`]}
                />
              ))}
            </section>

            {/* View tabs */}
            <div className="overflow-x-auto -mx-1 px-1 mb-5">
              <div className="flex items-center gap-1 w-max min-w-full">
                {VIEWS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setActiveView(v.id)}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition font-bold ${
                      activeView === v.id
                        ? 'bg-accent-faint text-accent-light border border-accent-faint-border'
                        : 'text-text-muted hover:text-text-secondary border border-transparent'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + tag filter */}
            <section className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search bots or tags…"
                  className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50"
                />
              </div>
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Hash size={12} className="text-text-muted" />
                  <button
                    onClick={() => setActiveTag(null)}
                    className={`text-xs px-2 py-1 rounded transition font-bold ${activeTag === null ? 'bg-accent-faint text-accent-light border border-accent-faint-border' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}
                  >
                    all
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={`text-xs px-2 py-1 rounded transition font-bold ${activeTag === tag ? 'bg-accent-faint text-accent-light border border-accent-faint-border' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {activeView === 'table'    && <BotTable sorted={sorted} sortBy={sortBy} sortDir={sortDir} toggleSort={toggleSort} onViewBot={setDetailBotId} onEditBot={setEditingBotId} onAddSnapshot={setAddingSnapshotForId} onDeleteBot={deleteBot} />}
            {activeView === 'timeline' && <OverlayChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'ranking'  && <RankingChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'gains'    && <GainsChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'history'  && <HistoryChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'tags'     && <TagsChart bots={sorted} />}
          </>
        )}
      </div>

      {detailBot && (
        <BotDetailModal
          bot={detailBot}
          onClose={() => setDetailBotId(null)}
          onAddSnapshot={snap => addSnapshot(detailBotId, snap)}
          onDeleteSnapshot={date => deleteSnapshot(detailBotId, date)}
          onUpdateMeta={patch => updateBot(detailBotId, patch)}
          onDelete={() => { deleteBot(detailBotId); setDetailBotId(null) }}
        />
      )}
      {showImport  && <ImportModal onClose={() => setShowImport(false)} />}
      {adding      && <AddBotModal onClose={() => setAdding(false)} onAdd={(bot) => { addBot(bot); setAdding(false) }} />}
      {editingBot  && <EditBotModal bot={editingBot} onClose={() => setEditingBotId(null)} onSave={(patch) => { updateBot(editingBotId, patch); setEditingBotId(null) }} />}
      {snapshotBot && <AddSnapshotModal bot={snapshotBot} onClose={() => setAddingSnapshotForId(null)} onAdd={(snapshot) => { addSnapshot(addingSnapshotForId, snapshot); setAddingSnapshotForId(null) }} />}
      {showBackup    && <BackupModal onClose={() => setShowBackup(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
