import { createMemo, type Component } from 'solid-js'
import { LEVEL_NAMES } from '../types'
import type { PlayerStats, MatchRecord } from '../types'
import { getAvgPlayTime } from '../lib/algorithms'

interface Props {
  playerName: string
  playerStats: Record<string, PlayerStats>
  matchHistory: MatchRecord[]
  getPlayerLevel: (name: string) => number
  onClose: () => void
}

const PlayerStatsModal: Component<Props> = (props) => {
  const s = () => props.playerStats[props.playerName]
  const level = () => props.getPlayerLevel(props.playerName)
  const losses = () => (s()?.games ?? 0) - (s()?.wins ?? 0)
  const rate = () =>
    s()?.games ? ((s()!.wins / s()!.games) * 100).toFixed(1) + '%' : '0%'
  const diff = () => (s()?.pointsFor ?? 0) - (s()?.pointsAgainst ?? 0)
  const avgWait = () =>
    s() ? (getAvgWaitFromStats(s()!) / 60).toFixed(1) : '0.0'
  const avgPlay = () =>
    s() ? (getAvgPlayTime(props.playerName, props.matchHistory) / 60).toFixed(1) : '0.0'

  const rank = createMemo(() => {
    const players = Object.entries(props.playerStats)
      .map(([name, st]) => ({
        name,
        rate: st.games ? (st.wins / st.games) * 100 : 0,
        games: st.games,
      }))
      .filter((p) => p.games >= 5)
      .sort((a, b) => b.rate - a.rate)
    const idx = players.findIndex((p) => p.name === props.playerName)
    return idx >= 0 ? idx + 1 : null
  })

  const badge = createMemo(() => {
    const r = rank()
    if (r === 1) return { text: '🥇 MVP', cls: 'bg-yellow-400 text-black' }
    if (r === 2) return { text: '🥈 Top 2', cls: 'bg-slate-300 text-black' }
    if (r === 3) return { text: '🥉 Top 3', cls: 'bg-orange-500 text-white' }
    if (r !== null) {
      const r2 = rate()
      const pct = parseFloat(r2)
      if (pct >= 80) return { text: '🔥 Elite', cls: 'bg-red-500 text-white' }
      if (pct >= 65) return { text: '💪 Strong', cls: 'bg-emerald-500 text-white' }
      if (pct >= 40) return { text: '⚖️ Balanced', cls: 'bg-blue-500 text-white' }
      return { text: '🧊 Cold', cls: 'bg-slate-500 text-white' }
    }
    return null
  })

  const gradients: Record<number, string> = {
    1: '#374151', 2: '#2563eb', 3: '#059669',
    4: '#15803d', 5: '#d97706', 6: '#ea580c', 7: '#b91c1c',
  }

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
      onClick={props.onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        class="rounded-2xl p-6 text-white w-[360px] shadow-2xl animate-fade-in"
        style={{ background: gradients[level()] || '#0f172a' }}
      >
        <div class="flex justify-end">
          <button
            onClick={props.onClose}
            class="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm hover:bg-white/30 transition"
          >
            ✕
          </button>
        </div>

        <div class="text-center">
          <h3 class="text-xl font-extrabold">{props.playerName}</h3>
          <span class="inline-block px-3 py-1 rounded-full text-xs bg-white/10 mt-1">
            {LEVEL_NAMES[level() - 1]}
          </span>
        </div>

        <div class="text-center mt-4">
          <div class="text-4xl font-extrabold">{rate()}</div>
          <div class="text-xs opacity-70">Win Rate</div>
        </div>

        <div class="h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
          <div
            class="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: rate() }}
          />
        </div>

        {badge() && (
          <div class="flex justify-center mt-3">
            <span class={`px-3 py-1 rounded-full text-xs font-semibold ${badge()!.cls}`}>
              {badge()!.text}
            </span>
          </div>
        )}

        <div class="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Games', value: s()?.games ?? 0 },
            { label: 'Wins', value: s()?.wins ?? 0 },
            { label: 'Losses', value: losses() },
            { label: '+/-', value: diff() > 0 ? `+${diff()}` : diff() },
            { label: 'Avg Play', value: `${avgPlay()}m` },
            { label: 'Avg Wait', value: `${avgWait()}m` },
          ].map((item) => (
            <div class="bg-white/5 rounded-xl p-2 text-center">
              <div class="text-lg font-bold">{item.value}</div>
              <div class="text-[10px] opacity-60">{item.label}</div>
            </div>
          ))}
        </div>

        <div class="text-center text-[10px] opacity-50 mt-4">
          Stats by TBC
        </div>
      </div>
    </div>
  )
}

function getAvgWaitFromStats(s: PlayerStats): number {
  if (!s || !s.waitCount) return 0
  return s.totalWaitTime / s.waitCount
}

export default PlayerStatsModal
