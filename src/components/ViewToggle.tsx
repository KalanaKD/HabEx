import type { IconType } from 'react-icons'
import { LuChartColumn, LuList } from 'react-icons/lu'

export type View = 'list' | 'stats'

/** Segmented List / Stats switch used by the Habits and Expenses tabs. */
export default function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const btn = (v: View, Icon: IconType, label: string) => (
    <button
      onClick={() => onChange(v)}
      aria-label={label}
      className={`rounded-md p-2 ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
    >
      <Icon />
    </button>
  )
  return (
    <div className="flex rounded-lg bg-slate-200 p-0.5">
      {btn('list', LuList, 'List')}
      {btn('stats', LuChartColumn, 'Stats')}
    </div>
  )
}
