import { createSignal, createMemo, For, type Component } from 'solid-js'
import { usePaymentStore } from '../stores/paymentStore'
import { usePlayerStore } from '../stores/playerStore'
import { formatPeso } from '../lib/formats'
import type { ShuttleRow } from '../types'

interface GlassInputProps {
  value: string | number
  onInput: (val: string) => void
  onBlur: () => void
  onKeyDown: (e: KeyboardEvent) => void
  label: string
  prefix?: string
  type?: string
  placeholder?: string
}

const GlassInput: Component<GlassInputProps> = (props) => (
  <div class="group relative">
    <label class="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">
      {props.label}
    </label>
    <div class="relative">
      {props.prefix && (
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium pointer-events-none select-none">
          {props.prefix}
        </span>
      )}
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onBlur={props.onBlur}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        class={`w-full rounded-xl border border-white/10 bg-white/40 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-300 ease-out focus:border-blue-400/50 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.15)] focus:bg-white/70 dark:focus:bg-white/[0.07] ${
          props.prefix ? 'pl-7' : 'pl-3'
        } pr-3 py-2.5`}
      />
    </div>
  </div>
)

const ShuttleRowEditor: Component<{
  row: ShuttleRow
  index: number
  onUpdate: (i: number, data: Partial<ShuttleRow>) => void
  onRemove: (i: number) => void
}> = (props) => {
  const [localType, setLocalType] = createSignal(props.row.type)
  const [localPrice, setLocalPrice] = createSignal(props.row.tubePrice)
  const [localQty, setLocalQty] = createSignal(props.row.qty)

  const sync = () => {
    props.onUpdate(props.index, { type: localType(), tubePrice: localPrice(), qty: localQty() })
  }

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); sync() }
  }

  return (
    <tr data-shuttle-row class="border-b border-white/[0.03] transition-all duration-200 hover:bg-white/[0.02]">
      <td class="py-2 pr-2">
        <input
          value={localType()}
          onInput={(e) => setLocalType(e.currentTarget.value)}
          onBlur={sync}
          onKeyDown={handleKey}
          placeholder="e.g. Aerosensa"
          class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-blue-400/50 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.15)]"
        />
      </td>
      <td class="py-2 pr-2">
        <div class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium pointer-events-none select-none">
            ₱
          </span>
          <input
            type="number"
            value={localPrice() || ''}
            placeholder="0"
            onInput={(e) => setLocalPrice(parseFloat(e.currentTarget.value) || 0)}
            onBlur={sync}
            onKeyDown={handleKey}
            class="w-full pl-6 pr-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-400/50 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.15)]"
          />
        </div>
      </td>
      <td class="py-2 pr-2">
        <input
          type="number"
          value={localQty() || ''}
          placeholder="0"
          onInput={(e) => setLocalQty(parseFloat(e.currentTarget.value) || 0)}
          onBlur={sync}
          onKeyDown={handleKey}
          class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-blue-400/50 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.15)]"
        />
      </td>
      <td class="py-2 pr-2 text-right text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
        {formatPeso((localPrice() / 12) * localQty())}
      </td>
      <td class="py-2 text-center">
        <button
          onClick={() => props.onRemove(props.index)}
          class="text-xs text-red-400/60 hover:text-red-400 transition-colors duration-150 active:scale-90 touch-action-manipulation"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

const PaymentsView: Component = () => {
  const store = usePaymentStore()
  const playerStore = usePlayerStore()

  // Local editable signals — sync to store only on blur/enter
  const [localCourtCost, setLocalCourtCost] = createSignal(store.courtCost)
  const [localCourtHours, setLocalCourtHours] = createSignal(store.courtHours)
  const [localQMFee, setLocalQMFee] = createSignal(store.queueMasterFee)
  const [localClubFund, setLocalClubFund] = createSignal(store.clubFund)
  const [localNonShow, setLocalNonShow] = createSignal(store.nonShowPlayers)
  const [showGuide, setShowGuide] = createSignal(false)

  const syncAll = () => {
    store.setCourtCost(localCourtCost())
    store.setCourtHours(localCourtHours())
    store.setQueueMasterFee(localQMFee())
    store.setClubFund(localClubFund())
    store.setNonShowPlayers(localNonShow())
  }

  const summary = createMemo(() => {
    const totalPlayers = playerStore.players.length
    const shuttleTotal = store.shuttles.reduce((sum, row) => sum + (row.tubePrice / 12) * row.qty, 0)
    const courtTotal = store.courtCost * store.courtHours
    const otherTotal = store.queueMasterFee + store.clubFund
    const totalCost = shuttleTotal + courtTotal + otherTotal

    const nsp = store.nonShowPlayers
    const pp = Math.max(totalPlayers - nsp, 1)
    const courtPerPlayer = totalPlayers ? courtTotal / totalPlayers : 0
    const playingCost = courtPerPlayer + ((otherTotal + shuttleTotal) / pp)
    const nonShowCost = courtPerPlayer
    const costPerPlayer = totalPlayers ? totalCost / totalPlayers : 0

    return {
      shuttleTotal,
      courtTotal,
      totalCost,
      costPerPlayer,
      playingCost,
      nonShowCost,
      clubFund: store.clubFund,
      queueFee: store.queueMasterFee,
      numPlayers: totalPlayers,
      nonShowPlayers: nsp,
      playingPlayers: pp,
    }
  })

  return (
    <div class="h-full overflow-y-auto p-6 scrollbar-auto-hide">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
        {/* ── Left: 3/5 — Inputs ── */}
        <div class="lg:col-span-3 space-y-5">
          {/* Courts */}
          <div class="glass-card-solid rounded-2xl p-5 border border-white/10">
            <h4 class="font-bold text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
              Courts
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <GlassInput
                label="Cost per Hour"
                prefix="₱"
                type="number"
                value={localCourtCost() || ''}
                placeholder="0"
                onInput={(v) => setLocalCourtCost(parseFloat(v) || 0)}
                onBlur={() => store.setCourtCost(localCourtCost())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); store.setCourtCost(localCourtCost()) } }}
              />
              <GlassInput
                label="Hours Rented"
                type="number"
                value={localCourtHours() || ''}
                placeholder="0"
                onInput={(v) => setLocalCourtHours(parseFloat(v) || 0)}
                onBlur={() => store.setCourtHours(localCourtHours())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); store.setCourtHours(localCourtHours()) } }}
              />
            </div>
            <div class="mt-3 flex items-center justify-between rounded-xl bg-white/30 dark:bg-white/[0.02] px-4 py-2.5 border border-white/10">
              <span class="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                Court Total
              </span>
              <span class="text-base font-black tabular-nums text-slate-900 dark:text-white">
                {formatPeso(summary().courtTotal)}
              </span>
            </div>
          </div>

          {/* Additional Fees */}
          <div class="glass-card-solid rounded-2xl p-5 border border-white/10">
            <h4 class="font-bold text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
              Additional Fees
            </h4>
            <div class="grid grid-cols-3 gap-4">
              <GlassInput
                label="Queue Master Fee"
                prefix="₱"
                type="number"
                value={localQMFee() || ''}
                placeholder="0"
                onInput={(v) => setLocalQMFee(parseFloat(v) || 0)}
                onBlur={() => store.setQueueMasterFee(localQMFee())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); store.setQueueMasterFee(localQMFee()) } }}
              />
              <GlassInput
                label="Club Fund"
                prefix="₱"
                type="number"
                value={localClubFund() || ''}
                placeholder="0"
                onInput={(v) => setLocalClubFund(parseFloat(v) || 0)}
                onBlur={() => store.setClubFund(localClubFund())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); store.setClubFund(localClubFund()) } }}
              />
              <div class="group relative">
                <label class="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">
                  No. of Players
                </label>
                <div class="w-full rounded-xl border border-blue-400/30 bg-blue-500/10 dark:bg-blue-400/[0.06] text-sm text-blue-500 dark:text-blue-400 font-bold px-3 py-2.5 tabular-nums">
                   {summary().numPlayers}
                </div>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-4">
              <GlassInput
                label="Non-Show Players"
                type="number"
                value={localNonShow() || ''}
                placeholder="0"
                onInput={(v) => setLocalNonShow(parseInt(v) || 0)}
                onBlur={() => store.setNonShowPlayers(localNonShow())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); store.setNonShowPlayers(localNonShow()) } }}
              />
              <div class="group relative">
                <label class="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">
                  Playing Players
                </label>
                <div class="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 dark:bg-amber-400/[0.06] text-sm text-amber-500 dark:text-amber-400 font-bold px-3 py-2.5 tabular-nums">
                  {Math.max(summary().numPlayers - localNonShow(), 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Shuttles */}
          <div class="glass-card-solid rounded-2xl p-5 border border-white/10">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-bold text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Shuttles Used
              </h4>
              <button
                onClick={() => store.addShuttle()}
                class="px-4 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold rounded-full border border-blue-400/30 transition-all duration-200 active:scale-95 touch-action-manipulation"
              >
                + Add
              </button>
            </div>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th class="text-left py-2 pr-2 font-semibold">Type</th>
                  <th class="text-left py-2 pr-2 font-semibold">Tube Price</th>
                  <th class="text-left py-2 pr-2 font-semibold">Qty</th>
                  <th class="text-right py-2 pr-2 font-semibold">Total</th>
                  <th class="py-2 w-6"></th>
                </tr>
              </thead>
              <tbody>
                <For each={store.shuttles}>
                  {(row, i) => (
                    <ShuttleRowEditor
                      row={row}
                      index={i()}
                      onUpdate={(idx, data) => store.updateShuttle(idx, data)}
                      onRemove={(idx) => store.removeShuttle(idx)}
                    />
                  )}
                </For>
              </tbody>
            </table>
            <div class="flex justify-end items-center gap-2 mt-3 pt-3 border-t border-white/10">
              <span class="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                Shuttle Total
              </span>
              <span class="text-base font-black tabular-nums text-slate-900 dark:text-white">
                {formatPeso(summary().shuttleTotal)}
              </span>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={syncAll}
            class="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.97] transition-all duration-200 touch-action-manipulation"
          >
            ↻ Update Totals
          </button>
        </div>

        {/* ── Right: 2/5 — Receipt Summary ── */}
        <div class="lg:col-span-2">
          <div class="glass-card-solid rounded-2xl p-6 border border-white/10 sticky top-0">
            {/* Receipt Header */}
            <div class="text-center mb-5 pb-4 border-b border-dashed border-white/10 relative">
              <div class="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold">
                Payment Receipt
              </div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                #TBC-{Date.now().toString(36).slice(-4).toUpperCase()}
              </div>
              <button
                onClick={() => setShowGuide(true)}
                class="absolute right-0 top-0 w-6 h-6 rounded-full border border-slate-400/30 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-400/60 text-xs font-bold transition-all duration-200 active:scale-90 touch-action-manipulation"
                title="Payment guide"
              >
                ?
              </button>
            </div>

            {/* Line Items */}
            <div class="space-y-3">
              {([
                { label: 'Shuttle Total', value: summary().shuttleTotal },
                { label: 'Court Total', value: summary().courtTotal },
                { label: 'Queue Master Fee', value: summary().queueFee },
                { label: 'Club Fund', value: summary().clubFund },
              ] as const).map((item) => (
                <div class="flex justify-between items-center">
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {item.label}
                  </span>
                  <span class="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatPeso(item.value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Dashed Divider */}
            <div class="my-4 border-t border-dashed border-white/10" />

            {/* Total Cost */}
            <div class="flex justify-between items-center">
              <span class="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Total Cost
              </span>
              <span class="text-lg font-black tabular-nums text-slate-900 dark:text-white">
                {formatPeso(summary().totalCost)}
              </span>
            </div>

            {/* Dashed Divider */}
            <div class="my-4 border-t border-dashed border-white/10" />

            {/* Playing Players */}
            {summary().playingPlayers > 0 && (
              <div class="rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/[0.06] border border-emerald-400/20 p-4 text-center mb-3">
                <div class="text-[10px] uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400 font-semibold mb-2">
                  Per Playing Player
                </div>
                <div class="text-2xl sm:text-3xl font-black tabular-nums text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                  {summary().playingPlayers > 0
                    ? formatPeso(summary().playingCost)
                    : '—'}
                </div>
                <div class="text-[10px] text-emerald-500/60 dark:text-emerald-400/50 mt-1.5 font-medium">
                  {summary().playingPlayers} player{summary().playingPlayers !== 1 ? 's' : ''} playing
                </div>
              </div>
            )}

            {/* Non-Show Players */}
            {summary().nonShowPlayers > 0 && (
              <div class="rounded-2xl bg-slate-500/10 dark:bg-slate-400/[0.06] border border-slate-400/20 p-4 text-center">
                <div class="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-semibold mb-2">
                  Per Non-Show Player
                </div>
                <div class="text-2xl sm:text-3xl font-black tabular-nums text-slate-500 dark:text-slate-300">
                  {formatPeso(summary().nonShowCost)}
                </div>
                <div class="text-[10px] text-slate-500/60 dark:text-slate-400/50 mt-1.5 font-medium">
                  court fee only — {summary().nonShowPlayers} player{summary().nonShowPlayers !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            {summary().nonShowPlayers === 0 && summary().playingPlayers > 0 && (
              <div class="text-center">
                <div class="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-semibold mb-1">
                  All Players Playing
                </div>
                <div class="text-xs text-slate-400 dark:text-slate-500">
                  No non-show deductions
                </div>
              </div>
            )}

            {/* Info note */}
            <div class="mt-4 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500 text-center border-t border-dashed border-white/10 pt-4">
              Court cost is split equally among all players. Shuttle, QM fee, and club fund are split only among playing players.
            </div>
          </div>
        </div>
      </div>

      {/* Guide Modal */}
      {showGuide() && (
      <div
        onClick={() => setShowGuide(false)}
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          class="glass-card-solid rounded-2xl p-6 border border-white/10 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto scrollbar-auto-hide"
        >
          <div class="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-white/10">
            <h3 class="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">
              Payment Guide
            </h3>
            <button
              onClick={() => setShowGuide(false)}
              class="w-6 h-6 rounded-full border border-slate-400/30 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold transition-colors active:scale-90 touch-action-manipulation"
            >
              ✕
            </button>
          </div>
          <div class="space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <div>
              <span class="font-bold text-slate-700 dark:text-slate-300">Court Cost</span>
              <p class="mt-1">Split equally among <span class="font-semibold">all</span> registered players — including non-show players.</p>
            </div>
            <div>
              <span class="font-bold text-slate-700 dark:text-slate-300">Shuttle, QM Fee &amp; Club Fund</span>
              <p class="mt-1">Split only among <span class="font-semibold">playing</span> players. Non-show players are excluded since they didn't use shuttlecocks or facilities.</p>
            </div>
            <div class="rounded-xl bg-blue-500/10 dark:bg-blue-400/[0.06] border border-blue-400/20 p-3">
              <span class="font-bold text-blue-500 dark:text-blue-400">Example</span>
              <p class="mt-1">8 players, 2 non-show. Court = ₱400, Shuttle = ₱200, QM Fee = ₱100.</p>
              <ul class="mt-2 space-y-1">
                <li>• Court share per player: ₱400 ÷ 8 = <span class="font-semibold text-blue-500 dark:text-blue-400">₱50</span></li>
                <li>• Other costs per playing: (₱200 + ₱100) ÷ 6 = <span class="font-semibold text-emerald-500 dark:text-emerald-400">₱50</span></li>
                <li class="pt-2 border-t border-white/10">• <span class="font-semibold text-emerald-500 dark:text-emerald-400">Playing player pays:</span> ₱50 + ₱50 = <span class="font-bold">₱100</span></li>
                <li>• <span class="font-semibold text-slate-500 dark:text-slate-300">Non-show pays:</span> ₱50 <span class="text-slate-400">(court only)</span></li>
              </ul>
            </div>
            <p class="text-slate-400 text-[10px]">Non-show count can be set under Additional Fees. Playing count auto-adjusts.</p>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}

export default PaymentsView
