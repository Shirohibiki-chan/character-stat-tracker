import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'charsnap-onboarded'

export default function OnboardingBanner({ onImport }) {
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY))

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-amber-300/5 border border-amber-300/20 rounded-lg text-sm">
      <div className="flex-1 text-stone-400">
        <span className="text-amber-200 font-medium">Tip:</span> Open any bot's stats modal in CharSnap, click the copy button, then{' '}
        <button
          onClick={() => { onImport(); dismiss() }}
          className="text-amber-300 hover:text-amber-200 underline underline-offset-2 transition inline-flex items-center gap-1"
        >
          paste it here <ArrowRight size={12} />
        </button>{' '}
        to record a snapshot.
      </div>
      <button onClick={dismiss} className="text-stone-600 hover:text-stone-400 transition shrink-0 mt-0.5">
        <X size={14} />
      </button>
    </div>
  )
}
