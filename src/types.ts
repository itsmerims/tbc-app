export interface Player {
  id: string
  name: string
  level: number
  active: boolean
  timeIn: number
  timeOut: number
  queueStart: number
  lastWait?: number
}

export interface PlayerStats {
  wins: number
  games: number
  pointsFor: number
  pointsAgainst: number
  totalWaitTime: number
  waitCount: number
}

export interface Court {
  id: string
  label: string
  locked: boolean
  team1: (string | null)[]
  team2: (string | null)[]
  matchStart: number | null
}

export interface QueueGroup {
  id: string
  label: string
  team1: (string | null)[]
  team2: (string | null)[]
}

export interface MatchRecord {
  team1: string[]
  team2: string[]
  score1: number
  score2: number
  winner: 1 | 2
  duration: string
  court: string
  waitTimes: Record<string, number>
}

export interface ShuttleRow {
  type: string
  tubePrice: number
  qty: number
}

export const LEVEL_NAMES = [
  'Beg', 'Adv Beg', 'Low Int', 'Mid Int',
  'Up Int', 'Adv', 'Expert',
] as const

export const LEVEL_COLORS = [
  'bg-level-1', 'bg-level-2', 'bg-level-3', 'bg-level-4',
  'bg-level-5', 'bg-level-6', 'bg-level-7',
] as const
