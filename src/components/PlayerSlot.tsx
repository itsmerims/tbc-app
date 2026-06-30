import { createSignal, type Component } from 'solid-js'
import { LEVEL_NAMES } from '../types'

interface Props {
  playerName: string | null
  team: 'team1' | 'team2'
  slot: number
  onClick: () => void
  onPlayerDrop?: (playerName: string) => void
  onRemovePlayer?: () => void
  getPlayerLevel: (name: string) => string | number
  isEmpty?: boolean
}

const PlayerSlot: Component<Props> = (props) => {
  const [dragOver, setDragOver] = createSignal(false)

  const level = () => {
    if (!props.playerName) return 1
    return props.getPlayerLevel(props.playerName)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const name = e.dataTransfer?.getData('text/plain')
    if (name) {
      props.onPlayerDrop?.(name)
    }
  }

  return (
    <div
      onClick={props.onClick}
      onDragOver={handleDragOver}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
      onDrop={handleDrop}
      class={
        `player-slot group/slot flex items-center justify-center p-2 cursor-pointer transition-all duration-200 relative ` +
        (dragOver()
          ? 'ring-2 ring-blue-400 bg-blue-500/10 scale-[1.03] border-blue-400 border-2 border-dashed'
          : props.playerName
            ? `glass-card border-solid border ${props.team === 'team1' ? 'border-team1/30' : 'border-team2/30'}`
            : 'border-2 border-dashed border-white/10 hover:border-blue-400/40 hover:bg-blue-500/5')
      }
    >
      {props.playerName ? (
        <div class="text-center w-full relative">
          <button
            onClick={(e) => { e.stopPropagation(); props.onRemovePlayer?.() }}
            class="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500/80 text-white text-[10px] leading-none hover:bg-red-500 transition-all duration-150 active:scale-75 opacity-0 hover:opacity-100 group-hover/slot:opacity-100"
          >
            ×
          </button>
          <span
            class={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-[0.15em]`}
            style={`color:var(--level-text-${Number(level())});background:color-mix(in srgb,var(--color-level-${Number(level())}) 18%,var(--badge-mix-base));border:1px solid color-mix(in srgb,var(--color-level-${Number(level())}) 30%,transparent)`}
          >
            {LEVEL_NAMES[Number(level()) - 1]}
          </span>
          <div class="font-semibold text-xs mt-1 truncate tracking-tight">
            {props.playerName}
          </div>
        </div>
      ) : (
        <span class="text-xs text-slate-500 font-medium">Empty</span>
      )}
    </div>
  )
}

export default PlayerSlot
