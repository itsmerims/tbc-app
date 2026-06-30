import { type Component, type JSX } from 'solid-js'

interface Props {
  title: string
  children: JSX.Element
  fraction?: string
  actions?: JSX.Element
}

const CollapsiblePanel: Component<Props> = (props) => {
  return (
    <div class="flex flex-col" style={{ flex: props.fraction || '1' }}>
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200/80 dark:border-white/10 shrink-0">
        <h2 class="font-bold text-sm tracking-tight uppercase text-[#1a1f26] dark:text-slate-400">
          {props.title}
        </h2>
        <div class="flex items-center gap-2">
          {props.actions}
        </div>
      </div>
      <div class="overflow-y-auto flex-1 scrollbar-auto-hide">
        {props.children}
      </div>
    </div>
  )
}

export default CollapsiblePanel
