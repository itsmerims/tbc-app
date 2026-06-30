import { createMemo, For, type Component } from 'solid-js'
import type { PlayerStats, MatchRecord, Player } from '../types'
import { getAvgWait, getAvgPlayTime } from '../lib/algorithms'
import { formatTime, formatClockTime } from '../lib/formats'

interface Props {
  playerName: string
  playerStats: Record<string, PlayerStats>
  matchHistory: MatchRecord[]
  players: Player[]
  getPlayerLevel: (name: string) => number
  onClose: () => void
}

const PlayerStatsTableModal: Component<Props> = (props) => {
  const s = () => props.playerStats[props.playerName]
  const losses = () => (s()?.games ?? 0) - (s()?.wins ?? 0)
  const diff = () => (s()?.pointsFor ?? 0) - (s()?.pointsAgainst ?? 0)
  const avgWait = () => getAvgWait(props.playerName, props.matchHistory)
  const avgPlay = () => getAvgPlayTime(props.playerName, props.matchHistory)
  const card = () =>
    props.players.find(
      (p) => p.name.toLowerCase() === props.playerName.toLowerCase()
    )

  const matches = createMemo(() =>
    props.matchHistory
      .slice()
      .reverse()
      .filter(
        (m) =>
          m.team1.includes(props.playerName) ||
          m.team2.includes(props.playerName)
      )
  )

  const opponentMap = createMemo(() => {
    const map: Record<string, number> = {}
    props.matchHistory.forEach((m) => {
      const isT1 = m.team1.includes(props.playerName)
      const isT2 = m.team2.includes(props.playerName)
      if (!isT1 && !isT2) return
      const opps = isT1 ? m.team2 : m.team1
      opps.forEach((o) => {
        if (o) map[o] = (map[o] || 0) + 1
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  })

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={props.onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fade-in"
      >
        <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 class="font-bold text-lg">{props.playerName}</h3>
          <button onClick={props.onClose} class="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <div class="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Games', value: s()?.games ?? 0 },
              { label: 'Wins', value: s()?.wins ?? 0 },
              { label: 'Losses', value: losses() },
              {
                label: '+/-',
                value: diff() > 0 ? `+${diff()}` : diff(),
              },
              {
                label: 'Avg Wait',
                value: `${(avgWait() / 60).toFixed(1)}m`,
              },
              {
                label: 'Avg Game',
                value: `${(avgPlay() / 60).toFixed(1)}m`,
              },
              {
                label: 'Time In',
                value: formatClockTime(card()?.timeIn ?? 0),
              },
              {
                label: 'Time Out',
                value: formatClockTime(card()?.timeOut ?? 0),
              },
            ].map((item) => (
              <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                <div class="text-lg font-bold">{item.value}</div>
                <div class="text-[10px] text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div class="mb-4">
            <div class="text-sm font-semibold mb-2">Opponents</div>
            <div class="flex flex-wrap gap-1">
              <For each={opponentMap()}>
                {([opp, count]) => (
                  <span
                    class={`text-xs px-2 py-0.5 rounded-full text-white font-medium bg-level-${props.getPlayerLevel(opp)}`}
                  >
                    {opp} ({count})
                  </span>
                )}
              </For>
            </div>
          </div>

          <div class="text-sm font-semibold mb-2">Match History</div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                  <th class="text-left py-1 pr-2">#</th>
                  <th class="text-left py-1 pr-2">T1</th>
                  <th class="text-left py-1 pr-2">T2</th>
                  <th class="text-left py-1 pr-2">W/L</th>
                  <th class="text-left py-1 pr-2">Score</th>
                  <th class="text-left py-1 pr-2">Dur</th>
                  <th class="text-left py-1 pr-2">Wait</th>
                </tr>
              </thead>
              <tbody>
                <For each={matches()}>
                  {(m, i) => {
                    const isT1 = m.team1.includes(props.playerName)
                    const won =
                      (m.winner === 1 && isT1) ||
                      (m.winner === 2 && !isT1)
                    const myWait = m.waitTimes?.[props.playerName] ?? 0
                    return (
                      <tr class="border-b border-slate-100 dark:border-slate-700/50">
                        <td class="py-1.5 pr-2">
                          {props.matchHistory.length - i()}
                        </td>
                        <td class="py-1.5 pr-2">{m.team1.join(', ')}</td>
                        <td class="py-1.5 pr-2">{m.team2.join(', ')}</td>
                        <td
                          class={
                            `py-1.5 pr-2 font-medium ` +
                            (won ? 'text-emerald-600' : 'text-red-500')
                          }
                        >
                          {won ? 'W' : 'L'}
                        </td>
                        <td class="py-1.5 pr-2">
                          {m.score1} - {m.score2}
                        </td>
                        <td class="py-1.5 pr-2">{m.duration}</td>
                        <td class="py-1.5">{formatTime(myWait)}</td>
                      </tr>
                    )
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerStatsTableModal
