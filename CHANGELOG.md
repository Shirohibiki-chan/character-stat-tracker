# Changelog

## [Unreleased]

### Fixes
- **"This week" resets on Monday 0 UTC:** stat card weekly deltas now use Monday midnight UTC (matching CharSnap's reset time) instead of a rolling 7-day window.
- **"Today" delta on stat cards:** each stat card now also shows a daily gain since midnight UTC, matching CharSnap's daily reset.
- **White flash on initial load:** the app no longer briefly flashes a white screen before the dark background loads.
- **"1000K" / "1000M" display bug:** numbers near a tier boundary (e.g. 999,972) now correctly round up to the next unit (1.0M / 1.0B) instead of showing "1000K" or "1000M".
- **Bar chart labels disappearing when a modal opens:** labels to the right of bars no longer vanish when a modal with a backdrop blur is open.

### Adjustments
- **Bar chart colors:** each bot's bars now use their aura ring color (hash-based), so you can identify bots at a glance. Tags chart bars are colored the same way by tag name. Bar colors use a darker variant of each hue so they're not eye-straining on a dark background.
- **Bar chart bot names:** Y-axis labels are now larger (13px) and bolder so names are easier to read; wider label column (160px) prevents long names from being clipped. Tag names on the Tags chart were missing entirely — fixed.
- **Bar chart value labels:** the numbers shown to the right of each bar are now bold.
- **Bot detail modal readability:** snapshot table dates, numbers, and scope text are now bolder; chart axis numbers and legend are bolder; tooltip label text is bolder and brighter; section headers are bolder.

---

## 2026-05-20

### Fixes
- **Chart focus outline:** clicking bars on the Ranking, History, Gains, and Tags charts no longer shows a white box outline.
- **PFP squish on load:** avatars in the bot table no longer briefly distort when the page refreshes; wrapped the image in an overflow-hidden container so it's always properly clipped.
- **Settings icon:** changed to a plain gear (was a different settings-style icon).
- **Snapshot icon:** table snapshot button and bot detail Snapshots section header no longer use the camera icon (reserved for changing PFP); now shows a clipboard-plus icon.
- **Lander flash on refresh:** the empty/onboarding screen no longer flickers on load for users who already have bots; the app now waits for IndexedDB to finish loading before deciding what to show.
- **Theme/compact color flash:** settings (theme, compact mode) are now applied before React renders via an inline script in the page head, eliminating the flash of default styles on load.

### Additions
- **Logo → lander:** clicking the "CharSnap stats" wordmark when you have bots shows the feature overview / how-to-start screen. Click it again, or use Import / Add bot from that screen, to return to the dashboard.

---

## 2026-05-20 (App — settings panel)

### Additions
- **Settings panel:** gear icon in the header opens a Settings modal with two sections.
  - **Appearance** — theme picker (Default; more themes coming) and a compact mode toggle that tightens card padding across the dashboard.
  - **Preferences** — opening view (which tab the app lands on when you load it; clicking also switches you there immediately) and rows per page (25 / 50 / 100; applies instantly).
- All settings persist automatically across sessions.
- Header now has a dedicated `Database` icon for Data & Backup; the `Settings` gear opens the new settings panel.

---

## 2026-05-20 (Userscript v2.2 — settings panel)

### Additions
- **Userscript v2.2 — settings panel:** clicking the gear icon in the expanded HUD header opens a settings view. A `← Back` button returns to the captures list. Settings include:
  - **Default state on load** — choose whether the HUD starts as Pill, Expanded, or Hidden when you land on your own creator profile page. Defaults to Pill. Persists across page loads.
  - **Auto-capture toggle** — same ON/OFF toggle as the toolbar, mirrored here for discoverability. Auto-capture is event-driven (fires when you open a bot's stats modal) — no interval to configure.
  - **Reset position** — returns the HUD to its default bottom-right corner without losing other settings.
  - **Reset size** — returns the expanded panel to its default 360×480 dimensions without losing other settings.
  - **Clear all settings** — two-step confirm; wipes position, size, default-state pref, auto-capture pref, and force-show flag back to defaults. Captures queue is preserved.
  - **Wipe captures queue** — two-step confirm; clears all queued captures (same as the footer Clear action). Settings are preserved.

---

## 2026-05-20 (Userscript v2.1.1 — profile gate bypass, HUD force-show shortcut)

### Fixes
- **Userscript v2.1.1 — HUD invisible after update:** the profile gate was not detecting the creator profile page, hiding both the HUD and restore pill everywhere. Added `Ctrl+Shift+Alt+H` (Cmd on Mac) as a force-show override that persists across navigations. Pressing it logs diagnostic info to the browser console (which buttons CharSnap has on the page and whether `isOwnProfile()` passed) to help identify the root cause. Clicking the × hide button clears the override.

---

## 2026-05-20 (Userscript v2.1 — captures list, per-row remove, inline preview, search, multi-select)

### Additions
- **Userscript v2.1 — captures list:** the HUD body now renders all queued captures as a scrollable list. Each row shows the bot's avatar (letter-initials fallback), name, and a secondary line with relative timestamp, scope, and compact stat summary (e.g. `3.1M msgs · 8.9K threads · 1.3K favs`). If the same bot appears multiple times in the queue, subsequent entries show positive deltas in green (e.g. `+24K msgs`).
- **Userscript v2.1 — per-row remove:** each capture row has a `×` button that removes that single capture from the queue. A toast fires immediately: "Removed [name]. Undo" — clicking Undo re-inserts the capture. Undo window is 8 seconds (matches toast duration).
- **Userscript v2.1 — inline preview:** clicking anywhere on a row (except the × button or checkbox) expands an inline JSON preview directly below that row, pushing following rows down. Click again to collapse. No modal involved.
- **Userscript v2.1 — search/filter:** a text input in the toolbar (next to AUTO) filters the list in real-time by bot name substring (case-insensitive). Filter state persists across HUD re-renders so typing is never interrupted by new captures arriving.
- **Userscript v2.1 — multi-select mode:** a Select button in the footer (visible when queue is non-empty) enables checkboxes on every row. In select mode: clicking a row toggles its checkbox; the footer shows count selected, All/None toggle, Remove, Export, and Cancel. Remove removes all checked captures with a single "Removed N captures. Undo" toast (also undoable). Export copies only checked captures to clipboard as `{ captures: [...] }` — same shape as the app's batch import.
- **Userscript v2.1 — empty state:** when the queue is empty, the capture list area shows a centered camera icon and instruction text.

---

## 2026-05-20 (Userscript v2.0 — HUD shell overhaul, part 1: three-state model + header/footer)

### Additions
- **Userscript v2.0 — three-state HUD model:** the HUD now has three explicit states with clean transitions — Pill (collapsed badge), Expanded (full panel), and Hidden (restore-pill only). Previously collapsing from expanded to pill was broken; that path now works reliably in both directions.
- **Userscript v2.0 — new header layout:** expanded panel header shows queue count text on the left and three icon buttons on the right — collapse (chevron, returns to pill), settings (gear, wired up in part 3), and hide (×, triggers the v1.11 hide/restore-pill flow). A decorative dots-grid icon sits between the title and the icon buttons as a drag-handle affordance.
- **Userscript v2.0 — sticky footer action bar:** Export queue and Clear buttons moved from the body into a dedicated sticky footer bar at the bottom of the panel, separated from the scrollable body. Confirm states (Clear? / Copied — clear now?) now appear in the footer rather than replacing body content.
- **Userscript v2.0 — default expanded size:** 360×480 px (was viewport-eating). Min size updated to 280×360. If no saved size exists, the HUD opens at exactly 360×480.

### Adjustments
- Removed the "Reset position" button from the HUD body — that action moves to the settings panel in part 3.
- "0 captures" label updated to "No captures" in both pill and expanded header.

---

## 2026-05-20 (Fix: userscript v1.20 — toast flashing and floating above capture box)

### Fixes
- **Userscript v1.20 — toast notification flashing:** every HUD state change (capture, button click, queue update) called `updateHUD()`, which wiped the panel's innerHTML. The toast area element lived inside the panel, so it was detached and re-appended on every update — causing the toast to visibly flash or replay its enter animation mid-display. Fixed by moving `#charsnap-toast-area` out of the HUD panel entirely: it is now a sibling of the HUD (both appended directly to `<html>`), so HUD re-renders never touch it.
- **Userscript v1.20 — toast position:** the toast was previously overlaid at the bottom edge of the capture box interior. It now floats ~7 px above the box as a separate element, so it never covers the box content. `positionToastArea()` keeps it anchored to the box top edge on every move, resize, and state change.

---

## 2026-05-20 (Fix: userscript v1.19 — HUD buttons broken after export queue confirmation)

### Fixes
- **Userscript v1.19 — HUD buttons completely unresponsive:** the v1.18 DOM-query guard in `updateHUD` (checking for `#cs-clear-yes`) left the HUD permanently stuck on the confirmation screen if it was showing during any navigation or profile-gate re-check. Fixed by replacing the DOM query with a `confirmingAction` JS variable that is explicitly set and cleared at every entry/exit point.

---

## 2026-05-20 (Fix: userscript v1.18 — messages capturing placeholder value; export queue confirmation dismissing)

### Fixes
- **Userscript v1.18 — messages total still wrong (capturing placeholder):** `waitForStats` was resolving the moment any non-zero stat appeared in the DOM. CharSnap renders a placeholder state first — the large messages element shows the solo count and the breakdown span shows `(solo + 0)` — then updates both to the real values a moment later. The fix: `hasData` now refuses to resolve when a breakdown is present with `messagesGroup === 0` and `messages === messagesSolo` (the exact signature of the placeholder state). Genuine zero-group bots fall through to the existing 2 s timeout and are still captured correctly.
- **Userscript v1.18 — export queue "Clear?" confirmation immediately dismissed:** any external DOM mutation on the page (e.g. CharSnap's React re-rendering in response to HUD changes) could trigger the profile-gate watcher, which called `updateHUD()` and wiped the confirmation screen. Fixed by adding a guard at the top of `updateHUD`: if `#cs-clear-yes` is already in the panel, bail out immediately without resetting the view.

---

## 2026-05-20 (Fix: userscript v1.17 — messages group count still zero)

### Fixes
- **Userscript v1.17 — messagesGroup capturing as 0:** the ℹ️ icon in CharSnap's breakdown span moved to appear between the solo count and the `+` sign (e.g. `(2,613,440 ℹ️ + 518,222)`), which broke the `\s*` whitespace match in the breakdown regex and caused the real breakdown span to not match. A false-positive span elsewhere in the modal (with a `+ 0` pattern) was winning instead, giving the wrong total. Fixed by widening the regex gap between the first number and `+` to accept any non-digit non-paren characters (`[^0-9+(]*`), so the ℹ️ icon no longer prevents a match. Added a `Math.max(domElement, breakdownSum)` safety net: if the DOM element happens to hold the real total and the breakdown sum is lower (false positive), the DOM value wins automatically.

---

## 2026-05-20 (Fix: stat card gradients and table tints missing on first load)

### Fixes
- **Stat card gradients and table column tints not rendering on first page load:** all gradient and tint values in the React components were referenced as CSS custom properties (`var(--gradient-messages)`, `var(--accent-threads)`, etc.) inside inline styles. Inline styles are resolved by the browser at paint time — if the CSS file hasn't been parsed yet (first visit, cold cache), the `var()` references resolve to nothing, leaving stat cards flat/dark and table column tints invisible. Re-refreshing would load the CSS from cache and show everything correctly. Fixed by replacing all `var()` references in inline styles with hardcoded `rgba()` / hex values directly in the JS constants, so rendering is independent of CSS load order.

---

## 2026-05-20 (Fix: userscript v1.16 — wrong message count; export queue UI reset)

### Fixes
- **Userscript v1.16 — messages capturing solo count instead of total:** CharSnap's DOM places the solo messages count in the large stat element; the all-time total was being skipped. When the `(solo + group)` breakdown is present in the modal, the total is now derived as `solo + group` — always correct regardless of which value the DOM element holds. The breakdown regex no longer requires a closing `)`, tolerating the ℹ️ icon that may appear inside the parentheses. Among multiple breakdown-looking spans, the one with the largest total is used to avoid false positives from other elements.
- **Userscript v1.16 — Export queue "Clear?" UI immediately reverting:** the profile-gate `MutationObserver` was watching all of `document.body` including the HUD element itself. Replacing the HUD's inner HTML (e.g. switching to the "Clear?" view) triggered a mutation, which called `updateHUD()` 300 ms later and reset the HUD to its default state. The observer now ignores mutations that originate inside the HUD's own elements.

---

## 2026-05-20 (Fix: userscript capturing zero stats; parser rejecting zero-stat imports)

### Fixes
- **Userscript v1.15 — capturing zeros instead of real stats:** `waitForStats` was resolving as soon as the bot's name appeared in the modal, even though CharSnap renders placeholder `0` values in the stat elements before the real data arrives. The function now waits for at least one non-zero stat before resolving. If stats are genuinely all-zero after 2 seconds (brand-new bot with no activity), it captures those zeros rather than dropping the snapshot.
- **Import rejecting brand-new bots with zero stats:** the JSON import parser was filtering out any capture where messages, threads, and favorites were all 0 — a falsy check that accidentally dropped valid captures for bots that genuinely have no activity yet. The parser now checks whether the stat fields *exist* in the source JSON (regardless of their value), so a new bot with all-zero stats imports correctly.

---

## 2026-05-20 (Fix: dashboard stats and growth only use Total-scope snapshots)

### Fixes
- **Stat cards showing wrong totals:** the "Total messages / threads / favorites" aggregate cards were summing each bot's most-recently-captured value regardless of scope. If the latest capture for a bot was a "Last 24h" or "Last 7d" snapshot (period-specific, not cumulative), that small partial number fed into the total — and conversely, a stale data anomaly could cause an absurdly inflated value. The cards now always sum the latest **Total-scope** snapshot value per bot.
- **Row growth indicators using wrong baseline:** the `+N` growth delta shown under each bot's stats in the table was computed by comparing the last two snapshots regardless of scope, so a Total snapshot could be compared against a 24h one (or vice versa), producing a meaningless or missing delta. Deltas now always compare two consecutive Total-scope snapshots.
- **"This week" growth wrong when scopes were mixed:** the same scope-contamination affected the weekly-gain delta shown on the dashboard stat cards. The baseline search now only walks Total-scope snapshots, so the "this week" number reflects all-time-count growth, not a comparison across different period windows.
- **Import match ranking used partial-scope values:** the "Closest match" ranking in the import bot-picker now compares incoming captures against each bot's latest **Total-scope** message count. Previously it could rank against a 24h value, making the closest-match badge point at the wrong bot.

---

## 2026-05-19 (Import — richer bot-match dropdown)

### Changes
- **Custom bot-match dropdown:** the "which bot does this belong to?" chooser in the import review step has been redesigned from a plain `<select>` to a custom component. Each bot option now shows a PFP thumbnail (24 px circle), the bot name, and a secondary info row with latest message count, snapshot count, up to 2 tags, and last-updated relative date (e.g. `3.1M messages · 2 snaps · HSR · updated 2d ago`).
- **Type-ahead filter:** a search field at the top of the open dropdown filters bot options by name or tag as you type. The two pinned options (skip / create new) remain visible at all times regardless of filter state.
- **Smart ranking:** bots are ordered by how closely their latest message count matches the incoming snapshot — the likeliest match appears first. The top result gets a "Closest match" badge. After the top 3 closest matches, the remaining bots sort alphabetically.
- **Current selection preview:** the closed dropdown button shows the selected bot's PFP thumbnail alongside the name so you can confirm the selection at a glance without reopening the panel.

---

## 2026-05-19 (Grid view — hero banner cards)

### Changes
- **Grid view card redesign:** the grid view now shows each bot as a wide card with a full-width hero image banner at the top (~120 px tall, center-cropped from the bot's PFP), rather than the previous compact avatar-circle layout. The card body shows the bot name, up to 2 tag chips with a `+N` overflow popover, and a three-column stats block (Messages / Threads / Favorites) with full labels and per-metric color coding matching the list view (green / purple / pink).
- **PFP edit affordance:** hovering over the hero banner reveals a camera icon in the bottom-right corner. Clicking it opens the bot's detail view where the PFP editor lives.
- **Bulk-select overlay:** the multi-select checkbox appears on top of the hero banner (top-left corner) when select mode is active.

---

## 2026-05-19 (Fix: consistent stat card appearance across browsers)

### Fixes
- **Stat card gradient variance:** the stat card gradient overlays (the subtle color tint at the top of each card) previously rendered noticeably different between browser versions. Modern browsers got a 35%-opacity tint; older browsers got a full-saturated color wash — a side effect of Tailwind's CSS compiler automatically generating a `@supports color-mix` split for the gradient definitions. Replaced the `color-mix()` expressions with equivalent `rgba()` values, which compile to a single consistent rule with no conditional split.
- **Removed redundant Quicksand font request:** Quicksand was being loaded from both the self-hosted `@fontsource` bundle and Google Fonts simultaneously. Removed it from the Google Fonts URL; the bundled version is used exclusively.
- **Removed unused Inter font bundle:** the `@fontsource/inter` imports in the JS entry point loaded ~150 kB of Inter font files that are not referenced by any CSS token. Removed. CSS bundle shrinks from 40.4 kB to 35.1 kB.

---

## 2026-05-19 (Userscript v1.14 — faster tab switch)

### Changes
- **Tab switch speed:** when the stats modal opens on a non-Total tab, the script now retries with keyboard activation after 50 ms (was 1 500 ms) if the initial pointer-click attempt doesn't land. The "click Total manually" fallback prompt also fires earlier (1.5 s, was 3 s). In the worst case this cuts the pre-capture wait from ~1.5 s down to ~50 ms.
- **Synthetic click fix:** the programmatic tab-click now includes `isPrimary` and `pointerId` fields that some Radix UI versions require to treat the event as a real pointer interaction rather than ignoring it.

---

## 2026-05-19 (Userscript v1.13 — faster auto-capture)

### Changes
- **Capture speed:** the "Captured [name]" toast now appears as quickly as the stat numbers finish rendering in the browser, rather than waiting a fixed 200 ms after the Total tab activates. In practice this means the capture registers near-instantly once the tab switches. The fix applies to both auto-capture (when the script clicks Total for you) and manual-capture mode (when you click the Capture button yourself). The fallback timeout is 2 seconds — if stats haven't appeared by then, the same "Could not read stats" error fires as before.

---

## 2026-05-19 (Userscript v1.12 — toast anchored to capture box)

### Changes
- **Toast position:** the "Captured [name]. Undo" toast (and all other userscript toasts) now appears inside the capture box itself, overlaying its bottom edge — instead of floating at the bottom-left of the viewport. The toast width adapts when you resize the box.
- **Multiple toasts:** up to 3 toasts stack vertically inside the box (newest at the bottom); adding a fourth quietly removes the oldest.
- **Auto-dismiss timing:** toasts now dismiss after 4 seconds (was 5).
- **Suppress when hidden:** if you've hidden the capture box with ×, new toasts are suppressed entirely. Toasts already showing dismiss immediately when you hide the box.
- **Suppress when collapsed:** toasts are also suppressed when the box is collapsed to its pill mode, and any showing toasts dismiss when you collapse.
- **Navigate away:** any in-flight toasts dismiss immediately when the profile gate hides the box (e.g., navigating to another creator's profile).

---

## 2026-05-19 (Userscript v1.11 — profile gate, resize, hide/restore)

### Additions
- **Profile gate:** the capture box (HUD) now only appears when you are viewing your own creator profile page. On any other page — another creator's profile, explore, settings, etc. — the box is hidden. It reappears automatically when you navigate back to your own profile. The gate checks for owner-only buttons in the creator banner (the "Announce" button is the primary signal).
- **Resizable box:** drag the bottom-right corner grip to resize the expanded panel to any size you prefer. Minimum size is 280 × 200 px; the box cannot be dragged beyond the viewport edge. Size is saved and restored on reload.
- **Hide / restore:** clicking the × in the panel header now hides the box entirely. A small 📊 icon appears in the bottom-right corner as a restore affordance. Click it to bring the box back. The hidden/visible state is persisted across page loads. The restore icon also respects the profile gate — it only shows on your own profile.
- **Position persistence (existing):** position was already saved from drag. The − button collapses the expanded panel back to the pill (as before); × hides it entirely.

---

## 2026-05-19 (Tag filter, manual PFP, bulk tags, pagination + grid view)

### Additions
- **Tag Totals → filter:** clicking a tag name or bar in the Tags chart navigates to the bot list and filters it to that tag. The active filter appears as a removable chip above the table; click the × to clear it.
- **Manual PFP override:** click the avatar in any bot's detail view to open a PFP editor. Paste an image URL or browse for a file. The new picture is saved as a manual override (indicated by a small pencil badge on the avatar) and will NOT be overwritten by future snapshot imports. Use "Allow future imports to update PFP" to clear the lock without removing the image.
- **Bulk tag editing:** a "Select" toggle in the table/grid header switches the bot list into multi-select mode. After selecting bots, a bottom action bar appears with "Add tags…" and "Remove tags…" pickers. Adding is additive (doesn't remove existing tags); removing only strips the chosen tags. "Select all visible" selects the current page. Selections persist as you navigate pages; "Done" or "Clear selection" exits the mode.
- **Pagination:** the bot list is now paginated. Default is 50 bots per page; choose 25, 50, or 100 from the page-size selector. Pagination controls appear below the list. Search, filter, and sort changes reset to page 1. Page size preference is saved in localStorage.
- **Grid view:** a List/Grid toggle in the table header switches to a card grid layout showing each bot's avatar, name, and key stats. Also paginated. Preference is saved in localStorage.

---

## 2026-05-19 (Bug fixes)

### Fixes
- Import: when a capture's name matches exactly one existing bot, the review screen now requires you to confirm or reassign instead of silently pre-selecting that bot. Prevents stats from accidentally landing on the wrong bot when only one exists in the library.
- Import: re-importing a snapshot for an existing bot now also updates that bot's profile picture to the one from the new capture. Previously the PFP was only written when a bot was first created.
- Charts: clicking on a chart element (bar, point, canvas) no longer leaves a visible white focus outline on the chart wrapper.
- Modals: click-outside-to-close no longer fires when you click inside the modal and drag the pointer outside before releasing. Both the press and the release must land outside the modal for it to close.
- Bot detail: growth chart no longer causes right-axis labels (messages scale) to visibly snap into place a beat after the modal opens.

---

## 2026-05-18 (Table tweaks)

### Adjustments
- Table stat numbers changed to amber-orange (`#e8a060`) — warmer and more distinctive than the previous warm off-white.
- Default table sort is now Messages descending instead of Threads/Chats.

---

## 2026-05-18 (Visual polish)

### Adjustments
- New typography and color system applied from sandbox: Manrope for stat numbers and table figures, Lora for the wordmark, Outfit for card labels, Poppins for body text. Accent palette shifted to cool slate-blue with per-metric tints (teal for bots, green for messages, purple for threads, pink for favorites). Avatar glow preserved.
- Stat card gradients are now visible — cards were using pre-tinted dark backgrounds that hid the overlay; switched to neutral surfaces so the top-to-bottom color fade shows properly.
- Each stat card now shows "+N this week" (green) or "−N this week" (red) below the main number, compared to 7 days ago.
- "Total Bots" card now has a bot icon and shows how many new bots were added this week, matching the metric card style.
- Abbreviated numbers (K / M / B) now always show one decimal place — e.g. 89.6M instead of 90M.
- Full unabbreviated number removed from below stat card values — cleaner layout with room for the weekly delta line.
- Table stat numbers changed to warm off-white — easier to read against all three column tint backgrounds than the previous metric accent colors.
- Table stat numbers are heavier (800 weight, 14 px) so they read as clearly distinct from the bot name text.
- Table column headers are now ALL CAPS.
- Row divider lines removed from the table — alternating row banding provides enough separation on its own.

### Fixes
- Table row hover now works correctly on both light and dark rows — previously banded rows showed no highlight on hover, and dark-row hover produced nearly the same shade as the banding.

### Removed
- `docs/reference-artifact.jsx` — original single-file prototype used as a behavioral reference during Phases 1–5; fully superseded by git history.
- Design sandbox (`public/dev/sandbox.html`) moved to a separate repo.

---

## 2026-05-17 (Dark theme)

### Changes
- Dashboard redesigned with a cool-slate dark base and sky accent (#0ea5e9). Warm stone and amber palette retired.
- Stat cards are now centered with metric-tinted backgrounds: dark green for Messages, dark indigo for Threads, dark pink for Favorites.
- Each bot gets a unique "aura" color (one of 5: sky, violet, pink, emerald, orange) determined by its ID. The aura appears as a soft glow ring on the bot's avatar in the table and detail view.
- Overlay chart lines use per-bot aura colors instead of the previous 20-color cycle.
- Table rows now alternate between two surface shades for easier scanning.
- Tag chips redesigned: sky-tinted background, border, and text.
- Buttons updated: Import is an outline button; Add Bot uses a sky gradient.
- (Internal) Color system refactored to CSS-variable semantic tokens via Tailwind v4 `@theme`. Architecture supports future theme variants via `[data-theme="..."]` selector — five additional themes planned.
- Typography: Quicksand replaces Geist for body and labels; Inter (tabular numerals) replaces JetBrains Mono.

---

## 2026-05-17 (Userscript v1.10 — Creator Analytics exclusion)

### Fixes
- Userscript: auto-capture no longer fires on the Creator Analytics modal. Previously, opening it hijacked navigation to the Total tab and queued a bogus capture because it shares structure with bot stats modals (Total tab, Copy stats button, same stat layout). Now excluded by modal title. Additional false-positive modals of this type can be added to `NON_BOT_STATS_MODAL_TITLES` in the script.

---

## 2026-05-17 (Userscript v1.9 — stats modal gate)

### Fixes
- Userscript: auto-capture no longer fires on unrelated modals (character cards, share dialogs, confirmation popups, etc.). Capture now only attempts when the dialog contains a "Copy stats" button — i.e., an actual bot stats modal. Note: the creator overall stats modal also has a "Copy stats" button and will still trigger capture; a dedicated fix for that case is tracked separately.

---

## 2026-05-17 (Polish — mobile layout)

### Fixes
- Table: "Updated" and "Tags" columns are now hidden on narrow screens; the bot name, stat columns, and action buttons remain. The table is usable on a 375px phone without horizontal scrolling.
- Charts (Ranking, Gains, History, Tags): Y-axis name labels reduced from 150 px to 100 px wide; right margin reduced to match. Bar charts no longer consume most of a phone screen's width on labels alone.
- Header: "CharSnap stats" title now scales down on small screens (`text-3xl` on mobile, `text-5xl` on desktop). Left/right page padding reduced from 24 px to 16 px on mobile.
- Modals (Add Bot, Add Snapshot, Edit Bot, Data & Backup): added `max-h-[90vh] overflow-y-auto` so tall forms stay within the viewport on short screens (e.g., landscape phones).

---

## 2026-05-17 (Userscript v1.8 — pill recovery)

### Fixes
- Userscript: added Ctrl+Shift+Alt+R (Cmd+Shift+Alt+R on Mac) keyboard shortcut to snap the pill back to its default bottom-right position — recovery path if the pill is ever hidden behind other floating elements on the page.
- Userscript: tightened on-load position clamp — the saved pill position is now restored only if the pill would be fully visible; otherwise it falls back to the default bottom-right.

---

## 2026-05-17 (Polish — metric ordering + bug fixes)

### Adjustments
- Metric order changed to Messages → Threads → Favorites everywhere in the app (stat columns, chart pickers, tooltips, dropdowns).

### Fixes
- Charts: removed a thin white rectangular border that appeared around chart components (Recharts default focus outline).
- Userscript (v1.7): pill position is now re-clamped when the page loads, so a position saved before a browser window resize can no longer put the pill fully off-screen.

---

## 2026-05-16 (Phase 7, v1.6)

### Changes
- Userscript: floating HUD pill is now draggable. Click-and-drag from any non-button area to reposition it anywhere on screen. Cursor shows grab/grabbing feedback. Position is saved via GM_setValue and restored on page reload. Dragging is threshold-based (4 px of movement) so a normal click never accidentally starts a drag. The widget is constrained to the viewport so it can't be lost off-screen. A "Reset position" button in the expanded panel snaps it back to the default bottom-right corner.

---

## 2026-05-16

### Fixes
- Import: avatar was not saved when creating a new bot from a userscript capture. The `avatarUrl` field was used for matching existing bots but was never passed into `createBot()`, leaving `bot.avatar` null after import. Fixed by threading `avatarUrl` through to the bot record.
- Userscript (v1.5.1): "Captured X. Undo" toasts moved to the bottom-left corner (pill stays bottom-right). Eliminates overlap when the pill expands upward and removes the z-index ordering dependency between the two injected elements.

---

## 2026-05-16 (Phase 7, v1.5)

### Fixes
- Userscript: HUD pill and toast container are now appended to `<html>` instead of `<body>`, making them siblings of CharSnap's React root rather than descendants of it — this escapes any stacking context the page body creates. Positioning styles are applied as inline `!important` declarations so framework CSS cannot override them. A MutationObserver re-injects the HUD if it is ever evicted from the DOM by a React re-render.

---

## 2026-05-16 (Phase 7, v1.4)

### Changes
- Userscript: floating HUD redesigned as a collapsible widget. Collapsed state is a small pill (📊 N captures queued) pinned to the bottom-right corner; clicking it opens an expanded panel. Panel shows the Auto ON/OFF toggle, an Export queue button (copies JSON to clipboard), and a Clear button. After Export, the panel prompts "Clear the queue now?" with Yes/Keep so you can clean up in one flow. When the queue is empty the pill shows "📊 0 captures" in a muted style so the widget stays discoverable without being intrusive.

---

## 2026-05-16 (Phase 7, v1.3)

### Fixes
- Userscript: auto-switch now tries two techniques before giving up. Primary: full PointerEvent chain (pointerdown → pointerup → click). Fallback at ~1.5 s: keyboard activation (focus + Enter keydown) — Radix tabs are keyboard-accessible by design, so this often succeeds when pointer dispatch is ignored. The "Click the Total tab" hint is now deferred to ~3 s (after both techniques have had time to run) rather than appearing immediately at 1.5 s.

---

## 2026-05-16 (Phase 7, v1.2)

### Fixes
- Userscript: programmatic tab switch now dispatches a full `pointerdown → pointerup → click` PointerEvent chain instead of a bare `.click()` — Radix UI tab components listen on `pointerdown` and were silently ignoring `.click()`.
- Userscript: capture no longer depends on the programmatic switch succeeding. A `MutationObserver` watches for the Total tab's `data-state` to become `"active"` (regardless of what caused it), so the capture fires even if the script's click was ignored and the user clicked manually instead. A hint toast appears after 1.5 s if the tab still hasn't switched, telling the user to click Total themselves.

---

## 2026-05-16 (Phase 7, v1.1)

### Fixes
- Userscript: Total-tab timeout increased from 2 s to 5 s; retries the tab click once at ~1.5 s before giving up; error message now includes which tab was actually active for easier debugging.

### Changes
- Userscript: replaced the manual Capture button with auto-capture on modal open — when a stats modal opens the script automatically switches to Total and queues the capture.
- Userscript: toast notification ("Captured [name]. Undo") replaces in-button feedback for auto mode; Undo removes that specific capture from the queue.
- Userscript: deduplication by normalized avatar URL — re-opening the same bot's modal in the same session is silently skipped with a "Already captured — skipped" toast.
- Userscript: "Auto: ON/OFF" toggle added to the floating HUD (default ON); when OFF, the original manual Capture button reappears in the modal header.

---

## 2026-05-16 (Phase 7)

### Additions
- Tampermonkey userscript (`userscript/charsnap-capture.user.js`) — injects a "Capture" button into CharSnap stats modals opened manually by the user. Automatically switches to the Total tab if needed, reads bot name, avatar, and the three stat values (plus optional solo/group message breakdown), and queues the capture locally. A floating HUD shows the queue count and lets you copy the full queue as JSON (ready to paste into the app's Import modal) or clear it with a two-step confirm.

---

## 2026-05-16 (Phase 6)

### Additions
- Enhanced empty state — richer first-time lander with feature-highlight cards and a two-step "how to start" guide; Import paste is now the primary CTA.
- Onboarding banner — dismissible tip bar that appears for users who already have bots, pointing to the Import button; stored in localStorage so it only shows once.
- Data & Backup modal (⚙ icon in header) — export full JSON backup, import from backup file (with replace-all confirmation), and reset all data (two-step confirm).
- What's New modal (newspaper icon in header) — renders this changelog in-app via Vite raw import; no external dependency.
- Tab bar now scrolls horizontally on narrow screens.
- README with project description, feature list, screenshot placeholders, and quick-start guide.

---

## 2026-05-16 (Phase 5c)

### Additions
- Tags tab — horizontal bar chart summing Threads, Messages, or Favorites across all bots sharing each tag; shows bot count per tag in the tooltip; inherits search and tag filter.

---

## 2026-05-16 (Phase 5b)

### Additions
- Gains tab — rolling-window gain ranking: pick 7d / 30d / 90d / All Time and a metric; shows bots sorted by how much they gained in that window; baseline is the snapshot just before the window opened (or oldest available); click a bar to open bot detail.
- History tab — day-picker snapshot gain ranking: pick any date; shows each bot's gain between their two most recent Total snapshots at or before that date; defaults to the date of the latest Total snapshot in the current filter; click a bar to open bot detail.

---

## 2026-05-16 (Phase 5a)

### Additions
- View switcher — three tabs (Table / Timeline / Ranking) above the filter bar; search and tag filter apply to all three views.
- Timeline view — overlay line chart with one line per bot; pick Threads, Messages, or Favorites; toggle between absolute totals and growth-from-first-snapshot (relative); 20-color bot palette; sparse series connected across gaps; clicking a bot name in the legend opens its detail view.
- Ranking view — horizontal bar chart showing top N bots by any metric; configurable N (10 / 15 / 25 / 50 / All); clicking a bar opens that bot's detail.

---

## 2026-05-16 (Phase 4)

### Additions
- Per-bot detail view — click any row to open; shows metric cards, growth chart, and full snapshot history.
- Growth chart — line chart of all three metrics over time using only Total-scope snapshots; dual Y-axis so messages (much larger scale) doesn't squash threads and favorites.
- Delta display — each metric card shows gain/loss since the previous snapshot, with the date it was captured.
- Snapshot management — add snapshots inline from the detail view; delete individual snapshots with a confirm step.
- Bot management from detail view — edit name/tags inline; delete bot (with confirm) without returning to the table.

---

## 2026-05-16

### Additions
- Phase 3: Paste-box import — paste CharSnap copy-button output to add a snapshot; JSON format (for future userscript) supports batch captures with auto-matching by avatar URL; disambiguation picker for ambiguous name matches; scope warning for non-Total captures.
- Phase 2: Full dashboard — bot list table with sort, search, and tag filter; stat cards for totals; Add Bot modal (with optional initial snapshot and shorthand number parsing); Add Snapshot modal per bot; Edit bot name/tags modal; inline delete confirm; empty state.
- Phase 1: Data layer — IndexedDB persistence, Zustand store, debounced autosave, use-bots hook, avatar URL normalization, bot/snapshot schemas.
- Phase 0: Initial Vite + React scaffolding, Tailwind CSS v4, Zustand, GitHub Pages deploy pipeline.
