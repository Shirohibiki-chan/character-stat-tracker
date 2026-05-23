// charsnap-capture.bookmarklet.js
// Version 1.0 — 2026-05-23
//
// Mobile-compatible alternative to the Tampermonkey userscript.
// Works in any modern browser (iOS Safari, Android Chrome, desktop) —
// no extension required.
//
// ── WHAT IT DOES ─────────────────────────────────────────────────────────────
// Tap the bookmark on any CharSnap page. A 📊 pill appears in the corner.
// Tap the pill to expand the capture queue panel.
// Open any bot's stats modal → it auto-captures to the queue (Total tab only).
// When you're done, tap "Export queue" → JSON copies to clipboard → paste into
// the CharSnap Stats Tracker import box.
//
// Tap the bookmark again at any time to restore the HUD if it was hidden.
//
// ── DIFFERENCES FROM THE TAMPERMONKEY USERSCRIPT ─────────────────────────────
// • No profile gate — always visible while you're on CharSnap (you activated it
//   intentionally by tapping the bookmark)
// • Storage uses localStorage (same charsnap.ai domain; separate key prefix
//   so it doesn't conflict with the userscript's GM_setValue storage)
// • Must tap the bookmark once per browser session to activate — it doesn't
//   run automatically in the background
// • No settings panel — auto-capture toggle is inline in the panel header
// • No resize grip — panel uses a fixed default size
// • Export uses navigator.clipboard (async, requires HTTPS — CharSnap is HTTPS)
//
// ── INSTALL ───────────────────────────────────────────────────────────────────
// This is the human-readable source. To install as a bookmarklet:
//
//   Step 1 — Minify this file:
//     Use an online minifier such as https://jscompress.com (paste this file,
//     click "Compress JavaScript").
//
//   Step 2 — Make a bookmark URL:
//     Take the minified output and prepend  javascript:  (no quotes, no space
//     after the colon). The full URL looks like:
//       javascript:(function(){'use strict';...})();
//
//   Step 3 — Save as a bookmark:
//     Desktop: Paste that URL into the bookmark URL field; title it "📊 Capture"
//     iOS Safari:
//       1. Bookmark any page (share sheet → Add Bookmark)
//       2. Go to Bookmarks → long-press the new bookmark → Edit
//       3. Replace the URL with the javascript: line
//     Android Chrome:
//       1. Tap ⋮ → Bookmarks → Add bookmark (any page)
//       2. Long-press the new bookmark → Edit bookmark → URL → paste
//
//   Step 4 — Use it:
//     Navigate to CharSnap, tap the bookmark. 📊 pill appears.
//
// ── POLICY NOTE ──────────────────────────────────────────────────────────────
// Reads only the rendered DOM of stats modals the user opens manually.
// Makes zero HTTP requests. Same policy status as the Tampermonkey userscript.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict'

  // ── Re-init guard ─────────────────────────────────────────────────────────
  // Tapping the bookmark a second time restores and refreshes the HUD
  // instead of injecting duplicate elements.
  if (window.__csBookmarklet) {
    window.__csBookmarklet.restore()
    return
  }

  // ── localStorage helpers ──────────────────────────────────────────────────

  const LS = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v !== null ? v : fallback } catch { return fallback }
    },
    set(key, val) {
      try { localStorage.setItem(key, String(val)) } catch {}
    },
    remove(key) {
      try { localStorage.removeItem(key) } catch {}
    },
  }

  // Key prefix cs_bm_ avoids collisions with GM_setValue keys (cs_* without bm_)
  const KEY_QUEUE = 'cs_bm_queue'
  const KEY_AUTO  = 'cs_bm_auto'
  const KEY_POS   = 'cs_bm_pos'

  // ── Helpers ───────────────────────────────────────────────────────────────

  function normalizeAvatar(url) {
    if (!url) return null
    const m = url.match(/\/([a-f0-9-]+-image\.[a-z]+)(\?|$)/i)
    return m ? m[1] : url
  }

  function parseNumber(text) {
    return parseInt((text || '').replace(/,/g, '').trim(), 10) || 0
  }

  function escHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback for older browsers / missing clipboard permission
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { return document.execCommand('copy') } catch { return false }
      finally { ta.remove() }
    }
  }

  // ── Queue management ──────────────────────────────────────────────────────

  function getQueue() {
    try { return JSON.parse(LS.get(KEY_QUEUE, '[]')) } catch { return [] }
  }

  function saveQueue(q) {
    LS.set(KEY_QUEUE, JSON.stringify(q))
  }

  function addToQueue(capture) {
    const q = getQueue()
    q.push(capture)
    saveQueue(q)
  }

  function removeFromQueue(capturedAt) {
    saveQueue(getQueue().filter(c => c.capturedAt !== capturedAt))
    updateHUD()
  }

  function clearQueue() {
    LS.remove(KEY_QUEUE)
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
      return {
        messages:  cap.messages  - p.messages,
        chats:     cap.chats     - p.chats,
        favorites: cap.favorites - p.favorites,
      }
    })
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  function getAutoCapture() { return LS.get(KEY_AUTO, '1') !== '0' }

  function setAutoCapture(on) {
    LS.set(KEY_AUTO, on ? '1' : '0')
    updateHUD()
    const dialog = document.querySelector('[role="dialog"][data-state="open"]')
    if (!dialog) return
    if (on) {
      dialog.querySelector('[data-cs-injected]')?.remove()
      performAutoCapture(dialog)
    } else {
      disconnectTabWatcher()
      injectCaptureButton(dialog)
    }
  }

  // ── Pointer-event dispatch ────────────────────────────────────────────────
  // Radix UI tab components respond to pointerdown, not click.

  function dispatchPointerClick(el) {
    const opts = { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1 }
    el.dispatchEvent(new PointerEvent('pointerdown', opts))
    el.dispatchEvent(new PointerEvent('pointerup',   opts))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }

  function closeDialog(dialog) {
    const closeBtn = [...dialog.querySelectorAll('button')].find(b => b.textContent.trim() === 'Close')
    if (!closeBtn) return
    const propsKey = Object.keys(closeBtn).find(k => k.startsWith('__reactProps'))
    if (propsKey && closeBtn[propsKey]?.onClick) {
      closeBtn[propsKey].onClick({
        type: 'click', preventDefault: () => {}, stopPropagation: () => {},
        currentTarget: closeBtn, target: closeBtn,
      })
    }
  }

  function dispatchKeyboardActivate(el) {
    el.focus()
    const opts = { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }
    el.dispatchEvent(new KeyboardEvent('keydown', opts))
    el.dispatchEvent(new KeyboardEvent('keyup',   opts))
  }

  // ── Tab helpers ───────────────────────────────────────────────────────────

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
        reject(new Error(`No Total tab. Tabs: ${found || 'none'}`))
        return
      }
      dispatchPointerClick(totalTab)
      let ticks = 0, retried = false
      const timer = setInterval(() => {
        if (getActiveTabName(dialog) === 'Total') { clearInterval(timer); resolve(); return }
        if (!retried && ticks === 15) { retried = true; dispatchPointerClick(totalTab) }
        if (++ticks > 50) {
          clearInterval(timer)
          reject(new Error(`Could not switch to Total tab (active: "${getActiveTabName(dialog)}").`))
        }
      }, 100)
    })
  }

  // ── Stats reader ──────────────────────────────────────────────────────────

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
    const messages = Math.max(domMessages, breakdownSum)
    return {
      name, avatarUrl, chats, messages, favorites,
      ...(breakdown ? { messagesSolo: breakdown.messagesSolo, messagesGroup: breakdown.messagesGroup } : {}),
      scope: 'Total',
      capturedAt: new Date().toISOString(),
    }
  }

  function waitForStats(dialog, timeoutMs = 2000) {
    function hasData(snap) {
      if (!snap || !snap.name) return false
      if (snap.messages === 0 && snap.chats === 0 && snap.favorites === 0) return false
      if ('messagesGroup' in snap && snap.messagesGroup === 0
          && snap.messagesSolo > 0 && snap.messages === snap.messagesSolo) return false
      return true
    }
    return new Promise(resolve => {
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
      mo.observe(dialog, { subtree: true, childList: true, characterData: true })
      setTimeout(() => finish(readStats(dialog)), timeoutMs)
    })
  }

  // ── Toast notifications ───────────────────────────────────────────────────

  let toastAreaEl = null
  const TOAST_MAX = 3
  const TOAST_MS  = 4000

  function positionToastArea() {
    if (!hudEl || !toastAreaEl) return
    if (hudEl.style.display === 'none') {
      toastAreaEl.style.setProperty('display', 'none', 'important')
      return
    }
    toastAreaEl.style.removeProperty('display')
    const rect = hudEl.getBoundingClientRect()
    toastAreaEl.style.setProperty('bottom', (window.innerHeight - rect.top + 7) + 'px', 'important')
    toastAreaEl.style.setProperty('left',   rect.left + 'px', 'important')
    toastAreaEl.style.setProperty('width',  rect.width + 'px', 'important')
  }

  function dismissAllToasts() {
    if (!toastAreaEl) return
    while (toastAreaEl.firstChild) toastAreaEl.removeChild(toastAreaEl.firstChild)
  }

  function showToast(html, ms = TOAST_MS) {
    if (!hudExpanded || !toastAreaEl) return
    while (toastAreaEl.children.length >= TOAST_MAX) toastAreaEl.firstChild?.remove()
    const t = document.createElement('div')
    t.className = 'cs-toast'
    t.innerHTML = html
    toastAreaEl.appendChild(t)
    setTimeout(() => t.remove(), ms)
  }

  // ── Auto-capture ──────────────────────────────────────────────────────────

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
        `Captured <b>${escHtml(capture.name)}</b>. ` +
        `<button class="cs-toast-undo" data-ts="${escHtml(capture.capturedAt)}">Undo</button>`
      )
      setTimeout(() => closeDialog(dialog), 800)
    }

    if (getActiveTabName(dialog) === 'Total') { doCapture(); return }

    const tabs = Array.from(dialog.querySelectorAll('button[role="tab"]'))
    const totalTab = tabs.find(t => t.textContent.trim() === 'Total')
    if (totalTab) dispatchPointerClick(totalTab)

    let fired = false
    const observer = new MutationObserver(() => {
      if (fired || getActiveTabName(dialog) !== 'Total') return
      fired = true
      disconnectTabWatcher()
      doCapture()
    })
    observer.observe(dialog, { subtree: true, attributes: true, attributeFilter: ['data-state'] })
    activeTabWatcher = observer

    setTimeout(() => {
      if (fired || !document.body.contains(dialog) || !totalTab) return
      if (getActiveTabName(dialog) === 'Total') return
      dispatchKeyboardActivate(totalTab)
    }, 50)

    setTimeout(() => {
      if (!fired && document.body.contains(dialog) && getActiveTabName(dialog) !== 'Total') {
        showToast('Tap the <b>Total</b> tab to capture.', 8000)
      }
    }, 1500)
  }

  // ── Manual Capture button (Auto OFF mode) ─────────────────────────────────

  function injectCaptureButton(dialog) {
    if (dialog.querySelector('[data-cs-injected]')) return
    const copyBtn = dialog.querySelector('button[title="Copy stats"]')
    if (!copyBtn) return
    const btn = document.createElement('button')
    btn.setAttribute('data-cs-injected', '1')
    btn.className = 'cs-capture-btn'
    btn.textContent = 'Capture'
    copyBtn.parentElement.insertBefore(btn, copyBtn)
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      btn.disabled = true
      btn.textContent = '…'
      try {
        await waitForTotalTab(dialog)
        const capture = await waitForStats(dialog)
        if (!capture) throw new Error('Could not read stats.')
        if (isDuplicateInQueue(capture.avatarUrl)) {
          btn.textContent = 'Already captured'
          setTimeout(() => { btn.textContent = 'Capture'; btn.disabled = false }, 2000)
          return
        }
        addToQueue(capture)
        updateHUD()
        btn.textContent = '✓ Captured'
        btn.classList.add('cs-capture-btn--ok')
        setTimeout(() => closeDialog(dialog), 800)
        setTimeout(() => {
          btn.textContent = 'Capture'
          btn.disabled = false
          btn.classList.remove('cs-capture-btn--ok')
        }, 2000)
      } catch (err) {
        btn.textContent = '✗ ' + err.message
        btn.classList.add('cs-capture-btn--err')
        setTimeout(() => {
          btn.textContent = 'Capture'
          btn.disabled = false
          btn.classList.remove('cs-capture-btn--err')
        }, 4000)
      }
    })
  }

  // ── Position persistence + drag ───────────────────────────────────────────

  function loadPos() {
    try { return JSON.parse(LS.get(KEY_POS, null)) } catch { return null }
  }

  function savePos(top, left) {
    LS.set(KEY_POS, JSON.stringify({ top, left }))
  }

  function applyPos() {
    const stored = loadPos()
    if (stored) {
      const W = window.innerWidth, H = window.innerHeight
      const rect = hudEl.getBoundingClientRect()
      const w = rect.width || 220, h = rect.height || 44
      if (stored.top >= 0 && stored.left >= 0 && stored.top + h <= H && stored.left + w <= W) {
        hudEl.style.removeProperty('bottom')
        hudEl.style.removeProperty('right')
        hudEl.style.setProperty('top',  stored.top  + 'px', 'important')
        hudEl.style.setProperty('left', stored.left + 'px', 'important')
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

  function clampPos(top, left) {
    const W = window.innerWidth, H = window.innerHeight
    const rect = hudEl.getBoundingClientRect()
    const w = rect.width || 220, h = rect.height || 44
    const MIN = 10
    return {
      top:  Math.max(-(h - MIN), Math.min(H - MIN, top)),
      left: Math.max(-(w - MIN), Math.min(W - MIN, left)),
    }
  }

  const DRAG_THRESHOLD = 4

  function attachDrag() {
    hudEl.addEventListener('pointerdown', e => {
      // Allow left-click on mouse; allow any pointer on touch/stylus
      if (e.pointerType === 'mouse' && e.button !== 0) return

      const pointerId   = e.pointerId
      const startPos    = { x: e.clientX, y: e.clientY }
      const startTarget = e.target
      let dragging = false, dragOffset = { x: 0, y: 0 }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return
        const dx = ev.clientX - startPos.x
        const dy = ev.clientY - startPos.y

        if (!dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
          // In expanded mode, buttons/links initiate their own actions — don't drag from them.
          // In pill mode the whole HUD is one button, so dragging is always allowed.
          if (hudExpanded && startTarget?.closest('button, a')) { cleanup(); return }
          dragging = true
          const rect = hudEl.getBoundingClientRect()
          hudEl.style.removeProperty('bottom')
          hudEl.style.removeProperty('right')
          hudEl.style.setProperty('top',  rect.top  + 'px', 'important')
          hudEl.style.setProperty('left', rect.left + 'px', 'important')
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
          savePos(rect.top, rect.left)
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

  // ── HUD state ─────────────────────────────────────────────────────────────

  let hudEl         = null
  let hudExpanded   = false
  let confirmAction = false
  let searchQuery   = ''
  let selectMode    = false
  let selectedIds   = new Set()
  let expandedCapId = null
  const undoBuffer  = new Map()

  function hudLabel(count) {
    return count === 0 ? '📊 No captures' : `📊 ${count} capture${count !== 1 ? 's' : ''}`
  }

  const SVG_COLLAPSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
  const SVG_CLOSE    = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'

  function removeCapture(cap) {
    if (expandedCapId === cap.capturedAt) expandedCapId = null
    undoBuffer.set(cap.capturedAt, cap)
    setTimeout(() => undoBuffer.delete(cap.capturedAt), 8000)
    removeFromQueue(cap.capturedAt)
  }

  function removeCapturesBulk(captures) {
    const bulkKey = 'bulk_' + Date.now()
    undoBuffer.set(bulkKey, captures)
    setTimeout(() => undoBuffer.delete(bulkKey), 8000)
    const tsSet = new Set(captures.map(c => c.capturedAt))
    saveQueue(getQueue().filter(c => !tsSet.has(c.capturedAt)))
    updateHUD()
    return bulkKey
  }

  function buildSelectFooter(totalCount, selCount) {
    const allSel = totalCount > 0 && selCount === totalCount
    return `
      <div class="cs-sel-row">
        <span class="cs-sel-count">${selCount} selected</span>
        <button class="cs-btn cs-btn--sm" id="cs-sel-all">${allSel ? 'None' : 'All'}</button>
        <button class="cs-icon-btn" id="cs-sel-cancel" title="Exit">${SVG_CLOSE}</button>
      </div>
      ${selCount > 0 ? `
        <div class="cs-sel-actions">
          <button class="cs-btn cs-btn--danger" id="cs-remove-sel">Remove ${selCount}</button>
          <button class="cs-btn cs-btn--primary" id="cs-export-sel">Export ${selCount}</button>
        </div>
      ` : ''}
    `
  }

  function updateHUD() {
    if (!hudEl || confirmAction) return
    const q     = getQueue()
    const count = q.length
    const auto  = getAutoCapture()

    if (!hudExpanded) {
      hudEl.innerHTML = `
        <button class="cs-pill${count === 0 ? ' cs-pill--empty' : ''}" id="cs-open">
          ${hudLabel(count)}
        </button>
      `
      hudEl.querySelector('#cs-open').addEventListener('click', () => {
        hudExpanded = true
        updateHUD()
      })
      hudEl.style.removeProperty('width')
      hudEl.style.removeProperty('height')
      return
    }

    const savedScroll = hudEl.querySelector('.cs-list')?.scrollTop ?? 0
    const deltas      = computeDeltas(q)
    const selCount    = selectedIds.size

    let capturesHtml
    if (count === 0) {
      capturesHtml = `<div class="cs-empty">No captures yet — open a bot's stats modal to capture it.</div>`
    } else {
      capturesHtml = q.map((cap, i) => {
        const delta      = deltas[i]
        const isSelected = selectedIds.has(cap.capturedAt)
        const isExpanded = expandedCapId === cap.capturedAt
        const initials   = escHtml((cap.name || '?')[0].toUpperCase())
        const avatarHtml = cap.avatarUrl
          ? `<img class="cs-avatar" src="${escHtml(cap.avatarUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.removeProperty('display')"><div class="cs-avatar-fb" style="display:none">${initials}</div>`
          : `<div class="cs-avatar-fb">${initials}</div>`
        const summary = `${fmtNum(cap.messages)} msgs · ${fmtNum(cap.chats)} threads · ${fmtNum(cap.favorites)} favs`
        let deltaHtml = ''
        if (delta) {
          const parts = []
          if (delta.messages  > 0) parts.push(`<span class="cs-delta">+${fmtNum(delta.messages)} msgs</span>`)
          if (delta.chats     > 0) parts.push(`<span class="cs-delta">+${fmtNum(delta.chats)} threads</span>`)
          if (delta.favorites > 0) parts.push(`<span class="cs-delta">+${fmtNum(delta.favorites)} favs</span>`)
          if (parts.length) deltaHtml = `<div class="cs-deltas">${parts.join('')}</div>`
        }
        const checkHtml   = selectMode
          ? `<input type="checkbox" class="cs-chk"${isSelected ? ' checked' : ''} data-ts="${escHtml(cap.capturedAt)}">`
          : ''
        const previewHtml = isExpanded
          ? `<div class="cs-preview"><pre>${escHtml(JSON.stringify(cap, null, 2))}</pre></div>`
          : ''
        return `
          <div class="cs-row${isSelected ? ' cs-row--sel' : ''}" data-name="${escHtml((cap.name || '').toLowerCase())}" data-ts="${escHtml(cap.capturedAt)}">
            <div class="cs-row-main">
              ${checkHtml}
              <div class="cs-av-wrap">${avatarHtml}</div>
              <div class="cs-info">
                <div class="cs-name">${escHtml(cap.name || 'Unknown')}</div>
                <div class="cs-meta">${escHtml(timeAgo(cap.capturedAt))} · ${escHtml(cap.scope || 'Total')} · ${escHtml(summary)}</div>
                ${deltaHtml}
              </div>
              <button class="cs-remove" data-ts="${escHtml(cap.capturedAt)}" title="Remove">×</button>
            </div>
            ${previewHtml}
          </div>
        `
      }).join('')
    }

    const footerInner = selectMode
      ? buildSelectFooter(count, selCount)
      : `
          <button class="cs-btn cs-btn--primary" id="cs-export"${count === 0 ? ' disabled' : ''}>Export queue</button>
          <button class="cs-btn cs-btn--danger" id="cs-clear"${count === 0 ? ' disabled' : ''}>Clear</button>
          ${count > 0 ? '<button class="cs-btn" id="cs-select">Select</button>' : ''}
        `

    hudEl.innerHTML = `
      <div class="cs-panel">
        <div class="cs-header">
          <span class="cs-title">${hudLabel(count)}</span>
          <div class="cs-header-right">
            <button class="cs-icon-btn" id="cs-collapse" title="Collapse">${SVG_COLLAPSE}</button>
            <button class="cs-icon-btn" id="cs-hide" title="Hide">${SVG_CLOSE}</button>
          </div>
        </div>
        <div class="cs-body">
          <div class="cs-toolbar">
            <button class="cs-auto${auto ? ' cs-auto--on' : ''}" id="cs-auto">AUTO: ${auto ? 'ON' : 'OFF'}</button>
            <div class="cs-search-wrap">
              <input class="cs-search" id="cs-search" type="text" placeholder="Filter bots…" value="${escHtml(searchQuery)}">
              <button class="cs-search-x" id="cs-search-x" style="${searchQuery ? '' : 'display:none'}">×</button>
            </div>
          </div>
          <div class="cs-list" id="cs-list">${capturesHtml}</div>
        </div>
        <div class="cs-footer${selectMode ? ' cs-footer--sel' : ''}" id="cs-footer">
          ${footerInner}
        </div>
      </div>
    `

    // ── Header buttons ────────────────────────────────────────────────────
    hudEl.querySelector('#cs-collapse').addEventListener('click', () => {
      dismissAllToasts()
      hudExpanded = false
      confirmAction = false
      selectMode = false
      selectedIds.clear()
      expandedCapId = null
      searchQuery = ''
      updateHUD()
    })
    hudEl.querySelector('#cs-hide').addEventListener('click', () => {
      dismissAllToasts()
      hudEl.style.setProperty('display', 'none', 'important')
      positionToastArea()
    })
    hudEl.querySelector('#cs-auto').addEventListener('click', () => setAutoCapture(!auto))

    // Click anywhere in the header (not on a button) to collapse to pill
    hudEl.querySelector('.cs-header').addEventListener('click', e => {
      if (e.target.closest('button')) return
      dismissAllToasts()
      hudExpanded = false
      confirmAction = false
      selectMode = false
      selectedIds.clear()
      expandedCapId = null
      searchQuery = ''
      updateHUD()
    })

    // ── Search ────────────────────────────────────────────────────────────
    const si = hudEl.querySelector('#cs-search')
    si.addEventListener('input', () => {
      searchQuery = si.value
      const term = searchQuery.toLowerCase()
      hudEl.querySelectorAll('.cs-row').forEach(row => {
        row.style.display = (row.dataset.name || '').includes(term) ? '' : 'none'
      })
      const xBtn = hudEl.querySelector('#cs-search-x')
      if (xBtn) xBtn.style.display = searchQuery ? '' : 'none'
    })
    hudEl.querySelector('#cs-search-x')?.addEventListener('click', () => {
      searchQuery = ''
      updateHUD()
    })

    if (searchQuery) {
      const term = searchQuery.toLowerCase()
      hudEl.querySelectorAll('.cs-row').forEach(row => {
        row.style.display = (row.dataset.name || '').includes(term) ? '' : 'none'
      })
    }

    // ── Capture rows ──────────────────────────────────────────────────────
    hudEl.querySelectorAll('.cs-row').forEach(row => {
      const ts  = row.dataset.ts
      const cap = q.find(c => c.capturedAt === ts)
      row.querySelector('.cs-row-main')?.addEventListener('click', e => {
        if (e.target.closest('.cs-remove, .cs-chk')) return
        if (selectMode) {
          if (selectedIds.has(ts)) selectedIds.delete(ts)
          else selectedIds.add(ts)
          updateHUD()
          return
        }
        expandedCapId = expandedCapId === ts ? null : ts
        updateHUD()
      })
      row.querySelector('.cs-remove')?.addEventListener('click', e => {
        e.stopPropagation()
        if (!cap) return
        removeCapture(cap)
        showToast(
          `Removed <b>${escHtml(cap.name)}</b>. ` +
          `<button class="cs-toast-undo" data-ts="${escHtml(ts)}">Undo</button>`
        )
      })
      row.querySelector('.cs-chk')?.addEventListener('change', e => {
        if (e.target.checked) selectedIds.add(ts)
        else selectedIds.delete(ts)
        updateHUD()
      })
    })

    // ── Footer — normal mode ──────────────────────────────────────────────
    hudEl.querySelector('#cs-export')?.addEventListener('click', async () => {
      if (!count) return
      const json = JSON.stringify({ captures: q }, null, 2)
      const ok = await copyToClipboard(json)
      confirmAction = true
      const footer = hudEl.querySelector('#cs-footer')
      footer.innerHTML = `
        <span class="cs-confirm-msg">${ok ? 'Copied! Clear queue?' : 'Copy failed. Clear queue?'}</span>
        <button class="cs-btn cs-btn--danger-confirm cs-btn--sm" id="cs-yes">Yes</button>
        <button class="cs-btn cs-btn--sm" id="cs-no">Keep</button>
      `
      footer.querySelector('#cs-yes').addEventListener('click', () => { confirmAction = false; clearQueue(); updateHUD() })
      footer.querySelector('#cs-no').addEventListener('click',  () => { confirmAction = false; updateHUD() })
    })

    hudEl.querySelector('#cs-clear')?.addEventListener('click', () => {
      confirmAction = true
      const footer = hudEl.querySelector('#cs-footer')
      footer.innerHTML = `
        <span class="cs-confirm-msg">Clear ${count} capture${count !== 1 ? 's' : ''}?</span>
        <button class="cs-btn cs-btn--danger-confirm cs-btn--sm" id="cs-yes">Yes</button>
        <button class="cs-btn cs-btn--sm" id="cs-no">Cancel</button>
      `
      footer.querySelector('#cs-yes').addEventListener('click', () => { confirmAction = false; clearQueue(); updateHUD() })
      footer.querySelector('#cs-no').addEventListener('click',  () => { confirmAction = false; updateHUD() })
    })

    hudEl.querySelector('#cs-select')?.addEventListener('click', () => {
      selectMode = true
      selectedIds.clear()
      updateHUD()
    })

    // ── Footer — select mode ──────────────────────────────────────────────
    hudEl.querySelector('#cs-sel-all')?.addEventListener('click', () => {
      if (selectedIds.size === count) selectedIds.clear()
      else q.forEach(c => selectedIds.add(c.capturedAt))
      updateHUD()
    })
    hudEl.querySelector('#cs-sel-cancel')?.addEventListener('click', () => {
      selectMode = false
      selectedIds.clear()
      updateHUD()
    })
    hudEl.querySelector('#cs-remove-sel')?.addEventListener('click', () => {
      const toRemove = q.filter(c => selectedIds.has(c.capturedAt))
      if (!toRemove.length) return
      const n = toRemove.length
      selectMode = false
      selectedIds.clear()
      const bulkKey = removeCapturesBulk(toRemove)
      showToast(
        `Removed ${n} capture${n !== 1 ? 's' : ''}. ` +
        `<button class="cs-toast-undo" data-toast-action="readd-bulk" data-key="${escHtml(bulkKey)}">Undo</button>`
      )
    })
    hudEl.querySelector('#cs-export-sel')?.addEventListener('click', async () => {
      const toExport = q.filter(c => selectedIds.has(c.capturedAt))
      if (!toExport.length) return
      const n = toExport.length
      await copyToClipboard(JSON.stringify({ captures: toExport }, null, 2))
      selectMode = false
      selectedIds.clear()
      updateHUD()
      showToast(`Copied ${n} capture${n !== 1 ? 's' : ''} to clipboard.`)
    })

    // Restore scroll position lost by the innerHTML wipe
    if (savedScroll > 0) {
      const list = hudEl.querySelector('.cs-list')
      if (list) list.scrollTop = savedScroll
    }

    // Responsive default size — fits within the viewport with margin
    const panelW = Math.min(340, window.innerWidth  - 40)
    const panelH = Math.min(480, window.innerHeight - 80)
    hudEl.style.setProperty('width',  panelW + 'px', 'important')
    hudEl.style.setProperty('height', panelH + 'px', 'important')
    positionToastArea()
  }

  // ── Modal observer ────────────────────────────────────────────────────────

  const NON_BOT_MODALS = ['Creator Analytics']

  function isStatsModal(dialog) {
    if (!dialog.querySelector('button[title="Copy stats"]')) return false
    const h2Text = dialog.querySelector('h2')?.textContent?.trim() ?? ''
    return !NON_BOT_MODALS.includes(h2Text)
  }

  function onDialogOpen(dialog) {
    if (!isStatsModal(dialog)) return
    if (getAutoCapture()) performAutoCapture(dialog)
    else injectCaptureButton(dialog)
  }

  function observeModals() {
    let currentDialog = null

    function handleOpen(dialog) {
      if (!dialog || dialog === currentDialog) return
      currentDialog = dialog
      onDialogOpen(dialog)
    }

    const existing = document.querySelector('[role="dialog"][data-state="open"]')
    if (existing) handleOpen(existing)

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'attributes') {
          const el = m.target
          if (el.getAttribute('role') !== 'dialog') continue
          const ns = el.getAttribute('data-state')
          if (ns === 'open' && m.oldValue !== 'open') handleOpen(el)
          else if (ns !== 'open' && el === currentDialog) { currentDialog = null; disconnectTabWatcher() }
        }
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue
            const d = node.matches?.('[role="dialog"][data-state="open"]')
              ? node : node.querySelector?.('[role="dialog"][data-state="open"]')
            if (d) handleOpen(d)
          }
        }
      }
    })
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-state'], attributeOldValue: true,
    })
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  // All class names use cs- prefix to avoid collisions with CharSnap's own styles.
  // !important on sizing/positioning isn't needed inside the style block itself —
  // those properties are set via element.style.setProperty(..., 'important') in JS.

  function injectStyles() {
    const style = document.createElement('style')
    style.id = 'cs-bm-styles'
    style.textContent = `
      /* ── Capture button (injected next to Copy in manual mode) ── */
      .cs-capture-btn {
        display: inline-flex; align-items: center;
        padding: 4px 10px; font-size: 12px; font-weight: 500;
        background: rgba(251,191,36,0.12); color: #fbbf24;
        border: 1px solid rgba(251,191,36,0.3); border-radius: 6px;
        cursor: pointer; white-space: nowrap; line-height: 1;
        transition: background 0.15s;
      }
      .cs-capture-btn:hover:not(:disabled) { background: rgba(251,191,36,0.22); }
      .cs-capture-btn:disabled { opacity: 0.6; cursor: default; }
      .cs-capture-btn--ok  { background: rgba(52,211,153,0.15)!important; color: #34d399!important; border-color: rgba(52,211,153,0.3)!important; }
      .cs-capture-btn--err { background: rgba(251,113,133,0.15)!important; color: #fb7185!important; border-color: rgba(251,113,133,0.3)!important; max-width: 260px; overflow: hidden; text-overflow: ellipsis; }

      /* ── HUD root ── */
      #cs-bm-hud { cursor: grab; }
      #cs-bm-hud button, #cs-bm-hud a { cursor: pointer; }

      /* ── Collapsed pill ── */
      .cs-pill {
        display: inline-flex; align-items: center;
        padding: 10px 18px; background: #1c1917;
        border: 1px solid #44403c; border-radius: 999px;
        color: #fbbf24; font-size: 13px; font-weight: 500;
        cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.45);
        white-space: nowrap; min-height: 44px;
        transition: background 0.15s, border-color 0.15s;
      }
      .cs-pill:hover { background: #292524; border-color: #57534e; }
      .cs-pill--empty { color: #57534e; border-color: #292524; }
      .cs-pill--empty:hover { background: #1f1d1c; border-color: #3c3837; color: #78716c; }

      /* ── Expanded panel ── */
      .cs-panel {
        background: #1c1917; border: 1px solid #44403c;
        border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        min-width: 280px; overflow: hidden; position: relative;
        display: flex; flex-direction: column; height: 100%; box-sizing: border-box;
      }
      .cs-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 12px 10px; border-bottom: 1px solid #292524; flex-shrink: 0;
      }
      .cs-title {
        color: #fbbf24; font-weight: 500; font-size: 13px;
        white-space: nowrap; flex: 1; min-width: 0; overflow: hidden;
        text-overflow: ellipsis; cursor: pointer;
      }
      .cs-header-right { display: flex; align-items: center; gap: 4px; margin-left: 8px; flex-shrink: 0; }
      .cs-icon-btn {
        color: #78716c; background: none; border: none; cursor: pointer;
        width: 36px; height: 36px; display: flex; align-items: center;
        justify-content: center; border-radius: 6px; padding: 0; line-height: 0;
        transition: color 0.15s, background 0.15s; flex-shrink: 0;
      }
      .cs-icon-btn:hover { color: #d6d3d1; background: rgba(255,255,255,0.06); }
      .cs-body {
        padding: 8px 12px 6px; display: flex; flex-direction: column;
        flex: 1; min-height: 0; overflow: hidden;
      }
      .cs-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-shrink: 0; }
      .cs-search-wrap { flex: 1; min-width: 0; position: relative; display: flex; align-items: center; }
      .cs-search {
        flex: 1; min-width: 0; background: #111; border: 1px solid #44403c;
        border-radius: 6px; color: #d6d3d1; font-size: 12px;
        padding: 7px 26px 7px 10px; outline: none; font-family: system-ui, sans-serif;
        -webkit-appearance: none;
      }
      .cs-search::placeholder { color: #57534e; }
      .cs-search:focus { border-color: #78716c; }
      .cs-search-x {
        position: absolute; right: 7px; background: none; border: none;
        color: #57534e; font-size: 18px; line-height: 1; padding: 4px; cursor: pointer;
        min-width: 24px; min-height: 24px; display: flex; align-items: center; justify-content: center;
      }
      .cs-search-x:hover { color: #d6d3d1; }
      .cs-list {
        display: flex; flex-direction: column; gap: 2px;
        overflow-y: auto; flex: 1; min-height: 0;
        -webkit-overflow-scrolling: touch;
      }
      .cs-list::-webkit-scrollbar { width: 4px; }
      .cs-list::-webkit-scrollbar-track { background: transparent; }
      .cs-list::-webkit-scrollbar-thumb { background: #44403c; border-radius: 2px; }
      .cs-empty {
        padding: 28px 16px; color: #57534e; text-align: center;
        font-size: 12px; line-height: 1.5;
      }
      .cs-row { border-radius: 6px; }
      .cs-row--sel { background: rgba(251,191,36,0.07); }
      .cs-row-main {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 4px; border-radius: 6px; cursor: pointer;
        transition: background 0.12s; -webkit-tap-highlight-color: transparent;
      }
      .cs-row-main:hover { background: rgba(255,255,255,0.04); }
      .cs-av-wrap { flex-shrink: 0; }
      .cs-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; display: block; }
      .cs-avatar-fb {
        width: 32px; height: 32px; border-radius: 50%; background: #292524;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 600; color: #78716c;
      }
      .cs-info { flex: 1; min-width: 0; }
      .cs-name { font-size: 13px; font-weight: 500; color: #e7e5e4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cs-meta { font-size: 11px; color: #78716c; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cs-deltas { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
      .cs-delta { font-size: 10px; color: #34d399; font-weight: 500; }
      .cs-remove {
        background: none; border: none; color: #57534e; cursor: pointer;
        font-size: 20px; line-height: 1; border-radius: 4px; flex-shrink: 0;
        min-width: 36px; min-height: 36px; display: flex; align-items: center; justify-content: center;
        transition: color 0.12s, background 0.12s;
      }
      .cs-remove:hover { color: #fb7185; background: rgba(251,113,133,0.12); }
      .cs-chk { flex-shrink: 0; width: 18px; height: 18px; cursor: pointer; accent-color: #fbbf24; }
      .cs-preview {
        background: #111; border-top: 1px solid #292524;
        padding: 8px 10px; overflow-x: auto; border-radius: 0 0 6px 6px;
      }
      .cs-preview pre { margin: 0; font-size: 10px; color: #78716c; white-space: pre-wrap; word-break: break-all; font-family: monospace; line-height: 1.4; }
      .cs-footer {
        display: flex; align-items: center; gap: 6px;
        padding: 10px 12px; border-top: 1px solid #292524; flex-shrink: 0;
      }
      .cs-footer .cs-btn { flex: 1; }
      .cs-footer--sel { flex-direction: column; gap: 4px; align-items: stretch; }
      .cs-sel-row { display: flex; align-items: center; gap: 6px; }
      .cs-sel-count { flex: 1; font-size: 11px; color: #a8a29e; }
      .cs-sel-actions { display: flex; gap: 6px; }
      .cs-sel-actions .cs-btn { flex: 1; }
      .cs-confirm-msg { font-size: 11px; color: #a8a29e; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cs-auto {
        display: inline-flex; align-items: center;
        padding: 7px 10px; border-radius: 4px; font-size: 11px; font-weight: 500;
        letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer;
        background: #292524; border: 1px solid #44403c; color: #a8a29e;
        transition: background 0.15s; white-space: nowrap; min-height: 36px;
      }
      .cs-auto:hover { background: #3c3837; }
      .cs-auto--on { background: rgba(52,211,153,0.1); color: #34d399; border-color: rgba(52,211,153,0.3); }
      .cs-auto--on:hover { background: rgba(52,211,153,0.18); }
      .cs-btn {
        padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 500;
        cursor: pointer; border: 1px solid #44403c; background: #292524;
        color: #d6d3d1; transition: background 0.15s; white-space: nowrap;
        min-height: 36px; -webkit-tap-highlight-color: transparent;
      }
      .cs-btn:hover:not(:disabled) { background: #3c3837; }
      .cs-btn:disabled { opacity: 0.35; cursor: default; }
      .cs-btn--sm { flex: none!important; padding: 7px 14px; }
      .cs-btn--primary { background: rgba(251,191,36,0.12); color: #fbbf24; border-color: rgba(251,191,36,0.3); }
      .cs-btn--primary:hover:not(:disabled) { background: rgba(251,191,36,0.22); }
      .cs-btn--danger { color: #fb7185; border-color: rgba(251,113,133,0.3); }
      .cs-btn--danger:hover:not(:disabled) { background: rgba(251,113,133,0.12); }
      .cs-btn--danger-confirm { background: rgba(251,113,133,0.15); color: #fb7185; border-color: rgba(251,113,133,0.3); }
      .cs-btn--danger-confirm:hover { background: rgba(251,113,133,0.25); }

      /* ── Toast area (sibling of HUD, positioned by JS) ── */
      #cs-bm-toasts {
        position: fixed!important; z-index: 2147483647!important;
        display: flex; flex-direction: column; gap: 4px; pointer-events: none;
      }
      .cs-toast {
        background: #1c1917; border: 1px solid #44403c; border-radius: 8px;
        padding: 10px 14px; font-family: system-ui, sans-serif; font-size: 13px;
        color: #d6d3d1; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        animation: cs-in 0.15s ease; box-sizing: border-box; width: 100%;
        line-height: 1.5; pointer-events: auto;
      }
      @keyframes cs-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .cs-toast b { color: #e7e5e4; font-weight: 600; }
      .cs-toast-undo {
        background: none; border: none; color: #fbbf24; cursor: pointer;
        font-size: 13px; font-weight: 500; padding: 0; margin-left: 6px;
        min-height: 24px; vertical-align: middle;
      }
      .cs-toast-undo:hover { text-decoration: underline; }
    `
    document.head.appendChild(style)
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  if (!document.getElementById('cs-bm-styles')) injectStyles()

  // HUD element — appended to <html> to escape any stacking context CharSnap creates
  hudEl = document.createElement('div')
  hudEl.id = 'cs-bm-hud'
  hudEl.style.cssText = [
    'position:fixed!important',
    'z-index:2147483647!important',
    'isolation:isolate!important',
    'pointer-events:auto!important',
    'font-family:system-ui,sans-serif',
    'font-size:13px',
  ].join(';')
  document.documentElement.appendChild(hudEl)

  // Toast area is a sibling of the HUD so updateHUD()'s innerHTML wipe never touches it
  toastAreaEl = document.createElement('div')
  toastAreaEl.id = 'cs-bm-toasts'
  toastAreaEl.addEventListener('click', e => {
    const btn = e.target.closest('.cs-toast-undo')
    if (!btn) return
    const action = btn.dataset.toastAction
    const key    = btn.dataset.key
    const ts     = btn.dataset.ts
    if (action === 'readd-bulk') {
      const caps = undoBuffer.get(key)
      if (caps) { undoBuffer.delete(key); caps.forEach(c => addToQueue(c)); updateHUD() }
    } else if (ts) {
      const cap = undoBuffer.get(ts)
      if (cap) { undoBuffer.delete(ts); addToQueue(cap); updateHUD() }
    }
    btn.closest('.cs-toast')?.remove()
  })
  document.documentElement.appendChild(toastAreaEl)

  // Keep both elements in the DOM if React evicts them during re-renders
  new MutationObserver(() => {
    if (!hudEl.isConnected)       document.documentElement.appendChild(hudEl)
    if (!toastAreaEl.isConnected) document.documentElement.appendChild(toastAreaEl)
  }).observe(document.documentElement, { childList: true })

  applyPos()
  attachDrag()
  updateHUD()
  observeModals()

  // Expose restore function so the re-init guard (top of file) can call it
  window.__csBookmarklet = {
    restore() {
      hudEl.style.setProperty('display', 'block', 'important')
      updateHUD()
    },
  }

  console.log('[CharSnap Capture] Bookmarklet v1.0 active — tap the bookmark again to restore if hidden')
})()
