import type { Component } from 'solid-js'
import PlayerSlot from './PlayerSlot'
import type { QueueGroup } from '../types'

interface Props {
  queue: QueueGroup
  onSlotClick: (team: 'team1' | 'team2', slot: number) => void
  onPlayerDrop: (playerName: string, team: 'team1' | 'team2', slot: number) => void
  onRemovePlayer: (team: 'team1' | 'team2', slot: number) => void
  onSend: () => void
  onRemove: () => void
  getPlayerLevel: (name: string) => number
}

const QueueCard: Component<Props> = (props) => {
  const allFilled = () =>
    props.queue.team1.filter(Boolean).length === 2 &&
    props.queue.team2.filter(Boolean).length === 2

  const playerCount = () =>
    [...props.queue.team1, ...props.queue.team2].filter(Boolean).length

  return (
    <div
      data-flip-id={`queue-${props.queue.id}`}
      class="glass-card-solid rounded-2xl border-l-4 border-amber-500/40 p-4"
    >
      <div class="flex items-center justify-between mb-3">
        <span class="font-bold text-sm tracking-tight text-[#1a1f26] dark:text-white">{props.queue.label}</span>
        <button
          onClick={props.onRemove}
          class="text-xs text-slate-400 hover:text-red-400 transition-all duration-200 active:scale-90"
        >
          🗑
        </button>
      </div>

      <div class="space-y-2">
        {(['team1', 'team2'] as const).map((team) => (
          <div
            class={
              `rounded-xl p-2.5 ` +
              (team === 'team1'
                ? 'bg-amber-500/5 border border-amber-500/10'
                : 'bg-amber-500/5 border border-amber-500/10')
            }
          >
            <div class="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-gray-600 dark:text-slate-400">
              {team === 'team1' ? 'Pair 1' : 'Pair 2'}
            </div>
            <div class="grid grid-cols-2 gap-2">
              {([0, 1] as const).map((slot) => (
                <PlayerSlot
                  playerName={props.queue[team][slot]}
                  team={team}
                  slot={slot}
                  onClick={() => props.onSlotClick(team, slot)}
                  onPlayerDrop={(name) => props.onPlayerDrop(name, team, slot)}
                  onRemovePlayer={() => props.onRemovePlayer(team, slot)}
                  getPlayerLevel={props.getPlayerLevel}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={props.onSend}
        disabled={!allFilled()}
        class={
          `w-full mt-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] ` +
          (allFilled()
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01]'
            : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-slate-500 border border-gray-200/80 dark:border-white/10 cursor-not-allowed')
        }
      >
        ▶ Queue ({playerCount()}/4)
      </button>
    </div>
  )
}

export default QueueCard
