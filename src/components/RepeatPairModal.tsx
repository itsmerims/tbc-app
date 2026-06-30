import { createMemo, For, type Component } from 'solid-js'
import { pairPlayedBefore } from '../lib/algorithms'
import { LEVEL_NAMES, type Player, type MatchRecord } from '../types'

interface Props {
  players: [string, string]
  team: 'team1' | 'team2'
  waitingPlayers: Player[]
  matchHistory: MatchRecord[]
  getPlayerLevel: (name: string) => number
  onSelectSwap: (currentPlayer: string, replacement: string) => void
  onClose: () => void
}

const RepeatPairModal: Component<Props> = (props) => {
  const suggestions = (current: string, teammate: string) => {
    const currentLevel = props.getPlayerLevel(current)
    return props.waitingPlayers
      .filter(
        (p) =>
          p.name !== current &&
          p.name !== teammate &&
          !pairPlayedBefore(p.name, teammate, props.matchHistory)
      )
      .map((p) => ({
        name: p.name,
        level: p.level,
        diff: Math.abs(p.level - currentLevel),
      }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 6)
  }

  const suggestionsA = createMemo(() => suggestions(props.players[0], props.players[1]))
  const suggestionsB = createMemo(() => suggestions(props.players[1], props.players[0]))

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full max-w-sm mx-4 p-5 animate-fade-in">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-lg">🔄</span>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">Repeated Pair Detected</h3>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span class="font-semibold text-slate-700 dark:text-slate-300">{props.players[0]}</span>
          {' & '}
          <span class="font-semibold text-slate-700 dark:text-slate-300">{props.players[1]}</span>
          {' have played together before. Swap one with a player below.'}
        </p>

        <div class="space-y-3 max-h-72 overflow-y-auto">
          <SuggestionGroup
            label={`Replace ${props.players[0]}`}
            suggestions={suggestionsA()}
            onPick={(name) => props.onSelectSwap(props.players[0], name)}
          />
          <SuggestionGroup
            label={`Replace ${props.players[1]}`}
            suggestions={suggestionsB()}
            onPick={(name) => props.onSelectSwap(props.players[1], name)}
          />
        </div>

        <div class="mt-4 flex justify-end">
          <button
            onClick={props.onClose}
            class="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-all active:scale-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const SuggestionGroup: Component<{
  label: string
  suggestions: { name: string; level: number; diff: number }[]
  onPick: (name: string) => void
}> = (props) => (
  <div>
    <div class="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
      {props.label}
    </div>
    {props.suggestions.length === 0 ? (
      <p class="text-xs text-slate-400 dark:text-slate-500 italic">No suitable players available</p>
    ) : (
      <div class="space-y-1">
        <For each={props.suggestions}>
          {(s) => (
            <button
              onClick={() => props.onPick(s.name)}
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/50 dark:bg-white/[0.03] border border-white/20 dark:border-white/[0.06] hover:border-blue-400/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-left active:scale-[0.98]"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                  style={{
                    color: `var(--level-text-${s.level})`,
                    background: `color-mix(in srgb, var(--color-level-${s.level}) 18%, var(--badge-mix-base))`,
                    border: `1px solid color-mix(in srgb, var(--color-level-${s.level}) 30%, transparent)`,
                  }}
                >
                  {LEVEL_NAMES[s.level - 1]}
                </span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Δ{s.diff}</span>
              </div>
            </button>
          )}
        </For>
      </div>
    )}
  </div>
)

export default RepeatPairModal
