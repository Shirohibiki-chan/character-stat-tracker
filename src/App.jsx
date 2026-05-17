import { useState } from 'react'
import { Plus, Upload, Search, Hash, MessageSquare, MessagesSquare, Heart, Settings2, Newspaper } from 'lucide-react'
import { useBots } from './hooks/use-bots.js'
import { useDashboard } from './hooks/use-dashboard.js'
import { METRICS } from './constants/metrics.js'
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
    <div
      className="min-h-screen text-stone-100"
      style={{ fontFamily: "'Geist', system-ui, sans-serif", background: 'radial-gradient(ellipse at top, #1c1410 0%, #0c0a09 45%, #070605 100%)' }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-overlay z-0"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <header className="flex items-end justify-between mb-10 pb-6 border-b border-stone-800 flex-wrap gap-4">
          <div>
            <div className="text-[11px] tracking-[0.25em] text-amber-300/70 uppercase mb-2">Creator dashboard</div>
            <h1 className="font-display text-3xl sm:text-5xl font-medium leading-none">
              CharSnap <span className="italic text-amber-300/90">stats</span>
            </h1>
            <p className="text-stone-400 text-sm mt-3">
              {totalBotCount} {totalBotCount === 1 ? 'bot' : 'bots'} tracked
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setShowChangelog(true)}
              className="p-2 text-stone-500 hover:text-stone-300 transition"
              title="What's new"
            >
              <Newspaper size={15} />
            </button>
            <button
              onClick={() => setShowBackup(true)}
              className="p-2 text-stone-500 hover:text-stone-300 transition"
              title="Data & Backup"
            >
              <Settings2 size={15} />
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-2 text-xs uppercase tracking-wider text-stone-400 hover:text-stone-200 border border-stone-700 hover:border-stone-500 rounded transition flex items-center gap-2"
            >
              <Upload size={14} /> Import
            </button>
            <button
              onClick={() => setAdding(true)}
              className="px-3 py-2 text-xs uppercase tracking-wider bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded transition flex items-center gap-2 font-medium"
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
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Total bots" value={filteredCount} accent="#f5f5f4" />
              {METRICS.map(m => (
                <StatCard
                  key={m.key}
                  label={`Total ${m.label.toLowerCase()}`}
                  value={totals[m.key]}
                  accent={m.color}
                  icon={ICON_MAP[m.icon]}
                />
              ))}
            </section>

            <div className="overflow-x-auto -mx-1 px-1 mb-5">
            <div className="flex items-center gap-1 w-max min-w-full">
              {[
                { id: 'table', label: 'Table' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'ranking', label: 'Ranking' },
                { id: 'gains', label: 'Gains' },
                { id: 'history', label: 'History' },
                { id: 'tags', label: 'Tags' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id)}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition ${
                    activeView === v.id
                      ? 'bg-amber-300/15 text-amber-200 border border-amber-300/30'
                      : 'text-stone-500 hover:text-stone-300 border border-transparent'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            </div>

            <section className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search bots or tags…"
                  className="w-full bg-stone-900/60 border border-stone-800 rounded pl-9 pr-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-300/40"
                />
              </div>
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Hash size={12} className="text-stone-600" />
                  <button
                    onClick={() => setActiveTag(null)}
                    className={`text-xs px-2 py-1 rounded transition ${activeTag === null ? 'bg-amber-300/15 text-amber-200 border border-amber-300/30' : 'text-stone-500 hover:text-stone-300 border border-transparent'}`}
                  >
                    all
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={`text-xs px-2 py-1 rounded transition ${activeTag === tag ? 'bg-amber-300/15 text-amber-200 border border-amber-300/30' : 'text-stone-500 hover:text-stone-300 border border-transparent'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {activeView === 'table' && (
              <BotTable
                sorted={sorted}
                sortBy={sortBy}
                sortDir={sortDir}
                toggleSort={toggleSort}
                onViewBot={setDetailBotId}
                onEditBot={setEditingBotId}
                onAddSnapshot={setAddingSnapshotForId}
                onDeleteBot={deleteBot}
              />
            )}
            {activeView === 'timeline' && (
              <OverlayChart bots={sorted} onViewBot={setDetailBotId} />
            )}
            {activeView === 'ranking' && (
              <RankingChart bots={sorted} onViewBot={setDetailBotId} />
            )}
            {activeView === 'gains' && (
              <GainsChart bots={sorted} onViewBot={setDetailBotId} />
            )}
            {activeView === 'history' && (
              <HistoryChart bots={sorted} onViewBot={setDetailBotId} />
            )}
            {activeView === 'tags' && (
              <TagsChart bots={sorted} />
            )}
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
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} />
      )}
      {adding && (
        <AddBotModal
          onClose={() => setAdding(false)}
          onAdd={(bot) => { addBot(bot); setAdding(false) }}
        />
      )}
      {editingBot && (
        <EditBotModal
          bot={editingBot}
          onClose={() => setEditingBotId(null)}
          onSave={(patch) => { updateBot(editingBotId, patch); setEditingBotId(null) }}
        />
      )}
      {snapshotBot && (
        <AddSnapshotModal
          bot={snapshotBot}
          onClose={() => setAddingSnapshotForId(null)}
          onAdd={(snapshot) => { addSnapshot(addingSnapshotForId, snapshot); setAddingSnapshotForId(null) }}
        />
      )}
      {showBackup && <BackupModal onClose={() => setShowBackup(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
