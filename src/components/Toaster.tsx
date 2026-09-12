import { useToasts } from './toast'

export default function Toaster() {
  const items = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`animate-toast rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
            t.kind === 'xp' ? 'bg-indigo-600 text-white' : 'bg-ink text-canvas'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
