import { persist } from 'zustand/middleware'
import { createSolidStore } from '../lib/zustand-solid'
import { zustandStorage } from '../lib/storage'
import { ensureStats } from '../lib/algorithms'
import type { Player, PlayerStats } from '../types'

interface PlayerState {
  players: Player[]
  playerStats: Record<string, PlayerStats>
  _loaded: boolean

  addPlayer: (name: string, level: number, active?: boolean) => void
  updatePlayer: (id: string, data: Partial<Player>) => void
  removePlayer: (id: string) => void
  renamePlayer: (id: string, oldName: string, newName: string) => void

  recordWaitTime: (name: string, seconds: number) => void
  resetQueueStart: (name: string) => void

  getPlayer: (id: string) => Player | undefined
  getPlayerByName: (name: string) => Player | undefined
  playerExists: (name: string, excludeId?: string) => boolean
  activePlayers: () => Player[]

  loadComplete: () => void
}

let idCounter = 0
const genId = () => `p${++idCounter}_${Date.now()}`

export const usePlayerStore = createSolidStore<PlayerState>()(
  persist(
    (set, get) => ({
      players: [],
      playerStats: {},
      _loaded: false,

      addPlayer: (name, level, active = true) => {
        const now = Date.now()
        const player: Player = {
          id: genId(),
          name,
          level,
          active,
          timeIn: now,
          timeOut: 0,
          queueStart: now,
        }
        set((s) => {
          ensureStats(name, s.playerStats)
          return { players: [...s.players, player] }
        })
      },

      updatePlayer: (id, data) => {
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }))
      },

      removePlayer: (id) => {
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
        }))
      },

      renamePlayer: (id, oldName, newName) => {
        set((s) => {
          const stats = { ...s.playerStats }
          if (stats[oldName]) {
            stats[newName] = stats[oldName]
            delete stats[oldName]
          }
          return {
            players: s.players.map((p) =>
              p.id === id ? { ...p, name: newName } : p
            ),
            playerStats: stats,
          }
        })
      },

      recordWaitTime: (name, seconds) => {
        set((s) => {
          const stats = { ...s.playerStats }
          ensureStats(name, stats)
          stats[name].totalWaitTime += seconds
          stats[name].waitCount++
          return { playerStats: stats }
        })
      },

      resetQueueStart: (name) => {
        set((s) => ({
          players: s.players.map((p) =>
            p.name === name ? { ...p, queueStart: Date.now() } : p
          ),
        }))
      },

      getPlayer: (id) => get().players.find((p) => p.id === id),
      getPlayerByName: (name) =>
        get().players.find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
        ),
      playerExists: (name, excludeId) =>
        get().players.some(
          (p) =>
            p.id !== excludeId &&
            p.name.trim().toLowerCase() === name.trim().toLowerCase()
        ),
      activePlayers: () => get().players.filter((p) => p.active),

      loadComplete: () => set({ _loaded: true }),
    }),
    {
      name: 'tbc-players',
      storage: zustandStorage,
    }
  )
)
