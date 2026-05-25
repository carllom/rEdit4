import type { PixelDiff } from '../../domain/history'
import { linearIndex, inBounds } from '../viewport'

export function ellipseOutlinePoints(
  x0: number, y0: number, x1: number, y1: number,
): { x: number; y: number }[] {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1)

  if (minX === maxX && minY === maxY) return [{ x: minX, y: minY }]
  if (minX === maxX) {
    const pts: { x: number; y: number }[] = []
    for (let y = minY; y <= maxY; y++) pts.push({ x: minX, y })
    return pts
  }
  if (minY === maxY) {
    const pts: { x: number; y: number }[] = []
    for (let x = minX; x <= maxX; x++) pts.push({ x, y: minY })
    return pts
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const rx = (maxX - minX) / 2
  const ry = (maxY - minY) / 2

  const seen = new Set<number>()
  const pts: { x: number; y: number }[] = []

  function add(x: number, y: number) {
    const px = Math.round(x), py = Math.round(y)
    if (px < minX || px > maxX || py < minY || py > maxY) return
    const key = py * 65536 + px
    if (seen.has(key)) return
    seen.add(key)
    pts.push({ x: px, y: py })
  }

  // Row pass: leftmost and rightmost pixel per scanline
  for (let y = minY; y <= maxY; y++) {
    const inner = 1 - ((y - cy) / ry) ** 2
    if (inner < 0) continue
    const xOff = rx * Math.sqrt(inner)
    add(cx - xOff, y)
    add(cx + xOff, y)
  }

  // Column pass: topmost and bottommost per column (fills diagonal gaps)
  for (let x = minX; x <= maxX; x++) {
    const inner = 1 - ((x - cx) / rx) ** 2
    if (inner < 0) continue
    const yOff = ry * Math.sqrt(inner)
    add(x, cy - yOff)
    add(x, cy + yOff)
  }

  return pts
}

export function applyEllipse(
  data: Uint8Array,
  width: number, height: number,
  x0: number, y0: number,
  x1: number, y1: number,
  colorIdx: number,
): PixelDiff[] {
  const diffs: PixelDiff[] = []
  for (const p of ellipseOutlinePoints(x0, y0, x1, y1)) {
    if (!inBounds(p.x, p.y, width, height)) continue
    const li = linearIndex(p.x, p.y, width)
    const old = data[li]
    if (old === colorIdx) continue
    diffs.push({ x: p.x, y: p.y, oldIndex: old, newIndex: colorIdx })
    data[li] = colorIdx
  }
  return diffs
}

export function applyEllipseFilled(
  data: Uint8Array,
  width: number, height: number,
  x0: number, y0: number,
  x1: number, y1: number,
  colorIdx: number,
): PixelDiff[] {
  // Derive scanline spans from the outline so the filled boundary is pixel-identical.
  const rowSpan = new Map<number, { xL: number; xR: number }>()
  for (const { x, y } of ellipseOutlinePoints(x0, y0, x1, y1)) {
    const span = rowSpan.get(y)
    if (!span) rowSpan.set(y, { xL: x, xR: x })
    else { span.xL = Math.min(span.xL, x); span.xR = Math.max(span.xR, x) }
  }

  const diffs: PixelDiff[] = []
  for (const [y, { xL, xR }] of rowSpan) {
    for (let x = xL; x <= xR; x++) {
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
