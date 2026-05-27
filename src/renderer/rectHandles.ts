import type { Point, Rect } from '../domain/model'
import { pixelToScreen } from './viewport'

export type HandleId = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l'

export const HANDLE_IDS: HandleId[] = ['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l']

const HANDLE_SIZE = 7
const HALF = Math.floor(HANDLE_SIZE / 2)
const HANDLE_HIT = 10

export const HANDLE_CURSOR: Record<HandleId, string> = {
  tl: 'nwse-resize', tr: 'nesw-resize', br: 'nwse-resize', bl: 'nesw-resize',
  t: 'ns-resize', b: 'ns-resize', l: 'ew-resize', r: 'ew-resize',
}

export function getHandleScreenPoints(rect: Rect, zoom: number, panOffset: Point): Record<HandleId, Point> {
  const tl = pixelToScreen(rect.x, rect.y, zoom, panOffset)
  const br = pixelToScreen(rect.x + rect.w, rect.y + rect.h, zoom, panOffset)
  const cx = (tl.x + br.x) / 2
  const cy = (tl.y + br.y) / 2
  return {
    tl: { x: tl.x, y: tl.y },
    t:  { x: cx,   y: tl.y },
    tr: { x: br.x, y: tl.y },
    r:  { x: br.x, y: cy   },
    br: { x: br.x, y: br.y },
    b:  { x: cx,   y: br.y },
    bl: { x: tl.x, y: br.y },
    l:  { x: tl.x, y: cy   },
  }
}

// Corners have priority over edge midpoints when handles overlap on small rects.
export function hitTestHandle(mx: number, my: number, handles: Record<HandleId, Point>): HandleId | null {
  const r = HANDLE_HIT / 2
  for (const id of ['tl', 'tr', 'bl', 'br', 't', 'r', 'b', 'l'] as HandleId[]) {
    const h = handles[id]
    if (Math.abs(mx - h.x) <= r && Math.abs(my - h.y) <= r) return id
  }
  return null
}

export function drawHandles(ctx: CanvasRenderingContext2D, handles: Record<HandleId, Point>): void {
  ctx.save()
  ctx.lineWidth = 1
  for (const id of HANDLE_IDS) {
    const { x, y } = handles[id]
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - HALF, y - HALF, HANDLE_SIZE, HANDLE_SIZE)
    ctx.strokeStyle = '#000000'
    ctx.strokeRect(x - HALF + 0.5, y - HALF + 0.5, HANDLE_SIZE - 1, HANDLE_SIZE - 1)
  }
  ctx.restore()
}
