import type { PlayerStats, MatchRecord } from '../types'

export interface MatchmakerResult {
  team1: [string, string]
  team2: [string, string]
  score: number
}

export function autoMatchmaker(
  candidates: { name: string; level: number; waitSeconds: number }[],
  matchHistory: MatchRecord[],
): MatchmakerResult | null {
  if (candidates.length < 4) return null

  const pool = [...candidates]
    .sort((a, b) => b.waitSeconds - a.waitSeconds)
    .slice(0, 12)

  if (pool.length < 4) return null

  const maxWait = Math.max(...pool.map((p) => p.waitSeconds), 1)
  let best: MatchmakerResult | null = null

  for (let a = 0; a < pool.length - 3; a++) {
    for (let b = a + 1; b < pool.length - 2; b++) {
      for (let c = b + 1; c < pool.length - 1; c++) {
        for (let d = c + 1; d < pool.length; d++) {
          const four = [pool[a], pool[b], pool[c], pool[d]]
          const splits: { t1: [number, number]; t2: [number, number] }[] = [
            { t1: [0, 1], t2: [2, 3] },
            { t1: [0, 2], t2: [1, 3] },
            { t1: [0, 3], t2: [1, 2] },
          ]
          for (const s of splits) {
            const t1 = [four[s.t1[0]], four[s.t1[1]]]
            const t2 = [four[s.t2[0]], four[s.t2[1]]]
            const score = scoreMatch(t1, t2, matchHistory, maxWait)
            if (!best || score > best.score) {
              best = {
                team1: [t1[0].name, t1[1].name] as [string, string],
                team2: [t2[0].name, t2[1].name] as [string, string],
                score,
              }
            }
          }
        }
      }
    }
  }

  return best
}

function scoreMatch(
  t1: { name: string; level: number; waitSeconds: number }[],
  t2: { name: string; level: number; waitSeconds: number }[],
  history: MatchRecord[],
  maxWait: number,
): number {
  const avg1 = (t1[0].level + t1[1].level) / 2
  const avg2 = (t2[0].level + t2[1].level) / 2
  const skillScore = 1 - Math.abs(avg1 - avg2) / 6

  const waitSum = [...t1, ...t2].reduce((s, p) => s + p.waitSeconds, 0)
  const waitScore = Math.min(1, waitSum / (maxWait * 4))

  const countPair = (p1: string, p2: string): number =>
    history.filter(
      (m) =>
        (m.team1.includes(p1) && m.team1.includes(p2)) ||
        (m.team2.includes(p1) && m.team2.includes(p2)),
    ).length
  const repeat = countPair(t1[0].name, t1[1].name) + countPair(t2[0].name, t2[1].name)
  const partnerScore = Math.max(0, 1 - repeat * 0.33)

  const exactMatchPlayed = history.some(
    (m) =>
      m.team1.includes(t1[0].name) &&
      m.team1.includes(t1[1].name) &&
      m.team2.includes(t2[0].name) &&
      m.team2.includes(t2[1].name),
  )
  const varietyScore = exactMatchPlayed ? 0 : 1

  return skillScore * 0.35 + waitScore * 0.3 + partnerScore * 0.2 + varietyScore * 0.15
}

export function ensureStats(
  name: string,
  stats: Record<string, PlayerStats>
): PlayerStats {
  if (!stats[name]) {
    stats[name] = {
      wins: 0, games: 0,
      pointsFor: 0, pointsAgainst: 0,
      totalWaitTime: 0, waitCount: 0,
    }
  }
  return stats[name]
}

export function avgLevel(
  team: string[],
  getLevel: (name: string) => number
): number {
  if (!team.length) return 0
  return team.reduce((s, p) => s + getLevel(p), 0) / team.length
}

export function pairPlayedBefore(
  p1: string,
  p2: string,
  history: MatchRecord[]
): boolean {
  return history.some(
    (m) =>
      (m.team1.includes(p1) && m.team1.includes(p2)) ||
      (m.team2.includes(p1) && m.team2.includes(p2))
  )
}

export function computeStreaks(history: MatchRecord[]): Record<string, number> {
  const streaks: Record<string, number> = {}
  history.forEach((m) => {
    const winners = m.winner === 1 ? m.team1 : m.team2
    const losers = m.winner === 1 ? m.team2 : m.team1
    winners.forEach((p) => {
      streaks[p] = (streaks[p] || 0) + 1
    })
    losers.forEach((p) => {
      streaks[p] = 0
    })
  })
  return streaks
}

export function computeBiggestUpset(
  history: MatchRecord[],
  getLevel: (name: string) => number
): { diff: number; match: MatchRecord } | null {
  let biggest: { diff: number; match: MatchRecord } | null = null
  history.forEach((m) => {
    const t1 = avgLevel(m.team1, getLevel)
    const t2 = avgLevel(m.team2, getLevel)
    const diff = Math.abs(t1 - t2)
    if (diff < 1) return
    const winnerLevel = m.winner === 1 ? t1 : t2
    const loserLevel = m.winner === 1 ? t2 : t1
    if (winnerLevel < loserLevel) {
      if (!biggest || diff > biggest.diff) {
        biggest = { diff, match: m }
      }
    }
  })
  return biggest
}

export function getDurationSeconds(duration: string): number {
  const [min, sec] = duration.split(':').map(Number)
  return min * 60 + sec
}

export function getAvgWait(
  name: string,
  history: MatchRecord[]
): number {
  let total = 0
  let count = 0
  history.forEach((m) => {
    const wt = m.waitTimes?.[name]
    if (wt !== undefined) {
      total += wt
      count++
    }
  })
  return count ? total / count : 0
}

export function getAvgPlayTime(
  name: string,
  history: MatchRecord[]
): number {
  let total = 0
  let count = 0
  history.forEach((m) => {
    if (m.team1.includes(name) || m.team2.includes(name)) {
      total += getDurationSeconds(m.duration)
      count++
    }
  })
  return count ? total / count : 0
}

export function recomputeStatsFromHistory(
  history: MatchRecord[],
  preservedStats?: Record<string, PlayerStats>
): Record<string, PlayerStats> {
  const stats: Record<string, PlayerStats> = {}

  history.forEach((m) => {
    ;[...m.team1, ...m.team2].forEach((p) => ensureStats(p, stats))
    m.team1.forEach((p) => {
      stats[p].games++
      stats[p].pointsFor += m.score1
      stats[p].pointsAgainst += m.score2
    })
    m.team2.forEach((p) => {
      stats[p].games++
      stats[p].pointsFor += m.score2
      stats[p].pointsAgainst += m.score1
    })
    if (m.winner === 1) {
      m.team1.forEach((p) => stats[p].wins++)
    } else {
      m.team2.forEach((p) => stats[p].wins++)
    }
  })

  if (preservedStats) {
    Object.entries(preservedStats).forEach(([name, s]) => {
      ensureStats(name, stats)
      stats[name].totalWaitTime = s.totalWaitTime || 0
      stats[name].waitCount = s.waitCount || 0
    })
  }

  return stats
}
