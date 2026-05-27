import type { Ref } from 'vue'
import { useSheetStore } from '../stores/sheetStore'
import { screenToPixel } from '../renderer/viewport'
import type { Point } from '../domain/model'

export function useRectInteraction(
  canvas: Ref<HTMLCanvasElement | null>,
  zoom: Ref<number>,
  panOffset: Ref<Point>,
  isPanMode: Ref<boolean>,
) {
  const sheetStore = useSheetStore()

  let isDragging = false
  let dragStart: Point | null = null

  function pixelAt(e: MouseEvent): Point {
    const el = canvas.value!
    const r = el.getBoundingClientRect()
    return screenToPixel(e.clientX - r.left, e.clientY - r.top, zoom.value, panOffset.value)
  }

  function makeRect(a: Point, b: Point) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x) + 1,
      h: Math.abs(b.y - a.y) + 1,
    }
  }

  function onMousedown(e: MouseEvent) {
    if (e.button !== 0 || isPanMode.value || sheetStore.activeTool !== 'drawRect') return
    if (!canvas.value) return
    isDragging = true
    dragStart = pixelAt(e)
    sheetStore.setInProgressRect(makeRect(dragStart, dragStart))
  }

  function onMousemove(e: MouseEvent) {
    if (!isDragging || !dragStart || !canvas.value) return
    sheetStore.setInProgressRect(makeRect(dragStart, pixelAt(e)))
  }

  function onMouseup() {
    isDragging = false
    dragStart = null
  }

  return { onMousedown, onMousemove, onMouseup }
}
