// ==UserScript==
// @name         CharSnap Stats Capture
// @namespace    https://github.com/Shirohibiki-chan/character-stat-tracker
// @version      1.1.0
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

// ── Auto-capture setting ──────────────────────────────────────────────────────

const AUTO_KEY = 'charsnap_auto_capture'

function getAutoCapture() {
  return GM_getValue(AUTO_KEY, '1') !== '0'
}

function setAutoCapture(on) {
  GM_setValue(AUTO_KEY, on ? '1' : '0')
  updateHUD()
  // Apply immediately to any currently-open dialog
  const dialog = document.querySelector('[role="dialog"][data-state="open"]')
  if (!dialog) return
  if (on) {
    dialog.querySelector('[data-charsnap-injected]')?.remove()
    performAutoCapture(dialog)
  } else {
    injectCaptureButton(dialog)
  }
}

// ── Tab gating ────────────────────────────────────────────────────────────────

function getActiveTabName(dialog) {
  return dialog.querySelector('button[role="tab"][data-state="active"]')?.textContent?.trim() ?? ''
}

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

    totalTab.click()

    // Poll until Radix marks Total as active (5 s / 50 ticks at 100 ms each).
    // Retry the click once at ~1.5 s in case the first click was swallowed
    // before the tab list was fully interactive.
    let ticks = 0
    let retried = false
    const timer = setInterval(() => {
      if (getActiveTabName(dialog) === 'Total') {
        clearInterval(timer)
        setTimeout(resolve, 200) // brief pause for stat values to render
        return
      }
      if (!retried && ticks === 15) {
        retried = true
        totalTab.click()
      }
      if (++ticks > 50) {
        clearInterval(timer)
        const nowActive = getActiveTabName(dialog)
        reject(new Error(
          `Timed out switching to Total tab (active: "${nowActive || 'unknown'}"). Try again.`
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

  // Three stat value divs in DOM order: chats, messages, favorites.
  // Fall back to the broader div.text-3xl if CharSnap changes class names.
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

// ── Toast notifications ───────────────────────────────────────────────────────

let toastContainerEl = null

function ensureToastContainer() {
  if (toastContainerEl) return
  toastContainerEl = document.createElement('div')
  toastContainerEl.id = 'charsnap-toasts'
  document.body.appendChild(toastContainerEl)
  // Event delegation — one listener handles all Undo buttons
  toastContainerEl.addEventListener('click', e => {
    const btn = e.target.closest('.cs-toast-undo')
    if (!btn) return
    removeFromQueue(btn.dataset.ts)
    btn.closest('.charsnap-toast')?.remove()
  })
}

function showToast(html, durationMs = 5000) {
  ensureToastContainer()
  const toast = document.createElement('div')
  toast.className = 'charsnap-toast'
  toast.innerHTML = html
  toastContainerEl.appendChild(toast)
  setTimeout(() => toast.remove(), durationMs)
}

// ── Auto-capture ──────────────────────────────────────────────────────────────

async function performAutoCapture(dialog) {
  try {
    await waitForTotalTab(dialog)
    const capture = readStats(dialog)
    if (!capture || !capture.name) {
      showToast('Could not read stats from modal.')
      return
    }
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
  } catch (err) {
    showToast(`Capture failed: ${escHtml(err.message)}`)
  }
}

// ── Manual Capture button (Auto-capture OFF mode) ─────────────────────────────

function injectCaptureButton(dialog) {
  if (dialog.querySelector('[data-charsnap-injected]')) return
  // Bail if this isn't a stats modal (Copy stats button is the reliable indicator)
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
      const capture = readStats(dialog)
      if (!capture || !capture.name) throw new Error('Could not read stats from modal.')
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

// ── Floating HUD ──────────────────────────────────────────────────────────────

let hudEl = null

function renderHUD() {
  if (hudEl) return
  hudEl = document.createElement('div')
  hudEl.id = 'charsnap-hud'
  document.body.appendChild(hudEl)
  updateHUD()
}

function updateHUD() {
  if (!hudEl) return
  const count = getQueue().length
  const auto  = getAutoCapture()

  hudEl.innerHTML = `
    <div class="charsnap-hud-inner">
      <button class="charsnap-hud-btn charsnap-hud-btn--toggle ${auto ? 'charsnap-hud-btn--toggle-on' : ''}" id="cs-auto-btn">
        Auto: ${auto ? 'ON' : 'OFF'}
      </button>
      <span class="charsnap-hud-sep"></span>
      <span class="charsnap-hud-label">
        <span class="charsnap-hud-badge">${count}</span>
        queued
      </span>
      <div class="charsnap-hud-actions">
        <button class="charsnap-hud-btn charsnap-hud-btn--primary" id="cs-copy-btn" ${count === 0 ? 'disabled' : ''}>
          Copy queue
        </button>
        <button class="charsnap-hud-btn charsnap-hud-btn--danger" id="cs-clear-btn" ${count === 0 ? 'disabled' : ''}>
          Clear
        </button>
      </div>
    </div>
  `

  hudEl.querySelector('#cs-auto-btn')?.addEventListener('click', () => setAutoCapture(!auto))

  hudEl.querySelector('#cs-copy-btn')?.addEventListener('click', () => {
    const q = getQueue()
    if (!q.length) return
    GM_setClipboard(JSON.stringify({ captures: q }, null, 2), 'text')
    hudEl.querySelector('#cs-copy-btn').textContent = '✓ Copied!'
    setTimeout(updateHUD, 1500)
  })

  hudEl.querySelector('#cs-clear-btn')?.addEventListener('click', () => {
    hudEl.innerHTML = `
      <div class="charsnap-hud-inner">
        <span class="charsnap-hud-label charsnap-hud-label--warn">Clear all ${count}?</span>
        <div class="charsnap-hud-actions">
          <button class="charsnap-hud-btn charsnap-hud-btn--danger-confirm" id="cs-clear-yes-btn">Yes, clear</button>
          <button class="charsnap-hud-btn" id="cs-clear-no-btn">Keep</button>
        </div>
      </div>
    `
    hudEl.querySelector('#cs-clear-yes-btn')?.addEventListener('click', () => { clearQueue(); updateHUD() })
    hudEl.querySelector('#cs-clear-no-btn')?.addEventListener('click', updateHUD)
  })
}

// ── Modal observer ────────────────────────────────────────────────────────────

function onDialogOpen(dialog) {
  if (getAutoCapture()) {
    performAutoCapture(dialog)
  } else {
    injectCaptureButton(dialog)
  }
}

function observeModals() {
  // Track the currently-open dialog so we fire once per open, not once per mutation
  let currentDialog = null

  function handlePotentialOpen(dialog) {
    if (!dialog || dialog === currentDialog) return
    currentDialog = dialog
    onDialogOpen(dialog)
  }

  // Handle a dialog already open when the script loads
  const existing = document.querySelector('[role="dialog"][data-state="open"]')
  if (existing) handlePotentialOpen(existing)

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      // Attribute change: data-state flipped on a dialog element
      if (mutation.type === 'attributes') {
        const el = mutation.target
        if (el.getAttribute('role') !== 'dialog') continue
        const newState = el.getAttribute('data-state')
        if (newState === 'open' && mutation.oldValue !== 'open') {
          handlePotentialOpen(el)
        } else if (newState !== 'open' && el === currentDialog) {
          currentDialog = null // reset so a re-open of the same node triggers again
        }
      }
      // childList: a new dialog node added to DOM already marked open
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
    #charsnap-hud {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: system-ui, sans-serif;
      font-size: 12px;
    }
    .charsnap-hud-inner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1c1917;
      border: 1px solid #44403c;
      border-radius: 10px;
      padding: 8px 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    }
    .charsnap-hud-sep { width: 1px; height: 16px; background: #44403c; flex-shrink: 0; }
    .charsnap-hud-label {
      color: #a8a29e;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .charsnap-hud-label--warn { color: #fb7185; }
    .charsnap-hud-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      border-radius: 999px;
      font-weight: 600;
      font-size: 11px;
    }
    .charsnap-hud-actions { display: flex; gap: 4px; }
    .charsnap-hud-btn {
      padding: 4px 10px;
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
    .charsnap-hud-btn:hover:not(:disabled) { background: #3c3837; }
    .charsnap-hud-btn:disabled { opacity: 0.4; cursor: default; }
    .charsnap-hud-btn--toggle {
      color: #a8a29e;
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .charsnap-hud-btn--toggle-on {
      background: rgba(52, 211, 153, 0.1);
      color: #34d399;
      border-color: rgba(52, 211, 153, 0.3);
    }
    .charsnap-hud-btn--toggle-on:hover { background: rgba(52, 211, 153, 0.18) !important; }
    .charsnap-hud-btn--primary {
      background: rgba(251, 191, 36, 0.12);
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.3);
    }
    .charsnap-hud-btn--primary:hover:not(:disabled) { background: rgba(251, 191, 36, 0.22); }
    .charsnap-hud-btn--danger { color: #fb7185; border-color: rgba(251, 113, 133, 0.3); }
    .charsnap-hud-btn--danger:hover:not(:disabled) { background: rgba(251, 113, 133, 0.12); }
    .charsnap-hud-btn--danger-confirm {
      background: rgba(251, 113, 133, 0.15);
      color: #fb7185;
      border-color: rgba(251, 113, 133, 0.3);
    }
    .charsnap-hud-btn--danger-confirm:hover { background: rgba(251, 113, 133, 0.25); }

    /* ── Toasts ── */
    #charsnap-toasts {
      position: fixed;
      bottom: 68px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;
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
      max-width: 280px;
      line-height: 1.4;
    }
    @keyframes cs-toast-in {
      from { opacity: 0; transform: translateX(8px); }
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
observeModals()
