// ==UserScript==
// @name         CharSnap Stats Capture
// @namespace    https://github.com/Shirohibiki-chan/character-stat-tracker
// @version      1.0.0
// @description  Personal use only — do not redistribute. Adds a Capture button to CharSnap stats modals; queues Total-scope stats for paste-import into CharSnap Stats Tracker.
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

// ── Number helpers ────────────────────────────────────────────────────────────

function parseNumber(text) {
  return parseInt((text || '').replace(/,/g, '').trim(), 10) || 0
}

function parseBreakdown(dialog) {
  // Look for "(X + Y)" pattern — the solo + group messages breakdown
  const spans = dialog.querySelectorAll('span.text-xs.text-secondary, span.text-xs')
  for (const span of spans) {
    const m = span.textContent.match(/\(([0-9,]+)\s*\+\s*([0-9,]+)\)/)
    if (m) {
      return { messagesSolo: parseNumber(m[1]), messagesGroup: parseNumber(m[2]) }
    }
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

function clearQueue() {
  GM_setValue(QUEUE_KEY, '[]')
}

// ── Tab gating ────────────────────────────────────────────────────────────────

function getActiveTabName(dialog) {
  return dialog.querySelector('button[role="tab"][data-state="active"]')?.textContent?.trim() ?? ''
}

function waitForTotalTab(dialog) {
  return new Promise((resolve, reject) => {
    if (getActiveTabName(dialog) === 'Total') {
      resolve()
      return
    }

    const tabs = dialog.querySelectorAll('button[role="tab"]')
    const totalTab = Array.from(tabs).find(t => t.textContent.trim() === 'Total')
    if (!totalTab) {
      reject(new Error('Could not find the Total tab.'))
      return
    }

    totalTab.click()

    // Poll until Radix marks the Total tab as active, then give the stats a moment to render
    let ticks = 0
    const timer = setInterval(() => {
      if (getActiveTabName(dialog) === 'Total') {
        clearInterval(timer)
        setTimeout(resolve, 200)
        return
      }
      if (++ticks > 20) {
        clearInterval(timer)
        reject(new Error('Timed out switching to Total tab. Try again.'))
      }
    }, 100)
  })
}

// ── Stats reader ──────────────────────────────────────────────────────────────

function readStats(dialog) {
  const name = dialog.querySelector('h2')?.textContent?.trim() ?? ''

  // Avatar: prefer the CDN-hosted image, fall back to any <img>
  const avatarEl = dialog.querySelector('img[src*="cdn.charsnap"]') ?? dialog.querySelector('img')
  const avatarUrl = avatarEl?.src ?? null

  // Three stat value divs in DOM order: chats, messages, favorites
  let statEls = Array.from(dialog.querySelectorAll('div.text-3xl.font-bold'))
  if (statEls.length < 3) {
    // CharSnap may change class names — try a broader selector
    statEls = Array.from(dialog.querySelectorAll('div.text-3xl'))
  }
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

// ── Capture button ────────────────────────────────────────────────────────────

function injectCaptureButton(dialog) {
  if (dialog.querySelector('[data-charsnap-injected]')) return

  // The Copy stats button is the documented, stable anchor point —
  // if it's absent we're not in a stats modal and should bail.
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
      }, 3000)
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

  hudEl.innerHTML = `
    <div class="charsnap-hud-inner">
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

  hudEl.querySelector('#cs-copy-btn')?.addEventListener('click', () => {
    const q = getQueue()
    if (!q.length) return
    GM_setClipboard(JSON.stringify({ captures: q }, null, 2), 'text')
    hudEl.querySelector('#cs-copy-btn').textContent = '✓ Copied!'
    setTimeout(updateHUD, 1500)
  })

  hudEl.querySelector('#cs-clear-btn')?.addEventListener('click', () => {
    // Step 1 of 2 — show confirm buttons
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

// ── Styles ────────────────────────────────────────────────────────────────────

function injectStyles() {
  GM_addStyle(`
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
    .charsnap-capture-btn:hover:not(:disabled) {
      background: rgba(251, 191, 36, 0.22);
    }
    .charsnap-capture-btn:disabled {
      opacity: 0.6;
      cursor: default;
    }
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
  `)
}

// ── Modal observer ────────────────────────────────────────────────────────────

function observeModals() {
  // Handle a dialog that's already open on script load
  const existing = document.querySelector('[role="dialog"][data-state="open"]')
  if (existing) injectCaptureButton(existing)

  const observer = new MutationObserver(() => {
    const dialog = document.querySelector('[role="dialog"][data-state="open"]')
    if (dialog) injectCaptureButton(dialog)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state'],
  })
}

// ── Init ──────────────────────────────────────────────────────────────────────

injectStyles()
renderHUD()
observeModals()
