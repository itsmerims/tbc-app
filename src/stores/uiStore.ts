import { persist } from 'zustand/middleware'
import { createSolidStore } from '../lib/zustand-solid'
import { zustandStorage } from '../lib/storage'

export type Tab = 'home' | 'stats' | 'payments'
export type PlayerSort = 'waiting' | 'name' | 'games'
export type LeaderboardSortKey = 'name' | 'wins' | 'games' | 'rate' | 'diff' | 'avgWait'

interface UIState {
  theme: 'light' | 'dark'
  activeTab: Tab
  playerSort: PlayerSort
  sortAsc: boolean
  leaderboardSort: { key: LeaderboardSortKey; asc: boolean }
  minGamesFilter: number
  excludePlayers: string
  excludeStats: string
  playerModalOpen: boolean
  editingPlayerId: string | null
  statsModalOpen: boolean
  statsModalPlayer: string | null
  statsTableModalOpen: boolean
  statsTableModalPlayer: string | null
  editMatchModalOpen: boolean
  editingMatchIndex: number | null
  playersPanelOpen: boolean
  queuePanelOpen: boolean

  toggleTheme: () => void
  setTheme: (t: 'light' | 'dark') => void
  setActiveTab: (t: Tab) => void
  setPlayerSort: (s: PlayerSort) => void
  toggleSortAsc: () => void
  setLeaderboardSort: (key: LeaderboardSortKey) => void
  setMinGamesFilter: (v: number) => void
  setExcludePlayers: (v: string) => void
  setExcludeStats: (v: string) => void
  openPlayerModal: (id?: string | null) => void
  closePlayerModal: () => void
  openStatsModal: (player: string) => void
  closeStatsModal: () => void
  openStatsTableModal: (player: string) => void
  closeStatsTableModal: () => void
  openEditMatchModal: (index: number) => void
  closeEditMatchModal: () => void
  togglePlayersPanel: () => void
  toggleQueuePanel: () => void
}

export const useUIStore = createSolidStore<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      activeTab: 'home',
      playerSort: 'waiting',
      sortAsc: false,
      leaderboardSort: { key: 'rate', asc: false },
      minGamesFilter: 0,
      excludePlayers: '',
      excludeStats: '',
      playerModalOpen: false,
      editingPlayerId: null,
      statsModalOpen: false,
      statsModalPlayer: null,
      statsTableModalOpen: false,
      statsTableModalPlayer: null,
      editMatchModalOpen: false,
      editingMatchIndex: null,
      playersPanelOpen: true,
      queuePanelOpen: true,

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (t) => set({ theme: t }),
      setActiveTab: (t) => set({ activeTab: t }),
      setPlayerSort: (s) => set({ playerSort: s }),
      toggleSortAsc: () => set((s) => ({ sortAsc: !s.sortAsc })),
      setLeaderboardSort: (key) =>
        set((s) => ({
          leaderboardSort: {
            key,
            asc: s.leaderboardSort.key === key ? !s.leaderboardSort.asc : false,
          },
        })),
      setMinGamesFilter: (v) => set({ minGamesFilter: v }),
      setExcludePlayers: (v) => set({ excludePlayers: v }),
      setExcludeStats: (v) => set({ excludeStats: v }),
      openPlayerModal: (id = null) =>
        set({ playerModalOpen: true, editingPlayerId: id }),
      closePlayerModal: () =>
        set({ playerModalOpen: false, editingPlayerId: null }),
      openStatsModal: (player) =>
        set({ statsModalOpen: true, statsModalPlayer: player }),
      closeStatsModal: () =>
        set({ statsModalOpen: false, statsModalPlayer: null }),
      openStatsTableModal: (player) =>
        set({ statsTableModalOpen: true, statsTableModalPlayer: player }),
      closeStatsTableModal: () =>
        set({ statsTableModalOpen: false, statsTableModalPlayer: null }),
      openEditMatchModal: (index) =>
        set({ editMatchModalOpen: true, editingMatchIndex: index }),
      closeEditMatchModal: () =>
        set({ editMatchModalOpen: false, editingMatchIndex: null }),
      togglePlayersPanel: () => set((s) => ({ playersPanelOpen: !s.playersPanelOpen })),
      toggleQueuePanel: () => set((s) => ({ queuePanelOpen: !s.queuePanelOpen })),
    }),
    {
      name: 'tbc-ui',
      storage: zustandStorage,
      partialize: (state: UIState) => ({
        theme: state.theme,
        excludePlayers: state.excludePlayers,
        excludeStats: state.excludeStats,
        playersPanelOpen: state.playersPanelOpen,
        queuePanelOpen: state.queuePanelOpen,
      } as UIState),
    }
  )
)
