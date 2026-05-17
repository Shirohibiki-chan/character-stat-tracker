# Handoff: Phases 0–7 → Polish Roadmap

## Where We Are

Phases 0–7 from `docs/plan.md` are complete. Live app at `https://shirohibiki-chan.github.io/character-stat-tracker/`. The Tampermonkey userscript on `charsnap.ai` captures bot stats with effectively one click (open a bot's stats modal → auto-captures to a queue → export queue as JSON → paste into the tracker's import box).

## Repo Snapshot

- `src/` — React app (constants → services → state → hooks → components)
- `userscript/charsnap-capture.user.js` — Tampermonkey userscript
- `docs/` — architecture, data model, glossary, plan, charsnap-state, reference artifact
- `CLAUDE.md` — project rules
- `CHANGELOG.md` — phase-by-phase log

## What Phases 0–7 Delivered

- **Phase 0:** Vite + React + Tailwind v4 + Zustand scaffold, GitHub Pages CI deploy
- **Phase 1:** IndexedDB-backed data layer with autosave, schema factories, avatar normalization
- **Phase 2:** Manual entry dashboard — table, sort, filter, search, stat cards, Add/Edit/AddSnapshot modals
- **Phase 3:** Paste-box import — parser for CharSnap copy-button text, parser for batch JSON, avatar-URL-keyed disambiguation, preview-before-apply
- **Phase 4:** Per-bot detail modal with dual-axis line chart of Total snapshots
- **Phase 5:** Multi-bot visualizations — izumael-style overlay chart, configurable ranking chart, daily/weekly/monthly gain views, top-characters history, tag aggregates
- **Phase 6 (partial):** click-outside-to-close + Escape on all modals (full Phase 6 items deferred — see roadmap below)
- **Phase 7:** Tampermonkey userscript — auto-capture on Total tab activation, draggable floating queue pill, toast notifications, JSON export to clipboard

## Known Issue (workaround, not a code fix)

Bots imported before the import-side avatar mapping fix landed (Phase 7 late) don't have stored avatar URLs and display as letter-initials in the table. To fix retroactively: re-capture those bots via the userscript and re-import — the import will match them by name and update existing records.

---

# New Roadmap: Polish + Aesthetic Unification

The original plan is complete. Next phase is making the app look as good as it works.

## 1. Aesthetic Unification (the big one)

The reference artifact's warm stone + amber palette landed gorgeously in the bot detail modal (`BotDetailModal`) but drifted to cool navy/blue in some later-phase views, especially the multi-bot overlay chart. Need to unify the palette across every screen.

**Reference palette (from the bot detail modal — this is the "winning" look):**

- Background: dark warm stone — `#0c0a09` base with subtle `radial-gradient(ellipse at top, #1c1410 0%, #0c0a09 45%, #070605 100%)`
- Surfaces/cards: `stone-950/40` with `stone-800` borders, backdrop-blur
- Primary accent: amber-300 (`#e8b858`)
- Metric colors (warm, not cool):
  - Chats: `#e8b858` (gold)
  - Messages: `#c98b5f` (copper)
  - Favorites: `#b85c5c` (brick red)
- Typography:
  - Display headings: Fraunces (serif, italic accents on key words)
  - Body: Geist
  - Numbers: JetBrains Mono with tabular-nums
- Selection: amber-300 on stone-950
- Subtle film-grain noise overlay at low opacity for texture

**Audit every screen against this palette.** Specifically scrutinize:

- Multi-bot overlay chart (Phase 5) — currently feels cool/navy, should be warm dark
- Top Characters history view
- Daily/weekly/monthly gain views
- Configurable ranking chart
- Tag-aggregate views
- The main dashboard's view switcher (tabs/dropdown between the above)

## 2. Metric Ordering: Messages First

The user prioritizes message count over thread count. Currently most places order Threads → Messages → Favorites. **Should be Messages → Threads → Favorites** (or Messages → Favorites → Threads depending on the column logic).

Apply to:

- Stat card order on the main dashboard
- Default sort column on the bot table
- Bot detail modal's three metric cards (top of the modal)
- Default selected metric in the overlay chart (currently messages — keep)
- Default selected metric in the ranking chart
- Snapshot history table column order in the bot detail

The constant `METRICS` in `src/constants/metrics.js` is probably the canonical source — reordering there should cascade through. Verify there's no hardcoded order in individual components.

## 3. Chart White Box Artifact

A visible light/white rectangular outline appears around the overlay chart and possibly other Recharts components. Probably a default Recharts focus outline or hover state escaping the theme. Find the offending element (likely `<Tooltip>` cursor styling or chart container default) and theme it to match.

## 4. Deferred Phase 6 Items

These were originally Phase 6 in `docs/plan.md`. Now reassigned to the polish roadmap:

- Better empty state for first-time users (paste-your-first-stats hint, friendlier copy)
- Onboarding tooltip on the Import button
- About / lander page rendering `CHANGELOG.md` entries inside the app (use Vite's `?raw` import for the markdown)
- `README.md` at repo root with screenshots — user will provide screenshots
- Export full data (JSON download) for backup or transferring between browsers
- Reset-all-data button with two-step confirmation
- Mobile-decent layout audit and patching
- Favicon and page `<title>` set to "CharSnap Stats Tracker"

## 5. Userscript Polish

### URGENT — Draggable pill bounds checking is broken
The draggable pill can currently be dragged completely off-screen with no way to recover it (the user has hit this — pill lost, had to manually clear `pillPosition` from Tampermonkey storage). Fix:
- Constrain drag during pointermove so the pill cannot go past the viewport edges. Keep at least 50px of the pill visible on all four sides at ALL times during drag, not just on drop.
- On window resize, re-clamp the saved position so a smaller window doesn't strand the pill off-screen.
- Add a **"Reset position"** button to the pill's expanded menu — single click returns the pill to its default bottom-right anchor.
- Default position should be `bottom: 20px; right: 20px;` (or wherever the original was). Save default as a constant so the reset button can restore it.

### Lower-priority polish
- `@updateURL` and `@downloadURL` metadata pointing at the raw GitHub URL so Tampermonkey auto-updates without manual re-install

---

## Process Notes for New Session

- Read `CLAUDE.md` first — architecture rules, layer order, naming conventions, don't-do's
- Read `docs/charsnap-state.md` for CharSnap UI specifics if any userscript work comes up
- **Do NOT read `docs/reference-artifact.jsx` wholesale** — it's ~800 lines. Use Grep to find specific patterns/components, then targeted `view` with offset+limit. This rule is in CLAUDE.md but worth restating.
- Commit and push after each meaningful change so the GitHub Pages deploy fires automatically
- Show plan before executing — user approves before code lands
- User is non-technical — explain choices in plain language, not just code

## Not In Scope (policy boundary)

- Anything that reaches CharSnap's servers programmatically (no API calls, no fetch interception, no auto-walking through modals)
- Multi-user features, accounts, shared state — this is a single-user browser-only tool

## Suggested First Move for New Session

Ask the user which polish area to start with:

1. Aesthetic unification pass (biggest visual impact, most satisfying)
2. Metric ordering (Messages first) — quick win, touches many files
3. Chart white box fix — quick, isolated bug
4. Deferred Phase 6 items — adds real functionality (export/import, About page, etc.)
5. Userscript polish — low priority

Recommend (1) and (2) together as a first "polish pass" since they're interconnected (re-theming views is also a good moment to re-check metric ordering in each).
