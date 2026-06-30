import { persist } from 'zustand/middleware'
import { createSolidStore } from '../lib/zustand-solid'
import { zustandStorage } from '../lib/storage'
import { formatTime } from '../lib/formats'
import { autoMatchmaker } from '../lib/algorithms'
import type { Court, QueueGroup, MatchRecord } from '../types'

interface CourtState {
  courts: Court[]
  queues: QueueGroup[]
  matchHistory: MatchRecord[]

  addCourt: (label?: string) => void
  removeCourt: (id: string) => void
  updateCourtLabel: (id: string, label: string) => void

  addQueue: (label?: string) => void
  removeQueue: (id: string) => void
  renumberQueues: () => void

  assignPlayerToSlot: (
    target: { type: 'court' | 'queue'; id: string; team: 'team1' | 'team2'; slot: number },
    playerId: string | null
  ) => void
  swapSlots: (
    a: { type: 'court' | 'queue'; id: string; team: 'team1' | 'team2'; slot: number },
    b: { type: 'court' | 'queue'; id: string; team: 'team1' | 'team2'; slot: number }
  ) => void

  startMatch: (courtId: string) => void
  finishMatch: (courtId: string, score1: number, score2: number) => MatchRecord | null
  cancelMatch: (courtId: string) => void

  sendQueueToCourt: (queueId: string) => string | null

  getCourtPlayerNames: (courtId: string) => string[]
  getQueuePlayerNames: (queueId: string) => string[]

  getAvailableCourt: () => Court | undefined

  autoMatchmaker: (
    waitingPlayers: { name: string; level: number; waitSeconds: number }[]
  ) => { type: 'court' | 'queue'; id: string } | null

  updateMatch: (index: number, data: Partial<MatchRecord>) => void
  deleteMatch: (index: number) => void
}

let courtSeq = 0
let queueSeq = 0
const genCourtId = () => `c${++courtSeq}_${Date.now()}`
const genQueueId = () => `q${++queueSeq}_${Date.now()}`

function makeEmptyTeam(): (null)[] {
  return [null, null]
}

export const useCourtStore = createSolidStore<CourtState>()(
  persist(
    (set, get) => ({
      courts: [],
      queues: [],
      matchHistory: [],

      addCourt: (label) => {
        set((s) => ({
          courts: [
            ...s.courts,
            {
              id: genCourtId(),
              label: label || `Court ${s.courts.length + 1}`,
              locked: false,
              team1: makeEmptyTeam(),
              team2: makeEmptyTeam(),
              matchStart: null,
            },
          ],
        }))
      },

      removeCourt: (id) => {
        set((s) => ({
          courts: s.courts.filter((c) => c.id !== id).map((c, i) => {
            const m = c.label.match(/^Court \d+$/i)
            return m ? { ...c, label: `Court ${i + 1}` } : c
          }),
        }))
      },

      updateCourtLabel: (id, label) => {
        set((s) => ({
          courts: s.courts.map((c) =>
            c.id === id ? { ...c, label } : c
          ),
        }))
      },

      addQueue: (label) => {
        const existing = get().queues
        const nums = existing
          .map((q) => { const m = q.label.match(/^Queue (\d+)$/i); return m ? parseInt(m[1]) : 0 })
          .filter((n) => n > 0)
        const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : existing.length + 1
        set((s) => ({
          queues: [
            ...s.queues,
            {
              id: genQueueId(),
              label: label || `Queue ${nextNum}`,
              team1: makeEmptyTeam(),
              team2: makeEmptyTeam(),
            },
          ],
        }))
      },

      removeQueue: (id) => {
        set((s) => {
          const q = s.queues.find((q) => q.id === id)
          if (!q) return s
          return {
            queues: s.queues.filter((x) => x.id !== id).map((q, i) => {
              const m = q.label.match(/^Queue \d+$/i)
              return m ? { ...q, label: `Queue ${i + 1}` } : q
            }),
          }
        })
      },

      renumberQueues: () => {
        set((s) => ({
          queues: s.queues.map((q, i) => ({ ...q, label: `Queue ${i + 1}` })),
        }))
      },

      assignPlayerToSlot: (target, playerId) => {
        set((s) => {
          if (target.type === 'court') {
            return {
              courts: s.courts.map((c) =>
                c.id === target.id
                  ? {
                      ...c,
                      [target.team]: c[target.team].map((p, i) =>
                        i === target.slot ? playerId : p
                      ),
                    }
                  : c
              ),
            }
          } else {
            return {
              queues: s.queues.map((q) =>
                q.id === target.id
                  ? {
                      ...q,
                      [target.team]: q[target.team].map((p, i) =>
                        i === target.slot ? playerId : p
                      ),
                    }
                  : q
              ),
            }
          }
        })
      },

      swapSlots: (a, b) => {
        set((s) => {
          const getTarget = (t: typeof a) => {
            if (t.type === 'court') {
              const court = s.courts.find((c) => c.id === t.id)
              if (!court) return null
              return court[t.team][t.slot]
            }
            const queue = s.queues.find((q) => q.id === t.id)
            if (!queue) return null
            return queue[t.team][t.slot]
          }

          const valA = getTarget(a)
          const valB = getTarget(b)

          const assignCourt = (id: string, team: 'team1' | 'team2', slot: number, val: string | null) =>
            (c: Court) =>
              c.id === id
                ? { ...c, [team]: c[team].map((p, i) => (i === slot ? val : p)) }
                : c

          const assignQueue = (id: string, team: 'team1' | 'team2', slot: number, val: string | null) =>
            (q: QueueGroup) =>
              q.id === id
                ? { ...q, [team]: q[team].map((p, i) => (i === slot ? val : p)) }
                : q

          let courts = s.courts
          let queues = s.queues

          if (a.type === 'court') courts = courts.map(assignCourt(a.id, a.team, a.slot, valB))
          else queues = queues.map(assignQueue(a.id, a.team, a.slot, valB))

          if (b.type === 'court') courts = courts.map(assignCourt(b.id, b.team, b.slot, valA))
          else queues = queues.map(assignQueue(b.id, b.team, b.slot, valA))

          return { courts, queues }
        })
      },

      getCourtPlayerNames: (courtId) => {
        const court = get().courts.find((c) => c.id === courtId)
        if (!court) return []
        return [...court.team1, ...court.team2].filter(Boolean) as string[]
      },

      getQueuePlayerNames: (queueId) => {
        const queue = get().queues.find((q) => q.id === queueId)
        if (!queue) return []
        return [...queue.team1, ...queue.team2].filter(Boolean) as string[]
      },

      startMatch: (courtId) => {
        set((s) => ({
          courts: s.courts.map((c) =>
            c.id === courtId
              ? { ...c, locked: true, matchStart: Date.now() }
              : c
          ),
        }))
      },

      finishMatch: (courtId, score1, score2) => {
        const court = get().courts.find((c) => c.id === courtId)
        if (!court || !court.matchStart) return null

        const t1 = court.team1.filter(Boolean) as string[]
        const t2 = court.team2.filter(Boolean) as string[]
        const duration = Math.floor((Date.now() - court.matchStart) / 1000)
        const winner = score1 > score2 ? 1 : 2

        const match: MatchRecord = {
          team1: t1,
          team2: t2,
          score1,
          score2,
          winner,
          duration: formatTime(duration),
          court: court.label,
          waitTimes: {},
        }

        set((s) => ({
          courts: s.courts.map((c) =>
            c.id === courtId
              ? {
                  ...c,
                  locked: false,
                  matchStart: null,
                  team1: [null, null] as (string | null)[],
                  team2: [null, null] as (string | null)[],
                }
              : c
          ),
          matchHistory: [...s.matchHistory, match],
        }))

        return match
      },

      cancelMatch: (courtId) => {
        set((s) => ({
          courts: s.courts.map((c) =>
            c.id === courtId
              ? {
                  ...c,
                  locked: false,
                  matchStart: null,
                  team1: [null, null] as (string | null)[],
                  team2: [null, null] as (string | null)[],
                }
              : c
          ),
        }))
      },

      getAvailableCourt: () => {
        return get().courts.find(
          (c) => !c.locked && c.team1.every((p) => !p) && c.team2.every((p) => !p)
        )
      },

      autoMatchmaker: (waitingPlayers) => {
        const result = autoMatchmaker(waitingPlayers, get().matchHistory)
        if (!result) return null
        const target = get().getAvailableCourt()
        if (target) {
          set((s) => ({
            courts: s.courts.map((c) =>
              c.id === target.id
                ? {
                    ...c,
                    team1: [result.team1[0], result.team1[1]] as (string | null)[],
                    team2: [result.team2[0], result.team2[1]] as (string | null)[],
                  }
                : c
            ),
          }))
          return { type: 'court', id: target.id }
        }
        const n = get().queues.length + 1
        const queueId = genQueueId()
        set((s) => ({
          queues: [
            ...s.queues,
            {
              id: queueId,
              label: `Queue ${n}`,
              team1: [result.team1[0], result.team1[1]] as (string | null)[],
              team2: [result.team2[0], result.team2[1]] as (string | null)[],
            },
          ],
        }))
        return { type: 'queue', id: queueId }
      },

      sendQueueToCourt: (queueId) => {
        const queue = get().queues.find((q) => q.id === queueId)
        if (!queue) return null

        const players = [
          ...queue.team1, ...queue.team2,
        ].filter(Boolean) as string[]
        if (players.length !== 4) return null

        const target = get().getAvailableCourt()
        if (!target) return null

        set((s) => ({
          courts: s.courts.map((c) =>
            c.id === target.id
              ? {
                  ...c,
                  team1: [players[0], players[1]],
                  team2: [players[2], players[3]],
                }
              : c
          ),
          queues: s.queues.filter((q) => q.id !== queueId),
        }))

        get().renumberQueues()
        return target.id
      },

      updateMatch: (index, data) => {
        set((s) => {
          const history = [...s.matchHistory]
          if (history[index]) {
            history[index] = { ...history[index], ...data }
          }
          return { matchHistory: history }
        })
      },

      deleteMatch: (index) => {
        set((s) => ({
          matchHistory: s.matchHistory.filter((_, i) => i !== index),
        }))
      },
    }),
    {
      name: 'tbc-courts',
      storage: zustandStorage,
      partialize: (state: CourtState) => ({
        courts: state.courts,
        queues: state.queues,
        matchHistory: state.matchHistory,
      } as CourtState),
    }
  )
)
