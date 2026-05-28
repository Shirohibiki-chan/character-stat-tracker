import { useRef } from 'react'
import { GitCompare, Upload, X } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtRelative } from '../../constants/format.js'
import { useCompare } from '../../hooks/use-compare.js'

const MY_COLOR = '#4ba8c4'
const FRIEND_COLOR = '#fb7185'

function BotAvatar({ bot, size = 44 }) {
  if (bot.avatar) {
    return (
      <img
        src={bot.avatar}
        alt={bot.name}
        className="rounded-full object-cover border border-border shrink-0"
        style={{ width: size, height: size }}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-surface-alt border border-border flex items-center justify-center font-bold text-text-muted shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {bot.name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function StatRow({ label, myVal, friendVal, myDelta, friendDelta, color }) {
  const myAhead = myVal != null && friendVal != null && myVal > friendVal
  const friendAhead = myVal != null && friendVal != null && friendVal > myVal

  return (
    <div className="grid grid-cols-3 items-center py-2.5 border-b border-border last:border-0">
      <div className="text-right pr-4">
        <div className="num font-bold text-sm" style={{ color: myAhead ? color : 'var(--color-text-primary)' }}>
          {fmt(myVal)}
        </div>
        {myDelta != null && (
          <div className="text-[10px] text-text-muted num mt-0.5">
            {myDelta >= 0 ? '+' : ''}{fmt(myDelta)} since last
          </div>
        )}
      </div>
      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">
        {label}
      </div>
      <div className="text-left pl-4">
        <div className="num font-bold text-sm" style={{ color: friendAhead ? color : 'var(--color-text-primary)' }}>
          {fmt(friendVal)}
        </div>
        {friendDelta != null && (
          <div className="text-[10px] text-text-muted num mt-0.5">
            {friendDelta >= 0 ? '+' : ''}{fmt(friendDelta)} since last
          </div>
        )}
      </div>
    </div>
  )
}

function CompareTooltip({ active, payload, label, myName, friendName }) {
  if (!active || !payload?.length) return null
  const date = new Date(label + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <div className="bg-bg border border-border rounded px-3 py-2 shadow-xl">
      <div className="text-text-muted text-[10px] mb-1.5">{date}</div>
      {payload.filter(p => p.value != null).map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
          <span className="text-text-tertiary truncate max-w-[120px]">{p.name}</span>
          <span className="num shrink-0" style={{ color: p.stroke }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CompareView({ bots }) {
  const fileRef = useRef(null)
  const {
    friendBots, friendFileName, friendBotList, myBotList,
    myBotId, setMyBotId, friendBotId, setFriendBotId,
    myBot, friendBot, error,
    metric, setMetric, relative, setRelative,
    chartData, loadFriendFile, reset,
  } = useCompare(bots)

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    loadFriendFile(file)
    e.target.value = ''
  }

  const metricObj = METRICS.find(m => m.key === metric)

  // ─── No file loaded yet ─────────────────────────────────────────────────────
  if (!friendBots) {
    return (
      <section className="border border-border rounded-lg bg-surface">
        <div className="flex flex-col gap-0.5 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            <GitCompare size={16} className="text-accent opacity-60" />
            Compare
          </div>
          <p className="text-[13px] text-text-muted pl-6">
            Load a friend's export to compare your bots side by side. They download their backup from Data &amp; Backup (the database icon), send you the file, and you load it here.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-center max-w-xs">
            <p className="text-sm font-semibold text-text-secondary mb-1">Load a friend's export</p>
            <p className="text-xs text-text-muted">
              Ask them to open <span className="text-text-primary font-semibold">Data &amp; Backup</span> and click Download backup. Then load that file here.
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold bg-surface-alt hover:bg-surface-edge text-text-secondary rounded transition border border-border hover-accent-border-40"
          >
            <Upload size={13} /> Load friend's file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
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
            {myBot && friendBot && (
              <span className="text-text-muted font-normal text-xs">
                · {myBot.name} vs {friendBot.name}
              </span>
            )}
          </div>
          <p className="text-[13px] text-text-muted pl-6">
            Head-to-head stats and growth chart. The higher number for each metric is highlighted.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {myBot && friendBot && (
            <>
              <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
                {METRICS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition ${metric === m.key ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    style={metric === m.key ? { boxShadow: `inset 0 0 0 1px ${m.color}40` } : {}}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 p-0.5 bg-surface-alt rounded">
                <button
                  onClick={() => setRelative(false)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${!relative ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  Total
                </button>
                <button
                  onClick={() => setRelative(true)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${relative ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  Growth
                </button>
              </div>
            </>
          )}
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

      {/* Bot selectors */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-surface p-4">
          <div
            className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2"
            style={{ color: MY_COLOR }}
          >
            Your bot
          </div>
          <select
            value={myBotId ?? ''}
            onChange={e => setMyBotId(e.target.value || null)}
            className="w-full bg-surface-alt border border-border rounded px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus-accent-border"
          >
            <option value="">Select a bot…</option>
            {myBotList.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-surface p-4">
          <div
            className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2"
            style={{ color: FRIEND_COLOR }}
          >
            Their bot
          </div>
          <select
            value={friendBotId ?? ''}
            onChange={e => setFriendBotId(e.target.value || null)}
            className="w-full bg-surface-alt border border-border rounded px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus-accent-border"
          >
            <option value="">Select a bot…</option>
            {friendBotList.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prompt to pick bots */}
      {(!myBot || !friendBot) && (
        <div className="flex items-center justify-center py-16">
          <p className="text-text-muted text-sm">
            Pick one of your bots and one of theirs to start comparing.
          </p>
        </div>
      )}

      {/* Comparison */}
      {myBot && friendBot && (
        <div className="p-5 space-y-6">

          {/* Name + avatar headers */}
          <div className="grid grid-cols-3 items-center">
            <div className="flex flex-col items-end gap-2 text-right pr-6">
              <BotAvatar bot={myBot} />
              <div>
                <div className="font-bold text-text-primary text-sm leading-tight">{myBot.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {myBot._totalSnaps?.length ?? 0} snapshots · last {fmtRelative(myBot.lastCapturedAt)}
                </div>
              </div>
            </div>
            <div className="text-center text-xs uppercase tracking-widest text-text-muted font-bold">vs</div>
            <div className="flex flex-col items-start gap-2 text-left pl-6">
              <BotAvatar bot={friendBot} />
              <div>
                <div className="font-bold text-text-primary text-sm leading-tight">{friendBot.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {friendBot._totalSnaps?.length ?? 0} snapshots · last {fmtRelative(friendBot.lastCapturedAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Stat rows */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 items-center py-2 bg-surface-alt border-b border-border">
              <div
                className="text-right pr-4 text-[10px] uppercase tracking-[0.2em] font-bold"
                style={{ color: MY_COLOR }}
              >
                {myBot.name}
              </div>
              <div className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Stats</div>
              <div
                className="text-left pl-4 text-[10px] uppercase tracking-[0.2em] font-bold"
                style={{ color: FRIEND_COLOR }}
              >
                {friendBot.name}
              </div>
            </div>
            <div className="px-5">
              {METRICS.map(m => {
                const cap = m.key.charAt(0).toUpperCase() + m.key.slice(1)
                return (
                  <StatRow
                    key={m.key}
                    label={m.label}
                    myVal={myBot[m.key]}
                    friendVal={friendBot[m.key]}
                    myDelta={myBot[`delta${cap}`]}
                    friendDelta={friendBot[`delta${cap}`]}
                    color={m.color}
                  />
                )
              })}
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div>
              <div className="text-xs text-text-muted mb-3 font-semibold uppercase tracking-widest">
                {metricObj?.label} over time{relative ? ' (growth from first snapshot)' : ''}
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="var(--color-text-muted)"
                      style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={{ stroke: 'var(--color-border)' }}
                    />
                    <YAxis
                      tickFormatter={fmt}
                      stroke="var(--color-text-muted)"
                      style={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={{ stroke: 'var(--color-border)' }}
                      width={52}
                    />
                    <Tooltip
                      content={props => (
                        <CompareTooltip {...props} myName={myBot.name} friendName={friendBot.name} />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="my"
                      name={myBot.name}
                      stroke={MY_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="friend"
                      name={friendBot.name}
                      stroke={FRIEND_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-5 mt-3">
                <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold">
                  <div className="w-4 h-0.5 rounded-full shrink-0" style={{ backgroundColor: MY_COLOR }} />
                  {myBot.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold">
                  <div className="w-4 h-0.5 rounded-full shrink-0" style={{ backgroundColor: FRIEND_COLOR }} />
                  {friendBot.name}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-text-muted text-sm text-center">
                Neither bot has Total-scope snapshots yet — no chart to show.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
