import { createSignal, type Component } from 'solid-js'
import { useCourtStore } from '../stores/courtStore'
import type { MatchRecord } from '../types'

interface Props {
  index: number
  match: MatchRecord
  onClose: () => void
}

const MatchEditModal: Component<Props> = (props) => {
  const courts = useCourtStore()
  const [score1, setScore1] = createSignal(props.match.score1)
  const [score2, setScore2] = createSignal(props.match.score2)
  const [winner, setWinner] = createSignal<1 | 2>(props.match.winner)
  const [duration, setDuration] = createSignal(props.match.duration)

  const handleSave = () => {
    courts.updateMatch(props.index, {
      score1: score1(),
      score2: score2(),
      winner: winner(),
      duration: duration(),
    })
    props.onClose()
  }

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        class="rounded-2xl p-6 w-[380px] shadow-2xl animate-fade-in glass-card-solid"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Edit Match</h3>
          <button
            onClick={props.onClose}
            class="w-7 h-7 rounded-full bg-white/40 dark:bg-white/10 flex items-center justify-center text-xs hover:bg-white/60 dark:hover:bg-white/20 transition"
          >
            ✕
          </button>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span class="font-semibold text-slate-700 dark:text-slate-300">{props.match.court}</span>
          <span class="mx-2">·</span>
          {props.match.team1.join(', ')} vs {props.match.team2.join(', ')}
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Team 1 Score
              </label>
              <input
                type="number"
                value={score1()}
                onInput={(e) => setScore1(parseInt(e.currentTarget.value) || 0)}
                class="w-full px-3 py-2 text-sm rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/30 dark:border-white/[0.08] outline-none focus:border-blue-400/50 transition-all text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Team 2 Score
              </label>
              <input
                type="number"
                value={score2()}
                onInput={(e) => setScore2(parseInt(e.currentTarget.value) || 0)}
                class="w-full px-3 py-2 text-sm rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/30 dark:border-white/[0.08] outline-none focus:border-blue-400/50 transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
              Winner
            </label>
            <div class="flex gap-2">
              <button
                onClick={() => setWinner(1)}
                class={`flex-1 py-2 text-sm font-bold rounded-xl border transition-all ${
                  winner() === 1
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-400/30'
                    : 'bg-white/40 text-slate-400 border-white/20 hover:bg-white/60'
                }`}
              >
                Team 1
              </button>
              <button
                onClick={() => setWinner(2)}
                class={`flex-1 py-2 text-sm font-bold rounded-xl border transition-all ${
                  winner() === 2
                    ? 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-400/30'
                    : 'bg-white/40 text-slate-400 border-white/20 hover:bg-white/60'
                }`}
              >
                Team 2
              </button>
            </div>
          </div>

          <div>
            <label class="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
              Duration
            </label>
            <input
              type="text"
              value={duration()}
              onInput={(e) => setDuration(e.currentTarget.value)}
              placeholder="e.g. 12:34"
              class="w-full px-3 py-2 text-sm rounded-xl bg-white/60 dark:bg-white/[0.06] border border-white/30 dark:border-white/[0.08] outline-none focus:border-blue-400/50 transition-all text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div class="flex gap-2 mt-5">
          <button
            onClick={props.onClose}
            class="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-white/30 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/[0.06] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            class="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default MatchEditModal
