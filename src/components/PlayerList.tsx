import { createMemo, createSignal, onCleanup, For, type Component } from 'solid-js'
import { useUIStore } from '../stores/uiStore'
import { formatTime } from '../lib/formats'
import type { Player, PlayerStats } from '../types'
import { LEVEL_NAMES } from '../types'

interface Props {
  players: Player[]
  selectedPlayerId: string | null
  onSelectPlayer: (id: string) => void
  playerStats: Record<string, PlayerStats>
  getPlayerLevel: (name: string) => number
}

const PlayerCard: Component<{
  player: Player
  stats: Record<string, PlayerStats>
  selected: boolean
  onSelect: () => void
  onStats: () => void
  onEdit: () => void
  tick: () => number
}> = (props) => {
  const waitSec = createMemo(() => {
    props.tick()
    const p = props.player
    if (!p.active) return 0
    const start = p.queueStart || p.timeIn
    return Math.floor((Date.now() - start) / 1000)
  })

  const avgWait = createMemo(() => {
    const s = props.stats[props.player.name]
    if (!s || !s.waitCount) return 0
    return Math.floor(s.totalWaitTime / s.waitCount)
  })

  const getWaitClass = (seconds: number) => {
    if (seconds >= 1500) return 'wait-indicator-20'
    if (seconds >= 1200) return 'wait-indicator-15'
    if (seconds >= 900) return 'wait-indicator-10'
    if (seconds >= 600) return 'wait-indicator-5'
    return ''
  }

  const p = props.player

  return (
    <div
      data-flip-id={`player-${p.id}`}
      onClick={props.onSelect}
      draggable={p.active}
      onDragStart={(e) => {
        const dt = e.dataTransfer
        if (!dt) return
        dt.setData('text/plain', p.name)
        dt.effectAllowed = 'move'
        const el = e.currentTarget
        el.classList.add('is-dragging')

        const ghost = document.createElement('div')
        const rect = el.getBoundingClientRect()
        ghost.style.cssText = [
          'position:absolute',
          'top:-9999px',
          'left:-9999px',
          'width:' + Math.min(rect.width, 160) + 'px',
          'height:72px',
          'padding:8px 10px',
          'background:#ffffff',
          'border-radius:10px',
          'border:2px solid #3b82f6',
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'justify-content:center',
          'gap:3px',
          'font-size:11px',
          'font-weight:600',
          'box-shadow:0 4px 16px rgba(0,0,0,0.12)',
        ].join(';')

        const badge = document.createElement('span')
        const lvl = p.level
        const rootStyle = getComputedStyle(document.documentElement)
        const lvlColor = rootStyle.getPropertyValue(`--color-level-${lvl}`).trim()
        const textColor = rootStyle.getPropertyValue(`--level-text-${lvl}`).trim() || lvlColor
        const mixBase = rootStyle.getPropertyValue('--badge-mix-base').trim() || 'white'
        badge.style.cssText = [
          'font-size:10px',
          'padding:2px 10px',
          'border-radius:999px',
          'font-weight:700',
          'text-transform:uppercase',
          'letter-spacing:0.15em',
          'color:' + textColor,
          'background:color-mix(in srgb,' + lvlColor + ' 18%,' + mixBase + ')',
          'border:1px solid color-mix(in srgb,' + lvlColor + ' 30%,transparent)',
        ].join(';')
        badge.textContent = LEVEL_NAMES[lvl - 1]

        const nameEl = document.createElement('div')
        nameEl.textContent = p.name
        nameEl.style.cssText = 'font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;'

        ghost.appendChild(badge)
        ghost.appendChild(nameEl)
        document.body.appendChild(ghost)
        dt.setDragImage(ghost, Math.min(rect.width, 160) / 2, 36)
        requestAnimationFrame(() => document.body.removeChild(ghost))
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove('is-dragging')
      }}
      class={
        `player-card p-3 rounded-xl border-2 transition-all duration-150 relative ` +
        (p.active ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-50') +
        (props.selected
          ? ' border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/10'
          : ' border-transparent hover:border-white/20 bg-white/50 dark:bg-white/[0.04]') +
        ` ${getWaitClass(waitSec())}`
      }
    >
      <div class="flex items-center justify-between mb-1">
        <span
          style={`color:var(--level-text-${p.level});background:color-mix(in srgb,var(--color-level-${p.level}) 18%,var(--badge-mix-base));border:1px solid color-mix(in srgb,var(--color-level-${p.level}) 30%,transparent)`}
          class={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-[0.15em]`}
        >
          {LEVEL_NAMES[p.level - 1]}
        </span>
        <div class="flex gap-1 drag-aux-hide">
          <button
            onClick={(e) => { e.stopPropagation(); props.onStats() }}
            class="text-xs text-slate-400 hover:text-slate-600 transition-all duration-200 active:scale-90"
          >
            📊
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); props.onEdit() }}
            class="text-xs text-slate-400 hover:text-slate-600 transition-all duration-200 active:scale-90"
          >
            ✏️
          </button>
        </div>
      </div>
      <div class="font-semibold text-sm tracking-tight text-[#1a1f26] dark:text-white">{p.name}</div>
      <div class="flex items-center gap-2 text-xs text-slate-500 mt-0.5 drag-aux-hide">
        <span class="tabular-nums">{formatTime(waitSec())}</span>
        <span class="text-slate-400/60">({formatTime(avgWait())})</span>
      </div>
      <span class="absolute bottom-1.5 right-3 text-[10px] tabular-nums font-semibold drag-aux-hide">
        <span class="text-emerald-500">{props.stats[p.name]?.wins ?? 0}</span>
        <span class="text-red-400">-{(props.stats[p.name]?.games ?? 0) - (props.stats[p.name]?.wins ?? 0)}</span>
      </span>
    </div>
  )
}

const PlayerList: Component<Props> = (props) => {
  const ui = useUIStore()
  const [tick, setTick] = createSignal(0)
  const timerId = setInterval(() => setTick((t) => t + 1), 1000)
  onCleanup(() => clearInterval(timerId))

  const sortedPlayers = createMemo(() => {
    const active = props.players.filter((p) => p.active)
    const inactive = props.players.filter((p) => !p.active)

    const sortKey = ui.playerSort
    const asc = ui.sortAsc

    const sorted = [...active].sort((a, b) => {
      let va: number | string, vb: number | string
      if (sortKey === 'name') {
        va = a.name.toLowerCase()
        vb = b.name.toLowerCase()
        return asc ? va.localeCompare(vb as string) : (vb as string).localeCompare(va as string)
      }
      if (sortKey === 'games') {
        va = props.playerStats[a.name]?.games ?? 0
        vb = props.playerStats[b.name]?.games ?? 0
      } else {
        va = a.queueStart ?? a.timeIn
        vb = b.queueStart ?? b.timeIn
      }
      return asc ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })

    return [...sorted, ...inactive]
  })

  return (
    <div class="flex flex-col overflow-hidden">
      <div class="p-4 pb-0 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-xs text-gray-600 font-medium">
            {props.players.length} player{props.players.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => ui.openPlayerModal()}
            class="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-all duration-200 active:scale-90"
          >
            + Add
          </button>
        </div>
        <div class="flex gap-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full p-0.5 text-xs">
          {(['waiting', 'name', 'games'] as const).map((k) => (
            <button
              onClick={() => ui.setPlayerSort(k)}
              class={
                `flex-1 py-1 rounded-full transition-all duration-200 ` +
                (ui.playerSort === k
                  ? 'bg-white dark:bg-slate-700 shadow-sm font-medium scale-[1.02] text-[#1a1f26] dark:text-white'
                  : 'text-gray-600 dark:text-slate-400 hover:text-[#1a1f26] dark:hover:text-white')
              }
            >
              {k === 'waiting' ? '⏱ Wait' : k === 'name' ? '📚 A-Z' : '🎮 Games'}
            </button>
          ))}
          <button
            onClick={() => ui.toggleSortAsc()}
            class="px-2 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200"
          >
            {ui.sortAsc ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 scrollbar-auto-hide">
        <div class="grid grid-cols-2 gap-3">
        <For each={sortedPlayers()}>
          {(p) => (
            <PlayerCard
              player={p}
              stats={props.playerStats}
              selected={props.selectedPlayerId === p.id}
              onSelect={() => props.onSelectPlayer(p.id)}
              onStats={() => ui.openStatsModal(p.name)}
              onEdit={() => ui.openPlayerModal(p.id)}
              tick={tick}
            />
          )}
        </For>
        </div>
      </div>
    </div>
  )
}

export default PlayerList
