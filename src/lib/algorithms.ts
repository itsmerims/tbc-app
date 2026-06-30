import type { PlayerStats, MatchRecord } from '../types'

// ─── Configuration ─────────────────────────────────────────────

const POOL_MAX_SIZE = 12
const MAX_ACCEPTABLE_WAIT_SEC = 600       // 10 minutes → normalized wait score caps here
const CRITICAL_WAIT_THRESHOLD_SEC = 450    // 7.5 minutes → triggers dynamic weight shift
const SKILL_DECAY_LAMBDA = 0.12            // exp(-λ * Δ²) — larger = steeper penalty for mismatched teams
const PARTNER_DECAY_RATE = 0.5             // exp(-rate * count) — repeat partner penalty curve
const VARIETY_DECAY_RATE = 0.3             // exp(-rate * recentMatches) — softer variety

// base weights (sum = 1.0)
const W_SKILL = 0.35
const W_WAIT = 0.30
const W_PARTNER = 0.20
const W_VARIETY = 0.15

// when critical wait is triggered, weight shifts:
//   skill loses SHIFT_AMOUNT, wait gains SHIFT_AMOUNT
const SHIFT_AMOUNT = 0.15

// ─── Types ─────────────────────────────────────────────────────

interface PlayerCandidate {
  name: string
  level: number
  waitSeconds: number
}

export interface MatchmakerResult {
  team1: [string, string]
  team2: [string, string]
  score: number
}

// ─── Public API ────────────────────────────────────────────────

export function autoMatchmaker(
  candidates: PlayerCandidate[],
  matchHistory: MatchRecord[],
): MatchmakerResult | null {
  if (candidates.length < 4) return null

  // 1. Sort by wait descending, take top N
  const pool = [...candidates]
    .sort((a, b) => b.waitSeconds - a.waitSeconds)
    .slice(0, POOL_MAX_SIZE)

  if (pool.length < 4) return null

  // 2. Detect queue starvation → dynamic weight shift
  const hasCriticalWaiter = pool.some(
    (p) => p.waitSeconds >= CRITICAL_WAIT_THRESHOLD_SEC,
  )
  const skillW = hasCriticalWaiter ? W_SKILL - SHIFT_AMOUNT : W_SKILL
  const waitW  = hasCriticalWaiter ? W_WAIT  + SHIFT_AMOUNT : W_WAIT

  // 3. Brute-force combinations (C(12,4) = 495 worst-case, each evals 3 splits → ~1500 evals — fine)
  let best: MatchmakerResult | null = null

  for (let a = 0; a < pool.length - 3; a++) {
    for (let b = a + 1; b < pool.length - 2; b++) {
      for (let c = b + 1; c < pool.length - 1; c++) {
        for (let d = c + 1; d < pool.length; d++) {
          const four = [pool[a], pool[b], pool[c], pool[d]]

          // Quick upper-bound prune: skip if this group cannot beat current best
          if (best) {
            if (best.score >= 1.0) continue
          }

          const splits: [number, number][][] = [
            [[0, 1], [2, 3]],
            [[0, 2], [1, 3]],
            [[0, 3], [1, 2]],
          ]
          for (const s of splits) {
            const t1 = [four[s[0][0]], four[s[0][1]]]
            const t2 = [four[s[1][0]], four[s[1][1]]]
            const score = scoreMatch(t1, t2, matchHistory, skillW, waitW)
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

// ─── Scoring ───────────────────────────────────────────────────

function scoreMatch(
  t1: PlayerCandidate[],
  t2: PlayerCandidate[],
  history: MatchRecord[],
  skillW: number,
  waitW: number,
): number {
  const partners = [t1, t2]
  const all = [...t1, ...t2]

  // Skill balance: exponential decay on squared level difference
  const avg1 = (t1[0].level + t1[1].level) / 2
  const avg2 = (t2[0].level + t2[1].level) / 2
  const delta = Math.abs(avg1 - avg2)
  const skillScore = Math.exp(-SKILL_DECAY_LAMBDA * delta * delta)
  //   Δ=0 → 1.0, Δ=1 → 0.89, Δ=2 → 0.62, Δ=3 → 0.34, Δ=4 → 0.15, Δ=5 → 0.05, Δ=6 → 0.01

  // Wait time: normalized against MAX_ACCEPTABLE_WAIT, capped at 1.0
  const totalWait = all.reduce((s, p) => s + p.waitSeconds, 0)
  const waitScore = Math.min(1, totalWait / (MAX_ACCEPTABLE_WAIT_SEC * 4))

  // Repeat partners: exponential decay on cumulative repeat count
  let repeatCount = 0
  for (const team of partners) {
    for (let i = 0; i < history.length; i++) {
      const m = history[i]
      if (
        (m.team1.includes(team[0].name) && m.team1.includes(team[1].name)) ||
        (m.team2.includes(team[0].name) && m.team2.includes(team[1].name))
      ) {
        repeatCount++
      }
    }
  }
  const partnerScore = Math.exp(-PARTNER_DECAY_RATE * repeatCount)
  //   0 reps → 1.0, 1 → 0.61, 2 → 0.37, 3 → 0.22, 4 → 0.14

  // Variety: exponential decay on how many times this exact 4-tuple has played together
  let exactCount = 0
  for (const m of history) {
    const seen = new Set([...m.team1, ...m.team2])
    if (all.every((p) => seen.has(p.name))) exactCount++
  }
  const varietyScore = Math.exp(-VARIETY_DECAY_RATE * exactCount)
  //   0 occurrences → 1.0, 1 → 0.74, 2 → 0.55, 3 → 0.41

  return skillScore * skillW + waitScore * waitW + partnerScore * W_PARTNER + varietyScore * W_VARIETY
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
