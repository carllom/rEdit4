import type { Ref } from 'vue'
import { ref } from 'vue'
import { useSheetStore } from '../stores/sheetStore'
import { useProjectStore } from '../stores/projectStore'
import { screenToPixel } from '../renderer/viewport'
import { growRectangle, shrinkRectangle } from '../domain/sheetOps'
import type { PixelBuffer } from '../domain/sheetOps'
import type { Point } from '../domain/model'
import { getHandleScreenPoints, hitTestHandle, type HandleId } from '../renderer/rectHandles'

interface ResizeState {
  anchorX: number
  anchorY: number
  movesX: boolean
  movesY: boolean
  fixedX: number
  fixedW: number
  fixedY: number
  fixedH: number
}

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

  const hoveredHandle = ref<HandleId | null>(null)

  let isDragging = false
  let dragStart: Point | null = null
  let dragEnd: Point | null = null
  let resizeState: ResizeState | null = null

  function screenAt(e: MouseEvent): Point {
    const el = canvas.value!
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

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

  function startResize(handle: HandleId) {
    const rect = sheetStore.inProgressRect
    if (!rect) return
    const { x, y, w, h } = rect
    const isLeft = handle === 'tl' || handle === 'bl' || handle === 'l'
    const isTop  = handle === 'tl' || handle === 't'  || handle === 'tr'
    resizeState = {
      anchorX: isLeft ? x + w - 1 : x,
      anchorY: isTop  ? y + h - 1 : y,
      movesX: handle !== 't' && handle !== 'b',
      movesY: handle !== 'l' && handle !== 'r',
      fixedX: x, fixedW: w, fixedY: y, fixedH: h,
    }
  }

  function onMousedown(e: MouseEvent) {
    if (e.button !== 0 || isPanMode.value) return
    if (!canvas.value) return

    // Handle hit takes priority — works regardless of active tool
    const rect = sheetStore.inProgressRect
    if (rect) {
      const s = screenAt(e)
      const handles = getHandleScreenPoints(rect, zoom.value, panOffset.value)
      const hit = hitTestHandle(s.x, s.y, handles)
      if (hit) {
        startResize(hit)
        hoveredHandle.value = null
        return
      }
    }

    const tool = sheetStore.activeTool

    if (tool === 'drawRect' || tool === 'shrinkRect') {
      isDragging = true
      dragStart = pixelAt(e)
      dragEnd = null
      sheetStore.setInProgressRect(clampToImage(makeRect(dragStart, dragStart)), true)
      return
    }

    if (tool === 'growRect') {
      const seed = pixelAt(e)
      if (!inImage(seed)) return
      const pixels = getPixels()
      if (!pixels) return
      const result = growRectangle(pixels, seed, sheetBounds(), getMatteColor())
      if (result) sheetStore.setInProgressRect(result, true)
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
    // Hover detection for handle cursor (only when idle)
    if (!isDragging && !resizeState) {
      const rect = sheetStore.inProgressRect
      if (rect && canvas.value) {
        const s = screenAt(e)
        const handles = getHandleScreenPoints(rect, zoom.value, panOffset.value)
        hoveredHandle.value = hitTestHandle(s.x, s.y, handles)
      } else {
        hoveredHandle.value = null
      }
    }

    // Resize drag
    if (resizeState && canvas.value) {
      const mouse = pixelAt(e)
      const { anchorX, anchorY, movesX, movesY, fixedX, fixedW, fixedY, fixedH } = resizeState
      let newX = fixedX, newW = fixedW, newY = fixedY, newH = fixedH
      if (movesX) { newX = Math.min(anchorX, mouse.x); newW = Math.abs(anchorX - mouse.x) + 1 }
      if (movesY) { newY = Math.min(anchorY, mouse.y); newH = Math.abs(anchorY - mouse.y) + 1 }
      sheetStore.setInProgressRect(clampToImage({ x: newX, y: newY, w: newW, h: newH }))
      return
    }

    // Draw drag
    if (!isDragging || !dragStart || !canvas.value) return
    dragEnd = pixelAt(e)
    sheetStore.setInProgressRect(clampToImage(makeRect(dragStart, dragEnd)), true)
  }

  function onMouseup() {
    if (resizeState) {
      resizeState = null
      return
    }

    if (!isDragging) return

    if (sheetStore.activeTool === 'shrinkRect' && dragStart) {
      const end = dragEnd ?? dragStart
      const clamped = clampToImage(makeRect(dragStart, end))
      const result = clamped && getPixels()
        ? shrinkRectangle(getPixels()!, clamped, sheetBounds(), getMatteColor())
        : null
      sheetStore.setInProgressRect(result, true)
    }

    isDragging = false
    dragStart = null
    dragEnd = null
  }

  // Moves the in-progress rect by (dx, dy) pixels, clamped so it stays inside the image.
  function nudge(dx: number, dy: number): void {
    const rect = sheetStore.inProgressRect
    if (!rect || !imgW.value || !imgH.value) return
    const x = Math.max(0, Math.min(imgW.value - rect.w, rect.x + dx))
    const y = Math.max(0, Math.min(imgH.value - rect.h, rect.y + dy))
    sheetStore.setInProgressRect({ x, y, w: rect.w, h: rect.h })
  }

  return { onMousedown, onMousemove, onMouseup, hoveredHandle, nudge }
}
