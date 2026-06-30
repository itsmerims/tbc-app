import { createEffect, type Component, type JSX } from 'solid-js'
import gsap from 'gsap'

interface Props {
  title: string
  open: boolean
  onToggle: () => void
  children: JSX.Element
  width?: number
  actions?: JSX.Element
}

const CollapsiblePanel: Component<Props> = (props) => {
  let containerRef: HTMLDivElement | undefined
  let mounted = false
  const pw = () => props.width ?? 320

  createEffect(() => {
    if (!containerRef) return
    const target = props.open ? pw() : 0
    if (!mounted) {
      mounted = true
      gsap.set(containerRef, { width: target })
      return
    }
    gsap.to(containerRef, {
      width: target,
      duration: 0.35,
      ease: 'power3.inOut',
      overwrite: 'auto',
    })
  })

  return (
    <div class="flex items-stretch">
      <div ref={containerRef} class="overflow-hidden shrink-0">
        <div class="h-full" style={{ width: `${pw()}px` }}>
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200/80 dark:border-white/10 shrink-0">
            <h2 class="font-bold text-sm tracking-tight uppercase text-[#1a1f26] dark:text-slate-400">
              {props.title}
            </h2>
            <div class="flex items-center gap-2">
              {props.actions}
              <button
                onClick={props.onToggle}
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={props.open ? `Collapse ${props.title}` : `Expand ${props.title}`}
              >
                <svg
                  class={`w-4 h-4 transition-transform duration-300 ${props.open ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
          <div class="overflow-y-auto h-[calc(100%-49px)] scrollbar-auto-hide">
            {props.children}
          </div>
        </div>
      </div>

      {/* Pill toggle strip — animated width on hover */}
      <button
        onClick={props.onToggle}
        class="w-6 shrink-0 flex items-center justify-center bg-gray-100/60 dark:bg-slate-800/40 hover:w-8 hover:bg-gray-200/80 dark:hover:bg-slate-700/70 hover:shadow-lg transition-all duration-200 ease-out cursor-pointer border-y border-gray-200/80 dark:border-white/[0.06] group"
        aria-label={props.open ? `Collapse ${props.title}` : `Expand ${props.title}`}
      >
        <svg
          class={`w-3 h-3 text-slate-400 transition-transform duration-300 group-hover:scale-110 ${props.open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}

export default CollapsiblePanel
