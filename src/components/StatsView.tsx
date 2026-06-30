import { createSignal, createMemo, For, type Component } from 'solid-js'
import { useUIStore } from '../stores/uiStore'
import { useCourtStore } from '../stores/courtStore'
import type { PlayerStats, MatchRecord, Player } from '../types'
import { LEVEL_NAMES } from '../types'
import {
  getDurationSeconds,
  computeStreaks,
  computeBiggestUpset,
} from '../lib/algorithms'

interface Props {
  playerStats: Record<string, PlayerStats>
  matchHistory: MatchRecord[]
  matchCount: number
  players: Player[]
  getPlayerLevel: (name: string) => number
}

const INSIGHT_ICONS: Record<string, string> = {
  'King of the Court': '👑',
  'Hottest Streak': '🔥',
  'Best Performer': '🏆',
  'Most Active': '🎮',
  'Longest Match': '⏱',
  'Closest Match': '⚖️',
  'Biggest Blowout': '💥',
  'Biggest Upset': '⚡',
}

function rankSuffix(i: number): string {
  if (i === 1) return 'st'
  if (i === 2) return 'nd'
  if (i === 3) return 'rd'
  return 'th'
}

const StatsView: Component<Props> = (props) => {
  const ui = useUIStore()

  const [skillOpen, setSkillOpen] = createSignal(true)
  const [leaderboardOpen, setLeaderboardOpen] = createSignal(true)
  const [resultsOpen, setResultsOpen] = createSignal(true)
  const courts = useCourtStore()

  const [excludePlayersDraft, setExcludePlayersDraft] = createSignal(ui.excludePlayers)
  const [minGamesDraft, setMinGamesDraft] = createSignal(String(ui.minGamesFilter))

  const applyFilters = () => {
    ui.setExcludePlayers(excludePlayersDraft())
    ui.setMinGamesFilter(parseInt(minGamesDraft()) || 0)
  }

  const handleFilterKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters()
  }

  const summary = createMemo(() => {
    const names = Object.keys(props.playerStats)
    const matches = props.matchHistory
    const totalPlayers = names.length
    const totalMatches = matches.length
    let totalGames = 0
    let totalDuration = 0
    matches.forEach((m) => {
      totalDuration += getDurationSeconds(m.duration)
    })
    names.forEach((n) => {
      totalGames += props.playerStats[n]?.games ?? 0
    })
    const avgGames = totalPlayers ? (totalGames / totalPlayers).toFixed(2) : '0'
    const avgDuration = totalMatches
      ? (totalDuration / totalMatches / 60).toFixed(2)
      : '0.00'
    let totalWait = 0
    let totalCount = 0
    names.forEach((n) => {
      const s = props.playerStats[n]
      if (s?.waitCount) {
        totalWait += s.totalWaitTime
        totalCount += s.waitCount
      }
    })
    const avgWait = totalCount ? (totalWait / totalCount / 60).toFixed(1) : '0.0'
    return { totalPlayers, totalMatches, avgGames, avgDuration, avgWait }
  })

  const excludedPlayers = () =>
    ui.excludePlayers
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

  const leaderboard = createMemo(() => {
    const minGames = ui.minGamesFilter
    const arr = Object.entries(props.playerStats)
      .map(([name, st]) => ({
        name,
        wins: st.wins,
        games: st.games,
        rate: st.games ? (st.wins / st.games) * 100 : 0,
        diff: st.pointsFor - st.pointsAgainst,
        avgWait: st.waitCount ? st.totalWaitTime / st.waitCount : 0,
      }))
      .filter(
        (p) =>
          p.games >= minGames &&
          !excludedPlayers().includes(p.name.trim().toLowerCase())
      )

    const { key, asc } = ui.leaderboardSort
    arr.sort((a, b) => {
      const va: unknown = a[key as keyof typeof a]
      const vb: unknown = b[key as keyof typeof b]
      if (key === 'name') {
        return asc
          ? (va as string).localeCompare(vb as string)
          : (vb as string).localeCompare(va as string)
      }
      if (key === 'avgWait') {
        return asc ? (va as number) - (vb as number) : (vb as number) - (va as number)
      }
      if ((va as number) < (vb as number)) return asc ? -1 : 1
      if ((va as number) > (vb as number)) return asc ? 1 : -1
      if (key === 'rate' && a.diff !== b.diff) {
        return asc ? a.diff - b.diff : b.diff - a.diff
      }
      return 0
    })
    return arr
  })

  const skillDist = createMemo(() => {
    const map: Record<number, { players: number; totalWinRate: number; totalGames: number }> = {}
    for (let i = 1; i <= 7; i++) map[i] = { players: 0, totalWinRate: 0, totalGames: 0 }
    props.players.forEach((p) => {
      const s = props.playerStats[p.name]
      const wr = s?.games ? (s.wins / s.games) * 100 : 0
      map[p.level].players++
      map[p.level].totalWinRate += wr
      map[p.level].totalGames += s?.games ?? 0
    })
    return map
  })

  const maxSkillPlayers = createMemo(() =>
    Math.max(...Object.values(skillDist()).map((s) => s.players), 1)
  )

  const insights = createMemo(() => {
    const items: { title: string; value: string }[] = []
    const history = props.matchHistory

    if (!history.length) return items

    const streaks = computeStreaks(history)
    const king = Object.entries(streaks)
      .map(([name, s]) => ({ name, streak: s }))
      .sort((a, b) => b.streak - a.streak)[0]
    if (king && king.streak > 0) {
      items.push({ title: 'King of the Court', value: `${king.name} (${king.streak})` })
    }

    const bestStreak = Object.entries(streaks)
      .map(([name, s]) => ({ name, streak: s }))
      .sort((a, b) => b.streak - a.streak)[0]
    if (bestStreak && bestStreak.streak > 0) {
      items.push({ title: 'Hottest Streak', value: `${bestStreak.name} (${bestStreak.streak})` })
    }

    const best = Object.entries(props.playerStats)
      .map(([name, st]) => ({ name, rate: st.games ? st.wins / st.games : 0, games: st.games }))
      .filter((p) => p.games >= 3)
      .sort((a, b) => b.rate - a.rate)[0]
    if (best) {
      items.push({ title: 'Best Performer', value: `${best.name} (${(best.rate * 100).toFixed(1)}%)` })
    }

    const mostActive = Object.entries(props.playerStats)
      .map(([name, st]) => ({ name, games: st.games }))
      .sort((a, b) => b.games - a.games)[0]
    if (mostActive) {
      items.push({ title: 'Most Active', value: `${mostActive.name} (${mostActive.games} games)` })
    }

    const durations = history.map((m) => getDurationSeconds(m.duration))
    if (durations.length) {
      const longest = Math.max(...durations)
      items.push({ title: 'Longest Match', value: `${Math.floor(longest / 60)} min` })
    }

    const diffs = history.map((m) => Math.abs(m.score1 - m.score2))
    if (diffs.length) {
      items.push({ title: 'Closest Match', value: `${Math.min(...diffs)} pts` })
      items.push({ title: 'Biggest Blowout', value: `${Math.max(...diffs)} pts` })
    }

    const upset = computeBiggestUpset(history, props.getPlayerLevel)
    if (upset) {
      items.push({
        title: 'Biggest Upset',
        value: `${upset.match.team1.join(' & ')} vs ${upset.match.team2.join(' & ')}`,
      })
    }

    return items
  })

  const sortHeaders = [
    { key: 'name', label: 'Player' },
    { key: 'wins', label: 'Wins' },
    { key: 'games', label: 'Games' },
    { key: 'rate', label: 'Win Rate' },
    { key: 'diff', label: '+/-' },
    { key: 'avgWait', label: 'Avg Wait' },
  ] as const

  return (
    <div class="h-full overflow-y-auto p-4 space-y-4 scrollbar-auto-hide">
      {/* ── Summary Metric Bar ── */}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: 'Players', value: summary().totalPlayers, border: '#3b82f6', dot: '#60a5fa' },
          { label: 'Matches', value: summary().totalMatches, border: '#10b981', dot: '#34d399' },
          { label: 'Avg Games', value: summary().avgGames, border: '#8b5cf6', dot: '#a78bfa' },
          { label: 'Avg Match (m)', value: summary().avgDuration, border: '#f59e0b', dot: '#fbbf24' },
          { label: 'Avg Wait (m)', value: summary().avgWait, border: '#f43f5e', dot: '#fb7185' },
        ].map((item) => (
          <div
            class="glass-card-solid rounded-xl p-3 text-center relative overflow-hidden"
            style={`border-left:2px solid ${item.border}`}
          >
            <div
              class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
              style={`background:${item.dot};box-shadow:0 0 6px ${item.dot}`}
            />
            <div class="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              {item.label}
            </div>
            <div class="text-xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Skill Distribution + Insights (side-by-side) ── */}
      <div class="glass-card-solid rounded-xl">
        <button
          onClick={() => setSkillOpen((p) => !p)}
          class="w-full flex items-center justify-between px-4 py-3 cursor-pointer touch-action-manipulation"
        >
          <h4 class="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
            Skill Level &amp; Insights
          </h4>
          <svg
            class={`w-4 h-4 text-slate-400 transition-transform duration-300 ${skillOpen() ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div
          class={`overflow-hidden transition-all duration-300 ease-out ${skillOpen() ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div class="px-4 pb-4 border-t border-white/10 dark:border-white/[0.06]">
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 pt-4">
              <div class="lg:col-span-3">
                <div class="space-y-2.5">
                  {Object.entries(skillDist()).map(([lv, sd]) => {
                    if (!sd.players) return null
                    const level = parseInt(lv)
                    const pct = (sd.players / maxSkillPlayers()) * 100
                    const avgWin = sd.players ? (sd.totalWinRate / sd.players).toFixed(1) : '0'
                    const avgG = sd.players ? Math.floor(sd.totalGames / sd.players) : 0
                    return (
                      <div class="flex items-center gap-3">
                        <div class="w-16 shrink-0">
                          <span class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            {LEVEL_NAMES[level - 1]}
                          </span>
                        </div>
                        <div class="flex-1 relative">
                          <div class="h-2 bg-white/30 dark:bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              class="h-full rounded-full relative"
                              style={`width:${pct}%;background:var(--color-level-${level});box-shadow:0 0 6px var(--color-level-${level}),inset 0 0 4px rgba(255,255,255,0.3)`}
                            />
                          </div>
                        </div>
                        <div class="w-10 text-right shrink-0">
                          <span class="text-xs font-bold tabular-nums text-slate-900 dark:text-white">{sd.players}</span>
                        </div>
                        <div class="w-16 text-right shrink-0">
                          <span class="text-xs tabular-nums text-slate-500 dark:text-slate-400 font-medium">{avgWin}%</span>
                        </div>
                        <div class="w-12 text-right shrink-0">
                          <span class="text-xs tabular-nums text-slate-500 dark:text-slate-400 font-medium">{avgG}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div class="lg:col-span-2">
                <div class="grid grid-cols-1 gap-2">
                  <For each={insights()}>
                    {(item) => (
                      <div class="rounded-xl p-2.5 bg-white/40 dark:bg-white/[0.02] border border-white/10 dark:border-white/[0.06] hover:border-blue-400/20 transition-all duration-200">
                        <div class="flex items-center gap-2.5">
                          <span class="text-base shrink-0 w-6 text-center">{INSIGHT_ICONS[item.title] || '📊'}</span>
                          <div class="min-w-0">
                            <div class="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                              {item.title}
                            </div>
                            <div class="text-base font-bold text-slate-900 dark:text-white truncate tabular-nums">
                              {item.value}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                  {insights().length === 0 && (
                    <p class="text-sm text-slate-500 text-center py-4">No match data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Leaderboard ── */}
      <div class="glass-card-solid rounded-xl">
        <button
          onClick={() => setLeaderboardOpen((p) => !p)}
          class="w-full flex items-center justify-between px-4 py-3 cursor-pointer touch-action-manipulation"
        >
          <h4 class="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
            Leaderboard
          </h4>
          <div class="flex items-center gap-3">
            <svg
              class={`w-4 h-4 text-slate-400 transition-transform duration-300 ${leaderboardOpen() ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </button>
        <div
          class={`overflow-hidden transition-all duration-300 ease-out ${leaderboardOpen() ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div class="px-4 pb-4 border-t border-white/10 dark:border-white/[0.06]">
            <div class="flex flex-wrap items-center gap-3 pt-4">
              <input
                value={excludePlayersDraft()}
                onInput={(e) => setExcludePlayersDraft(e.currentTarget.value)}
                onKeyDown={handleFilterKeyDown}
                placeholder="Exclude players..."
                class="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-lg bg-white/40 dark:bg-white/[0.04] border border-white/20 dark:border-white/[0.08] outline-none focus:border-blue-400/50 transition-all placeholder:text-slate-400/60"
              />
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Min Games</span>
                <input
                  type="number"
                  value={minGamesDraft()}
                  onInput={(e) => setMinGamesDraft(e.currentTarget.value)}
                  onKeyDown={handleFilterKeyDown}
                  class="w-16 px-2 py-1.5 text-sm rounded-lg bg-white/40 dark:bg-white/[0.04] border border-white/20 dark:border-white/[0.08] outline-none focus:border-blue-400/50 transition-all"
                />
              </div>
              <button
                onClick={applyFilters}
                class="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-90"
              >
                Filter
              </button>
            </div>
            <div class="overflow-x-auto pt-4">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-white/10 dark:border-white/[0.06]">
                    <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                    {sortHeaders.map((h) => (
                      <th
                        onClick={() => ui.setLeaderboardSort(h.key)}
                        class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                      >
                        {h.label}
                        {ui.leaderboardSort.key === h.key
                          ? ui.leaderboardSort.asc
                            ? ' ▴'
                            : ' ▾'
                          : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <For each={leaderboard()}>
                    {(p, i) => {
                      const rank = i() + 1
                      const isPodium = rank <= 3
                      const podiumColors = ['text-amber-400', 'text-slate-300', 'text-amber-600']
                      return (
                        <tr
                          class={
                            `border-b border-white/[0.03] transition-colors ` +
                            (isPodium ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]')
                          }
                        >
                          <td class="py-2 pr-3">
                            <span class={`font-bold tabular-nums ${isPodium ? podiumColors[rank - 1] : 'text-slate-400'}`}>
                              {rank}
                              <span class="text-[9px] ml-0.5">{rankSuffix(rank)}</span>
                            </span>
                          </td>
                          <td class={`py-2 pr-3 font-semibold ${isPodium ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {isPodium && <span class="mr-1">{['👑', '🥈', '🥉'][rank - 1]}</span>}
                            {p.name}
                          </td>
                          <td class="py-2 pr-3 tabular-nums text-slate-600 dark:text-slate-400 font-medium">{p.wins}</td>
                          <td class="py-2 pr-3 tabular-nums text-slate-600 dark:text-slate-400 font-medium">{p.games}</td>
                          <td class="py-2 pr-3 tabular-nums text-slate-600 dark:text-slate-400 font-medium">{p.rate.toFixed(1)}%</td>
                          <td class={`py-2 pr-3 tabular-nums font-medium ${p.diff > 0 ? 'text-emerald-500' : p.diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {p.diff > 0 ? '+' : ''}{p.diff}
                          </td>
                          <td class="py-2 pr-3 tabular-nums text-slate-600 dark:text-slate-400 font-medium">
                            {(p.avgWait / 60).toFixed(1)}m
                          </td>
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

      {/* ── Game Results ── */}
      <div class="glass-card-solid rounded-xl">
        <button
          onClick={() => setResultsOpen((p) => !p)}
          class="w-full flex items-center justify-between px-4 py-3 cursor-pointer touch-action-manipulation"
        >
          <h4 class="text-sm uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
            Game Results
          </h4>
          <svg
            class={`w-4 h-4 text-slate-400 transition-transform duration-300 ${resultsOpen() ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <div
          class={`overflow-hidden transition-all duration-300 ease-out ${resultsOpen() ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div class="px-4 pb-4 border-t border-white/10 dark:border-white/[0.06]">
            {props.matchHistory.length === 0 ? (
              <p class="text-sm text-slate-500 text-center py-4">No matches yet.</p>
            ) : (
              <div class="overflow-x-auto pt-4">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-white/10 dark:border-white/[0.06]">
                      <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                      <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Court</th>
                      <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team 1</th>
                      <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team 2</th>
                      <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Winner</th>
                      <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</th>
                      <th class="text-left py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                      <th class="py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={[...props.matchHistory].reverse()}>
                      {(m, i) => {
                        const realIdx = props.matchHistory.length - 1 - i()
                        return (
                          <tr class="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                            <td class="py-2 pr-3 tabular-nums text-slate-600 dark:text-slate-400 font-medium">
                              {props.matchHistory.length - i()}
                            </td>
                            <td class="py-2 pr-3 text-slate-700 dark:text-slate-300 font-medium">{m.court}</td>
                            <td class="py-2 pr-3 text-slate-600 dark:text-slate-400">{m.team1.join(', ')}</td>
                            <td class="py-2 pr-3 text-slate-600 dark:text-slate-400">{m.team2.join(', ')}</td>
                            <td class="py-2 pr-3">
                              <span class={`text-xs font-bold px-1.5 py-0.5 rounded-full ${m.winner === 1 ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-400'}`}>
                                Team {m.winner}
                              </span>
                            </td>
                            <td class="py-2 pr-3 tabular-nums font-bold">
                              <span class="text-slate-800 dark:text-slate-200">{m.score1} — {m.score2}</span>
                            </td>
                            <td class="py-2 pr-3 tabular-nums">
                              <span class="text-slate-500 dark:text-slate-400">{m.duration}</span>
                            </td>
                            <td class="py-2 text-center">
                              <div class="flex gap-1">
                                <button
                                  onClick={() => ui.openEditMatchModal(realIdx)}
                                  class="text-xs text-slate-400 hover:text-slate-300 transition-colors active:scale-90 touch-action-manipulation"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this match result?')) courts.deleteMatch(realIdx)
                                  }}
                                  class="text-xs text-red-400/60 hover:text-red-400 transition-colors active:scale-90 touch-action-manipulation"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsView
