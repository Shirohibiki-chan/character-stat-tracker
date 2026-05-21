import { useState, useMemo, useEffect } from 'react'
import { Plus, Upload, Search, Hash, MessageSquare, MessagesSquare, Heart, Cog, Database, Newspaper, Bot, LayoutList, LayoutGrid, X } from 'lucide-react'
import { useBots } from './hooks/use-bots.js'
import { useDashboard } from './hooks/use-dashboard.js'
import { usePagination } from './hooks/use-pagination.js'
import { METRICS, BOTS_CARD } from './constants/metrics.js'
import StatCard from './components/dashboard/StatCard.jsx'
import EmptyState from './components/dashboard/EmptyState.jsx'
import OnboardingBanner from './components/dashboard/OnboardingBanner.jsx'
import BotTable from './components/dashboard/BotTable.jsx'
import BotGrid from './components/dashboard/BotGrid.jsx'
import Pagination from './components/dashboard/Pagination.jsx'
import BulkActionBar from './components/dashboard/BulkActionBar.jsx'
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
import BulkTagModal from './components/modals/BulkTagModal.jsx'
import SettingsModal from './components/modals/SettingsModal.jsx'
import { useSettings } from './hooks/use-settings.js'
import { VIEWS } from './constants/views.js'

const ICON_MAP = { MessageSquare, MessagesSquare, Heart }

export default function App() {
  const { theme, compactMode, defaultView } = useSettings()
  const { bots, initialized, addBot, updateBot, deleteBot, addSnapshot, deleteSnapshot } = useBots()
  const {
    search, setSearch,
    activeTag, setActiveTag,
    sortBy, sortDir, toggleSort,
    allTags, totals, sorted, filteredCount,
  } = useDashboard(bots)

  const { page, setPage, pageSize, setPageSize, viewMode, setViewMode, totalPages, paginated } = usePagination(sorted)

  const [activeView, setActiveView] = useState(defaultView)
  const [showLander, setShowLander] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [adding, setAdding] = useState(false)
  const [detailBotId, setDetailBotId] = useState(null)
  const [editingBotId, setEditingBotId] = useState(null)
  const [addingSnapshotForId, setAddingSnapshotForId] = useState(null)

  // Feature 3: bulk select mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedBotIds, setSelectedBotIds] = useState(new Set())
  const [bulkTagMode, setBulkTagMode] = useState(null) // 'add' | 'remove' | null

  useEffect(() => {
    if (theme === 'default') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (compactMode) document.documentElement.setAttribute('data-compact', 'true')
    else document.documentElement.removeAttribute('data-compact')
  }, [compactMode])

  const totalBotCount = Object.keys(bots).length
  const detailBot = detailBotId ? bots[detailBotId] : null
  const editingBot = editingBotId ? bots[editingBotId] : null
  const snapshotBot = addingSnapshotForId ? bots[addingSnapshotForId] : null

  // Feature 1: clicking a tag in TagsChart navigates to table and applies filter
  function handleTagClick(tag) {
    setActiveTag(tag)
    setActiveView('table')
  }

  // Feature 3: bulk tag data
  const selectedTagsForRemoval = useMemo(() => {
    const s = new Set()
    selectedBotIds.forEach(id => { (bots[id]?.tags || []).forEach(t => s.add(t)) })
    return [...s].sort()
  }, [selectedBotIds, bots])

  function toggleSelectBot(id) {
    setSelectedBotIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAllVisible() {
    setSelectedBotIds(prev => {
      const next = new Set(prev)
      paginated.forEach(b => next.add(b.id))
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedBotIds(new Set())
  }

  function handleBulkAddTags(tags) {
    const tagSet = new Set(tags.map(t => t.trim().toLowerCase()).filter(Boolean))
    if (!tagSet.size) { setBulkTagMode(null); return }
    selectedBotIds.forEach(id => {
      const bot = bots[id]
      if (!bot) return
      updateBot(id, { tags: [...new Set([...(bot.tags || []), ...tagSet])] })
    })
    setBulkTagMode(null)
  }

  function handleBulkRemoveTags(tags) {
    const tagSet = new Set(tags)
    selectedBotIds.forEach(id => {
      const bot = bots[id]
      if (!bot) return
      updateBot(id, { tags: (bot.tags || []).filter(t => !tagSet.has(t)) })
    })
    setBulkTagMode(null)
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">

        {/* Header */}
        <header className="flex items-end justify-between mb-10 pb-6 border-b border-border flex-wrap gap-4">
          <div>
            <div
              onClick={() => initialized && totalBotCount > 0 && setShowLander(v => !v)}
              className={initialized && totalBotCount > 0 ? 'cursor-pointer w-fit hover:opacity-75 transition-opacity' : undefined}
            >
              <div className="text-[11px] tracking-[0.25em] text-accent-faint-text uppercase mb-2 font-bold">
                Creator dashboard
              </div>
              <h1
                className="leading-none"
                style={{ fontFamily: 'var(--wordmark-font)', fontWeight: 'var(--wordmark-weight)', fontSize: 'var(--wordmark-size)' }}
              >
                CharSnap <span className="italic text-accent">stats</span>
              </h1>
            </div>
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
              onClick={() => setShowSettings(true)}
              className="p-2 text-text-muted hover:text-text-secondary transition"
              title="Settings"
            >
              <Cog size={15} />
            </button>
            <button
              onClick={() => setShowBackup(true)}
              className="p-2 text-text-muted hover:text-text-secondary transition"
              title="Data & Backup"
            >
              <Database size={15} />
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

        {!initialized ? null : (totalBotCount === 0 || showLander) ? (
          <EmptyState
            onAdd={() => { setShowLander(false); setAdding(true) }}
            onImport={() => { setShowLander(false); setShowImport(true) }}
          />
        ) : (
          <>
            <OnboardingBanner onImport={() => setShowImport(true)} />

            {/* Stat cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Total bots" value={filteredCount} card={BOTS_CARD} icon={Bot} delta={totals.newBots} />
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
                      className={`text-xs px-2 py-1 rounded transition font-bold flex items-center gap-1 ${activeTag === tag ? 'bg-accent-faint text-accent-light border border-accent-faint-border' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}
                    >
                      {tag}
                      {activeTag === tag && <X size={10} className="ml-0.5 -mr-0.5" />}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Active tag prominent chip (shown when navigated from Tags view) */}
            {activeTag && activeView === 'table' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-text-muted uppercase tracking-widest">Filtering by tag:</span>
                <span
                  className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold"
                  style={{
                    background: 'var(--color-accent-faint)',
                    border: '1px solid var(--color-accent-faint-border)',
                    color: 'var(--color-accent-faint-text)',
                  }}
                >
                  #{activeTag}
                  <button
                    onClick={() => setActiveTag(null)}
                    className="hover:text-text-primary transition"
                  >
                    <X size={11} />
                  </button>
                </span>
              </div>
            )}

            {/* Table/Grid list controls */}
            {activeView === 'table' && (
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <span className="text-xs text-text-muted num">
                  {sorted.length > pageSize
                    ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sorted.length)} of ${sorted.length} bots`
                    : `${sorted.length} bot${sorted.length !== 1 ? 's' : ''}`}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="bg-surface-alt border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent/50"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                  <div className="flex gap-0.5 p-0.5 bg-surface-alt rounded">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                      title="List view"
                    >
                      <LayoutList size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                      title="Grid view"
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true) }}
                    className={`px-2.5 py-1 text-xs rounded transition font-bold border ${
                      selectMode
                        ? 'bg-accent-faint text-accent-light border-accent-faint-border'
                        : 'text-text-muted border-border hover:text-text-secondary'
                    }`}
                  >
                    {selectMode ? 'Done' : 'Select'}
                  </button>
                </div>
              </div>
            )}

            {/* Views */}
            {activeView === 'table' && viewMode === 'list' && (
              <BotTable
                sorted={paginated}
                sortBy={sortBy}
                sortDir={sortDir}
                toggleSort={toggleSort}
                onViewBot={setDetailBotId}
                onEditBot={setEditingBotId}
                onAddSnapshot={setAddingSnapshotForId}
                onDeleteBot={deleteBot}
                selectMode={selectMode}
                selectedIds={selectedBotIds}
                onToggleSelect={toggleSelectBot}
              />
            )}
            {activeView === 'table' && viewMode === 'grid' && (
              <BotGrid
                sorted={paginated}
                onViewBot={setDetailBotId}
                selectMode={selectMode}
                selectedIds={selectedBotIds}
                onToggleSelect={toggleSelectBot}
              />
            )}
            {activeView === 'table' && (
              <Pagination page={page} totalPages={totalPages} setPage={setPage} />
            )}
            {activeView === 'timeline' && <OverlayChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'ranking'  && <RankingChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'gains'    && <GainsChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'history'  && <HistoryChart bots={sorted} onViewBot={setDetailBotId} />}
            {activeView === 'tags'     && <TagsChart bots={sorted} onTagClick={handleTagClick} />}
          </>
        )}
      </div>

      {/* Modals */}
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
      {showSettings  && <SettingsModal onClose={() => setShowSettings(false)} onViewChange={setActiveView} />}
      {bulkTagMode && (
        <BulkTagModal
          mode={bulkTagMode}
          existingTags={selectedTagsForRemoval}
          allTags={allTags}
          onConfirm={bulkTagMode === 'add' ? handleBulkAddTags : handleBulkRemoveTags}
          onClose={() => setBulkTagMode(null)}
        />
      )}

      {/* Bulk action bar — shown when select mode is active */}
      {selectMode && (
        <BulkActionBar
          count={selectedBotIds.size}
          visibleCount={paginated.length}
          onSelectAllVisible={handleSelectAllVisible}
          onAddTags={() => setBulkTagMode('add')}
          onRemoveTags={() => setBulkTagMode('remove')}
          onClear={exitSelectMode}
        />
      )}
    </div>
  )
}
