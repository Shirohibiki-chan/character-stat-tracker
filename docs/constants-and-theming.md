# Constants & Theming Reference

## Key Constants (`src/constants/`)

- **`auras.js`** — `AURAS` (array of 5 hex colors: sky `#7dd3fc`, violet `#a78bfa`, pink `#f472b6`, emerald `#34d399`, orange `#fb923c`) and `getAura(id)` — deterministic hash-based assignment of one aura color per bot; same bot ID always resolves to the same color. Must stay in sync with `--color-aura-1..5` in `index.css`.

- **`chart-colors.js`** — `CHART_COLORS` array — the same 5 hex values as `AURAS` in the same order. Kept as a separate export for chart-specific imports; the comment directs callers to prefer `getAura()` for per-bot assignment.

- **`format.js`** — five formatting utilities used across the entire app:
  - `fmt(n)` — abbreviates to K / M / B (e.g., `1200 → "1.2K"`)
  - `fmtFull(n)` — comma-separated full number (e.g., `1200 → "1,200"`)
  - `fmtDate(iso)` — short locale date (e.g., `"May 16, 2026"`)
  - `fmtRelative(iso)` — human-relative (e.g., `"3d ago"`, `"just now"`)
  - `parseNum(v)` — parses shorthand entry (`"1.2k" → 1200`, `"3m" → 3000000`); used in all stat input fields

- **`metrics.js`** — array of 3 metric definition objects (`messages`, `chats`/Threads, `favorites`). Each entry carries: `key` (internal field name), `label` (display name), `color` (hex for chart lines), `icon` (lucide icon name), and `card` (object of CSS var references for StatCard tinting). Order is canonical — Messages → Threads → Favorites — everywhere in the app.

- **`schema.js`** — `createBot(overrides)` and `createSnapshot(overrides)` factory functions that stamp out default-shaped objects; `SCOPES` enum (`['Total', 'Last 24h', 'Last 7d', 'Last 30d']`). Bot fields: `id` (UUID), `name`, `avatar` (null or URL string), `tags` (array), `snapshots` (array). Snapshot fields: `date` (ISO string), `chats`, `messages`, `favorites`, `scope`; optional `messagesSolo` / `messagesGroup` fields are not defaulted.

---

## CSS / Theming (`src/index.css`)

### Theme architecture

CharSnap uses Tailwind v4's `@theme` block to define all semantic color tokens as CSS custom properties. There is currently one shipped theme (dark) — its token values live directly inside `@theme`. Additional themes (Light, Yume Kawaii, Ocean, Dark Academia, Synthwave) will be added as `[data-theme="<name>"]` selector blocks that override the same token names; the comment in `index.css` shows the shape: `[data-theme="kawaii"] { --color-bg: #fff0fa; ... }`. No theme-switcher UI exists yet — all planned themes are queued behind it.

### Semantic color tokens

All values below are from the dark theme (the only shipped theme).

| Token | Hex (dark) | Use for |
|-------|-----------|---------|
| `--color-bg` | `#0d1218` | Page background; the darkest surface |
| `--color-surface` | `#1a2030` | Primary card and panel backgrounds (bot table, chart panels, modal bodies) |
| `--color-surface-alt` | `#1d2538` | Slightly elevated surface — table header row, segmented control backgrounds, secondary input fields |
| `--color-surface-edge` | `#2a3344` | Highest-contrast surface — avatar fallback background, fine dividers |
| `--color-border` | `#3a4659` | Standard element borders (cards, inputs, table rows, modal edges) |
| `--color-border-subtle` | `#232b3d` | Low-contrast dividers where a full border would be too heavy |
| `--color-text-primary` | `#e6edf3` | Body text, headings, active labels |
| `--color-text-value` | `#d5dde9` | Numeric values that should read slightly softer than full primary |
| `--color-text-secondary` | `#b8c1d0` | Supporting text — descriptions, secondary labels |
| `--color-text-tertiary` | `#8b95a6` | Quiet labels — stat card labels, table column headers in inactive state |
| `--color-text-muted` | `#6e7787` | Placeholder text, disabled states, de-emphasized metadata |
| `--color-accent` | `#0ea5e9` | Base sky-blue accent; used for focus rings and the base of tinted surfaces |
| `--color-accent-light` | `#38bdf8` | Accent text on dark surfaces — active tab labels, highlighted link text, tag chip text |
| `--color-accent-dark` | `#0284c7` | Gradient end for the Add Bot button; hover states that need to go darker than accent |
| `--color-accent-soft` | `#3eb8e8` | Accent at medium brightness — rarely used directly |
| `--color-accent-faint` | `rgba(14,165,233,0.10)` | Tinted backgrounds for selected chips, active tabs, onboarding banner, scope pills |
| `--color-accent-faint-border` | `rgba(14,165,233,0.22)` | Border on accent-faint backgrounds |
| `--color-accent-faint-text` | `#5ec3f0` | Text on accent-faint backgrounds when `--color-accent-light` is too bright |
| `--color-metric-messages` | `#34d399` | Messages number text in StatCard |
| `--color-metric-messages-bg` | `#19281f` | Messages StatCard background |
| `--color-metric-messages-border` | `rgba(52,211,153,0.42)` | Messages StatCard border |
| `--color-metric-messages-label` | `#7eb89c` | Messages StatCard label text |
| `--color-metric-threads` | `#818cf8` | Threads number text in StatCard |
| `--color-metric-threads-bg` | `#1f2138` | Threads StatCard background |
| `--color-metric-threads-border` | `rgba(129,140,248,0.42)` | Threads StatCard border |
| `--color-metric-threads-label` | `#8e93c4` | Threads StatCard label text |
| `--color-metric-favorites` | `#fb7185` | Favorites number text in StatCard |
| `--color-metric-favorites-bg` | `#2b1b24` | Favorites StatCard background |
| `--color-metric-favorites-border` | `rgba(251,113,133,0.42)` | Favorites StatCard border |
| `--color-metric-favorites-label` | `#c08594` | Favorites StatCard label text |
| `--color-aura-1` | `#7dd3fc` | Per-bot aura — sky |
| `--color-aura-2` | `#a78bfa` | Per-bot aura — violet |
| `--color-aura-3` | `#f472b6` | Per-bot aura — pink |
| `--color-aura-4` | `#34d399` | Per-bot aura — emerald |
| `--color-aura-5` | `#fb923c` | Per-bot aura — orange |

> New UI must use semantic tokens, not raw color vars or hex literals. The convention is what makes future themes possible.

### Per-bot aura colors

Five colors (`--color-aura-1..5`) are assigned to bots deterministically by `getAura(id)` in `constants/auras.js` — the same bot always gets the same color. Auras appear in two places: as a box-shadow glow ring on bot avatars (in the table and BotDetailModal header), and as the stroke color for each bot's line in the OverlayChart. The hex values in `constants/auras.js` and `constants/chart-colors.js` must stay in sync with these CSS tokens.

### Metric-tinted StatCards

Each of the three metrics has a 4-token group (`-bg`, `-border`, `-label`, `-number`) that `StatCard.jsx` reads from the metric definition's `card` object. This is why adding a new metric requires both a new `metrics.js` entry and a matching `--color-metric-*` group in `index.css`.

### Accent-faint chip / tab pattern

Active chips and tabs (tag filter, view tabs, scope pills, "all" tag button) use a consistent three-token tint: `--color-accent-faint` background + `--color-accent-faint-border` border + `--color-accent-light` or `--color-accent-faint-text` label. Inactive state is transparent background with `--color-text-muted` label.

### Typography

Three font classes are used throughout the app — all applied via utility classes or the base `body` rule, not inline styles:

- **Body / labels** — Quicksand; set on `body` in `@layer base`
- **Numbers** — Inter with `font-feature-settings: 'tnum'` (tabular numerals); applied via the `.num` utility class
- **Display / headings** — Fraunces (optical-size aware serif); applied via the `.font-display` utility class
