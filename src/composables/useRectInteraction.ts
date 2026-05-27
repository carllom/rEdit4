import type { Ref } from 'vue'
import { useSheetStore } from '../stores/sheetStore'
import { useProjectStore } from '../stores/projectStore'
import { screenToPixel } from '../renderer/viewport'
import { growRectangle, shrinkRectangle } from '../domain/sheetOps'
import type { PixelBuffer } from '../domain/sheetOps'
import type { Point } from '../domain/model'

export function useRectInteraction(
  canvas: Ref<HTMLCanvasElement | null>,
  zoom: Ref<number>,
  panOffset: Ref<Point>,
  isPanMode: Ref<boolean>,
  getPixels: () => PixelBuffer | null,
  imgW: Ref<number>,
  imgH: Ref<number>,
) {
  const sheetStore = useSheetStore()
  const projectStore = useProjectStore()

  let isDragging = false
  let dragStart: Point | null = null
  let dragEnd: Point | null = null

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

  // Clamps a rect to [0, imgW) × [0, imgH); returns null if entirely outside.
  function clampToImage(rect: { x: number; y: number; w: number; h: number }) {
    if (!imgW.value || !imgH.value) return null
    const x0 = Math.max(0, rect.x)
    const y0 = Math.max(0, rect.y)
    const x1 = Math.min(imgW.value - 1, rect.x + rect.w - 1)
    const y1 = Math.min(imgH.value - 1, rect.y + rect.h - 1)
    if (x0 > x1 || y0 > y1) return null
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  }

  function inImage(p: Point): boolean {
    return p.x >= 0 && p.y >= 0 && p.x < imgW.value && p.y < imgH.value
  }

  function getMatteColor() {
    const id = sheetStore.activeSheetId
    return projectStore.project?.sheets.find(s => s.id === id)?.matteColor ?? null
  }

  function sheetBounds() {
    return { x: 0, y: 0, w: imgW.value, h: imgH.value }
  }

  function onMousedown(e: MouseEvent) {
    if (e.button !== 0 || isPanMode.value) return
    if (!canvas.value) return

    const tool = sheetStore.activeTool

    if (tool === 'drawRect' || tool === 'shrinkRect') {
      isDragging = true
      dragStart = pixelAt(e)
      dragEnd = null
      sheetStore.setInProgressRect(clampToImage(makeRect(dragStart, dragStart)))
      return
    }

    if (tool === 'growRect') {
      const seed = pixelAt(e)
      if (!inImage(seed)) return
      const pixels = getPixels()
      if (!pixels) return
      const result = growRectangle(pixels, seed, sheetBounds(), getMatteColor())
      if (result) sheetStore.setInProgressRect(result)
      return
    }

    if (tool === 'pickMatte') {
      const p = pixelAt(e)
      if (!inImage(p)) return
      const pixels = getPixels()
      if (!pixels) return
      const i = (p.y * pixels.width + p.x) * 4
      const a = pixels.data[i + 3]
      const id = sheetStore.activeSheetId
      if (!id) return
      sheetStore.setMatteColor(id, a === 0 ? null : { r: pixels.data[i], g: pixels.data[i + 1], b: pixels.data[i + 2] })
    }
  }

  function onMousemove(e: MouseEvent) {
    if (!isDragging || !dragStart || !canvas.value) return
    dragEnd = pixelAt(e)
    sheetStore.setInProgressRect(clampToImage(makeRect(dragStart, dragEnd)))
  }

  function onMouseup() {
    if (!isDragging) return

    if (sheetStore.activeTool === 'shrinkRect' && dragStart) {
      const end = dragEnd ?? dragStart
      const clamped = clampToImage(makeRect(dragStart, end))
      const result = clamped && getPixels()
        ? shrinkRectangle(getPixels()!, clamped, sheetBounds(), getMatteColor())
        : null
      sheetStore.setInProgressRect(result)
    }

    isDragging = false
    dragStart = null
    dragEnd = null
  }

  return { onMousedown, onMousemove, onMouseup }
}
