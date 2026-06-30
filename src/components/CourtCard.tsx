import { createSignal, createEffect, onCleanup, type Component } from 'solid-js'
import gsap from 'gsap'
import { formatTime } from '../lib/formats'
import PlayerSlot from './PlayerSlot'
import type { Court } from '../types'

interface Props {
  court: Court
  onSlotClick: (team: 'team1' | 'team2', slot: number) => void
  onPlayerDrop: (playerName: string, team: 'team1' | 'team2', slot: number) => void
  onRemovePlayer: (team: 'team1' | 'team2', slot: number) => void
  onStartMatch: () => void
  onFinishMatch: (score1: number, score2: number) => void
  onCancelMatch: () => void
  onRemove: () => void
  onLabelChange: (label: string) => void
  getPlayerLevel: (name: string) => number
}

const CourtCard: Component<Props> = (props) => {
  const [score1, setScore1] = createSignal(0)
  const [score2, setScore2] = createSignal(0)
  const [elapsed, setElapsed] = createSignal(0)
  const [confirmDelete, setConfirmDelete] = createSignal(false)
  const [focusSide, setFocusSide] = createSignal<'team1' | 'team2' | null>(null)

  let cardRef: HTMLDivElement | undefined
  let prevLocked = false

  let timerId: number | undefined
  let confirmTimerId: number | undefined

  const clearTimers = () => {
    if (timerId) { clearInterval(timerId); timerId = undefined }
    if (confirmTimerId) { clearTimeout(confirmTimerId); confirmTimerId = undefined }
  }

  createEffect(() => {
    if (props.court.locked && props.court.matchStart) {
      const update = () => {
        setElapsed(Math.floor((Date.now() - props.court.matchStart!) / 1000))
      }
      update()
      timerId = setInterval(update, 1000)
    } else {
      clearTimers()
      setElapsed(0)
      setScore1(0)
      setScore2(0)
    }
  })

  createEffect(() => {
    if (!cardRef) return
    const locked = props.court.locked
    if (locked === prevLocked) return
    prevLocked = locked
    gsap.fromTo(
      cardRef,
      { scale: 0.97, opacity: 0.7 },
      { scale: 1, opacity: 1, duration: 0.45, ease: 'power2.out' }
    )
  })

  onCleanup(clearTimers)

  const allFilled = () =>
    props.court.team1.filter(Boolean).length === 2 &&
    props.court.team2.filter(Boolean).length === 2

  const playerCount = () =>
    [...props.court.team1, ...props.court.team2].filter(Boolean).length

  return (
    <div
      ref={cardRef}
      data-court-id={props.court.id}
      data-flip-id={`court-${props.court.id}`}
      class={
        `court-card court-card-min-h rounded-2xl court-card-padding transition-all duration-300 h-full flex flex-col ` +
        (props.court.locked
          ? 'live-glow glass-card-solid border-emerald-500/30'
          : 'glass-card-solid border-transparent hover:border-white/20')
      }
    >
      {/* Header */}
      <div class="flex items-center justify-between mb-2 shrink-0 gap-2">
        <input
          value={props.court.label}
          onInput={(e) => props.onLabelChange(e.currentTarget.value)}
          class="font-bold text-sm bg-transparent border-none outline-none focus:ring-0 min-w-0 truncate tracking-tight text-[#1a1f26] dark:text-white"
          disabled={props.court.locked}
        />
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-xs font-mono font-bold tabular-nums text-slate-500 dark:text-slate-400">
            {props.court.locked ? formatTime(elapsed()) : '--:--'}
          </span>
          <span
            class={
              `text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ` +
              (props.court.locked
                ? 'bg-green-100/80 text-green-800 border border-green-200/60'
                : 'bg-gray-100/80 text-gray-500 border border-gray-200/60')
            }
          >
            {props.court.locked ? 'Live' : 'Idle'}
          </span>
          {!props.court.locked && (
            <button
              onClick={() => {
                if (confirmDelete()) {
                  if (confirmTimerId) clearTimeout(confirmTimerId)
                  setConfirmDelete(false)
                  props.onRemove()
                } else {
                  setConfirmDelete(true)
                  confirmTimerId = setTimeout(() => {
                    setConfirmDelete(false)
                    confirmTimerId = undefined
                  }, 2000)
                }
              }}
              class={
                `text-xs px-1.5 py-0.5 rounded transition-all duration-200 ` +
                (confirmDelete()
                  ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                  : 'text-slate-400 hover:text-red-400')
              }
            >
              {confirmDelete() ? '⚠️' : '🗑'}
            </button>
          )}
        </div>
      </div>

      {/* Idle state */}
      {!props.court.locked && (
        <div class="flex-1 flex flex-col animate-fade-in-no-move">
          <div class="flex-1 flex flex-col justify-evenly court-card-gap mb-3">
            {(['team1', 'team2'] as const).map((team) => (
              <div
                class={
                  `rounded-xl court-card-team-padding border flex-1 flex flex-col justify-center ` +
                  (team === 'team1'
                    ? 'border-blue-500/10 dark:border-blue-400/[0.06]'
                    : 'border-red-500/10 dark:border-red-400/[0.06]')
                }
              >
                <div class="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-gray-600 dark:text-slate-400 court-card-player-name">
                  {team === 'team1' ? 'Team 1' : 'Team 2'}
                </div>
                <div class="grid grid-cols-2 court-card-gap">
                  {([0, 1] as const).map((slot) => (
                    <PlayerSlot
                      playerName={props.court[team][slot]}
                      team={team}
                      slot={slot}
                      onClick={() => props.onSlotClick(team, slot)}
                      onPlayerDrop={(name) => props.onPlayerDrop(name, team, slot)}
                      onRemovePlayer={() => props.onRemovePlayer(team, slot)}
                      getPlayerLevel={props.getPlayerLevel}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={props.onStartMatch}
            disabled={!allFilled()}
            class={
              `w-full court-card-btn font-semibold rounded-xl transition-all duration-200 active:scale-[0.92] active:transition-[transform_0.15s_cubic-bezier(0.34,1.56,0.64,1)] ` +
              (allFilled()
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02]'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed')
            }
          >
            ▶ Start Match ({playerCount()}/4)
          </button>
        </div>
      )}

      {/* Live state */}
      {props.court.locked && (
        <div class="flex-1 flex flex-col animate-fade-in-no-move">
          {/* Split layout: flanked teams, VS center */}
          <div class="flex items-stretch flex-1 mb-3">
            {/* Team A — left flank */}
            <div
              class={
                `flex flex-col items-center flex-1 min-w-0 rounded-xl court-card-team-padding transition-all duration-300 ` +
                (focusSide() === 'team1'
                  ? 'bg-blue-500/10 ring-2 ring-blue-400/40 shadow-[0_0_24px_rgba(59,130,246,0.25)]'
                  : '')
              }
            >
              <div class="text-[10px] font-semibold uppercase tracking-widest text-gray-600 dark:text-slate-400">
                Team A
              </div>
              <input
                type="number"
                min="0"
                value={score1() || ''}
                placeholder="0"
                onInput={(e) => setScore1(Math.max(0, parseInt(e.currentTarget.value) || 0))}
                onFocus={() => setFocusSide('team1')}
                onBlur={() => setFocusSide(null)}
                class="w-full text-center court-card-score font-black bg-transparent border-none outline-none text-slate-900 dark:text-white tabular-nums placeholder:text-slate-400/50 dark:placeholder:text-slate-500/50"
              />
              <div class="space-y-1 w-full mt-1">
                {[0, 1].map((slot) => (
                  <div
                    class={
                      `court-card-player-name font-medium text-center truncate rounded-lg px-2 py-1 ` +
                      (props.court.team1[slot]
                        ? 'bg-blue-100/50 dark:bg-blue-900/20'
                        : '')
                    }
                  >
                    {props.court.team1[slot] || (
                      <span class="text-slate-400 italic court-card-player-name">empty</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* VS divider — centered */}
            <div class="flex flex-col items-center justify-center shrink-0 px-2">
              <div class="court-card-vs-h w-px bg-gradient-to-b from-blue-400/40 via-slate-300/40 to-red-400/40 dark:from-blue-400/20 dark:via-slate-400/20 dark:to-red-400/20" />
              <span class="text-[11px] font-black text-slate-400 dark:text-slate-500 my-1 leading-none select-none tracking-widest">
                VS
              </span>
              <div class="court-card-vs-h w-px bg-gradient-to-b from-red-400/40 via-slate-300/40 to-blue-400/40 dark:from-red-400/20 dark:via-slate-400/20 dark:to-blue-400/20" />
            </div>

            {/* Team B — right flank */}
            <div
              class={
                `flex flex-col items-center flex-1 min-w-0 rounded-xl court-card-team-padding transition-all duration-300 ` +
                (focusSide() === 'team2'
                  ? 'bg-red-500/10 ring-2 ring-red-400/40 shadow-[0_0_24px_rgba(239,68,68,0.25)]'
                  : '')
              }
            >
              <div class="text-[10px] font-semibold uppercase tracking-widest text-gray-600 dark:text-slate-400">
                Team B
              </div>
              <input
                type="number"
                min="0"
                value={score2() || ''}
                placeholder="0"
                onInput={(e) => setScore2(Math.max(0, parseInt(e.currentTarget.value) || 0))}
                onFocus={() => setFocusSide('team2')}
                onBlur={() => setFocusSide(null)}
                class="w-full text-center court-card-score font-black bg-transparent border-none outline-none text-slate-900 dark:text-white tabular-nums placeholder:text-slate-400/50 dark:placeholder:text-slate-500/50"
              />
              <div class="space-y-1 w-full mt-1">
                {[0, 1].map((slot) => (
                  <div
                    class={
                      `court-card-player-name font-medium text-center truncate rounded-lg px-2 py-1 ` +
                      (props.court.team2[slot]
                        ? 'bg-red-100/50 dark:bg-red-900/20'
                        : '')
                    }
                  >
                    {props.court.team2[slot] || (
                      <span class="text-slate-400 italic court-card-player-name">empty</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div class="flex gap-2 shrink-0">
            <button
              onClick={() => props.onFinishMatch(score1(), score2())}
              disabled={score1() === score2()}
              class={
                `flex-1 court-card-btn font-bold rounded-xl transition-all duration-200 active:scale-[0.92] active:transition-[transform_0.15s_cubic-bezier(0.34,1.56,0.64,1)] ` +
                (score1() !== score2()
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02]'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed')
              }
            >
              ✓ Finish
            </button>
            <button
              onClick={props.onCancelMatch}
              class="flex-1 court-card-btn font-bold rounded-xl transition-all duration-200 bg-rose-100/80 text-rose-700 border border-rose-200/60 hover:bg-rose-200/70 hover:scale-[1.02] active:scale-[0.92] active:transition-[transform_0.15s_cubic-bezier(0.34,1.56,0.64,1)]"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourtCard
