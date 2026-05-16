import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, LabelList
} from 'recharts';
import {
  Plus, Trash2, Pencil, Download, Upload, X, Search,
  MessageSquare, Heart, Users, BarChart3, TrendingUp,
  Check, AlertCircle, ArrowUpDown, ArrowDown, ArrowUp,
  Sparkles, RefreshCw, Hash, Clipboard, ChevronLeft,
  Camera, Calendar, Info
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dashboard:v2';
const LEGACY_KEY = 'charsnap-bots-v1';

const METRICS = [
  { key: 'chats',     label: 'Threads',   color: '#e8b858', icon: Users },
  { key: 'messages',  label: 'Messages',  color: '#c98b5f', icon: MessageSquare },
  { key: 'favorites', label: 'Favorites', color: '#b85c5c', icon: Heart },
];

const METRIC_MAP = Object.fromEntries(METRICS.map(m => [m.key, m]));

const fmt = (n) => {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(abs >= 1e10 ? 0 : 1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(abs >= 1e7 ? 0 : 1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(abs >= 1e4 ? 0 : 1) + 'K';
  return String(n);
};

const fmtFull = (n) => {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US').format(n);
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtRelative = (iso) => {
  if (!iso) return 'never';
  const diffMs = new Date() - new Date(iso);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return fmtDate(iso);
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const parseNum = (v) => {
  if (v === '' || v == null) return 0;
  const cleaned = String(v).replace(/[,\s]/g, '').replace(/[km]$/i, (m) => m.toLowerCase() === 'k' ? '000' : '000000');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const sortedSnapshots = (bot) => {
  if (!bot.snapshots) return [];
  return [...bot.snapshots].sort((a, b) => new Date(a.date) - new Date(b.date));
};

const latestSnapshot = (bot) => {
  const s = sortedSnapshots(bot);
  return s.length ? s[s.length - 1] : null;
};

const previousSnapshot = (bot) => {
  const s = sortedSnapshots(bot);
  return s.length >= 2 ? s[s.length - 2] : null;
};

// Strip CharSnap CDN transform params for stable avatar comparison
function normalizeAvatar(url) {
  if (!url) return null;
  const m = url.match(/\/([a-f0-9-]+-image\.[a-z]+)(\?|$)/i);
  return m ? m[1] : url;
}

// ─────────────────────────────────────────────────────────────
// Storage + migration
// ─────────────────────────────────────────────────────────────

async function loadState() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (r?.value) return JSON.parse(r.value);
  } catch {}

  // Migrate from v1
  try {
    const r = await window.storage.get(LEGACY_KEY);
    if (r?.value) {
      const old = JSON.parse(r.value);
      const now = new Date().toISOString();
      const bots = {};
      for (const b of old) {
        const hasNums = b.chats || b.messages || b.favorites;
        bots[b.id] = {
          id: b.id,
          name: b.name,
          avatar: null,
          tags: b.tags || [],
          snapshots: hasNums ? [{
            date: now,
            chats: b.chats || 0,
            messages: b.messages || 0,
            favorites: b.favorites || 0,
            scope: 'All Time',
          }] : [],
        };
      }
      return { bots };
    }
  } catch {}

  return { bots: {} };
}

async function saveState(state) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('save failed', e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────

function parseCopyButtonText(text) {
  if (!/Messages:/i.test(text)) return null;
  const scope = (text.match(/Creator Analytics\s*\((.+?)\)/i) || [])[1] || 'Unknown';
  const messages = parseNum((text.match(/Messages:\s*([\d,]+)/i) || [])[1]);
  const favorites = parseNum((text.match(/Favorites:\s*([\d,]+)/i) || [])[1]);
  const chats = parseNum((text.match(/Threads:\s*([\d,]+)/i) || [])[1]);
  return { scope, chats, messages, favorites };
}

function parsePasteInput(text) {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'unknown', captures: [] };

  // JSON?
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data) ? data : (data.captures || []);
      const captures = arr.map(c => ({
        avatarUrl: c.avatarUrl || c.avatar || null,
        name: c.name || null,
        scope: c.scope || 'All Time',
        chats: parseNum(c.chats),
        messages: parseNum(c.messages),
        favorites: parseNum(c.favorites),
        capturedAt: c.capturedAt || new Date().toISOString(),
      })).filter(c => c.chats || c.messages || c.favorites);
      return { kind: 'json', captures };
    } catch {
      return { kind: 'unknown', captures: [] };
    }
  }

  // Plain copy-button text
  const parsed = parseCopyButtonText(trimmed);
  if (parsed) {
    return {
      kind: 'text',
      captures: [{
        avatarUrl: null,
        name: null,
        scope: parsed.scope,
        chats: parsed.chats,
        messages: parsed.messages,
        favorites: parsed.favorites,
        capturedAt: new Date().toISOString(),
      }],
    };
  }

  return { kind: 'unknown', captures: [] };
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState({ bots: {} });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [sortBy, setSortBy] = useState('chats');
  const [sortDir, setSortDir] = useState('desc');

  const [detailBotId, setDetailBotId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const [chartMetric, setChartMetric] = useState('chats');
  const [topN, setTopN] = useState(15);

  useEffect(() => {
    loadState().then(s => {
      setState(s);
      setLoading(false);
    });
  }, []);

  const saveTimer = useRef(null);
  useEffect(() => {
    if (loading) return;
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveState(state);
      setSaveStatus(ok ? 'saved' : 'error');
      if (ok) setTimeout(() => setSaveStatus('idle'), 1500);
    }, 400);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [state, loading]);

  // ─── derived ─────────────────────────────────────────────
  const botsArray = useMemo(() => Object.values(state.bots), [state.bots]);

  const allTags = useMemo(() => {
    const s = new Set();
    botsArray.forEach(b => (b.tags || []).forEach(t => s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [botsArray]);

  const enriched = useMemo(() => {
    return botsArray.map(b => {
      const latest = latestSnapshot(b);
      const prev = previousSnapshot(b);
      return {
        ...b,
        latest,
        prev,
        chats: latest?.chats ?? 0,
        messages: latest?.messages ?? 0,
        favorites: latest?.favorites ?? 0,
        deltaChats: prev ? (latest?.chats ?? 0) - (prev.chats ?? 0) : 0,
        deltaMessages: prev ? (latest?.messages ?? 0) - (prev.messages ?? 0) : 0,
        deltaFavorites: prev ? (latest?.favorites ?? 0) - (prev.favorites ?? 0) : 0,
        snapshotCount: b.snapshots?.length ?? 0,
        lastCapturedAt: latest?.date,
      };
    });
  }, [botsArray]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(b => {
      if (q && !b.name.toLowerCase().includes(q) && !(b.tags || []).some(t => t.toLowerCase().includes(q))) return false;
      if (activeTag && !(b.tags || []).includes(activeTag)) return false;
      return true;
    });
  }, [enriched, search, activeTag]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortBy === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortBy === 'updated') {
        const av = a.lastCapturedAt ? new Date(a.lastCapturedAt).getTime() : 0;
        const bv = b.lastCapturedAt ? new Date(b.lastCapturedAt).getTime() : 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, b) => ({
      chats: acc.chats + (b.chats || 0),
      messages: acc.messages + (b.messages || 0),
      favorites: acc.favorites + (b.favorites || 0),
    }), { chats: 0, messages: 0, favorites: 0 });
  }, [filtered]);

  const chartData = useMemo(() => {
    return [...filtered]
      .filter(b => b.latest)
      .sort((a, b) => (b[chartMetric] || 0) - (a[chartMetric] || 0))
      .slice(0, topN)
      .map(b => ({ ...b, _val: b[chartMetric] || 0 }));
  }, [filtered, chartMetric, topN]);

  const detailBot = detailBotId ? state.bots[detailBotId] : null;

  // ─── mutations ───────────────────────────────────────────
  const upsertBot = (bot) => {
    setState(prev => ({ ...prev, bots: { ...prev.bots, [bot.id]: bot } }));
  };

  const deleteBot = (id) => {
    setState(prev => {
      const next = { ...prev.bots };
      delete next[id];
      return { ...prev, bots: next };
    });
    if (detailBotId === id) setDetailBotId(null);
  };

  const addSnapshot = (botId, snap) => {
    setState(prev => {
      const bot = prev.bots[botId];
      if (!bot) return prev;
      return { ...prev, bots: { ...prev.bots, [botId]: { ...bot, snapshots: [...(bot.snapshots || []), snap] } } };
    });
  };

  const deleteSnapshot = (botId, snapDate) => {
    setState(prev => {
      const bot = prev.bots[botId];
      if (!bot) return prev;
      return { ...prev, bots: { ...prev.bots, [botId]: { ...bot, snapshots: bot.snapshots.filter(s => s.date !== snapDate) } } };
    });
  };

  const updateBotMeta = (botId, patch) => {
    setState(prev => {
      const bot = prev.bots[botId];
      if (!bot) return prev;
      return { ...prev, bots: { ...prev.bots, [botId]: { ...bot, ...patch } } };
    });
  };

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  // ─── import flow ─────────────────────────────────────────
  // Given a list of captures (already disambiguated — every capture has an explicit
  // assignment: existing bot id, or null for "create new"), apply them all.
  const applyAssignedCaptures = (resolvedCaptures) => {
    setState(prev => {
      const bots = { ...prev.bots };
      for (const { capture, targetId } of resolvedCaptures) {
        const snap = {
          date: capture.capturedAt,
          chats: capture.chats,
          messages: capture.messages,
          favorites: capture.favorites,
          scope: capture.scope,
        };
        if (targetId === null) {
          const id = uid();
          bots[id] = {
            id,
            name: capture.name || 'Unnamed bot',
            avatar: capture.avatarUrl || null,
            tags: [],
            snapshots: [snap],
          };
        } else if (bots[targetId]) {
          bots[targetId] = {
            ...bots[targetId],
            avatar: bots[targetId].avatar || capture.avatarUrl || null,
            snapshots: [...(bots[targetId].snapshots || []), snap],
          };
        }
      }
      return { ...prev, bots };
    });
  };

  // For preview: try auto-resolve each capture, return what'd happen + ambiguous ones
  const previewCaptures = (captures) => {
    return captures.map(cap => {
      const normalizedAvatar = normalizeAvatar(cap.avatarUrl);
      const byAvatar = normalizedAvatar
        ? botsArray.find(b => normalizeAvatar(b.avatar) === normalizedAvatar)
        : null;
      if (byAvatar) return { capture: cap, status: 'match', targetId: byAvatar.id, targetName: byAvatar.name };

      const byName = cap.name ? botsArray.filter(b => b.name === cap.name) : [];
      if (byName.length === 0 && cap.name) return { capture: cap, status: 'new', targetId: null, targetName: cap.name };
      if (byName.length === 1 && !normalizedAvatar) return { capture: cap, status: 'match', targetId: byName[0].id, targetName: byName[0].name };
      if (byName.length >= 1) return { capture: cap, status: 'ambiguous', candidates: byName, targetId: undefined };
      return { capture: cap, status: 'unassigned', targetId: undefined };
    });
  };

  // Export
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charsnap-stats-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = 'Name,Threads,Messages,Favorites,Last Captured,Snapshots,Tags';
    const rows = enriched.map(b => {
      const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
      return [
        esc(b.name), b.chats || 0, b.messages || 0, b.favorites || 0,
        b.lastCapturedAt ? new Date(b.lastCapturedAt).toISOString() : '',
        b.snapshotCount, esc((b.tags || []).join('; ')),
      ].join(',');
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charsnap-stats-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-stone-100" style={{ fontFamily: "'Geist', system-ui, sans-serif", background: 'radial-gradient(ellipse at top, #1c1410 0%, #0c0a09 45%, #070605 100%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .num { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum'; }
        ::selection { background: #e8b858; color: #0c0a09; }
        .scrollbar-thin::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #44403c; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #57534e; }
        input::placeholder, textarea::placeholder { color: #78716c; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-overlay z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <header className="flex items-end justify-between mb-10 pb-6 border-b border-stone-800 flex-wrap gap-4">
          <div>
            <div className="text-[11px] tracking-[0.25em] text-amber-300/70 uppercase mb-2">Creator dashboard · v2</div>
            <h1 className="font-display text-5xl font-medium leading-none">
              CharSnap <span className="italic text-amber-300/90">stats</span>
            </h1>
            <p className="text-stone-400 text-sm mt-3">
              {botsArray.length} {botsArray.length === 1 ? 'bot' : 'bots'} tracked
              {saveStatus === 'saving' && <span className="ml-2 text-stone-500">· saving…</span>}
              {saveStatus === 'saved' && <span className="ml-2 text-emerald-400/70">· saved</span>}
              {saveStatus === 'error' && <span className="ml-2 text-red-400">· save error</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)} className="px-3 py-2 text-xs uppercase tracking-wider border border-stone-700 hover:border-amber-300/40 hover:bg-stone-900/50 rounded transition flex items-center gap-2">
              <Clipboard size={14} /> Import / Paste
            </button>
            <div className="relative group">
              <button className="px-3 py-2 text-xs uppercase tracking-wider border border-stone-700 hover:border-amber-300/40 hover:bg-stone-900/50 rounded transition flex items-center gap-2">
                <Download size={14} /> Export
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-stone-900 border border-stone-700 rounded shadow-xl z-30 w-36">
                <button onClick={exportCSV} className="w-full text-left px-3 py-2 text-xs hover:bg-stone-800">CSV</button>
                <button onClick={exportJSON} className="w-full text-left px-3 py-2 text-xs hover:bg-stone-800">JSON (backup)</button>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-stone-500">Loading…</div>
        ) : botsArray.length === 0 ? (
          <EmptyState onImport={() => setShowImport(true)} onAdd={() => setAdding(true)} />
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Total bots" value={filtered.length} accent="#f5f5f4" big />
              {METRICS.map(m => (
                <StatCard key={m.key} label={`Total ${m.label.toLowerCase()}`} value={totals[m.key]} accent={m.color} icon={m.icon} big />
              ))}
            </section>

            {chartData.length > 0 && (
              <section className="mb-10 border border-stone-800 rounded-lg bg-stone-950/50 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-stone-800">
                  <div className="flex items-center gap-2 text-sm text-stone-300">
                    <BarChart3 size={16} className="text-amber-300/70" />
                    Top {Math.min(topN, chartData.length)} by {METRIC_MAP[chartMetric].label.toLowerCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 p-0.5 bg-stone-900 rounded">
                      {METRICS.map(m => (
                        <button
                          key={m.key}
                          onClick={() => setChartMetric(m.key)}
                          className={`px-2.5 py-1 text-xs rounded transition ${chartMetric === m.key ? 'bg-stone-800 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}
                          style={chartMetric === m.key ? { boxShadow: `inset 0 0 0 1px ${m.color}40` } : {}}
                        >{m.label}</button>
                      ))}
                    </div>
                    <select value={topN} onChange={e => setTopN(Number(e.target.value))} className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none focus:border-amber-300/40">
                      <option value={10}>Top 10</option>
                      <option value={15}>Top 15</option>
                      <option value={25}>Top 25</option>
                      <option value={50}>Top 50</option>
                      <option value={9999}>All</option>
                    </select>
                  </div>
                </div>
                <div className="p-5">
                  <RankingChart data={chartData} metric={chartMetric} onBarClick={setDetailBotId} />
                </div>
              </section>
            )}

            <section className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bots or tags…" className="w-full bg-stone-900/60 border border-stone-800 rounded pl-9 pr-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-300/40" />
              </div>
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Hash size={12} className="text-stone-600" />
                  <button onClick={() => setActiveTag(null)} className={`text-xs px-2 py-1 rounded transition ${activeTag === null ? 'bg-amber-300/15 text-amber-200 border border-amber-300/30' : 'text-stone-500 hover:text-stone-300 border border-transparent'}`}>all</button>
                  {allTags.map(tag => (
                    <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} className={`text-xs px-2 py-1 rounded transition ${activeTag === tag ? 'bg-amber-300/15 text-amber-200 border border-amber-300/30' : 'text-stone-500 hover:text-stone-300 border border-transparent'}`}>{tag}</button>
                  ))}
                </div>
              )}
              <button onClick={() => setAdding(true)} className="ml-auto px-3 py-2 text-xs uppercase tracking-wider bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded transition flex items-center gap-2 font-medium">
                <Plus size={14} /> Add bot manually
              </button>
            </section>

            <section className="border border-stone-800 rounded-lg overflow-hidden bg-stone-950/30">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-800 bg-stone-950/60">
                      <SortHeader className="text-left pl-5" label="Bot" active={sortBy === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                      {METRICS.map(m => (
                        <SortHeader key={m.key} className="text-right" label={m.label} active={sortBy === m.key} dir={sortDir} onClick={() => toggleSort(m.key)} />
                      ))}
                      <SortHeader className="text-right" label="Updated" active={sortBy === 'updated'} dir={sortDir} onClick={() => toggleSort('updated')} />
                      <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider text-stone-500 font-medium">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-stone-500 text-sm">No bots match your filters.</td></tr>
                    )}
                    {sorted.map((bot, idx) => (
                      <tr key={bot.id} onClick={() => setDetailBotId(bot.id)} className="border-b border-stone-900 hover:bg-stone-900/40 transition cursor-pointer">
                        <td className="pl-5 py-3 font-medium">
                          <div className="flex items-center gap-3">
                            <span className="text-stone-600 text-xs num w-6">{idx + 1}</span>
                            {bot.avatar ? (
                              <img src={bot.avatar} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-800" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-600 text-xs">
                                {bot.name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span>{bot.name}</span>
                            {bot.snapshotCount > 1 && (
                              <span className="text-[10px] text-stone-600 num">{bot.snapshotCount} snaps</span>
                            )}
                          </div>
                        </td>
                        {METRICS.map(m => {
                          const deltaKey = `delta${m.key[0].toUpperCase()}${m.key.slice(1)}`;
                          const delta = bot[deltaKey];
                          return (
                            <td key={m.key} className="py-3 px-3 text-right num">
                              <div title={fmtFull(bot[m.key])}>{bot.latest ? fmt(bot[m.key]) : '—'}</div>
                              {delta > 0 && <div className="text-[10px] text-emerald-400/70 num">+{fmt(delta)}</div>}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-right text-xs text-stone-500">{fmtRelative(bot.lastCapturedAt)}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(bot.tags || []).map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">{t}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mt-6 flex justify-end">
              {!confirmReset ? (
                <button onClick={() => setConfirmReset(true)} className="text-xs text-stone-600 hover:text-red-400 transition flex items-center gap-1.5">
                  <RefreshCw size={12} /> Reset all data
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-400">Delete all {botsArray.length} bots and history?</span>
                  <button onClick={() => { setState({ bots: {} }); setConfirmReset(false); }} className="px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30">Yes, reset</button>
                  <button onClick={() => setConfirmReset(false)} className="px-2 py-1 text-stone-500 hover:text-stone-300">Cancel</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {detailBot && (
        <BotDetailModal
          bot={detailBot}
          onClose={() => setDetailBotId(null)}
          onAddSnapshot={(snap) => addSnapshot(detailBot.id, snap)}
          onDeleteSnapshot={(date) => deleteSnapshot(detailBot.id, date)}
          onUpdateMeta={(patch) => updateBotMeta(detailBot.id, patch)}
          onDelete={() => deleteBot(detailBot.id)}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          bots={botsArray}
          previewCaptures={previewCaptures}
          onApply={(resolved) => {
            applyAssignedCaptures(resolved);
            setShowImport(false);
          }}
        />
      )}

      {adding && (
        <AddBotModal
          onClose={() => setAdding(false)}
          onAdd={(bot) => { upsertBot(bot); setAdding(false); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function EmptyState({ onImport, onAdd }) {
  return (
    <div className="text-center py-20 border border-dashed border-stone-800 rounded-lg">
      <Sparkles size={32} className="mx-auto text-amber-300/60 mb-4" />
      <h2 className="font-display text-3xl mb-2">Start tracking</h2>
      <p className="text-stone-400 text-sm mb-6 max-w-md mx-auto">
        Paste CharSnap's copy-button output to start a bot's history. Each paste creates a snapshot — over time, growth charts appear.
      </p>
      <div className="flex gap-3 justify-center">
        <button onClick={onAdd} className="px-4 py-2 text-sm border border-stone-700 hover:border-amber-300/40 rounded flex items-center gap-2">
          <Plus size={14} /> Add bot manually
        </button>
        <button onClick={onImport} className="px-4 py-2 text-sm bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded flex items-center gap-2 font-medium">
          <Clipboard size={14} /> Paste stats
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, icon: Icon, big }) {
  return (
    <div className="relative overflow-hidden border border-stone-800 rounded-lg p-5 bg-stone-950/40 backdrop-blur group hover:border-stone-700 transition">
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: accent, opacity: 0.6 }} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[0.2em] uppercase text-stone-500">{label}</span>
        {Icon && <Icon size={14} style={{ color: accent }} className="opacity-60" />}
      </div>
      <div className={`num font-medium ${big ? 'text-4xl' : 'text-2xl'}`} style={{ color: accent }}>{fmt(value)}</div>
      {value >= 1000 && <div className="text-[10px] text-stone-600 num mt-1">{fmtFull(value)}</div>}
    </div>
  );
}

function SortHeader({ label, active, dir, onClick, className = '' }) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`py-3 px-3 text-[11px] uppercase tracking-wider font-medium ${className}`}>
      <button onClick={onClick} className={`inline-flex items-center gap-1 ${active ? 'text-amber-300' : 'text-stone-500 hover:text-stone-300'} transition`}>
        {label} <Icon size={11} />
      </button>
    </th>
  );
}

function RankingChart({ data, metric, onBarClick }) {
  const m = METRIC_MAP[metric];
  const height = Math.max(300, data.length * 28 + 40);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 70, left: 0, bottom: 5 }}>
          <CartesianGrid horizontal={false} stroke="#292524" />
          <XAxis type="number" tickFormatter={fmt} stroke="#78716c" style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#44403c' }} tickLine={{ stroke: '#44403c' }} />
          <YAxis type="category" dataKey="name" stroke="#a8a29e" width={150} style={{ fontSize: 12, fontFamily: 'Geist' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-stone-950 border border-stone-700 rounded px-3 py-2 shadow-xl">
                  <div className="font-display text-base mb-1">{d.name}</div>
                  {METRICS.map(mx => (
                    <div key={mx.key} className="flex justify-between gap-6 text-xs">
                      <span className="text-stone-500">{mx.label}</span>
                      <span className="num" style={{ color: mx.color }}>{fmtFull(d[mx.key] || 0)}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Bar dataKey="_val" fill={m.color} radius={[0, 3, 3, 0]} onClick={(d) => onBarClick?.(d.id)} className="cursor-pointer">
            <LabelList dataKey="_val" position="right" formatter={fmt} style={{ fill: '#a8a29e', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BotDetailModal({ bot, onClose, onAddSnapshot, onDeleteSnapshot, onUpdateMeta, onDelete }) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaName, setMetaName] = useState(bot.name);
  const [metaTags, setMetaTags] = useState((bot.tags || []).join(', '));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSnap, setNewSnap] = useState({
    chats: '', messages: '', favorites: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const snaps = useMemo(() => sortedSnapshots(bot), [bot]);
  const chartSnaps = useMemo(() => snaps.map(s => ({
    date: new Date(s.date).getTime(),
    dateLabel: fmtDate(s.date),
    chats: s.chats,
    messages: s.messages,
    favorites: s.favorites,
  })), [snaps]);

  const saveMeta = () => {
    onUpdateMeta({
      name: metaName.trim() || bot.name,
      tags: metaTags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditingMeta(false);
  };

  const submitSnap = () => {
    onAddSnapshot({
      date: new Date(newSnap.date + 'T12:00:00').toISOString(),
      chats: parseNum(newSnap.chats),
      messages: parseNum(newSnap.messages),
      favorites: parseNum(newSnap.favorites),
      scope: 'All Time',
    });
    setNewSnap({ chats: '', messages: '', favorites: '', date: new Date().toISOString().slice(0, 10) });
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-stone-950 border border-stone-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-stone-800">
          <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-200"><ChevronLeft size={20} /></button>
          {bot.avatar ? (
            <img src={bot.avatar} alt="" className="w-14 h-14 rounded-full object-cover bg-stone-800" onError={(e) => e.target.style.display = 'none'} />
          ) : (
            <div className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 font-display text-2xl">{bot.name?.[0]?.toUpperCase() || '?'}</div>
          )}
          <div className="flex-1 min-w-0">
            {editingMeta ? (
              <div className="flex flex-col gap-2">
                <input value={metaName} onChange={e => setMetaName(e.target.value)} className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-lg font-display focus:outline-none focus:border-amber-300/40" />
                <input value={metaTags} onChange={e => setMetaTags(e.target.value)} placeholder="tags, comma sep" className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40" />
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl truncate">{bot.name}</h2>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(bot.tags || []).map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-1">
            {editingMeta ? (
              <>
                <button onClick={saveMeta} className="p-2 text-emerald-400 hover:bg-stone-800 rounded"><Check size={16} /></button>
                <button onClick={() => { setEditingMeta(false); setMetaName(bot.name); setMetaTags((bot.tags || []).join(', ')); }} className="p-2 text-stone-500 hover:bg-stone-800 rounded"><X size={16} /></button>
              </>
            ) : (
              <button onClick={() => setEditingMeta(true)} className="p-2 text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded"><Pencil size={14} /></button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto scrollbar-thin px-6 py-5 flex-1">
          {snaps.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {METRICS.map(m => {
                const latest = snaps[snaps.length - 1];
                const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null;
                const val = latest[m.key];
                const delta = prev ? val - prev[m.key] : 0;
                return (
                  <div key={m.key} className="border border-stone-800 rounded-lg p-4 bg-stone-950/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-stone-500">{m.label}</span>
                      <m.icon size={14} style={{ color: m.color }} className="opacity-60" />
                    </div>
                    <div className="num text-3xl font-medium" style={{ color: m.color }}>{fmt(val)}</div>
                    <div className="text-[10px] text-stone-600 num mt-0.5">{fmtFull(val)}</div>
                    {delta !== 0 && (
                      <div className={`text-xs mt-1 num ${delta > 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                        {delta > 0 ? '+' : ''}{fmt(delta)} since {fmtDate(prev.date)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-stone-500 text-sm mb-6">No snapshots yet. Add one manually below or paste from CharSnap.</div>
          )}

          {chartSnaps.length >= 2 && (
            <div className="mb-6 border border-stone-800 rounded-lg p-4 bg-stone-950/40">
              <div className="flex items-center gap-2 text-sm text-stone-300 mb-3">
                <TrendingUp size={16} className="text-amber-300/70" /> Growth over time
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSnaps} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#292524" />
                    <XAxis dataKey="date" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} stroke="#78716c" style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <YAxis yAxisId="left" tickFormatter={fmt} stroke="#78716c" style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={fmt} stroke="#78716c" style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-stone-950 border border-stone-700 rounded px-3 py-2 shadow-xl">
                            <div className="text-xs text-stone-400 mb-1">{d.dateLabel}</div>
                            {METRICS.map(mx => (
                              <div key={mx.key} className="flex justify-between gap-6 text-xs">
                                <span className="text-stone-500">{mx.label}</span>
                                <span className="num" style={{ color: mx.color }}>{fmtFull(d[mx.key])}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="right" type="monotone" dataKey="messages" stroke={METRIC_MAP.messages.color} strokeWidth={2} dot={{ r: 3 }} name="Messages" />
                    <Line yAxisId="left" type="monotone" dataKey="chats" stroke={METRIC_MAP.chats.color} strokeWidth={2} dot={{ r: 3 }} name="Threads" />
                    <Line yAxisId="left" type="monotone" dataKey="favorites" stroke={METRIC_MAP.favorites.color} strokeWidth={2} dot={{ r: 3 }} name="Favorites" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-stone-600 mt-2">Threads &amp; favorites use left axis; messages use right axis (different scales).</div>
            </div>
          )}

          <div className="border border-stone-800 rounded-lg bg-stone-950/40">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <div className="flex items-center gap-2 text-sm text-stone-300">
                <Camera size={14} className="text-amber-300/70" /> Snapshots ({snaps.length})
              </div>
              <button onClick={() => setAdding(a => !a)} className="text-xs px-2 py-1 border border-stone-700 hover:border-amber-300/40 rounded flex items-center gap-1.5">
                <Plus size={12} /> Add manual snapshot
              </button>
            </div>
            {adding && (
              <div className="border-b border-stone-800 p-3 bg-amber-300/5">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input type="date" value={newSnap.date} onChange={e => setNewSnap({ ...newSnap, date: e.target.value })} className="col-span-3 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40" />
                  <input placeholder="threads" value={newSnap.chats} onChange={e => setNewSnap({ ...newSnap, chats: e.target.value })} className="col-span-2 num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40" />
                  <input placeholder="messages" value={newSnap.messages} onChange={e => setNewSnap({ ...newSnap, messages: e.target.value })} className="col-span-3 num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40" />
                  <input placeholder="favs" value={newSnap.favorites} onChange={e => setNewSnap({ ...newSnap, favorites: e.target.value })} className="col-span-2 num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40" />
                  <div className="col-span-2 flex gap-1 justify-end">
                    <button onClick={submitSnap} className="p-1.5 text-emerald-400 hover:bg-stone-800 rounded"><Check size={14} /></button>
                    <button onClick={() => setAdding(false)} className="p-1.5 text-stone-500 hover:bg-stone-800 rounded"><X size={14} /></button>
                  </div>
                </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-stone-500">
                <tr className="border-b border-stone-800">
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-right py-2 px-3">Threads</th>
                  <th className="text-right py-2 px-3">Messages</th>
                  <th className="text-right py-2 px-3">Favorites</th>
                  <th className="text-right py-2 px-3">Scope</th>
                  <th className="py-2 px-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {[...snaps].reverse().map(s => (
                  <tr key={s.date} className="border-b border-stone-900 hover:bg-stone-900/40">
                    <td className="py-2 px-4 text-xs text-stone-400">{fmtDate(s.date)}</td>
                    <td className="py-2 px-3 text-right num text-sm">{fmt(s.chats)}</td>
                    <td className="py-2 px-3 text-right num text-sm">{fmt(s.messages)}</td>
                    <td className="py-2 px-3 text-right num text-sm">{fmt(s.favorites)}</td>
                    <td className="py-2 px-3 text-right text-[10px] text-stone-600">{s.scope || ''}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => onDeleteSnapshot(s.date)} className="p-1 text-stone-600 hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {snaps.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-stone-500 text-xs">No snapshots recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-stone-600 hover:text-red-400 transition flex items-center gap-1.5">
                <Trash2 size={12} /> Delete this bot and its history
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-400">Delete "{bot.name}" and all snapshots?</span>
                <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30">Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-stone-500">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, bots, previewCaptures, onApply }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null); // array of { capture, status, targetId, candidates? }
  const [error, setError] = useState('');

  const handlePreview = () => {
    setError('');
    const parsed = parsePasteInput(text);
    if (parsed.kind === 'unknown' || parsed.captures.length === 0) {
      setError('Could not parse input. Paste either the CharSnap copy-button output or the userscript JSON export.');
      return;
    }
    setPreview(previewCaptures(parsed.captures));
  };

  const allResolved = preview && preview.every(p => p.targetId !== undefined);
  const total = preview?.length ?? 0;

  const handleApply = () => {
    if (!preview || !allResolved) return;
    onApply(preview.map(p => ({ capture: p.capture, targetId: p.targetId })));
  };

  const assignToBot = (idx, botIdOrNull) => {
    setPreview(prev => prev.map((p, i) => i === idx ? { ...p, targetId: botIdOrNull, targetName: botIdOrNull === null ? (p.capture.name || 'New bot') : bots.find(b => b.id === botIdOrNull)?.name } : p));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-stone-950 border border-stone-700 rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <h2 className="font-display text-xl">Import stats</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
          <div className="text-sm text-stone-400">
            Paste the CharSnap copy-button output (single bot) or the userscript JSON export (many bots at once).
          </div>
          <div className="text-xs text-stone-500 bg-stone-900/60 border border-stone-800 rounded p-3 leading-relaxed">
            <div className="text-stone-400 mb-1">Example:</div>
            <pre className="font-mono text-[11px] text-stone-500 whitespace-pre-wrap">📊 Creator Analytics (All Time){'\n'}━━━━━━━━━━━━━━━━{'\n'}💬 Messages: 2,585,584{'\n'}❤️ Favorites: 1,221{'\n'}🗨️ Threads: 8,127</pre>
          </div>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setPreview(null); setError(''); }}
            placeholder="Paste here…"
            rows={8}
            className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-300/40 scrollbar-thin"
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {preview && (
            <div className="border border-stone-800 rounded p-3 bg-stone-900/40 space-y-2">
              <div className="text-xs text-stone-400">
                {total} capture{total === 1 ? '' : 's'} parsed
              </div>
              {preview.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-t border-stone-800 first:border-t-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-200 truncate">
                      {p.capture.name || <span className="italic text-stone-500">unnamed capture</span>}
                    </div>
                    <div className="text-[10px] text-stone-500 num">
                      {p.capture.scope} · {fmt(p.capture.chats)} threads, {fmt(p.capture.messages)} msgs, {fmt(p.capture.favorites)} favs
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.status === 'match' && (
                      <div className="text-xs text-emerald-400/80 flex items-center gap-1">
                        <Check size={11} /> update <span className="text-stone-300">{p.targetName}</span>
                      </div>
                    )}
                    {p.status === 'new' && (
                      <div className="text-xs text-amber-300/80 flex items-center gap-1">
                        <Plus size={11} /> new bot
                      </div>
                    )}
                    {(p.status === 'ambiguous' || p.status === 'unassigned') && (
                      <select
                        value={p.targetId === undefined ? '' : (p.targetId === null ? '__new' : p.targetId)}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === '') assignToBot(i, undefined);
                          else if (v === '__new') assignToBot(i, null);
                          else assignToBot(i, v);
                        }}
                        className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-300/40"
                      >
                        <option value="">— assign —</option>
                        <option value="__new">+ Create new bot</option>
                        {(p.candidates || bots).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                        {p.candidates && bots.length > p.candidates.length && (
                          <optgroup label="Other bots">
                            {bots.filter(b => !p.candidates.some(c => c.id === b.id)).map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              ))}
              {preview.some(p => p.capture.scope && !/total|all time/i.test(p.capture.scope)) && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-300/80">
                  <Info size={12} className="mt-0.5 flex-shrink-0" />
                  <div>Some captures aren't from the "All Time" tab. They'll save fine, but trend charts work best when all snapshots share the same scope.</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-stone-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button>
          {!preview ? (
            <button onClick={handlePreview} className="px-4 py-2 text-sm bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded font-medium">Preview</button>
          ) : (
            <button
              onClick={handleApply}
              disabled={!allResolved}
              className="px-4 py-2 text-sm bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {total} snapshot{total === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddBotModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [chats, setChats] = useState('');
  const [messages, setMessages] = useState('');
  const [favorites, setFavorites] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    const id = uid();
    const hasNumbers = chats || messages || favorites;
    onAdd({
      id,
      name: name.trim(),
      avatar: null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      snapshots: hasNumbers ? [{
        date: new Date().toISOString(),
        chats: parseNum(chats),
        messages: parseNum(messages),
        favorites: parseNum(favorites),
        scope: 'All Time',
      }] : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-stone-950 border border-stone-700 rounded-lg w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <h2 className="font-display text-xl">Add bot manually</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-300/40" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">Tags (comma-separated, optional)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-300/40" />
          </div>
          <div className="border-t border-stone-800 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Initial snapshot (optional)</div>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="threads" value={chats} onChange={e => setChats(e.target.value)} className="num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-300/40" />
              <input placeholder="messages" value={messages} onChange={e => setMessages(e.target.value)} className="num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-300/40" />
              <input placeholder="favorites" value={favorites} onChange={e => setFavorites(e.target.value)} className="num bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-300/40" />
            </div>
            <div className="text-[10px] text-stone-600 mt-1">Shorthand like <code className="text-stone-400">52k</code> or <code className="text-stone-400">1.2m</code> works.</div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-stone-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button>
          <button onClick={submit} disabled={!name.trim()} className="px-4 py-2 text-sm bg-amber-300/90 text-stone-950 hover:bg-amber-300 rounded font-medium disabled:opacity-50">Add</button>
        </div>
      </div>
    </div>
  );
}
