// ==UserScript==
// @name         CharSnap Stats Capture
// @namespace    https://github.com/Shirohibiki-chan/character-stat-tracker
// @version      1.13
// @description  Personal use only — do not redistribute. Auto-captures stats when you open a CharSnap bot's stats modal; queues Total-scope snapshots for paste-import into CharSnap Stats Tracker.
// @author       Shirohibiki
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

function parseBreakdown(dialog) {
  const spans = dialog.querySelectorAll('span.text-xs.text-secondary, span.text-xs')
  for (const span of spans) {
    const m = span.textContent.match(/\(([0-9,]+)\s*\+\s*([0-9,]+)\)/)
    if (m) return { messagesSolo: parseNumber(m[1]), messagesGroup: parseNumber(m[2]) }
  }
  return null
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

// ── Persistent settings ───────────────────────────────────────────────────────

const AUTO_KEY       = 'charsnap_auto_capture'
const PILL_POS_KEY   = 'charsnap_pill_pos'
const HUD_HIDDEN_KEY = 'charsnap_hud_hidden'
const HUD_SIZE_KEY   = 'charsnap_hud_size'

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
  const opts = { bubbles: true, cancelable: true }
  el.dispatchEvent(new PointerEvent('pointerdown', opts))
  el.dispatchEvent(new PointerEvent('pointerup',   opts))
  el.dispatchEvent(new MouseEvent('click',         opts))
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

  const chats     = parseNumber(statEls[0].textContent)
  const messages  = parseNumber(statEls[1].textContent)
  const favorites = parseNumber(statEls[2].textContent)
  const breakdown = parseBreakdown(dialog)

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
// Resolves the moment readStats() returns a valid result — no fixed delay.
// Uses MutationObserver watching the dialog for any DOM or text change so the
// capture fires as soon as CharSnap finishes rendering the Total tab's numbers.
// Falls back to null after timeoutMs if stats never appear.

function waitForStats(dialog, timeoutMs = 2000) {
  return new Promise(resolve => {
    // Immediate check: stats already in DOM (e.g. Total was already active)
    const snap = readStats(dialog)
    if (snap && snap.name) { resolve(snap); return }

    let settled = false
    function finish(result) {
      if (settled) return
      settled = true
      mo.disconnect()
      resolve(result)
    }

    const mo = new MutationObserver(() => {
      const c = readStats(dialog)
      if (c && c.name) finish(c)
    })
    // Watch both childList (new elements) and characterData (text-node updates)
    // so we catch React rendering the numbers regardless of how it patches the DOM.
    mo.observe(dialog, { subtree: true, childList: true, characterData: true })

    setTimeout(() => finish(null), timeoutMs)
  })
}

// ── Toast notifications (anchored inside HUD box) ─────────────────────────────
//
// Toasts render inside the HUD box, overlaying its bottom edge. They are
// suppressed when the box is hidden (user clicked ×) or collapsed to pill,
// and dismissed immediately when the box hides or the profile gate closes it.

const TOAST_MAX         = 3
const TOAST_DURATION_MS = 4000
let toastAreaEl = null

function ensureToastArea() {
  if (!hudEl) return
  if (!toastAreaEl) {
    toastAreaEl = document.createElement('div')
    toastAreaEl.id = 'charsnap-toast-area'
    toastAreaEl.addEventListener('click', e => {
      const btn = e.target.closest('.cs-toast-undo')
      if (!btn) return
      removeFromQueue(btn.dataset.ts)
      btn.closest('.charsnap-toast')?.remove()
    })
  }
  if (!toastAreaEl.isConnected) hudEl.appendChild(toastAreaEl)
}

function dismissAllToasts() {
  if (!toastAreaEl) return
  while (toastAreaEl.firstChild) toastAreaEl.removeChild(toastAreaEl.firstChild)
}

function showToast(html, durationMs = TOAST_DURATION_MS) {
  if (getHudHidden() || !hudExpanded) return
  ensureToastArea()
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

  // Attempt 2: keyboard activation at ~1.5 s if pointer chain didn't land
  setTimeout(() => {
    if (fired || !document.body.contains(dialog) || !totalTab) return
    if (getActiveTabName(dialog) === 'Total') return
    dispatchKeyboardActivate(totalTab)
  }, 1500)

  // Prompt only after both techniques have had time to work (~3 s total)
  setTimeout(() => {
    if (!fired && document.body.contains(dialog) && getActiveTabName(dialog) !== 'Total') {
      showToast('Click the <b>Total</b> tab to capture.', 8000)
    }
  }, 3000)
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
      return
    }
  }
  hudEl.style.removeProperty('top')
  hudEl.style.removeProperty('left')
  hudEl.style.setProperty('bottom', '20px', 'important')
  hudEl.style.setProperty('right',  '20px', 'important')
}

// ── HUD size persistence ──────────────────────────────────────────────────────

const HUD_MIN_W = 280
const HUD_MIN_H = 200

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
    hudEl.style.removeProperty('width')
    hudEl.style.removeProperty('height')
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
  const allowed  = isOwnProfile()
  const hidden   = getHudHidden()
  const visible  = allowed && !hidden
  if (!visible) dismissAllToasts()
  hudEl.style.setProperty('display',     visible          ? 'block' : 'none', 'important')
  restoreEl.style.setProperty('display', (allowed && hidden) ? 'flex' : 'none', 'important')
  // Refresh HUD content when it becomes visible so queue count is current
  if (visible) updateHUD()
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

  // DOM mutation watcher — catches banner content loading async on same URL
  const mo = new MutationObserver(() => {
    clearTimeout(mutationTimer)
    mutationTimer = setTimeout(applyProfileGate, 300)
  })
  mo.observe(document.body, { childList: true, subtree: true })

  // Initial check after page has settled
  scheduleCheck(1200)
}

// ── Floating HUD ──────────────────────────────────────────────────────────────

let hudEl      = null
let restoreEl  = null
let hudExpanded = false

function hideHUD() {
  dismissAllToasts()
  GM_setValue(HUD_HIDDEN_KEY, '1')
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
  // Re-inject if evicted by a React re-render
  new MutationObserver(() => {
    if (!hudEl.isConnected) document.documentElement.appendChild(hudEl)
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
  if (count === 0) return '📊 0 captures'
  return `📊 ${count} capture${count !== 1 ? 's' : ''} queued`
}

function updateHUD() {
  if (!hudEl) return
  const count = getQueue().length
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

  hudEl.innerHTML = `
    <div class="cs-hud-panel">
      <div class="cs-hud-header">
        <span class="cs-hud-title">${hudLabel(count)}</span>
        <div class="cs-hud-header-btns">
          <button class="cs-hud-collapse" id="cs-hud-close" title="Collapse to pill">&#8722;</button>
          <button class="cs-hud-hide-btn" id="cs-hud-hide" title="Hide (restore pill appears in corner)">&times;</button>
        </div>
      </div>
      <div class="cs-hud-body" id="cs-hud-body">
        <button class="cs-hud-auto${auto ? ' cs-hud-auto--on' : ''}" id="cs-auto-btn">
          Auto: ${auto ? 'ON' : 'OFF'}
        </button>
        <div class="cs-hud-actions">
          <button class="cs-hud-action cs-hud-action--primary" id="cs-export-btn"${count === 0 ? ' disabled' : ''}>
            Export queue
          </button>
          <button class="cs-hud-action cs-hud-action--danger" id="cs-clear-btn"${count === 0 ? ' disabled' : ''}>
            Clear
          </button>
        </div>
        <button class="cs-hud-action cs-hud-action--muted" id="cs-reset-pos">Reset position</button>
      </div>
    </div>
  `

  hudEl.querySelector('#cs-hud-close').addEventListener('click', () => {
    dismissAllToasts()
    hudExpanded = false
    updateHUD()
  })

  hudEl.querySelector('#cs-hud-hide').addEventListener('click', hideHUD)

  hudEl.querySelector('#cs-auto-btn').addEventListener('click', () => setAutoCapture(!auto))

  hudEl.querySelector('#cs-export-btn')?.addEventListener('click', () => {
    const q = getQueue()
    if (!q.length) return
    GM_setClipboard(JSON.stringify({ captures: q }, null, 2), 'text')
    const body = hudEl.querySelector('#cs-hud-body')
    body.innerHTML = `
      <p class="cs-hud-msg">Queue copied to clipboard.</p>
      <p class="cs-hud-sub">Clear the queue now?</p>
      <div class="cs-hud-actions">
        <button class="cs-hud-action cs-hud-action--danger-confirm" id="cs-clear-yes">Yes, clear</button>
        <button class="cs-hud-action" id="cs-clear-no">Keep</button>
      </div>
    `
    body.querySelector('#cs-clear-yes').addEventListener('click', () => { clearQueue(); updateHUD() })
    body.querySelector('#cs-clear-no').addEventListener('click', updateHUD)
  })

  hudEl.querySelector('#cs-clear-btn')?.addEventListener('click', () => {
    const body = hudEl.querySelector('#cs-hud-body')
    body.innerHTML = `
      <p class="cs-hud-msg">Clear all ${count} capture${count !== 1 ? 's' : ''}?</p>
      <div class="cs-hud-actions">
        <button class="cs-hud-action cs-hud-action--danger-confirm" id="cs-clear-yes">Yes, clear</button>
        <button class="cs-hud-action" id="cs-clear-no">Cancel</button>
      </div>
    `
    body.querySelector('#cs-clear-yes').addEventListener('click', () => { clearQueue(); updateHUD() })
    body.querySelector('#cs-clear-no').addEventListener('click', updateHUD)
  })

  hudEl.querySelector('#cs-reset-pos')?.addEventListener('click', () => {
    GM_setValue(PILL_POS_KEY, null)
    applyPillPos()
  })

  // Apply persisted size and attach resize grip after panel DOM is ready
  applyHudSize()
  attachResize()
  // Re-attach toast area (panel innerHTML wipe detaches it on each updateHUD call)
  ensureToastArea()
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

    /* Expanded panel — flex column so body can scroll when HUD is resized short */
    .cs-hud-panel {
      background: #1c1917;
      border: 1px solid #44403c;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
      min-width: 210px;
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
    }
    .cs-hud-header-btns {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 8px;
    }
    /* Collapse (−) and Hide (×) buttons in header */
    .cs-hud-collapse,
    .cs-hud-hide-btn {
      color: #78716c;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0 4px;
      transition: color 0.15s;
    }
    .cs-hud-collapse:hover,
    .cs-hud-hide-btn:hover { color: #d6d3d1; }
    .cs-hud-body {
      padding: 10px 12px 20px; /* bottom padding leaves room for resize grip */
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      overflow-y: auto;
    }
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
    .cs-hud-actions { display: flex; gap: 6px; }
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
    .cs-hud-msg { color: #d6d3d1; font-size: 12px; margin: 0; }
    .cs-hud-sub { color: #a8a29e; font-size: 11px; margin: 0; }
    .cs-hud-action--muted {
      color: #57534e;
      font-size: 10px;
      border-color: transparent;
      background: transparent;
    }
    .cs-hud-action--muted:hover:not(:disabled) { background: #1f1d1c; color: #78716c; border-color: #292524; }

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

    /* ── Toasts (anchored inside HUD box) ── */
    #charsnap-toast-area {
      position: absolute;
      bottom: 8px;
      left: 8px;
      right: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      pointer-events: none; /* pass through to panel when no toast is showing */
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
    .cs-toast-undo {
      background: none;
      border: none;
      color: #fbbf24;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      padding: 0;
      margin-left: 6px;
    }
    .cs-toast-undo:hover { text-decoration: underline; }
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
}, true)
console.log('[CharSnap Capture] v1.13 | Ctrl+Shift+Alt+R (Cmd on Mac) → reset pill position')
