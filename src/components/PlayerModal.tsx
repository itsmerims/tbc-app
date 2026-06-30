import { createSignal, createEffect, type Component } from 'solid-js'
import { usePlayerStore } from '../stores/playerStore'
import { useUIStore } from '../stores/uiStore'
import { currentTimeInput, toTimestamp } from '../lib/formats'
import { LEVEL_NAMES } from '../types'

const PlayerModal: Component = () => {
  const players = usePlayerStore()
  const ui = useUIStore()

  const isEdit = () => !!ui.editingPlayerId
  const editingPlayer = () =>
    ui.editingPlayerId
      ? players.players.find((p) => p.id === ui.editingPlayerId) ?? null
      : null

  const [mode, setMode] = createSignal<'single' | 'bulk'>('single')
  const [name, setName] = createSignal('')
  const [bulkText, setBulkText] = createSignal('')
  const [level, setLevel] = createSignal(1)
  const [active, setActive] = createSignal(true)
  const [timeIn, setTimeIn] = createSignal('')
  const [timeOut, setTimeOut] = createSignal('')

  function parseLevel(str: string): number {
    const num = parseInt(str)
    if (!isNaN(num) && num >= 1 && num <= LEVEL_NAMES.length) return num
    const idx = LEVEL_NAMES.findIndex(
      (ln) => ln.toLowerCase() === str.toLowerCase()
    )
    if (idx !== -1) return idx + 1
    return 3
  }

  function parseLine(line: string): { name: string; level: number } | null {
    const trimmed = line.trim()
    if (!trimmed) return null
    const match = trimmed.match(/^(.+?)\s*-\s*(.+)$/)
    if (match) {
      return { name: match[1].trim(), level: parseLevel(match[2].trim()) }
    }
    return { name: trimmed, level: 3 }
  }

  createEffect(() => {
    const p = editingPlayer()
    if (p) {
      setMode('single')
      setName(p.name)
      setLevel(p.level)
      setActive(p.active)
      setTimeIn(
        p.timeIn
          ? new Date(p.timeIn).toTimeString().slice(0, 5)
          : ''
      )
      setTimeOut(
        p.timeOut
          ? new Date(p.timeOut).toTimeString().slice(0, 5)
          : ''
      )
    } else {
      setName('')
      setBulkText('')
      setLevel(1)
      setActive(true)
      setTimeIn(currentTimeInput())
      setTimeOut('')
    }
  })

  const handleSave = () => {
    if (mode() === 'single') {
      const n = name().trim()
      if (!n) return
      if (!isEdit() && players.playerExists(n)) {
        alert('Player with this name already exists.')
        return
      }

      if (isEdit() && editingPlayer()) {
        const oldName = editingPlayer()!.name
        if (oldName !== n) {
          players.renamePlayer(editingPlayer()!.id, oldName, n)
        }
        players.updatePlayer(editingPlayer()!.id, {
          name: n,
          level: level(),
          active: active(),
          timeIn: timeIn() ? toTimestamp(timeIn()) : editingPlayer()!.timeIn,
          timeOut: timeOut() ? toTimestamp(timeOut()) : 0,
        })
      } else {
        players.addPlayer(n, level(), active())
      }
      ui.closePlayerModal()
    } else {
      let added = 0
      let skipped = 0
      for (const line of bulkText().split('\n')) {
        const parsed = parseLine(line)
        if (!parsed) continue
        if (players.playerExists(parsed.name)) {
          skipped++
          continue
        }
        players.addPlayer(parsed.name, parsed.level, true)
        added++
      }
      ui.closePlayerModal()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !ui.editingPlayerId) {
      if (mode() === 'bulk' && !e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      handleSave()
    }
  }

  const bulkCount = () => {
    if (mode() !== 'bulk') return 0
    return bulkText().split('\n').filter((l) => l.trim()).length
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full max-w-sm mx-4 p-5 animate-fade-in">
        <h3 class="font-bold text-lg mb-4 text-[#1a1f26] dark:text-white">
          {isEdit() ? 'Edit Player' : 'Add Player'}
        </h3>

        {!isEdit() && (
          <div class="flex mb-4 rounded-lg overflow-hidden border border-gray-200/80 dark:border-slate-600">
            <button
              onClick={() => setMode('single')}
              class={`flex-1 py-1.5 text-sm font-medium transition ${
                mode() === 'single'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-transparent text-gray-600 dark:text-slate-400'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setMode('bulk')}
              class={`flex-1 py-1.5 text-sm font-medium transition ${
                mode() === 'bulk'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-transparent text-gray-600 dark:text-slate-400'
              }`}
            >
              Bulk
            </button>
          </div>
        )}

        {mode() === 'single' ? (
          <>
            <input
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder={isEdit() ? 'Player name' : 'Player name (or Name - 3)'}
              class="w-full px-3 py-2 rounded-lg border border-gray-200/80 dark:border-slate-600 bg-transparent mb-3 outline-none focus:border-indigo-500"
            />

            <select
              value={level()}
              onChange={(e) => setLevel(parseInt(e.currentTarget.value))}
              class="w-full px-3 py-2 rounded-lg border border-gray-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-[#1a1f26] dark:text-slate-100 mb-3 outline-none focus:border-indigo-500 dark:[color-scheme:dark]"
            >
              {LEVEL_NAMES.map((ln, i) => (
                <option value={i + 1} class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {ln}
                </option>
              ))}
            </select>

            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Time In</label>
                <input
                  type="time"
                  value={timeIn()}
                  onInput={(e) => setTimeIn(e.currentTarget.value)}
                  class="w-full px-3 py-2 rounded-lg border border-gray-200/80 dark:border-slate-600 bg-transparent outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Time Out</label>
                <input
                  type="time"
                  value={timeOut()}
                  onInput={(e) => setTimeOut(e.currentTarget.value)}
                  class="w-full px-3 py-2 rounded-lg border border-gray-200/80 dark:border-slate-600 bg-transparent outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <label class="flex items-center gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={active()}
                onChange={(e) => setActive(e.currentTarget.checked)}
                class="rounded"
              />
              Active Player
            </label>
          </>
        ) : (
          <>
            <textarea
              value={bulkText()}
              onInput={(e) => setBulkText(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder={"John - 1\nJane - 3\nBob"}
              rows={6}
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent mb-2 outline-none focus:border-blue-500 resize-none"
            />
            <p class="text-xs text-slate-500 mb-3">
              One player per line. Format: <code>Name - Level</code> (level 1-7, defaults to 3 - Low Int). Press Enter to add all.
            </p>
            {bulkCount() > 0 && (
              <p class="text-sm text-indigo-600 dark:text-indigo-400 mb-3">
                {bulkCount()} player{bulkCount() !== 1 ? 's' : ''} detected
              </p>
            )}
          </>
        )}

        <div class="flex gap-2">
          <button
            onClick={handleSave}
            class="flex-1 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            {mode() === 'bulk' ? `Add All (${bulkCount()})` : isEdit() ? 'Save' : 'Add'}
          </button>
          <button
            onClick={() => ui.closePlayerModal()}
            class="flex-1 py-2 bg-gray-100 dark:bg-slate-700 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition text-[#1a1f26] dark:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlayerModal
