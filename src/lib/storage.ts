import localforage from 'localforage'
import { createJSONStorage } from 'zustand/middleware'

localforage.config({
  name: 'tbc-app',
  storeName: 'tbc_store',
  description: 'Badminton Queuing Manager persistent storage',
})

const rawStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await localforage.getItem<string>(name)
    } catch {
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name)
  },
}

export const zustandStorage = createJSONStorage(() => rawStorage)
