import type { Tab } from '../stores/uiStore'
import type { Component } from 'solid-js'

interface Props {
  activeTab: Tab
  onTabChange: (t: Tab) => void
  onToggleTheme: () => void
  onExportData: () => void
  onDeleteAllData: () => void
  theme: string
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'stats', label: 'Stats' },
  { id: 'payments', label: 'Payments' },
]

const Navbar: Component<Props> = (props) => {
  return (
    <nav class="flex items-center justify-between px-5 py-2.5 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/80 dark:border-white/10 shrink-0">
      <span class="flex items-center gap-2 font-bold text-lg tracking-tight">
        <span class="text-xl">🍳</span>
        TBC
      </span>

      <div class="flex gap-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full p-1">
        {tabs.map((t) => (
          <button
            onClick={() => props.onTabChange(t.id)}
            class={
              `px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ` +
              (props.activeTab === t.id
                ? 'bg-white dark:bg-slate-700 shadow-sm text-[#1a1f26] dark:text-white scale-[1.02]'
                : 'text-gray-600 dark:text-slate-400 hover:text-[#1a1f26] dark:hover:text-white hover:scale-[1.02]')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div class="flex items-center gap-1">
        <button
          onClick={props.onExportData}
          class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200 active:scale-90 text-sm"
          aria-label="Export data"
          title="Export all data"
        >
          📥
        </button>
        <button
          onClick={props.onDeleteAllData}
          class="p-2 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-400/10 transition-all duration-200 active:scale-90 text-sm"
          aria-label="Delete all data"
          title="Delete all data"
        >
          🗑️
        </button>
        <button
          onClick={props.onToggleTheme}
          class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200 active:scale-90"
          aria-label="Toggle theme"
        >
          {props.theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}

export default Navbar
