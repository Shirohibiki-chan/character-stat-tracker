// ==UserScript==
// @name         CharSnap Stats Capture
// @namespace    https://github.com/Shirohibiki-chan/character-stat-tracker
// @version      2.1.1
// @description  Personal use only — do not redistribute. Auto-captures stats when you open a CharSnap bot's stats modal; queues Total-scope snapshots for paste-import into CharSnap Stats Tracker.
// @author       Shirohibiki
// @updateURL    https://raw.githubusercontent.com/Shirohibiki-chan/character-stat-tracker/main/userscript/charsnap-capture.user.js
// @downloadURL  https://raw.githubusercontent.com/Shirohibiki-chan/character-stat-tracker/main/userscript/charsnap-capture.user.js
// @match        https://charsnap.ai/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @noframes
// @run-at       document-idle
// ==/UserScript==

// ⚠️  PERSONAL USE ONLY
// Reads only the rendered DOM of stats modals the user opens manually.
// Makes zero HTTP requests of its own. All network activity comes from
// CharSnap's own page code responding to normal user-initiated UI interactions.

'use strict'

// ── Avatar normalization ──────────────────────────────────────────────────────

function normalizeAvatar(url) {
  if (!url) return null
  const m = url.match(/\/([a-f0-9-]+-image\.[a-z]+)(\?|$)/i)
  return m ? m[1] : url
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNumber(text) {
  return parseInt((text || '').replace(/,/g, '').trim(), 10) || 0
}

function escHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtNum(n) {
  if (!n) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function timeAgo(isoStr) {
  const s = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (s < 60)    return s + 's ago'
  if (s < 3600)  return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

function parseBreakdown(dialog) {
  // [^0-9+(]* between the first number and "+" tolerates the ℹ️ icon (or any
  // non-digit, non-paren character) appearing in that gap.
  // Among all matches, take the one with the largest total to avoid false
  // positives from other elements that coincidentally match with a low group count.
  const spans = dialog.querySelectorAll('span.text-xs.text-secondary, span.text-xs')
  let best = null
  for (const span of spans) {
    const m = span.textContent.match(/\(([0-9,]+)[^0-9+(]*\+\s*([0-9,]+)/)
    if (m) {
      const entry = { messagesSolo: parseNumber(m[1]), messagesGroup: parseNumber(m[2]) }
      if (!best || entry.messagesSolo + entry.messagesGroup > best.messagesSolo + best.messagesGroup) {
        best = entry
      }
    }
  }
  return best
}

// ── Queue management ──────────────────────────────────────────────────────────

const QUEUE_KEY = 'charsnap_capture_queue'

function getQueue() {
  try { return JSON.parse(GM_getValue(QUEUE_KEY, '[]')) }
  catch { return [] }
}

function addToQueue(capture) {
  const q = getQueue()
  q.push(capture)
  GM_setValue(QUEUE_KEY, JSON.stringify(q))
}

function removeFromQueue(capturedAt) {
  const q = getQueue().filter(c => c.capturedAt !== capturedAt)
  GM_setValue(QUEUE_KEY, JSON.stringify(q))
  updateHUD()
}

function clearQueue() {
  GM_setValue(QUEUE_KEY, '[]')
}

function isDuplicateInQueue(avatarUrl) {
  const norm = normalizeAvatar(avatarUrl)
  if (!norm) return false
  return getQueue().some(c => normalizeAvatar(c.avatarUrl) === norm)
}

function computeDeltas(queue) {
  const prev = new Map()
  return queue.map(cap => {
    const key = normalizeAvatar(cap.avatarUrl) || cap.name
    const p = prev.get(key) || null
    prev.set(key, cap)
    if (!p) return null
    return { messages: cap.messages - p.messages, chats: cap.chats - p.chats, favorites: cap.favorites - p.favorites }
  })
}

function removeCapture(capture) {
  if (expandedCaptureId === capture.capturedAt) expandedCaptureId = null
  undoBuffer.set(capture.capturedAt, capture)
  setTimeout(() => undoBuffer.delete(capture.capturedAt), 8000)
  removeFromQueue(capture.capturedAt)
}

function removeCapturesBulk(captures) {
  const bulkKey = 'bulk_' + Date.now()
  undoBuffer.set(bulkKey, captures)
  setTimeout(() => undoBuffer.delete(bulkKey), 8000)
  const tsSet = new Set(captures.map(c => c.capturedAt))
  const q = getQueue().filter(c => !tsSet.has(c.capturedAt))
  GM_setValue(QUEUE_KEY, JSON.stringify(q))
  updateHUD()
  return bulkKey
}

// ── Persistent settings ───────────────────────────────────────────────────────

const AUTO_KEY        = 'charsnap_auto_capture'
const PILL_POS_KEY    = 'charsnap_pill_pos'
const HUD_HIDDEN_KEY  = 'charsnap_hud_hidden'
const HUD_SIZE_KEY    = 'charsnap_hud_size'
const FORCE_SHOW_KEY  = 'charsnap_force_show'

function getAutoCapture() {
  return GM_getValue(AUTO_KEY, '1') !== '0'
}

function setAutoCapture(on) {
  GM_setValue(AUTO_KEY, on ? '1' : '0')
  updateHUD()
  const dialog = document.querySelector('[role="dialog"][data-state="open"]')
  if (!dialog) return
  if (on) {
    dialog.querySelector('[data-charsnap-injected]')?.remove()
    performAutoCapture(dialog)
  } else {
    disconnectTabWatcher()
    injectCaptureButton(dialog)
  }
}

function getHudHidden() {
  return GM_getValue(HUD_HIDDEN_KEY, '0') === '1'
}

// ── Pointer-event dispatch ────────────────────────────────────────────────────
//
// Radix UI tab components respond to pointerdown, not click. A bare .click()
// call only fires the click event and is silently ignored by the framework.
// Dispatching the full pointer sequence triggers the same handler a real
// finger/mouse press would.

function dispatchPointerClick(el) {
  // isPrimary + pointerId are required by some Radix UI versions to treat the
  // event as a real pointer interaction rather than discarding it as untrusted.
  const opts = { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1 }
  el.dispatchEvent(new PointerEvent('pointerdown', opts))
  el.dispatchEvent(new PointerEvent('pointerup',   opts))
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

// Radix tabs are keyboard-accessible; focus + Enter triggers the tab handler
// even when PointerEvent dispatch is ignored.
function dispatchKeyboardActivate(el) {
  el.focus()
  const opts = { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }
  el.dispatchEvent(new KeyboardEvent('keydown', opts))
  el.dispatchEvent(new KeyboardEvent('keyup',   opts))
}

// ── Tab helpers ───────────────────────────────────────────────────────────────

function getActiveTabName(dialog) {
  return dialog.querySelector('button[role="tab"][data-state="active"]')?.textContent?.trim() ?? ''
}

// waitForTotalTab — used only by the manual Capture button (Auto OFF mode).
function waitForTotalTab(dialog) {
  return new Promise((resolve, reject) => {
    if (getActiveTabName(dialog) === 'Total') { resolve(); return }

    const tabs = Array.from(dialog.querySelectorAll('button[role="tab"]'))
    const totalTab = tabs.find(t => t.textContent.trim() === 'Total')
    if (!totalTab) {
      const found = tabs.map(t => `"${t.textContent.trim()}"`).join(', ')
      reject(new Error(`Could not find Total tab. Tabs visible: ${found || 'none'}`))
      return
    }

    dispatchPointerClick(totalTab)

    let ticks = 0, retried = false
    const timer = setInterval(() => {
      if (getActiveTabName(dialog) === 'Total') {
        clearInterval(timer)
        resolve()
        return
      }
      if (!retried && ticks === 15) { retried = true; dispatchPointerClick(totalTab) }
      if (++ticks > 50) {
        clearInterval(timer)
        const nowActive = getActiveTabName(dialog)
        reject(new Error(
          `Could not switch to Total tab (active: "${nowActive || 'unknown'}"). ` +
          'Click the Total tab manually first.'
        ))
      }
    }, 100)
  })
}

// ── Stats reader ──────────────────────────────────────────────────────────────

function readStats(dialog) {
  const name = dialog.querySelector('h2')?.textContent?.trim() ?? ''
  const avatarEl = dialog.querySelector('img[src*="cdn.charsnap"]') ?? dialog.querySelector('img')
  const avatarUrl = avatarEl?.src ?? null

  let statEls = Array.from(dialog.querySelectorAll('div.text-3xl.font-bold'))
  if (statEls.length < 3) statEls = Array.from(dialog.querySelectorAll('div.text-3xl'))
  if (statEls.length < 3) return null

  const chats       = parseNumber(statEls[0].textContent)
  const favorites   = parseNumber(statEls[2].textContent)
  const domMessages = parseNumber(statEls[1].textContent)
  const breakdown   = parseBreakdown(dialog)
  const breakdownSum = breakdown ? breakdown.messagesSolo + breakdown.messagesGroup : 0
  // Take whichever is larger: the DOM element value or the breakdown sum.
  // If CharSnap puts the solo count in the large element, the correct breakdown
  // sum (solo + group) will be larger and wins. If the DOM holds the real total
  // and the breakdown is absent or a false-positive with a lower sum, the DOM wins.
  const messages = Math.max(domMessages, breakdownSum)

  return {
    name,
    avatarUrl,
    chats,
    messages,
    favorites,
    ...(breakdown ? { messagesSolo: breakdown.messagesSolo, messagesGroup: breakdown.messagesGroup } : {}),
    scope: 'Total',
    capturedAt: new Date().toISOString(),
  }
}

// ── Stat readiness wait ───────────────────────────────────────────────────────
//
// Resolves as soon as readStats() returns a result with a name AND at least one
// non-zero stat — this skips the initial placeholder state CharSnap renders
// before the real values arrive. If stats remain all-zero after timeoutMs (a
// brand-new bot with no activity), resolves with the zero-value snapshot anyway
// so the capture isn't silently lost. Falls back to null only if readStats()
// never returns a valid result at all.

function waitForStats(dialog, timeoutMs = 2000) {
  function hasData(snap) {
    if (!snap || !snap.name) return false
    if (snap.messages === 0 && snap.chats === 0 && snap.favorites === 0) return false
    // If a breakdown was found but group is 0 and messages equals the solo count,
    // CharSnap is still showing placeholder values — the real total hasn't loaded yet.
    // Bots with genuinely zero group messages will fall through to the 2 s timeout.
    if ('messagesGroup' in snap && snap.messagesGroup === 0
        && snap.messagesSolo > 0 && snap.messages === snap.messagesSolo) return false
    return true
  }

  return new Promise(resolve => {
    // Immediate check: stats already populated (e.g. Total was already active)
    const snap = readStats(dialog)
    if (hasData(snap)) { resolve(snap); return }

    let settled = false
    function finish(result) {
      if (settled) return
      settled = true
      mo.disconnect()
      resolve(result)
    }

    const mo = new MutationObserver(() => {
      const c = readStats(dialog)
      if (hasData(c)) finish(c)
    })
    // Watch both childList (new elements) and characterData (text-node updates)
    // so we catch React rendering the numbers regardless of how it patches the DOM.
    mo.observe(dialog, { subtree: true, childList: true, characterData: true })

    // After timeout, resolve with whatever is in the DOM — this handles genuinely
    // zero-stat bots (brand-new, no activity) that will never trigger hasData().
    setTimeout(() => finish(readStats(dialog)), timeoutMs)
  })
}

// ── Toast notifications (floating above HUD box) ──────────────────────────────
//
// #charsnap-toast-area is a sibling of the HUD (both children of <html>), not a
// child of it. positionToastArea() anchors it just above the HUD top edge on
// every move/resize/state change. Being decoupled means HUD re-renders
// (innerHTML wipe in updateHUD) never touch the toast area — fixing the v1.12
// flash that came from repeated detach/re-attach on every HUD state change.
//
// Toasts are suppressed when the box is hidden or collapsed to pill, and
// dismissed immediately when the box hides or the profile gate closes it.

const TOAST_MAX         = 3
const TOAST_DURATION_MS = 4000
let toastAreaEl = null

function positionToastArea() {
  if (!hudEl || !toastAreaEl) return
  if (hudEl.style.display === 'none') {
    toastAreaEl.style.setProperty('display', 'none', 'important')
    return
  }
  toastAreaEl.style.removeProperty('display')
  const rect = hudEl.getBoundingClientRect()
  const GAP = 7
  toastAreaEl.style.setProperty('bottom', (window.innerHeight - rect.top + GAP) + 'px', 'important')
  toastAreaEl.style.setProperty('left',   rect.left  + 'px', 'important')
  toastAreaEl.style.setProperty('width',  rect.width + 'px', 'important')
}

function dismissAllToasts() {
  if (!toastAreaEl) return
  while (toastAreaEl.firstChild) toastAreaEl.removeChild(toastAreaEl.firstChild)
}

function showToast(html, durationMs = TOAST_DURATION_MS) {
  if (getHudHidden() || !hudExpanded) return
  if (!toastAreaEl) return
  while (toastAreaEl.children.length >= TOAST_MAX) toastAreaEl.firstChild?.remove()
  const toast = document.createElement('div')
  toast.className = 'charsnap-toast'
  toast.innerHTML = html
  toastAreaEl.appendChild(toast)
  setTimeout(() => toast.remove(), durationMs)
}

// ── Auto-capture ──────────────────────────────────────────────────────────────
//
// Design: rather than requiring the programmatic click to succeed, we watch
// for the Total tab's data-state to become "active" via MutationObserver.
// The PointerEvent click is attempted as a convenience (saves the user one
// manual click) but the capture fires regardless of who activated the tab.

let activeTabWatcher = null

function disconnectTabWatcher() {
  if (activeTabWatcher) { activeTabWatcher.disconnect(); activeTabWatcher = null }
}

function performAutoCapture(dialog) {
  disconnectTabWatcher()

  async function doCapture() {
    const capture = await waitForStats(dialog)
    if (!capture) { showToast('Could not read stats from modal.'); return }
    if (isDuplicateInQueue(capture.avatarUrl)) {
      showToast(`Already captured <b>${escHtml(capture.name)}</b> — skipped.`)
      return
    }
    addToQueue(capture)
    updateHUD()
    showToast(
      `Captured <b>${escHtml(capture.name)}</b>.` +
      ` <button class="cs-toast-undo" data-ts="${escHtml(capture.capturedAt)}">Undo</button>`
    )
  }

  // Already on Total — nothing to wait for
  if (getActiveTabName(dialog) === 'Total') { doCapture(); return }

  // Attempt programmatic switch (PointerEvent chain works with Radix UI)
  const tabs = Array.from(dialog.querySelectorAll('button[role="tab"]'))
  const totalTab = tabs.find(t => t.textContent.trim() === 'Total')
  if (totalTab) dispatchPointerClick(totalTab)

  // Watch for Total to become active — fires whether our click worked or the
  // user clicked manually. This is the reliable path.
  let fired = false
  const observer = new MutationObserver(() => {
    if (fired || getActiveTabName(dialog) !== 'Total') return
    fired = true
    disconnectTabWatcher()
    doCapture()
  })

  observer.observe(dialog, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state'],
  })
  activeTabWatcher = observer

  // Attempt 2: keyboard activation 50 ms after pointer attempt (was 1500 ms).
  // MutationObserver fires the instant the tab activates, so the retry can be
  // nearly immediate — no need to wait for a "grace period".
  setTimeout(() => {
    if (fired || !document.body.contains(dialog) || !totalTab) return
    if (getActiveTabName(dialog) === 'Total') return
    dispatchKeyboardActivate(totalTab)
  }, 50)

  // Prompt only if both programmatic techniques failed (~1.5 s total, was 3 s)
  setTimeout(() => {
    if (!fired && document.body.contains(dialog) && getActiveTabName(dialog) !== 'Total') {
      showToast('Click the <b>Total</b> tab to capture.', 8000)
    }
  }, 1500)
}

// ── Manual Capture button (Auto OFF mode) ─────────────────────────────────────

function injectCaptureButton(dialog) {
  if (dialog.querySelector('[data-charsnap-injected]')) return
  const copyBtn = dialog.querySelector('button[title="Copy stats"]')
  if (!copyBtn) return

  const btn = document.createElement('button')
  btn.setAttribute('data-charsnap-injected', '1')
  btn.className = 'charsnap-capture-btn'
  btn.textContent = 'Capture'
  copyBtn.parentElement.insertBefore(btn, copyBtn)

  btn.addEventListener('click', async e => {
    e.stopPropagation()
    btn.disabled = true
    btn.textContent = '…'
    try {
      await waitForTotalTab(dialog)
      const capture = await waitForStats(dialog)
      if (!capture) throw new Error('Could not read stats from modal.')
      if (isDuplicateInQueue(capture.avatarUrl)) {
        btn.textContent = 'Already captured'
        setTimeout(() => { btn.textContent = 'Capture'; btn.disabled = false }, 2000)
        return
      }
      addToQueue(capture)
      updateHUD()
      btn.textContent = '✓ Captured'
      btn.classList.add('charsnap-capture-btn--success')
      setTimeout(() => {
        btn.textContent = 'Capture'
        btn.disabled = false
        btn.classList.remove('charsnap-capture-btn--success')
      }, 2000)
    } catch (err) {
      btn.textContent = '✗ ' + err.message
      btn.classList.add('charsnap-capture-btn--error')
      setTimeout(() => {
        btn.textContent = 'Capture'
        btn.disabled = false
        btn.classList.remove('charsnap-capture-btn--error')
      }, 4000)
    }
  })
}

// ── Pill position persistence ─────────────────────────────────────────────────

function loadPillPos() {
  try { return JSON.parse(GM_getValue(PILL_POS_KEY, null)) } catch { return null }
}

function savePillPos(top, left) {
  GM_setValue(PILL_POS_KEY, JSON.stringify({ top, left }))
}

function applyPillPos() {
  const stored = loadPillPos()
  if (stored) {
    const W = window.innerWidth
    const H = window.innerHeight
    const rect = hudEl.getBoundingClientRect()
    const w = rect.width  || 220
    const h = rect.height || 40
    const { top, left } = stored
    if (top >= 0 && left >= 0 && top + h <= H && left + w <= W) {
      hudEl.style.removeProperty('bottom')
      hudEl.style.removeProperty('right')
      hudEl.style.setProperty('top',  top  + 'px', 'important')
      hudEl.style.setProperty('left', left + 'px', 'important')
      positionToastArea()
      return
    }
  }
  hudEl.style.removeProperty('top')
  hudEl.style.removeProperty('left')
  hudEl.style.setProperty('bottom', '20px', 'important')
  hudEl.style.setProperty('right',  '20px', 'important')
  positionToastArea()
}

// ── HUD size persistence ──────────────────────────────────────────────────────

const HUD_MIN_W = 280
const HUD_MIN_H = 360

function loadHudSize() {
  try { return JSON.parse(GM_getValue(HUD_SIZE_KEY, null)) } catch { return null }
}

function saveHudSize(w, h) {
  GM_setValue(HUD_SIZE_KEY, JSON.stringify({ w, h }))
}

function applyHudSize() {
  if (!hudEl || !hudExpanded) return
  const size = loadHudSize()
  if (size) {
    hudEl.style.setProperty('width',  size.w + 'px', 'important')
    hudEl.style.setProperty('height', size.h + 'px', 'important')
  } else {
    hudEl.style.setProperty('width',  '360px', 'important')
    hudEl.style.setProperty('height', '480px', 'important')
  }
}

// ── Drag ──────────────────────────────────────────────────────────────────────
//
// Threshold-based: pointer must move >4 px before drag starts, so a normal
// click never accidentally begins a drag. Buttons, anchors, and the resize
// grip are excluded from initiating a drag.

const DRAG_THRESHOLD_PX = 4

function clampPos(top, left) {
  const W = window.innerWidth
  const H = window.innerHeight
  const rect = hudEl.getBoundingClientRect()
  const w = rect.width  || 220
  const h = rect.height || 40
  const MIN = 10 // minimum px that must remain inside the viewport
  return {
    top:  Math.max(-(h - MIN), Math.min(H - MIN, top)),
    left: Math.max(-(w - MIN), Math.min(W - MIN, left)),
  }
}

function attachDrag() {
  hudEl.addEventListener('pointerdown', e => {
    if (e.button !== 0) return

    const pointerId   = e.pointerId
    const startPos    = { x: e.clientX, y: e.clientY }
    const startTarget = e.target
    let dragging   = false
    let dragOffset = { x: 0, y: 0 }

    function onMove(ev) {
      if (ev.pointerId !== pointerId) return
      const dx = ev.clientX - startPos.x
      const dy = ev.clientY - startPos.y

      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
        // Don't drag when clicking buttons, links, or the resize grip
        if (startTarget?.closest('button, a, .cs-resize-grip')) { cleanup(); return }
        // Enter drag mode — switch element to top/left coords
        dragging = true
        const rect = hudEl.getBoundingClientRect()
        hudEl.style.removeProperty('bottom')
        hudEl.style.removeProperty('right')
        hudEl.style.setProperty('top',  rect.top  + 'px', 'important')
        hudEl.style.setProperty('left', rect.left + 'px', 'important')
        // Offset is relative to original pointerdown so element doesn't jump
        dragOffset = { x: startPos.x - rect.left, y: startPos.y - rect.top }
        hudEl.setPointerCapture(pointerId)
        document.documentElement.style.setProperty('cursor',      'grabbing', 'important')
        document.documentElement.style.setProperty('user-select', 'none',     'important')
      }

      const { top, left } = clampPos(ev.clientY - dragOffset.y, ev.clientX - dragOffset.x)
      hudEl.style.setProperty('top',  top  + 'px', 'important')
      hudEl.style.setProperty('left', left + 'px', 'important')
      positionToastArea()
    }

    function onUp(ev) {
      if (ev.pointerId !== pointerId) return
      if (dragging) {
        const rect = hudEl.getBoundingClientRect()
        savePillPos(rect.top, rect.left)
        // Suppress the click that fires immediately after pointerup
        hudEl.addEventListener('click', ev => ev.stopPropagation(), { once: true, capture: true })
      }
      cleanup()
    }

    function cleanup() {
      dragging = false
      hudEl.removeEventListener('pointermove',   onMove)
      hudEl.removeEventListener('pointerup',     onUp)
      hudEl.removeEventListener('pointercancel', onUp)
      document.documentElement.style.removeProperty('cursor')
      document.documentElement.style.removeProperty('user-select')
    }

    hudEl.addEventListener('pointermove',   onMove)
    hudEl.addEventListener('pointerup',     onUp)
    hudEl.addEventListener('pointercancel', onUp)
  })
}

// ── Resize ────────────────────────────────────────────────────────────────────
//
// Attaches a bottom-right drag grip to the expanded panel. Called after every
// updateHUD() in expanded mode (innerHTML wipe recreates panel DOM).

function attachResize() {
  const panel = hudEl?.querySelector('.cs-hud-panel')
  if (!panel || panel.querySelector('.cs-resize-grip')) return

  const grip = document.createElement('div')
  grip.className = 'cs-resize-grip'
  grip.title = 'Resize'
  panel.appendChild(grip)

  grip.addEventListener('pointerdown', e => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const pointerId = e.pointerId
    const startX    = e.clientX
    const startY    = e.clientY
    const startRect = hudEl.getBoundingClientRect()
    const startW    = startRect.width
    const startH    = startRect.height

    grip.setPointerCapture(pointerId)
    document.documentElement.style.setProperty('cursor',      'se-resize', 'important')
    document.documentElement.style.setProperty('user-select', 'none',      'important')

    function onMove(ev) {
      if (ev.pointerId !== pointerId) return
      const maxW = window.innerWidth  - startRect.left - 10
      const maxH = window.innerHeight - startRect.top  - 10
      const newW = Math.max(HUD_MIN_W, Math.min(maxW, startW + ev.clientX - startX))
      const newH = Math.max(HUD_MIN_H, Math.min(maxH, startH + ev.clientY - startY))
      hudEl.style.setProperty('width',  newW + 'px', 'important')
      hudEl.style.setProperty('height', newH + 'px', 'important')
      positionToastArea()
    }

    function onUp(ev) {
      if (ev.pointerId !== pointerId) return
      const rect = hudEl.getBoundingClientRect()
      saveHudSize(rect.width, rect.height)
      document.documentElement.style.removeProperty('cursor')
      document.documentElement.style.removeProperty('user-select')
      grip.removeEventListener('pointermove',   onMove)
      grip.removeEventListener('pointerup',     onUp)
      grip.removeEventListener('pointercancel', onUp)
    }

    grip.addEventListener('pointermove',   onMove)
    grip.addEventListener('pointerup',     onUp)
    grip.addEventListener('pointercancel', onUp)
  })
}

// ── Profile gate ──────────────────────────────────────────────────────────────
//
// The HUD and restore pill are shown ONLY when viewing your own creator profile.
// Gate condition: presence of owner-only DOM elements that CharSnap renders
// exclusively on your own page — the "Announce" button (primary) and the
// analytics/stats icon button (fallback). If CharSnap renames these, update
// isOwnProfile() below.
//
// SPA navigation is detected via URL polling (popstate alone isn't reliable on
// all router implementations) plus a debounced MutationObserver for late-loading
// banner content on the same URL.

function isOwnProfile() {
  // Primary: "Announce" button — only visible on your own creator profile
  for (const btn of document.querySelectorAll('button')) {
    if (btn.textContent.trim() === 'Announce') return true
  }
  // Fallback: creator analytics/stats icon button in the banner
  // CharSnap may use aria-label or title — adjust if their markup changes
  if (document.querySelector(
    'button[aria-label*="nalytics" i], button[title*="nalytics" i], ' +
    'button[aria-label*="Creator stats" i], button[title*="Creator stats" i]'
  )) return true
  return false
}

function applyProfileGate() {
  if (!hudEl || !restoreEl) return
  const forced   = GM_getValue(FORCE_SHOW_KEY, '0') === '1'
  const allowed  = forced || isOwnProfile()
  const hidden   = getHudHidden()
  const visible  = allowed && !hidden
  if (!visible) { dismissAllToasts(); confirmingAction = false }
  hudEl.style.setProperty('display',     visible          ? 'block' : 'none', 'important')
  restoreEl.style.setProperty('display', (allowed && hidden) ? 'flex' : 'none', 'important')
  // Refresh HUD content when it becomes visible so queue count is current
  if (visible) updateHUD()
  else positionToastArea()
}

function startProfileWatcher() {
  let lastHref      = location.href
  let checkTimer    = null
  let mutationTimer = null

  function scheduleCheck(delay) {
    clearTimeout(checkTimer)
    checkTimer = setTimeout(applyProfileGate, delay)
  }

  // URL-change polling — SPA navigation doesn't fire load events reliably
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href
      scheduleCheck(800) // give the new page time to render
    }
  }, 400)

  // DOM mutation watcher — catches banner content loading async on same URL.
  // Ignore mutations that come from inside our own HUD elements so that
  // in-HUD DOM changes (e.g. the Export queue "Clear?" view) don't trigger
  // a profile-gate re-check that resets the HUD back to its default state.
  const mo = new MutationObserver((mutations) => {
    if (mutations.every(m => hudEl?.contains(m.target) || restoreEl?.contains(m.target))) return
    clearTimeout(mutationTimer)
    mutationTimer = setTimeout(applyProfileGate, 300)
  })
  mo.observe(document.body, { childList: true, subtree: true })

  // Initial check after page has settled
  scheduleCheck(1200)
}

// ── Floating HUD ──────────────────────────────────────────────────────────────

let hudEl            = null
let restoreEl        = null
let hudExpanded      = false
let confirmingAction = false  // true while export/clear confirmation is showing
let searchQuery      = ''
let selectMode       = false
let selectedIds      = new Set()
let expandedCaptureId = null
const undoBuffer     = new Map()

function hideHUD() {
  dismissAllToasts()
  confirmingAction = false
  selectMode = false
  selectedIds.clear()
  GM_setValue(HUD_HIDDEN_KEY, '1')
  GM_setValue(FORCE_SHOW_KEY, '0')
  applyProfileGate()
}

function showHUD() {
  GM_setValue(HUD_HIDDEN_KEY, '0')
  applyProfileGate()
}

function renderHUD() {
  if (hudEl) return
  hudEl = document.createElement('div')
  hudEl.id = 'charsnap-hud'
  // Start hidden — profile gate will reveal it on own-profile pages
  hudEl.style.cssText = [
    'position: fixed !important',
    'z-index: 2147483647 !important',
    'isolation: isolate !important',
    'pointer-events: auto !important',
    'display: none !important',
    'font-family: system-ui, sans-serif',
    'font-size: 12px',
  ].join(';')
  // Append to <html>, not <body>, to escape any stacking context CharSnap creates
  document.documentElement.appendChild(hudEl)
  // Toast area is a sibling of the HUD so updateHUD()'s innerHTML wipe never
  // touches it — the root cause of the v1.12 toast flashing.
  toastAreaEl = document.createElement('div')
  toastAreaEl.id = 'charsnap-toast-area'
  toastAreaEl.addEventListener('click', e => {
    const undoBtn = e.target.closest('.cs-toast-undo')
    if (undoBtn) {
      removeFromQueue(undoBtn.dataset.ts)
      undoBtn.closest('.charsnap-toast')?.remove()
      return
    }
    const actionBtn = e.target.closest('[data-toast-action]')
    if (!actionBtn) return
    const action = actionBtn.dataset.toastAction
    const key    = actionBtn.dataset.key
    if (action === 'readd') {
      const cap = undoBuffer.get(key)
      if (cap) { undoBuffer.delete(key); addToQueue(cap); updateHUD() }
    } else if (action === 'readd-bulk') {
      const caps = undoBuffer.get(key)
      if (caps) { undoBuffer.delete(key); caps.forEach(c => addToQueue(c)); updateHUD() }
    }
    actionBtn.closest('.charsnap-toast')?.remove()
  })
  document.documentElement.appendChild(toastAreaEl)
  // Re-inject either element if evicted by a React re-render
  new MutationObserver(() => {
    if (!hudEl.isConnected) document.documentElement.appendChild(hudEl)
    if (!toastAreaEl.isConnected) document.documentElement.appendChild(toastAreaEl)
  }).observe(document.documentElement, { childList: true })
  applyPillPos()
  attachDrag()
  updateHUD()
}

function renderRestorePill() {
  if (restoreEl) return
  restoreEl = document.createElement('button')
  restoreEl.id = 'charsnap-restore'
  restoreEl.title = 'Show CharSnap Capture'
  restoreEl.textContent = '📊'
  restoreEl.style.cssText = [
    'position: fixed !important',
    'bottom: 20px !important',
    'right: 20px !important',
    'z-index: 2147483647 !important',
    'display: none !important',
    'width: 32px !important',
    'height: 32px !important',
    'border-radius: 50% !important',
    'background: #1c1917 !important',
    'border: 1px solid #44403c !important',
    'color: #fbbf24 !important',
    'font-size: 14px !important',
    'cursor: pointer !important',
    'align-items: center !important',
    'justify-content: center !important',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important',
    'isolation: isolate !important',
    'pointer-events: auto !important',
  ].join(';')
  document.documentElement.appendChild(restoreEl)
  new MutationObserver(() => {
    if (!restoreEl.isConnected) document.documentElement.appendChild(restoreEl)
  }).observe(document.documentElement, { childList: true })
  // JS-based hover because inline !important beats CSS :hover
  restoreEl.addEventListener('mouseenter', () => {
    restoreEl.style.setProperty('background',    '#292524', 'important')
    restoreEl.style.setProperty('border-color',  '#57534e', 'important')
  })
  restoreEl.addEventListener('mouseleave', () => {
    restoreEl.style.setProperty('background',    '#1c1917', 'important')
    restoreEl.style.setProperty('border-color',  '#44403c', 'important')
  })
  restoreEl.addEventListener('click', showHUD)
}

function hudLabel(count) {
  if (count === 0) return '📊 No captures'
  return `📊 ${count} capture${count !== 1 ? 's' : ''} queued`
}

// SVG icon strings used in the expanded header
const SVG_DOTS     = '<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2.5" cy="2.5" r="1.2"/><circle cx="7.5" cy="2.5" r="1.2"/><circle cx="2.5" cy="7" r="1.2"/><circle cx="7.5" cy="7" r="1.2"/><circle cx="2.5" cy="11.5" r="1.2"/><circle cx="7.5" cy="11.5" r="1.2"/></svg>'
const SVG_COLLAPSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
const SVG_SETTINGS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
const SVG_CLOSE    = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'

function buildSelectFooter(totalCount, selCount) {
  const allSelected = totalCount > 0 && selCount === totalCount
  return `
    <div class="cs-hud-select-row">
      <span class="cs-hud-select-count">${selCount} selected</span>
      <button class="cs-hud-action cs-hud-action--sm" id="cs-select-all-btn">${allSelected ? 'None' : 'All'}</button>
      <button class="cs-hud-icon-btn" id="cs-select-cancel-btn" title="Exit select mode">${SVG_CLOSE}</button>
    </div>
    ${selCount > 0 ? `
      <div class="cs-hud-select-actions">
        <button class="cs-hud-action cs-hud-action--danger" id="cs-remove-selected-btn">Remove ${selCount}</button>
        <button class="cs-hud-action cs-hud-action--primary" id="cs-export-selected-btn">Export ${selCount}</button>
      </div>
    ` : ''}
  `
}

function updateHUD() {
  if (!hudEl) return
  if (confirmingAction) return
  const q     = getQueue()
  const count = q.length
  const auto  = getAutoCapture()

  if (!hudExpanded) {
    hudEl.innerHTML = `
      <button class="cs-hud-pill${count === 0 ? ' cs-hud-pill--empty' : ''}" id="cs-hud-open">
        ${hudLabel(count)}
      </button>
    `
    hudEl.querySelector('#cs-hud-open').addEventListener('click', () => {
      hudExpanded = true
      updateHUD()
    })
    // Clear explicit size when collapsed to pill (pill auto-sizes)
    hudEl.style.removeProperty('width')
    hudEl.style.removeProperty('height')
    return
  }

  const deltas   = computeDeltas(q)
  const selCount = selectedIds.size

  // Build captures list HTML
  let capturesHtml
  if (count === 0) {
    capturesHtml = `
      <div class="cs-captures-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span>No captures yet — open a bot's stats modal on CharSnap to capture it.</span>
      </div>
    `
  } else {
    capturesHtml = q.map((cap, i) => {
      const delta      = deltas[i]
      const isSelected = selectedIds.has(cap.capturedAt)
      const isExpanded = expandedCaptureId === cap.capturedAt
      const initials   = escHtml((cap.name || '?')[0].toUpperCase())
      const avatarHtml = cap.avatarUrl
        ? `<img class="cs-cap-avatar" src="${escHtml(cap.avatarUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.removeProperty('display')"><div class="cs-cap-avatar-fallback" style="display:none">${initials}</div>`
        : `<div class="cs-cap-avatar-fallback">${initials}</div>`
      const summary = `${fmtNum(cap.messages)} msgs · ${fmtNum(cap.chats)} threads · ${fmtNum(cap.favorites)} favs`
      let deltaHtml = ''
      if (delta) {
        const parts = []
        if (delta.messages  > 0) parts.push(`<span class="cs-cap-delta">+${fmtNum(delta.messages)} msgs</span>`)
        if (delta.chats     > 0) parts.push(`<span class="cs-cap-delta">+${fmtNum(delta.chats)} threads</span>`)
        if (delta.favorites > 0) parts.push(`<span class="cs-cap-delta">+${fmtNum(delta.favorites)} favs</span>`)
        if (parts.length) deltaHtml = `<div class="cs-cap-deltas">${parts.join('')}</div>`
      }
      const checkHtml   = selectMode
        ? `<input type="checkbox" class="cs-cap-checkbox"${isSelected ? ' checked' : ''} data-ts="${escHtml(cap.capturedAt)}">`
        : ''
      const previewHtml = isExpanded
        ? `<div class="cs-cap-preview"><pre>${escHtml(JSON.stringify(cap, null, 2))}</pre></div>`
        : ''
      return `
        <div class="cs-capture-row${isSelected ? ' cs-capture-row--selected' : ''}" data-bot-name="${escHtml((cap.name || '').toLowerCase())}" data-cs-ts="${escHtml(cap.capturedAt)}">
          <div class="cs-cap-row-main">
            ${checkHtml}
            <div class="cs-cap-avatar-wrap">${avatarHtml}</div>
            <div class="cs-cap-info">
              <div class="cs-cap-name">${escHtml(cap.name || 'Unknown')}</div>
              <div class="cs-cap-meta">${escHtml(timeAgo(cap.capturedAt))} · ${escHtml(cap.scope || 'Total')} · ${escHtml(summary)}</div>
              ${deltaHtml}
            </div>
            <button class="cs-cap-remove" title="Remove capture" data-ts="${escHtml(cap.capturedAt)}">×</button>
          </div>
          ${previewHtml}
        </div>
      `
    }).join('')
  }

  const footerInner = selectMode
    ? buildSelectFooter(count, selCount)
    : `
        <button class="cs-hud-action cs-hud-action--primary" id="cs-export-btn"${count === 0 ? ' disabled' : ''}>Export queue</button>
        <button class="cs-hud-action cs-hud-action--danger" id="cs-clear-btn"${count === 0 ? ' disabled' : ''}>Clear</button>
        ${count > 0 ? '<button class="cs-hud-action" id="cs-select-btn">Select</button>' : ''}
      `

  hudEl.innerHTML = `
    <div class="cs-hud-panel">
      <div class="cs-hud-header">
        <span class="cs-hud-title">${hudLabel(count)}</span>
        <div class="cs-hud-header-right">
          <span class="cs-hud-drag-dots" aria-hidden="true">${SVG_DOTS}</span>
          <button class="cs-hud-icon-btn" id="cs-hud-collapse" title="Collapse to pill">${SVG_COLLAPSE}</button>
          <button class="cs-hud-icon-btn" id="cs-hud-settings" title="Settings (coming soon)" disabled>${SVG_SETTINGS}</button>
          <button class="cs-hud-icon-btn" id="cs-hud-hide" title="Hide">${SVG_CLOSE}</button>
        </div>
      </div>
      <div class="cs-hud-body" id="cs-hud-body">
        <div class="cs-hud-toolbar">
          <button class="cs-hud-auto${auto ? ' cs-hud-auto--on' : ''}" id="cs-auto-btn">AUTO: ${auto ? 'ON' : 'OFF'}</button>
          <input class="cs-hud-search" id="cs-search" type="text" placeholder="Filter bots…" value="${escHtml(searchQuery)}">
        </div>
        <div class="cs-captures-list" id="cs-captures-list">${capturesHtml}</div>
      </div>
      <div class="cs-hud-footer${selectMode ? ' cs-hud-footer--select' : ''}" id="cs-hud-footer">
        ${footerInner}
      </div>
    </div>
  `

  // Header buttons
  hudEl.querySelector('#cs-hud-collapse').addEventListener('click', () => {
    dismissAllToasts()
    hudExpanded = false
    confirmingAction = false
    selectMode = false
    selectedIds.clear()
    expandedCaptureId = null
    searchQuery = ''
    updateHUD()
  })
  hudEl.querySelector('#cs-hud-hide').addEventListener('click', hideHUD)
  hudEl.querySelector('#cs-auto-btn').addEventListener('click', () => setAutoCapture(!auto))

  // Search — live filter, no re-render (preserves input focus while typing)
  const searchInput = hudEl.querySelector('#cs-search')
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value
    const term = searchQuery.toLowerCase()
    hudEl.querySelectorAll('.cs-capture-row').forEach(row => {
      row.style.display = (row.dataset.botName || '').includes(term) ? '' : 'none'
    })
  })

  // Apply filter on re-renders triggered by other events (new capture, remove, etc.)
  if (searchQuery) {
    const term = searchQuery.toLowerCase()
    hudEl.querySelectorAll('.cs-capture-row').forEach(row => {
      row.style.display = (row.dataset.botName || '').includes(term) ? '' : 'none'
    })
  }

  // Capture rows — click to expand preview, × to remove, checkbox for select mode
  hudEl.querySelectorAll('.cs-capture-row').forEach(row => {
    const ts  = row.dataset.csTs
    const cap = q.find(c => c.capturedAt === ts)

    row.querySelector('.cs-cap-row-main')?.addEventListener('click', e => {
      if (e.target.closest('.cs-cap-remove, .cs-cap-checkbox')) return
      if (selectMode) {
        if (selectedIds.has(ts)) selectedIds.delete(ts)
        else selectedIds.add(ts)
        updateHUD()
        return
      }
      expandedCaptureId = expandedCaptureId === ts ? null : ts
      updateHUD()
    })

    row.querySelector('.cs-cap-remove')?.addEventListener('click', e => {
      e.stopPropagation()
      if (!cap) return
      removeCapture(cap)
      showToast(`Removed <b>${escHtml(cap.name)}</b>. <button class="cs-toast-undo-readd" data-toast-action="readd" data-key="${escHtml(ts)}">Undo</button>`)
    })

    row.querySelector('.cs-cap-checkbox')?.addEventListener('change', e => {
      if (e.target.checked) selectedIds.add(ts)
      else selectedIds.delete(ts)
      updateHUD()
    })
  })

  // Footer — normal mode
  hudEl.querySelector('#cs-export-btn')?.addEventListener('click', () => {
    if (!count) return
    GM_setClipboard(JSON.stringify({ captures: q }, null, 2), 'text')
    confirmingAction = true
    const footer = hudEl.querySelector('#cs-hud-footer')
    footer.innerHTML = `
      <span class="cs-hud-confirm-msg">Copied! Clear queue?</span>
      <button class="cs-hud-action cs-hud-action--danger-confirm cs-hud-action--sm" id="cs-clear-yes">Yes</button>
      <button class="cs-hud-action cs-hud-action--sm" id="cs-clear-no">Keep</button>
    `
    footer.querySelector('#cs-clear-yes').addEventListener('click', () => { confirmingAction = false; clearQueue(); updateHUD() })
    footer.querySelector('#cs-clear-no').addEventListener('click', () => { confirmingAction = false; updateHUD() })
  })

  hudEl.querySelector('#cs-clear-btn')?.addEventListener('click', () => {
    confirmingAction = true
    const footer = hudEl.querySelector('#cs-hud-footer')
    footer.innerHTML = `
      <span class="cs-hud-confirm-msg">Clear ${count} capture${count !== 1 ? 's' : ''}?</span>
      <button class="cs-hud-action cs-hud-action--danger-confirm cs-hud-action--sm" id="cs-clear-yes">Yes</button>
      <button class="cs-hud-action cs-hud-action--sm" id="cs-clear-no">Cancel</button>
    `
    footer.querySelector('#cs-clear-yes').addEventListener('click', () => { confirmingAction = false; clearQueue(); updateHUD() })
    footer.querySelector('#cs-clear-no').addEventListener('click', () => { confirmingAction = false; updateHUD() })
  })

  hudEl.querySelector('#cs-select-btn')?.addEventListener('click', () => {
    selectMode = true
    selectedIds.clear()
    updateHUD()
  })

  // Footer — select mode
  hudEl.querySelector('#cs-select-all-btn')?.addEventListener('click', () => {
    if (selectedIds.size === count) selectedIds.clear()
    else q.forEach(c => selectedIds.add(c.capturedAt))
    updateHUD()
  })

  hudEl.querySelector('#cs-select-cancel-btn')?.addEventListener('click', () => {
    selectMode = false
    selectedIds.clear()
    updateHUD()
  })

  hudEl.querySelector('#cs-remove-selected-btn')?.addEventListener('click', () => {
    const toRemove = q.filter(c => selectedIds.has(c.capturedAt))
    if (!toRemove.length) return
    const n = toRemove.length
    selectMode = false
    selectedIds.clear()
    const bulkKey = removeCapturesBulk(toRemove)
    showToast(`Removed ${n} capture${n !== 1 ? 's' : ''}. <button class="cs-toast-undo-readd" data-toast-action="readd-bulk" data-key="${escHtml(bulkKey)}">Undo</button>`)
  })

  hudEl.querySelector('#cs-export-selected-btn')?.addEventListener('click', () => {
    const toExport = q.filter(c => selectedIds.has(c.capturedAt))
    if (!toExport.length) return
    GM_setClipboard(JSON.stringify({ captures: toExport }, null, 2), 'text')
    const n = toExport.length
    selectMode = false
    selectedIds.clear()
    updateHUD()
    showToast(`Copied ${n} capture${n !== 1 ? 's' : ''} to clipboard.`)
  })

  // Apply persisted size and attach resize grip after panel DOM is ready
  applyHudSize()
  attachResize()
  positionToastArea()
}

// ── Modal observer ────────────────────────────────────────────────────────────

const NON_BOT_STATS_MODAL_TITLES = ['Creator Analytics']

function isStatsModal(dialog) {
  if (!dialog.querySelector('button[title="Copy stats"]')) return false
  const h2Text = dialog.querySelector('h2')?.textContent?.trim() ?? ''
  if (NON_BOT_STATS_MODAL_TITLES.includes(h2Text)) return false
  return true
}

function onDialogOpen(dialog) {
  if (!isStatsModal(dialog)) return
  if (getAutoCapture()) {
    performAutoCapture(dialog)
  } else {
    injectCaptureButton(dialog)
  }
}

function observeModals() {
  let currentDialog = null

  function handlePotentialOpen(dialog) {
    if (!dialog || dialog === currentDialog) return
    currentDialog = dialog
    onDialogOpen(dialog)
  }

  const existing = document.querySelector('[role="dialog"][data-state="open"]')
  if (existing) handlePotentialOpen(existing)

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const el = mutation.target
        if (el.getAttribute('role') !== 'dialog') continue
        const newState = el.getAttribute('data-state')
        if (newState === 'open' && mutation.oldValue !== 'open') {
          handlePotentialOpen(el)
        } else if (newState !== 'open' && el === currentDialog) {
          currentDialog = null
          disconnectTabWatcher()
        }
      }
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue
          const dialog = node.matches?.('[role="dialog"][data-state="open"]')
            ? node
            : node.querySelector?.('[role="dialog"][data-state="open"]')
          if (dialog) handlePotentialOpen(dialog)
        }
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state'],
    attributeOldValue: true,
  })
}

// ── Styles ────────────────────────────────────────────────────────────────────

function injectStyles() {
  GM_addStyle(`
    /* ── Capture button (manual mode) ── */
    .charsnap-capture-btn {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      background: rgba(251, 191, 36, 0.12);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      line-height: 1;
    }
    .charsnap-capture-btn:hover:not(:disabled) { background: rgba(251, 191, 36, 0.22); }
    .charsnap-capture-btn:disabled { opacity: 0.6; cursor: default; }
    .charsnap-capture-btn--success {
      background: rgba(52, 211, 153, 0.15) !important;
      color: #34d399 !important;
      border-color: rgba(52, 211, 153, 0.3) !important;
    }
    .charsnap-capture-btn--error {
      background: rgba(251, 113, 133, 0.15) !important;
      color: #fb7185 !important;
      border-color: rgba(251, 113, 133, 0.3) !important;
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── HUD ── */

    /* Drag cursor — buttons and grip override with their own cursors */
    #charsnap-hud { cursor: grab; }
    #charsnap-hud button,
    #charsnap-hud a { cursor: pointer; }

    /* Collapsed pill */
    .cs-hud-pill {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      background: #1c1917;
      border: 1px solid #44403c;
      border-radius: 999px;
      color: #fbbf24;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .cs-hud-pill:hover { background: #292524; border-color: #57534e; }
    .cs-hud-pill--empty { color: #57534e; border-color: #292524; }
    .cs-hud-pill--empty:hover { background: #1f1d1c; border-color: #3c3837; color: #78716c; }

    /* Expanded panel — flex column so body scrolls when HUD is resized short */
    .cs-hud-panel {
      background: #1c1917;
      border: 1px solid #44403c;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
      min-width: 280px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
    }
    .cs-hud-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px 8px;
      border-bottom: 1px solid #292524;
      flex-shrink: 0;
    }
    .cs-hud-title {
      color: #fbbf24;
      font-weight: 500;
      font-size: 12px;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cs-hud-header-right {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 8px;
      flex-shrink: 0;
    }
    /* Decorative drag handle in header — pointer-events none so it doesn't eat clicks */
    .cs-hud-drag-dots {
      color: #3c3837;
      display: flex;
      align-items: center;
      margin-right: 4px;
      pointer-events: none;
      line-height: 0;
    }
    /* Icon buttons in header (collapse, settings, hide) */
    .cs-hud-icon-btn {
      color: #78716c;
      background: none;
      border: none;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      padding: 0;
      line-height: 0;
      transition: color 0.15s, background 0.15s;
      flex-shrink: 0;
    }
    .cs-hud-icon-btn:hover { color: #d6d3d1; background: rgba(255,255,255,0.06); }
    .cs-hud-icon-btn:disabled { opacity: 0.3; cursor: default; }
    .cs-hud-icon-btn:disabled:hover { color: #78716c; background: none; }
    .cs-hud-body {
      padding: 8px 12px 6px;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .cs-hud-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      flex-shrink: 0;
    }
    .cs-hud-search {
      flex: 1;
      min-width: 0;
      background: #111;
      border: 1px solid #44403c;
      border-radius: 6px;
      color: #d6d3d1;
      font-size: 11px;
      padding: 4px 8px;
      outline: none;
      font-family: system-ui, sans-serif;
    }
    .cs-hud-search::placeholder { color: #57534e; }
    .cs-hud-search:focus { border-color: #78716c; }
    .cs-captures-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    .cs-captures-list::-webkit-scrollbar { width: 4px; }
    .cs-captures-list::-webkit-scrollbar-track { background: transparent; }
    .cs-captures-list::-webkit-scrollbar-thumb { background: #44403c; border-radius: 2px; }
    .cs-captures-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px 16px;
      color: #57534e;
      text-align: center;
      font-size: 11px;
      line-height: 1.4;
    }
    .cs-capture-row { border-radius: 6px; }
    .cs-capture-row--selected { background: rgba(251,191,36,0.07); }
    .cs-cap-row-main {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 4px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .cs-cap-row-main:hover { background: rgba(255,255,255,0.04); }
    .cs-cap-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      flex-shrink: 0;
    }
    .cs-cap-avatar-fallback {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #292524;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: #78716c;
      flex-shrink: 0;
    }
    .cs-cap-info { flex: 1; min-width: 0; }
    .cs-cap-name {
      font-size: 12px;
      font-weight: 500;
      color: #e7e5e4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cs-cap-meta {
      font-size: 10px;
      color: #78716c;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cs-cap-deltas { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
    .cs-cap-delta { font-size: 10px; color: #34d399; font-weight: 500; }
    .cs-cap-remove {
      background: none;
      border: none;
      color: #57534e;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      flex-shrink: 0;
      transition: color 0.12s, background 0.12s;
    }
    .cs-cap-remove:hover { color: #fb7185; background: rgba(251,113,133,0.12); }
    .cs-cap-checkbox {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: #fbbf24;
    }
    .cs-cap-preview {
      background: #111;
      border-top: 1px solid #292524;
      padding: 8px 10px;
      overflow-x: auto;
      border-radius: 0 0 6px 6px;
    }
    .cs-cap-preview pre {
      margin: 0;
      font-size: 10px;
      color: #78716c;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: monospace;
      line-height: 1.4;
    }
    .cs-hud-footer--select { flex-direction: column; gap: 4px; align-items: stretch; }
    .cs-hud-select-row { display: flex; align-items: center; gap: 6px; }
    .cs-hud-select-count { flex: 1; font-size: 11px; color: #a8a29e; }
    .cs-hud-select-actions { display: flex; gap: 6px; }
    .cs-hud-select-actions .cs-hud-action { flex: 1; }
    .cs-hud-auto {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      background: #292524;
      border: 1px solid #44403c;
      color: #a8a29e;
      transition: background 0.15s;
      width: fit-content;
    }
    .cs-hud-auto:hover { background: #3c3837; }
    .cs-hud-auto--on {
      background: rgba(52, 211, 153, 0.1);
      color: #34d399;
      border-color: rgba(52, 211, 153, 0.3);
    }
    .cs-hud-auto--on:hover { background: rgba(52, 211, 153, 0.18) !important; }
    /* Sticky footer — Export and Clear live here; also hosts confirm state */
    .cs-hud-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid #292524;
      flex-shrink: 0;
    }
    .cs-hud-footer .cs-hud-action { flex: 1; }
    .cs-hud-confirm-msg {
      font-size: 11px;
      color: #a8a29e;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cs-hud-action--sm { flex: none !important; padding: 4px 10px; }
    .cs-hud-action {
      flex: 1;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid #44403c;
      background: #292524;
      color: #d6d3d1;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .cs-hud-action:hover:not(:disabled) { background: #3c3837; }
    .cs-hud-action:disabled { opacity: 0.35; cursor: default; }
    .cs-hud-action--primary {
      background: rgba(251, 191, 36, 0.12);
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.3);
    }
    .cs-hud-action--primary:hover:not(:disabled) { background: rgba(251, 191, 36, 0.22); }
    .cs-hud-action--danger { color: #fb7185; border-color: rgba(251, 113, 133, 0.3); }
    .cs-hud-action--danger:hover:not(:disabled) { background: rgba(251, 113, 133, 0.12); }
    .cs-hud-action--danger-confirm {
      background: rgba(251, 113, 133, 0.15);
      color: #fb7185;
      border-color: rgba(251, 113, 133, 0.3);
    }
    .cs-hud-action--danger-confirm:hover { background: rgba(251, 113, 133, 0.25); }

    /* ── Resize grip (bottom-right corner of expanded panel) ── */
    .cs-resize-grip {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 18px;
      height: 18px;
      cursor: se-resize;
      /* Diagonal dotted grip lines */
      background-image:
        radial-gradient(circle, rgba(120,113,108,0.55) 1px, transparent 1px);
      background-size: 4px 4px;
      background-position: 2px 2px;
      background-repeat: repeat;
      clip-path: polygon(100% 0, 100% 100%, 0 100%);
    }

    /* ── Toasts (floating above HUD box — positioned by positionToastArea()) ── */
    #charsnap-toast-area {
      position: fixed !important;
      z-index: 2147483647 !important;
      display: flex;
      flex-direction: column;
      gap: 4px;
      pointer-events: none;
    }
    .charsnap-toast {
      background: #1c1917;
      border: 1px solid #44403c;
      border-radius: 8px;
      padding: 8px 12px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      color: #d6d3d1;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      animation: cs-toast-in 0.15s ease;
      box-sizing: border-box;
      width: 100%;
      line-height: 1.4;
      pointer-events: auto;
    }
    @keyframes cs-toast-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: none; }
    }
    .charsnap-toast b { color: #e7e5e4; font-weight: 600; }
    .cs-toast-undo, .cs-toast-undo-readd {
      background: none;
      border: none;
      color: #fbbf24;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      padding: 0;
      margin-left: 6px;
    }
    .cs-toast-undo:hover, .cs-toast-undo-readd:hover { text-decoration: underline; }
  `)
}

// ── Init ──────────────────────────────────────────────────────────────────────

injectStyles()
renderHUD()
renderRestorePill()
observeModals()
startProfileWatcher()

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault()
    e.stopPropagation()
    GM_setValue(PILL_POS_KEY, null)
    applyPillPos()
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'h') {
    e.preventDefault()
    e.stopPropagation()
    // Diagnostic log — helps identify why the profile gate might be failing
    const btns = Array.from(document.querySelectorAll('button'))
      .map(b => b.textContent.trim()).filter(t => t).slice(0, 20)
    console.log('[CharSnap Capture] force-show triggered')
    console.log('[CharSnap Capture] isOwnProfile:', isOwnProfile(), '| url:', location.href)
    console.log('[CharSnap Capture] buttons on page:', btns.join(' | ') || 'none')
    GM_setValue(FORCE_SHOW_KEY, '1')
    GM_setValue(HUD_HIDDEN_KEY, '0')
    applyProfileGate()
  }
}, true)
console.log('[CharSnap Capture] v2.1.1 | Ctrl+Shift+Alt+R → reset pill position | Ctrl+Shift+Alt+H → force-show HUD')
