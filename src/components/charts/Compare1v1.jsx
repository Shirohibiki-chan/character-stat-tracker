import { useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { METRICS } from '../../constants/metrics.js'
import { fmt, fmtRelative } from '../../constants/format.js'

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

function StatRow({ label, myVal, friendVal, myDelta, friendDelta, color, myColor, friendColor }) {
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
      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">{label}</div>
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

function CompareTooltip({ active, payload, label }) {
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

export default function Compare1v1({
  myBotList, friendBotList,
  myBotId, setMyBotId, friendBotId, setFriendBotId,
  myBot, friendBot,
  metric, setMetric, relative, setRelative,
  chartData,
  myColor, friendColor,
}) {
  const metricObj = METRICS.find(m => m.key === metric)

  return (
    <div>
      {/* Bot selectors */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: myColor }}>
            Your bot
          </div>
          <select
            value={myBotId ?? ''}
            onChange={e => setMyBotId(e.target.value || null)}
            className="w-full bg-surface-alt border border-border rounded px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus-accent-border"
          >
            <option value="">Select a bot…</option>
            {myBotList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="bg-surface p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: friendColor }}>
            Their bot
          </div>
          <select
            value={friendBotId ?? ''}
            onChange={e => setFriendBotId(e.target.value || null)}
            className="w-full bg-surface-alt border border-border rounded px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus-accent-border"
          >
            <option value="">Select a bot…</option>
            {friendBotList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {(!myBot || !friendBot) && (
        <div className="flex items-center justify-center py-14">
          <p className="text-text-muted text-sm">Pick one of your bots and one of theirs to compare.</p>
        </div>
      )}

      {myBot && friendBot && (
        <>
        <div className="p-4 pb-0 space-y-4 max-w-xl mx-auto">
          {/* Metric + relative controls */}
          <div className="flex flex-wrap items-center justify-center gap-2">
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
          </div>

          {/* Headers */}
          <div className="grid grid-cols-3 items-center">
            <div className="flex items-center justify-end gap-3 pr-4">
              <div className="text-right">
                <div className="font-bold text-text-primary text-sm leading-tight">{myBot.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {myBot._totalSnaps?.length ?? 0} snapshots · last {fmtRelative(myBot.lastCapturedAt)}
                </div>
              </div>
              <BotAvatar bot={myBot} size={36} />
            </div>
            <div className="text-center text-xs uppercase tracking-widest text-text-muted font-bold">vs</div>
            <div className="flex items-center gap-3 pl-4">
              <BotAvatar bot={friendBot} size={36} />
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
            <div className="grid grid-cols-3 py-2 bg-surface-alt border-b border-border">
              <div className="text-right pr-4 text-[10px] uppercase tracking-[0.2em] font-bold leading-tight" style={{ color: myColor }}>
                {myBot.name}
              </div>
              <div className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Stats</div>
              <div className="text-left pl-4 text-[10px] uppercase tracking-[0.2em] font-bold leading-tight" style={{ color: friendColor }}>
                {friendBot.name}
              </div>
            </div>
            <div className="px-2">
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
                    myColor={myColor}
                    friendColor={friendColor}
                  />
                )
              })}
            </div>
          </div>

        </div>

        {/* Chart — full width, outside the max-w-xl constraint */}
        {chartData.length > 0 ? (
          <div className="p-4 pt-4">
            <div className="text-xs text-text-muted mb-3 font-semibold uppercase tracking-widest">
              {metricObj?.label} over time{relative ? ' (growth from first snapshot)' : ''}
            </div>
            <div style={{ height: 280 }}>
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
                  <Tooltip content={props => <CompareTooltip {...props} />} />
                  <Line type="monotone" dataKey="my" name={myBot.name} stroke={myColor} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey="friend" name={friendBot.name} stroke={friendColor} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-5 mt-3">
              <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold">
                <div className="w-4 h-0.5 rounded-full shrink-0" style={{ backgroundColor: myColor }} />
                {myBot.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold">
                <div className="w-4 h-0.5 rounded-full shrink-0" style={{ backgroundColor: friendColor }} />
                {friendBot.name}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-text-muted text-sm">Neither bot has Total-scope snapshots yet.</p>
          </div>
        )}
        </>
      )}
    </div>
  )
}
