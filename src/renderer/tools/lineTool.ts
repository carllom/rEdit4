import type { PixelDiff } from '../../domain/history'
import { linearIndex, inBounds } from '../viewport'

export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  let dx = Math.abs(x1 - x0)
  let dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  let x = x0
  let y = y0
  while (true) {
    points.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 < dx)  { err += dx; y += sy }
  }
  return points
}

export function applyLine(
  data: Uint8Array,
  width: number,
  height: number,
  x0: number, y0: number,
  x1: number, y1: number,
  colorIdx: number,
): PixelDiff[] {
  const diffs: PixelDiff[] = []
  for (const p of bresenhamLine(x0, y0, x1, y1)) {
    if (!inBounds(p.x, p.y, width, height)) continue
    const li = linearIndex(p.x, p.y, width)
    const old = data[li]
    if (old === colorIdx) continue
    diffs.push({ x: p.x, y: p.y, oldIndex: old, newIndex: colorIdx })
    data[li] = colorIdx
  }
  return diffs
}
