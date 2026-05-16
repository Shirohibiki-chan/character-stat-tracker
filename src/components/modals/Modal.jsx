import { useEffect, useState } from 'react'

export default function Modal({ onClose, isDirty = false, children }) {
  const [confirming, setConfirming] = useState(false)

  function tryClose() {
    if (isDirty) setConfirming(true)
    else onClose()
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key !== 'Escape') return
      if (confirming) { setConfirming(false); return }
      if (isDirty) setConfirming(true)
      else onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isDirty, confirming, onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={tryClose}
      >
        {children}
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        >
          <div
            className="bg-stone-950 border border-stone-800 rounded-xl p-6 shadow-2xl text-center w-full max-w-xs mx-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm text-stone-200 mb-1">Discard changes?</p>
            <p className="text-xs text-stone-500 mb-5">Your unsaved changes will be lost.</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs uppercase tracking-wider bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded transition"
              >
                Discard
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-xs uppercase tracking-wider text-stone-400 hover:text-stone-200 border border-stone-700 hover:border-stone-500 rounded transition"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
