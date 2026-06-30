import { createStore } from 'zustand/vanilla'
import type { StoreApi, StateCreator, Mutate, StoreMutatorIdentifier } from 'zustand/vanilla'
import { createSignal } from 'solid-js'

type UseStore<T> = {
  (): T
} & StoreApi<T>

type CreateSolidStore = {
  <T, Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>
  ): Mutate<StoreApi<T>, Mos> & UseStore<T>
  <T>(): <Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>
  ) => Mutate<StoreApi<T>, Mos> & UseStore<T>
}

function wrapStore<T extends object>(api: StoreApi<T>): UseStore<T> {
  const [state, setState] = createSignal(api.getState())

  api.subscribe((s) => {
    setState(() => s as T)
  })

  function useStore(): T {
    return new Proxy({} as T, {
      get(_, prop: string | symbol) {
        return (state() as any)[prop]
      },
    })
  }

  return Object.assign(useStore, api) as UseStore<T>
}

export const createSolidStore = ((initializer: any) => {
  if (initializer) {
    return wrapStore(createStore(initializer) as any)
  }
  return (initializer: any) => wrapStore(createStore(initializer) as any)
}) as CreateSolidStore
