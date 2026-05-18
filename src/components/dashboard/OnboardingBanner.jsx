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
    <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-accent-faint border border-accent-faint-border rounded-lg text-sm">
      <div className="flex-1 text-text-secondary">
        <span className="text-accent-light font-bold">Tip:</span> Open any bot's stats modal in CharSnap, click the copy button, then{' '}
        <button
          onClick={() => { onImport(); dismiss() }}
          className="text-accent hover:text-accent-light underline underline-offset-2 transition inline-flex items-center gap-1 font-bold"
        >
          paste it here <ArrowRight size={12} />
        </button>{' '}
        to record a snapshot.
      </div>
      <button onClick={dismiss} className="text-text-muted hover:text-text-secondary transition shrink-0 mt-0.5">
        <X size={14} />
      </button>
    </div>
  )
}
