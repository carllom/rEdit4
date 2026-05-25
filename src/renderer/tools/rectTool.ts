import type { PixelDiff } from '../../domain/history'
import { linearIndex, inBounds } from '../viewport'

export function applyRectFilled(
  data: Uint8Array,
  width: number, height: number,
  x0: number, y0: number,
  x1: number, y1: number,
  colorIdx: number,
): PixelDiff[] {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)
  const diffs: PixelDiff[] = []
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!inBounds(x, y, width, height)) continue
      const li = linearIndex(x, y, width)
      const old = data[li]
      if (old === colorIdx) continue
      diffs.push({ x, y, oldIndex: old, newIndex: colorIdx })
      data[li] = colorIdx
    }
  }
  return diffs
}

export function rectOutlinePoints(
  x0: number, y0: number,
  x1: number, y1: number,
): { x: number; y: number }[] {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)
  const points: { x: number; y: number }[] = []

  for (let x = minX; x <= maxX; x++) {
    points.push({ x, y: minY })
    if (maxY !== minY) points.push({ x, y: maxY })
  }
  for (let y = minY + 1; y < maxY; y++) {
    points.push({ x: minX, y })
    if (maxX !== minX) points.push({ x: maxX, y })
  }
  return points
}

export function applyRect(
  data: Uint8Array,
  width: number,
  height: number,
  x0: number, y0: number,
  x1: number, y1: number,
  colorIdx: number,
): PixelDiff[] {
  const diffs: PixelDiff[] = []
  for (const p of rectOutlinePoints(x0, y0, x1, y1)) {
    if (!inBounds(p.x, p.y, width, height)) continue
    const li = linearIndex(p.x, p.y, width)
    const old = data[li]
    if (old === colorIdx) continue
    diffs.push({ x: p.x, y: p.y, oldIndex: old, newIndex: colorIdx })
    data[li] = colorIdx
  }
  return diffs
}
