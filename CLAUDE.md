# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a personal stats tracker for CharSnap (an AI character chat platform) bot creators. The user runs the app locally in their browser, manually enters bot stats by pasting CharSnap's copy-button output, and gets historical tracking + visualizations that CharSnap itself doesn't provide.

**What this is:**
- Browser-only single-page app, no backend, no auth, no user accounts
- A personal tool — one user's data lives in their own browser
- A tracker for data the user manually inputs from CharSnap's UI

**What this is NOT:**
- Not a CharSnap scraper. The app NEVER fetches anything from CharSnap. The user pastes data in.
- Not a multi-user product. No accounts, no shared state, no leaderboards.
- Not an API client. CharSnap's API is off-limits per their ToS.

## Policy Boundary

This project's existence depends on a hard line:
- OK: User manually opens CharSnap's stats modal, clicks copy, pastes the output into our app.
- OK (future): A separate Tampermonkey userscript that reads the rendered DOM of a stats modal the user opened manually, formats it for paste-import.
- NOT OK: Any code that fetches from CharSnap's API, or that auto-opens multiple modals to scrape stats. Auto-opening modals fires API requests CharSnap didn't initiate — same policy problem as direct API access, just less obvious.

If a feature proposal seems to require "let's just call the CharSnap endpoint directly" or "let's loop through all bots automatically," the answer is no. Those paths are prohibited and not negotiable. Push back and find a manual-input alternative.

## Plan

See `docs/plan.md`. Work phases in order. Do not build ahead.

## Tracking Docs

When shipping a change, update the tracking doc that owns the relevant item to reflect resolution. These updates are part of completing the change — show them in the plan before executing.

- `docs/plan.md` — mark completed phase items done. If new in-scope work is discovered, add it under the appropriate phase or a "Queued" section near the bottom.
- `docs/handoff.md` — mark resolved polish items as shipped (note the version or date). Add newly discovered issues to the appropriate section. Userscript work specifically tracks fixes under section 5 — when a userscript version ships, list what it resolved.
- `CHANGELOG.md` — required for all user-visible changes. Add a new dated section at the top with Additions / Fixes / Adjustments / Renames subheaders as appropriate. Plain-language, user-visible entries — not internal refactor notes. The changelog is the source the in-app lander will eventually render. Include the userscript version bump when shipping userscript work.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server (hot reload)
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

No tests configured. ESLint is set up via `eslint.config.js`; run with `npm run lint`.

## Architecture

Browser-only SPA (React 19 + Vite). No backend, no database, no authentication. All persistence is **IndexedDB** via `storage-service.js`.

State management: **Zustand** (already installed). The store lives in `src/state/`. Hooks access it via `src/hooks/`; components never import the store directly.

### Strict layer order — imports only flow downward:

```
constants → services → hooks → components
```

- Components may only import from `hooks/` (never stores or services directly).
- Hooks may import from `state/` and `services/`.
- Services are plain JS — no React imports.
- `storage-service.js` is the *only* file that touches IndexedDB — no exceptions.
- `autosave.js` is a plain service, not a hook — the debounce timer must survive React re-renders.

### Architecture Rules

1. **One file, one responsibility** — no mixed concerns.
2. **Components render only** — all logic lives in hooks or services.
3. **No component imports stores directly** — always go through a hook.
4. **No component imports services directly** — always go through a hook.
5. **`storage-service.js` is the only file that touches IndexedDB** — no exceptions.
6. **`autosave.js` is a plain service, not a hook** — the debounce timer must survive React re-renders.
7. **Constants are never hardcoded in logic files** — always imported from `src/constants/`.
8. **Max folder depth: 3 levels** — `src/components/feature/` is the deepest allowed.
9. **No backend, no database, no authentication** — browser-only, IndexedDB only.
10. **No code that reaches CharSnap** — the app is a pure local tool. See Policy Boundary.

### Naming Conventions

| Convention | Applied to |
|------------|-----------|
| `PascalCase.jsx` | All React component files |
| `lowercase-hyphenated.js` | All non-component files (hooks, services, constants, state) |
| `use-*.js` | Custom React hooks |
| No `index.js` barrel files | Imports always reference the file directly |
| No `utils`, `misc`, `helpers`, `common` | Files are named after what they actually do |

### Import path depth

Components live at `src/components/[layer]/File.jsx` — two levels deep from `src/`. To reach `src/state/` or `src/services/` use `../../state/` and `../../services/`, not `../../../`.

## Reference Docs (read only when relevant)

- `docs/plan.md` — phased build roadmap; work top-down, don't build ahead
- `docs/domain-glossary.md` — CharSnap-specific terms (bot, snapshot, scope, eight-Sampos problem)
- `docs/data-model.md` — bot/snapshot schemas, storage shape, avatar normalization rules
- `docs/charsnap-state.md` — what we know about CharSnap's current UI (May 2026); update when CharSnap changes things
- `docs/reference-artifact.jsx` — earlier single-file prototype; behavioral reference only, do not port verbatim.
  - **Never read wholesale** (the file is ~800 lines and burns context fast). Always Grep for the specific function first, then read only those lines with `offset` + `limit`.
  - **Already extracted** through Phase 3: table layout, modals, sort/filter/search, parser, avatar normalization, disambiguation. No need to revisit those sections.
  - **Remaining value:** chart components (LineChart, overlay chart, ranking chart) and export/reset logic — relevant for Phases 4–5 only.

## Userscript

`userscript/charsnap-capture.user.js` — a Tampermonkey userscript that lives alongside the main app but is **not** part of the Vite build.

- **Standalone vanilla JS** — no bundler, no React, no npm. Single file.
- **Install:** drag the file into the Tampermonkey dashboard, or point Tampermonkey at the raw GitHub URL.
- **Runs on:** `https://charsnap.ai/*`
- **What it does:** watches for stats modals the user opens manually; injects a "Capture" button near the modal's Copy button; on click, ensures the Total tab is active, reads the rendered DOM (bot name, avatar URL, three stat values, optional messages breakdown), and pushes to a local queue stored via `GM_getValue`/`GM_setValue`.
- **Floating HUD:** always-visible bottom-right panel showing queue count, a "Copy queue" button (copies JSON to clipboard via `GM_setClipboard`), and a two-step "Clear" confirm.
- **Output format:** `{ captures: [...] }` — matches the app's existing batch JSON import path exactly. User copies from HUD, pastes into the app's Import modal.
- **Does not share storage with the main app** (different origins / storage scopes). Export → clipboard → paste-import is the handoff.
- **Policy:** reads DOM of manually-opened modals only. Makes zero HTTP requests. See Policy Boundary.

## Deployment

GitHub Pages. `vite.config.js` reads `GITHUB_REPOSITORY` from the Actions environment and sets the base path to `/<repo-name>/` automatically. Push to `main` triggers deploy via `.github/workflows/main.yml`.

## Don't Do This

- Don't hardcode strings, numbers, or colors in logic files — always import from `src/constants/`
- Don't import stores or services directly in components — always go through a hook
- Don't create `index.js` barrel files
- Don't name files `utils`, `misc`, `helpers`, or `common`
- Don't nest folders deeper than `src/components/feature/`
- Don't add a backend, database, or authentication layer
- Don't add anything that fetches from CharSnap's servers — see Policy Boundary

## File Editing

- When the Edit tool fails due to unicode characters (em-dashes, non-breaking spaces, etc.), use targeted `sed` commands for surgical replacements — do **not** load and rewrite the entire file via Python or similar; that dumps the full file contents into context unnecessarily

## Communication

The user (shiro) is non-technical. Explain choices in plain language, not just code. When an exploratory or design discussion includes multiple decisions to make, finish the message with a numbered list of the specific clarifications you need from the user — one decision per item, with the options enumerated `(a)/(b)/(c)`. Lay out reasoning and tradeoffs in prose above the list as usual, but the trailing list should be self-contained enough that the user can reply with `1. a, 2. b, 3. yes` and unambiguously approve the path forward.

If the user pushes back on a technical choice with non-technical reasoning, take it seriously — they know their use case and the broader project context (CharSnap policies, community norms) better than the codebase implies.

## Token Cost Warnings

Some actions consume a disproportionate number of tokens. Warn the user **before** performing any of the following:

- **`/compact`** — Summarizes the entire conversation history. Cost scales with session length. On a long session with many file reads and code generations, this can consume 20–30% of your usage budget in one shot. **Alternative:** Start a new session earlier (before context gets large), or accept the larger per-message cost of a long session instead of compacting.

- **Reading very large files** — Reading a file with thousands of lines dumps it all into context. **Alternative:** Use `offset` + `limit` parameters to read only the relevant section, or use `Grep` to find specific lines first.

- **Full file rewrites via `Write`** — Rewriting an existing file sends the entire contents through the model. **Alternative:** Use `Edit` for targeted changes whenever possible.

- **Long Agent/subagent tasks** — Spawning an agent on a vague or open-ended task can burn many tokens exploring dead ends. **Alternative:** Give the agent a specific, narrow question; or use `Grep`/`Glob` directly for simple searches.

When any of these is about to happen on a large or expensive operation, say so and ask for confirmation or suggest the cheaper alternative.
