import { useState, useRef, useEffect } from 'react'
import { Bookmark, Copy, Check } from 'lucide-react'
import { BOOKMARKLET_URL } from '../../constants/bookmarklet-url.js'

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
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

export default function BookmarkletInstall() {
  const [copied, setCopied] = useState(false)
  const linkRef = useRef(null)

  // React blocks javascript: hrefs as a security measure — set it directly on the DOM node instead.
  useEffect(() => {
    if (linkRef.current) linkRef.current.setAttribute('href', BOOKMARKLET_URL)
  }, [])

  async function handleCopy() {
    const ok = await copyToClipboard(BOOKMARKLET_URL)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="border border-border rounded-lg p-6 max-w-md mx-auto bg-surface mt-4">
      <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-text-muted mb-2">Optional: capture tool</div>
      <p className="text-xs text-text-muted leading-relaxed mb-5">
        Adds a one-tap <strong className="text-text-secondary">Capture</strong> button inside CharSnap's stats modal.
        Captures go to a queue — export the whole batch at once instead of pasting one by one.
      </p>

      {/* Draggable bookmarklet link + copy fallback */}
      <div className="flex items-center gap-2 mb-5">
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a
          ref={linkRef}
          href="#"
          onClick={e => e.preventDefault()}
          draggable
          className="flex items-center gap-2 px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.12em] font-bold transition select-none cursor-grab active:cursor-grabbing"
          style={{
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.3)',
            color: '#fbbf24',
          }}
          title="Drag this to your bookmarks bar"
        >
          <Bookmark size={13} />
          CS Capture Bookmarklet
        </a>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] rounded-md border border-border text-text-muted hover:text-text-secondary transition"
          title="Copy bookmarklet URL to clipboard"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>

      {/* Install instructions */}
      <div className="space-y-2 text-xs text-text-muted mb-4">
        <p>
          <span className="text-text-secondary font-bold">Desktop: </span>
          Drag the amber button to your bookmarks bar. Then tap it on any CharSnap page.
        </p>
        <p>
          <span className="text-text-secondary font-bold">Android: </span>
          Not supported — Chrome strips bookmarklet URLs on save. Use the Tampermonkey userscript on desktop instead.
        </p>
        <p>
          <span className="text-text-secondary font-bold">iOS Safari: </span>
          Tap <em>Copy URL</em> → bookmark any page → open Bookmarks → edit that bookmark → paste the URL.
        </p>
      </div>

      <p className="text-xs text-text-muted border-t border-border pt-3">
        Already using the Tampermonkey userscript on this device? You don't need this — they do the same job
        and running both at once causes conflicts. The bookmarklet is the mobile alternative.
      </p>
    </div>
  )
}
