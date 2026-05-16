# Plan

Work phases top-down. Do not start a phase until the previous one is complete and usable.

Each phase is a meaningful milestone — at the end of any phase, the app should be in a coherent, working state. Phases are sized to be reviewable as user-facing changes, not just internal refactors.

---

## Phase 0: Project Setup

**Goal:** a runnable empty Vite + React app deployable to GitHub Pages.

- [ ] Initialize Vite + React project (`npm create vite@latest`)
- [ ] Install core dependencies: `recharts`, `lucide-react`. Pick & install state library if going with Zustand
- [ ] Wire up Tailwind CSS (reference artifact uses it heavily)
- [ ] Configure `vite.config.js` for GitHub Pages base path (read `GITHUB_REPOSITORY` env var)
- [ ] Set up `.github/workflows/main.yml` to deploy on push to main
- [ ] Create folder structure: `src/{constants,services,state,hooks,components}` + `docs/`
- [ ] Add `CHANGELOG.md` at repo root with initial entry
- [ ] Confirm: `npm run dev` shows a styled empty page; GitHub Pages deploy works on push

**Exit criteria:** branded empty app live at `https://<user>.github.io/<repo>/`.

## Phase 1: Data Layer

**Goal:** data flows through the strict layer architecture, persists to IndexedDB, survives reload.

- [ ] Define bot & snapshot schemas in `src/constants/schema.js` (see `data-model.md`)
- [ ] Define metric definitions in `src/constants/metrics.js` (chats / messages / favorites, colors, icons)
- [ ] Implement `storage-service.js` — the ONLY file that touches IndexedDB. Single object store, get/set whole `{bots}` blob
- [ ] Implement state store (Zustand or React equivalent — pick now, stay consistent)
- [ ] Implement `autosave.js` service — debounced writes, NOT a hook, debounce timer survives re-renders
- [ ] Implement `use-bots.js` hook as the access point components use
- [ ] Implement avatar URL normalization helper (see `data-model.md`)

**Exit criteria:** can write a bot through dev tools / temporary UI, reload browser, confirm it persists. No real UI yet beyond a "you have N bots" indicator that proves the pipeline works.

## Phase 2: Manual Entry + Basic Dashboard

**Goal:** user can add bots manually, add snapshots, see them in a list with totals and sorting.

- [ ] "Add bot" modal (name, tags, optional initial snapshot with shorthand like `52k` / `1.2m`)
- [ ] Bot list table with name, avatar, latest stats, last-captured timestamp, snapshot count
- [ ] Delete bot (with confirmation)
- [ ] Edit bot meta (name, tags) inline or via detail view
- [ ] Add manual snapshot to existing bot (date picker, three number fields, scope select)
- [ ] Search bots by name/tag
- [ ] Filter by tag (clickable tag pills)
- [ ] Sort by name / chats / messages / favorites / last-captured (ascending or descending)
- [ ] Aggregate stat cards (total bots, summed chats / messages / favorites) over the filtered set
- [ ] Empty state when no bots exist

**Reference:** the artifact's table, AddBotModal, stat cards, search/filter/sort already exist as a behavioral spec. Don't port code; do match UX.

**Exit criteria:** can add 10 fake bots, sort/filter/search them, edit and delete, reload, everything persists.

## Phase 3: Paste-Box Import

**Goal:** user can paste CharSnap's copy-button output and have it parsed into a snapshot.

- [ ] Import modal with paste textarea
- [ ] Parser for CharSnap copy-button format (see `charsnap-state.md` — **verify current format with the user before locking in the parser; it has changed since the reference artifact**)
- [ ] Parser for batch JSON format (forward-compatible for the future userscript)
- [ ] Auto-match captures to existing bots by name + normalized avatar URL
- [ ] Disambiguation UI when name matches multiple bots (the "eight Sampos" problem — see `domain-glossary.md`)
- [ ] "Create new bot" option in the disambiguation UI
- [ ] Preview screen before apply — show what will happen for each capture (update X, create new, ambiguous → pick)
- [ ] Scope warning if captures aren't from the Total tab (the growth chart needs Total)

**Exit criteria:** user pastes real CharSnap output, parser recognizes it, captures land as snapshots on the right bots without duplication.

## Phase 4: Per-Bot Detail + Growth Charts

**Goal:** user clicks a bot row, sees that bot's full history with a line chart.

- [ ] Bot detail modal/view (open from row click or row "view" button)
- [ ] List all snapshots chronologically with delete-individual capability
- [ ] Line chart of all three metrics over time, filtered to Total-scope snapshots
- [ ] Use dual-axis since messages dwarf chats and favorites in scale
- [ ] Delta-since-last-snapshot for each metric (e.g., "+12K since Nov 14")
- [ ] Add snapshot directly from detail view
- [ ] Edit bot meta from detail view
- [ ] Delete bot from detail view

**Exit criteria:** for any bot with 2+ snapshots, growth-over-time chart renders correctly with no scope-mixing artifacts.

## Phase 5: Multi-Bot Visualizations

**Goal:** the views CharSnap doesn't provide — the actual reason the tracker exists.

- [ ] **Izumael-style overlay chart**: all bots' cumulative growth (chats or messages) on one chart, one line per bot, legend, hover highlight. This is THE flagship view.
- [ ] **Top Characters history view**: reconstruct "who topped the leaderboard on day X" by ranking snapshot deltas. Day picker, ranked list, clickable to bot detail.
- [ ] **Daily/weekly/monthly gain views**: derived from Total snapshots via deltas — bypasses CharSnap's reset-window timing issues
- [ ] **Tag-based aggregates**: e.g., "event bots combined growth" — sum across tagged bots
- [ ] **Configurable ranking chart** (already in reference artifact): top N by any metric, configurable N
- [ ] Switch between chart types via tab/dropdown in main dashboard

**Exit criteria:** the dashboard offers something useful CharSnap doesn't. Specifically: the overlay chart works and looks good with 20+ bots.

## Phase 6: Polish + Share-Readiness

**Goal:** another creator could pick this up and use it without explanation.

- [ ] Empty state for first-time users (paste your first stats hint)
- [ ] Onboarding tooltip for the import box
- [ ] About page / lander rendering `CHANGELOG.md` entries
- [ ] README with screenshots of the dashboard, growth chart, overlay chart
- [ ] Export/import full data (JSON) for backup or transferring between browsers
- [ ] Reset button (with confirm-twice)
- [ ] Mobile-decent layout (works on phone, even if optimized for desktop)
- [ ] Favicon and page title

**Exit criteria:** sharable URL with a clean first-load experience.

## Phase 7 (Deferred): Userscript

**Not in scope until Phases 0–6 are complete.** When we get there, design separately. Constraints to honor when we do:

- Reads DOM of a manually-opened stats modal — does NOT auto-open modals
- Refuses to capture if not on the Total tab (warns user, doesn't queue bad data)
- Captures one bot at a time (no auto-walk across the creator's catalog)
- Outputs to clipboard as JSON for paste-import into the main app (since artifact and userscript don't share storage scope)
- Personal use only until cleared with CharSnap team for wider distribution

This phase may live in a separate repo or a sibling folder — decide at the time.
