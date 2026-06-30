import { createEffect, createSignal, Show, For } from 'solid-js'
import { usePlayerStore } from './stores/playerStore'
import { useCourtStore } from './stores/courtStore'
import { useUIStore, type Tab } from './stores/uiStore'
import { usePaymentStore } from './stores/paymentStore'
import { recomputeStatsFromHistory } from './lib/algorithms'
import localforage from 'localforage'
import Navbar from './components/Navbar'
import CollapsiblePanel from './components/CollapsiblePanel'
import PlayerList from './components/PlayerList'
import CourtCard from './components/CourtCard'
import QueueCard from './components/QueueCard'
import PlayerModal from './components/PlayerModal'
import StatsView from './components/StatsView'
import PaymentsView from './components/PaymentsView'
import PlayerStatsModal from './components/PlayerStatsModal'
import PlayerStatsTableModal from './components/PlayerStatsTableModal'
import MatchEditModal from './components/MatchEditModal'

export default function App() {
  const players = usePlayerStore()
  const courts = useCourtStore()
  const ui = useUIStore()

  const [selectedPlayerId, setSelectedPlayerId] = createSignal<string | null>(null)

  createEffect(() => {
    const theme = ui.theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  })

  createEffect(() => {
    if (courts.matchHistory.length > 0 || players._loaded) {
      const preserved: Record<string, import('./types').PlayerStats> = {}
      Object.entries(players.playerStats).forEach(([k, v]) => {
        preserved[k] = { ...v }
      })
      const recomputed = recomputeStatsFromHistory(courts.matchHistory, preserved)
      if (JSON.stringify(recomputed) !== JSON.stringify(players.playerStats)) {
        usePlayerStore.setState({ playerStats: recomputed })
      }
    }
  })

  const waitingPlayers = () =>
    players.players.filter((p) => {
      const onLockedCourt = courts.courts.some(
        (c) => c.locked && (c.team1.includes(p.name) || c.team2.includes(p.name))
      )
      const inQueue = courts.queues.some(
        (q) => q.team1.includes(p.name) || q.team2.includes(p.name)
      )
      return !onLockedCourt && !inQueue
    })

  const getPlayerLevel = (name: string) => {
    const p = players.players.find(
      (x) => x.name.toLowerCase() === name.toLowerCase()
    )
    return p?.level ?? 1
  }

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId((prev) => (prev === id ? null : id))
  }

  const handleAssignToSlot = (
    targetType: 'court' | 'queue',
    targetId: string,
    team: 'team1' | 'team2',
    slot: number
  ) => {
    const selectedId = selectedPlayerId()
    if (!selectedId) return

    const player = players.players.find((p) => p.id === selectedId)
    if (!player) return

    const target =
      targetType === 'court'
        ? courts.courts.find((c) => c.id === targetId)
        : courts.queues.find((q) => q.id === targetId)
    if (!target) return

    const slotPlayerName = target[team][slot]
    removePlayerFromAllSlots(player.name)
    if (slotPlayerName) {
      const slotPlayer = players.players.find(
        (p) => p.name === slotPlayerName
      )
      if (slotPlayer) {
        setSelectedPlayerId(slotPlayer.id)
      }
      courts.assignPlayerToSlot(
        { type: targetType, id: targetId, team, slot },
        player.name
      )
    } else {
      courts.assignPlayerToSlot(
        { type: targetType, id: targetId, team, slot },
        player.name
      )
      setSelectedPlayerId(null)
    }
  }

  const handleRemovePlayer = (
    targetType: 'court' | 'queue',
    targetId: string,
    team: 'team1' | 'team2',
    slot: number
  ) => {
    courts.assignPlayerToSlot(
      { type: targetType, id: targetId, team, slot },
      null
    )
  }

  const removePlayerFromAllSlots = (name: string) => {
    const nameLower = name.toLowerCase()
    courts.courts.forEach((c) => {
      ;(['team1', 'team2'] as const).forEach((t) => {
        c[t].forEach((p, i) => {
          if (p && p.toLowerCase() === nameLower) {
            courts.assignPlayerToSlot({ type: 'court', id: c.id, team: t, slot: i }, null)
          }
        })
      })
    })
    courts.queues.forEach((q) => {
      ;(['team1', 'team2'] as const).forEach((t) => {
        q[t].forEach((p, i) => {
          if (p && p.toLowerCase() === nameLower) {
            courts.assignPlayerToSlot({ type: 'queue', id: q.id, team: t, slot: i }, null)
          }
        })
      })
    })
  }

  const handlePlayerDrop = (
    playerName: string,
    targetType: 'court' | 'queue',
    targetId: string,
    team: 'team1' | 'team2',
    slot: number
  ) => {
    const player = players.players.find((p) => p.name === playerName)
    if (!player) return
    const target =
      targetType === 'court'
        ? courts.courts.find((c) => c.id === targetId)
        : courts.queues.find((q) => q.id === targetId)
    if (!target) return
    const existing = target[team][slot]
    if (existing && existing !== playerName) {
      const slotPlayer = players.players.find((p) => p.name === existing)
      if (slotPlayer) setSelectedPlayerId(slotPlayer.id)
    } else {
      setSelectedPlayerId(null)
    }
    removePlayerFromAllSlots(playerName)
    courts.assignPlayerToSlot(
      { type: targetType, id: targetId, team, slot },
      playerName
    )
  }

  const handleSlotClick = (
    targetType: 'court' | 'queue',
    targetId: string,
    team: 'team1' | 'team2',
    slot: number
  ) => {
    const target =
      targetType === 'court'
        ? courts.courts.find((c) => c.id === targetId)
        : courts.queues.find((q) => q.id === targetId)
    if (!target) return

    const slotPlayerName = target[team][slot]
    const selectedId = selectedPlayerId()

    if (slotPlayerName) {
      const slotPlayer = players.players.find(
        (p) => p.name === slotPlayerName
      )
      if (slotPlayer) {
        setSelectedPlayerId(slotPlayer.id)
      }
    } else if (selectedId) {
      handleAssignToSlot(targetType, targetId, team, slot)
    }
  }

  const handleStartMatch = (courtId: string) => {
    const court = courts.courts.find((c) => c.id === courtId)
    if (!court) return

    const allPlayers = [
      ...court.team1, ...court.team2,
    ].filter(Boolean) as string[]
    if (allPlayers.length !== 4) return

    allPlayers.forEach((name) => {
      const p = players.players.find(
        (x) => x.name.toLowerCase() === name.toLowerCase()
      )
      if (p) {
        const waitSeconds = Math.floor(
          (Date.now() - p.queueStart) / 1000
        )
        players.recordWaitTime(name, waitSeconds)
        players.resetQueueStart(name)
      }
    })

    courts.startMatch(courtId)
  }

  const handleFinishMatch = (courtId: string, s1: number, s2: number) => {
    courts.finishMatch(courtId, s1, s2)
  }

  const handleCancelMatch = (courtId: string) => {
    courts.cancelMatch(courtId)
  }

  const handleAutoMatchmaker = () => {
    const waiting = waitingPlayers().filter((p) => {
      const onAnyCourt = courts.courts.some(
        (c) => c.team1.includes(p.name) || c.team2.includes(p.name)
      )
      return !onAnyCourt
    })
    if (waiting.length < 4) return

    const candidates = waiting.map((p) => ({
      name: p.name,
      level: p.level,
      waitSeconds: Math.floor((Date.now() - p.queueStart) / 1000),
    }))

    const result = courts.autoMatchmaker(candidates)
    if (result) {
      const selector = result.type === 'court'
        ? `[data-court-id="${result.id}"]`
        : `[data-flip-id="queue-${result.id}"]`
      const el = document.querySelector(selector)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSendQueue = (queueId: string) => {
    const targetId = courts.sendQueueToCourt(queueId)
    if (targetId) {
      const el = document.querySelector(`[data-court-id="${targetId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleExportData = async () => {
    try {
      const data: Record<string, unknown> = {}
      const keys = ['tbc-courts', 'tbc-players', 'tbc-ui', 'tbc-payments']
      for (const key of keys) {
        const raw = await localforage.getItem<string>(key)
        if (raw) {
          try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tbc-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  const handleDeleteAllData = async () => {
    if (!confirm('Delete ALL data? This includes match history, players, courts, queues, and payments. This cannot be undone.')) return
    if (!confirm('Are you absolutely sure? All data will be permanently lost.')) return

    const payments = usePaymentStore()
    useCourtStore.setState({
      courts: [],
      queues: [],
      matchHistory: [],
      matchCount: 0,
    })
    usePlayerStore.setState({
      players: [],
      playerStats: {},
    })
    payments.clearAll()
  }

  const tabContent = (tab: Tab) => {
    switch (tab) {
      case 'home':
        return (
          <div class="flex-1 flex flex-row gap-0 p-4 pl-0 overflow-hidden h-full">
            <CollapsiblePanel
              title="Players"
              open={ui.playersPanelOpen}
              onToggle={() => ui.togglePlayersPanel()}
              width={288}
            >
              <PlayerList
                players={waitingPlayers()}
                selectedPlayerId={selectedPlayerId()}
                onSelectPlayer={handleSelectPlayer}
                playerStats={players.playerStats}
                getPlayerLevel={getPlayerLevel}
              />
            </CollapsiblePanel>

            <div class="flex-1 flex flex-row gap-0 overflow-hidden min-w-0">
              <CollapsiblePanel
                title="Queue"
                open={ui.queuePanelOpen}
                onToggle={() => ui.toggleQueuePanel()}
                width={340}
                actions={
                  <button
                    onClick={() => courts.addQueue()}
                    class="px-3 py-1 border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-xs font-semibold rounded-lg shadow-sm active:scale-[0.92] active:transition-[transform_0.15s_cubic-bezier(0.34,1.56,0.64,1)] transition-all duration-200"
                  >
                    + Add Queue
                  </button>
                }
              >
                <div class="space-y-3 p-4">
                  <For each={courts.queues}>
                    {(q) => (
                      <QueueCard
                        queue={q}
                        matchHistory={courts.matchHistory}
                        onSlotClick={(team, slot) =>
                          handleSlotClick('queue', q.id, team, slot)
                        }
                        onPlayerDrop={(name, team, slot) =>
                          handlePlayerDrop(name, 'queue', q.id, team, slot)
                        }
                        onRemovePlayer={(team, slot) =>
                          handleRemovePlayer('queue', q.id, team, slot)
                        }
                        onSend={() => handleSendQueue(q.id)}
                        onRemove={() => courts.removeQueue(q.id)}
                        getPlayerLevel={getPlayerLevel}
                      />
                    )}
                  </For>
                </div>
              </CollapsiblePanel>

              <div class="flex-1 flex flex-col overflow-hidden min-w-0 pl-4 pr-4">
                <div class="flex items-center justify-between mb-3 shrink-0 pb-2 border-b border-gray-200/80 dark:border-white/10">
                  <h2 class="text-sm font-bold tracking-tight uppercase text-[#1a1f26] dark:text-slate-400">Courts</h2>
                  <div class="flex items-center gap-2">
                  <button
                    onClick={handleAutoMatchmaker}
                    disabled={waitingPlayers().length < 4}
                    title="Auto-matchmake 4 players"
                    class={
                      `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 active:scale-[0.92] active:transition-[transform_0.15s_cubic-bezier(0.34,1.56,0.64,1)] ` +
                      (waitingPlayers().length >= 4
                        ? 'border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm'
                        : 'bg-gray-50/80 dark:bg-white/5 text-gray-400 dark:text-slate-500 border-2 border-gray-200/60 dark:border-white/10 cursor-not-allowed')
                    }
                  >
                    ⚡ Auto
                  </button>
                  <button
                    onClick={() => courts.addCourt()}
                    class="px-3 py-1.5 border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-xs font-semibold rounded-lg shadow-sm active:scale-[0.92] active:transition-[transform_0.15s_cubic-bezier(0.34,1.56,0.64,1)] transition-all duration-200"
                  >
                    + Court
                  </button>
                  </div>
                </div>
                <div class="flex-1 court-grid-container scrollbar-auto-hide">
                  <div class="court-grid">
                    <For each={courts.courts}>
                      {(c) => (
                        <CourtCard
                          court={c}
                          matchHistory={courts.matchHistory}
                          onSlotClick={(team, slot) =>
                            handleSlotClick('court', c.id, team, slot)
                          }
                          onPlayerDrop={(name, team, slot) =>
                            handlePlayerDrop(name, 'court', c.id, team, slot)
                          }
                          onRemovePlayer={(team, slot) =>
                            handleRemovePlayer('court', c.id, team, slot)
                          }
                          onStartMatch={() => handleStartMatch(c.id)}
                          onFinishMatch={(s1, s2) =>
                            handleFinishMatch(c.id, s1, s2)
                          }
                          onCancelMatch={() => handleCancelMatch(c.id)}
                          onRemove={() => courts.removeCourt(c.id)}
                          onLabelChange={(label) =>
                            courts.updateCourtLabel(c.id, label)
                          }
                          getPlayerLevel={getPlayerLevel}
                        />
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'stats':
        return (
          <StatsView
            playerStats={players.playerStats}
            matchHistory={courts.matchHistory}
            matchCount={courts.matchCount}
            players={players.players}
            getPlayerLevel={getPlayerLevel}
          />
        )
      case 'payments':
        return <PaymentsView />
    }
  }

  return (
    <div class="h-full flex flex-col">
      <Navbar
        activeTab={ui.activeTab}
        onTabChange={(t) => ui.setActiveTab(t)}
        onToggleTheme={() => ui.toggleTheme()}
        onExportData={handleExportData}
        onDeleteAllData={handleDeleteAllData}
        theme={ui.theme}
      />

      <main class="flex-1 overflow-hidden">
        {tabContent(ui.activeTab)}
      </main>

      <Show when={ui.playerModalOpen}>
        <PlayerModal />
      </Show>

      <Show when={ui.statsModalOpen && ui.statsModalPlayer}>
        <PlayerStatsModal
          playerName={ui.statsModalPlayer!}
          playerStats={players.playerStats}
          matchHistory={courts.matchHistory}
          getPlayerLevel={getPlayerLevel}
          onClose={() => ui.closeStatsModal()}
        />
      </Show>

      <Show when={ui.statsTableModalOpen && ui.statsTableModalPlayer}>
        <PlayerStatsTableModal
          playerName={ui.statsTableModalPlayer!}
          playerStats={players.playerStats}
          matchHistory={courts.matchHistory}
          players={players.players}
          getPlayerLevel={getPlayerLevel}
          onClose={() => ui.closeStatsTableModal()}
        />
      </Show>

      <Show when={ui.editMatchModalOpen && ui.editingMatchIndex !== null}>
        <MatchEditModal
          index={ui.editingMatchIndex!}
          match={courts.matchHistory[ui.editingMatchIndex!]}
          onClose={() => ui.closeEditMatchModal()}
        />
      </Show>
    </div>
  )
}
