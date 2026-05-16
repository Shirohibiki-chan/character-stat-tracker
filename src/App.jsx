import { useBots } from './hooks/use-bots.js'

export default function App() {
  const { botCount } = useBots()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold tracking-tight">CharSnap Stats Tracker</h1>
      <p className="text-gray-400">You have {botCount} bot{botCount !== 1 ? 's' : ''}.</p>
    </div>
  )
}
