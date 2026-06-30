import { createEffect } from 'solid-js'
import gsap from 'gsap'

export function useFLIP(
  getContainer: () => HTMLElement | null,
  deps: () => unknown
) {
  let prev = new Map<string, DOMRect>()

  createEffect(() => {
    deps()
    const container = getContainer()
    if (!container) return

    const current = new Map<string, DOMRect>()
    const items = container.querySelectorAll<HTMLElement>('[data-flip-id]')
    items.forEach((el) => {
      const id = el.dataset.flipId
      if (id) current.set(id, el.getBoundingClientRect())
    })

    if (prev.size > 0) {
      items.forEach((el) => {
        const id = el.dataset.flipId
        if (!id) return
        const oldRect = prev.get(id)
        if (!oldRect) return
        const curRect = current.get(id)
        if (!curRect) return

        const dx = oldRect.left - curRect.left
        const dy = oldRect.top - curRect.top
        const dw = oldRect.width ? oldRect.width / curRect.width : 1
        const dh = oldRect.height ? oldRect.height / curRect.height : 1

        if (dx === 0 && dy === 0 && dw === 1 && dh === 1) return

        gsap.set(el, {
          x: dx,
          y: dy,
          scaleX: dw,
          scaleY: dh,
        })
        gsap.to(el, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.35,
          ease: 'power2.out',
          clearProps: 'transform',
        })
      })
    }

    prev = current
  })
}

export function useCapturePositions() {
  let positions = new Map<string, DOMRect>()

  function capture(selector: string) {
    positions.clear()
    document.querySelectorAll(selector).forEach((el) => {
      const key = el.getAttribute('data-flip-id') || el.id || ''
      if (key) positions.set(key, el.getBoundingClientRect())
    })
  }

  function play(selector: string, duration = 0.35) {
    document.querySelectorAll(selector).forEach((el) => {
      const key = el.getAttribute('data-flip-id') || el.id || ''
      const old = positions.get(key)
      if (!old) return
      const cur = el.getBoundingClientRect()
      const dx = old.left - cur.left
      const dy = old.top - cur.top
      if (dx === 0 && dy === 0) return
      gsap.fromTo(
        el,
        { x: dx, y: dy },
        { x: 0, y: 0, duration, ease: 'power2.out', clearProps: 'transform' }
      )
    })
  }

  return { capture, play }
}
