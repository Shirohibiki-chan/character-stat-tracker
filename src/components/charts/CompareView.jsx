import { useRef, useState } from 'react'
import { GitCompare, Upload, X } from 'lucide-react'
import { useCompare, COMPARE_TABS } from '../../hooks/use-compare.js'
import CompareOverview   from './CompareOverview.jsx'
import CompareTable      from './CompareTable.jsx'
import CompareRanking    from './CompareRanking.jsx'
import CompareGains      from './CompareGains.jsx'
import CompareTags       from './CompareTags.jsx'
import CompareBreakdown  from './CompareBreakdown.jsx'
import Compare1v1        from './Compare1v1.jsx'

const MY_COLOR     = '#4ba8c4'
const FRIEND_COLOR = '#fb7185'

export default function CompareView({ bots }) {
  const fileRef = useRef(null)
  const [myName, setMyName]         = useState('You')
  const [friendName, setFriendName] = useState('Them')

  const {
    friendBots, friendFileName, fileError,
    loadFriendFile, reset,
    compareTab, setCompareTab,
    myBotList, friendBotList,
    myTotals, friendTotals,
    metric, setMetric,
    relative, setRelative,
    myBotId, setMyBotId, friendBotId, setFriendBotId,
    myBot, friendBot, oneVsOneData,
  } = useCompare(bots)

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    loadFriendFile(file)
    e.target.value = ''
  }

  // ─── No file loaded ──────────────────────────────────────────────────────────
  if (!friendBots) {
    return (
      <section className="border border-border rounded-lg bg-surface">
        <div className="flex flex-col gap-0.5 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <GitCompare size={16} className="text-accent opacity-60" />
            Compare
          </div>
          <p className="text-[13px] text-text-muted pl-6">
            Load a friend's export to compare your full libraries side by side — ranking, gains, tags, breakdown, and more. They download their backup from Data &amp; Backup (the database icon), send you the file, and you load it here.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-center max-w-xs">
            <p className="text-sm font-semibold text-text-secondary mb-1">Load a friend's export</p>
            <p className="text-xs text-text-muted">
              Ask them to open <span className="text-text-primary font-semibold">Data &amp; Backup</span> and click Download backup. Then load that file here.
            </p>
          </div>
          {fileError && <p className="text-xs text-red-400">{fileError}</p>}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold bg-surface-alt hover:bg-surface-edge text-text-secondary rounded transition border border-border hover-accent-border-40"
          >
            <Upload size={13} /> Load friend's file
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </div>
      </section>
    )
  }

  // ─── File loaded ─────────────────────────────────────────────────────────────
  return (
    <section className="border border-border rounded-lg bg-surface">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <GitCompare size={16} className="text-accent opacity-60" />
            Compare
          </div>
          <p className="text-[13px] text-text-muted pl-6">
            Head-to-head across all bots. Use the tabs below to switch views.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Name labels — nowrap so the dots/vs never spread apart */}
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: MY_COLOR }} />
            <input
              value={myName}
              onChange={e => setMyName(e.target.value || 'You')}
              className="bg-transparent text-xs font-bold text-text-secondary focus:outline-none w-20 border-b border-transparent focus:border-border"
              title="Your display name"
            />
            <span className="text-text-muted text-xs">vs</span>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: FRIEND_COLOR }} />
            <input
              value={friendName}
              onChange={e => setFriendName(e.target.value || 'Them')}
              className="bg-transparent text-xs font-bold text-text-secondary focus:outline-none w-20 border-b border-transparent focus:border-border"
              title="Their display name"
            />
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-muted hover:text-red-400 border border-border hover:border-red-800 rounded transition"
            title="Load a different file"
          >
            <X size={11} />
            <span className="max-w-[140px] truncate">{friendFileName}</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 px-5 py-3 border-b border-border">
        {COMPARE_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setCompareTab(t.id)}
            className={`px-2.5 py-1 text-[11px] uppercase tracking-wide rounded transition font-bold ${
              compareTab === t.id
                ? 'bg-accent-faint text-accent-light border border-accent-faint-border'
                : 'text-text-muted hover:text-text-secondary border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-views */}
      {compareTab === 'overview' && (
        <CompareOverview
          myBotList={myBotList} friendBotList={friendBotList}
          myTotals={myTotals} friendTotals={friendTotals}
          myName={myName} friendName={friendName}
          myColor={MY_COLOR} friendColor={FRIEND_COLOR}
        />
      )}
      {compareTab === 'table' && (
        <CompareTable
          myBotList={myBotList} friendBotList={friendBotList}
          myName={myName} friendName={friendName}
          myColor={MY_COLOR} friendColor={FRIEND_COLOR}
        />
      )}
      {compareTab === 'ranking' && (
        <CompareRanking
          myBotList={myBotList} friendBotList={friendBotList}
          myName={myName} friendName={friendName}
          myColor={MY_COLOR} friendColor={FRIEND_COLOR}
        />
      )}
      {compareTab === 'gains' && (
        <CompareGains
          myBotList={myBotList} friendBotList={friendBotList}
          myName={myName} friendName={friendName}
          myColor={MY_COLOR} friendColor={FRIEND_COLOR}
        />
      )}
      {compareTab === 'tags' && (
        <CompareTags
          myBotList={myBotList} friendBotList={friendBotList}
          myName={myName} friendName={friendName}
          myColor={MY_COLOR} friendColor={FRIEND_COLOR}
        />
      )}
      {compareTab === 'breakdown' && (
        <CompareBreakdown
          myBotList={myBotList} friendBotList={friendBotList}
          myName={myName} friendName={friendName}
          myColor={MY_COLOR} friendColor={FRIEND_COLOR}
        />
      )}
      {compareTab === '1v1' && (
        <Compare1v1
          myBotList={myBotList} friendBotList={friendBotList}
          myBotId={myBotId} setMyBotId={setMyBotId}
          friendBotId={friendBotId} setFriendBotId={setFriendBotId}
          myBot={myBot} friendBot={friendBot}
          metric={metric} setMetric={setMetric}
          relative={relative} setRelative={setRelative}
          chartData={oneVsOneData}
          myColor={MY_COLOR} friendColor={FRIEND_COLOR}
        />
      )}
    </section>
  )
}
