import { persist } from 'zustand/middleware'
import { createSolidStore } from '../lib/zustand-solid'
import { zustandStorage } from '../lib/storage'
import type { ShuttleRow } from '../types'

interface PaymentState {
  courtCost: number
  courtHours: number
  queueMasterFee: number
  clubFund: number
  numPlayers: number
  nonShowPlayers: number
  shuttles: ShuttleRow[]

  setCourtCost: (v: number) => void
  setCourtHours: (v: number) => void
  setQueueMasterFee: (v: number) => void
  setClubFund: (v: number) => void
  setNumPlayers: (v: number) => void
  setNonShowPlayers: (v: number) => void
  addShuttle: (row?: ShuttleRow) => void
  updateShuttle: (index: number, data: Partial<ShuttleRow>) => void
  removeShuttle: (index: number) => void

  compute: () => {
    shuttleTotal: number
    courtTotal: number
    totalCost: number
    costPerPlayer: number
    playingCost: number
    nonShowCost: number
    clubFund: number
    queueFee: number
    numPlayers: number
    nonShowPlayers: number
    playingPlayers: number
  }
}

export const usePaymentStore = createSolidStore<PaymentState>()(
  persist(
    (set, get) => ({
      courtCost: 0,
      courtHours: 0,
      queueMasterFee: 0,
      clubFund: 0,
      numPlayers: 0,
      nonShowPlayers: 0,
      shuttles: [],

      setCourtCost: (v) => set({ courtCost: v }),
      setCourtHours: (v) => set({ courtHours: v }),
      setQueueMasterFee: (v) => set({ queueMasterFee: v }),
      setClubFund: (v) => set({ clubFund: v }),
      setNumPlayers: (v) => set({ numPlayers: v }),
      setNonShowPlayers: (v) => set({ nonShowPlayers: v }),

      addShuttle: (row) => {
        set((s) => ({
          shuttles: [
            ...s.shuttles,
            row || { type: '', tubePrice: 0, qty: 0 },
          ],
        }))
      },

      updateShuttle: (index, data) => {
        set((s) => ({
          shuttles: s.shuttles.map((r, i) =>
            i === index ? { ...r, ...data } : r
          ),
        }))
      },

      removeShuttle: (index) => {
        set((s) => ({
          shuttles: s.shuttles.filter((_, i) => i !== index),
        }))
      },

      compute: () => {
        const s = get()
        const shuttleTotal = s.shuttles.reduce(
          (sum, row) => sum + (row.tubePrice / 12) * row.qty,
          0
        )
        const courtTotal = s.courtCost * s.courtHours
        const otherTotal = s.queueMasterFee + s.clubFund
        const totalCost = shuttleTotal + courtTotal + otherTotal

        const nsp = s.nonShowPlayers
        const pp = Math.max(s.numPlayers - nsp, 1)
        const courtPerPlayer = s.numPlayers ? courtTotal / s.numPlayers : 0
        const otherPerPlaying = otherTotal + shuttleTotal
        const playingCost = courtPerPlayer + (otherPerPlaying / pp)
        const nonShowCost = courtPerPlayer
        const costPerPlayer = s.numPlayers ? totalCost / s.numPlayers : 0

        return {
          shuttleTotal,
          courtTotal,
          totalCost,
          costPerPlayer,
          playingCost,
          nonShowCost,
          clubFund: s.clubFund,
          queueFee: s.queueMasterFee,
          numPlayers: s.numPlayers,
          nonShowPlayers: nsp,
          playingPlayers: pp,
        }
      },
    }),
    {
      name: 'tbc-payments',
      storage: zustandStorage,
    }
  )
)
