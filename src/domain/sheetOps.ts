import type { Point, Rect, RgbColor } from './model'

export interface PixelBuffer {
  data: Uint8ClampedArray
  width: number
  height: number
}

export function isTransparentPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  matteColor: RgbColor | null,
): boolean {
  if (a === 0) return true
  if (matteColor !== null && r === matteColor.r && g === matteColor.g && b === matteColor.b) return true
  return false
}

function getPixel(pixels: PixelBuffer, x: number, y: number): [number, number, number, number] {
  const i = (y * pixels.width + x) * 4
  return [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2], pixels.data[i + 3]]
}

function isTransparentAt(pixels: PixelBuffer, x: number, y: number, matteColor: RgbColor | null): boolean {
  const [r, g, b, a] = getPixel(pixels, x, y)
  return isTransparentPixel(r, g, b, a, matteColor)
}

function rowHasOpaque(pixels: PixelBuffer, y: number, x0: number, x1: number, matteColor: RgbColor | null): boolean {
  for (let x = x0; x <= x1; x++) {
    if (!isTransparentAt(pixels, x, y, matteColor)) return true
  }
  return false
}

function colHasOpaque(pixels: PixelBuffer, x: number, y0: number, y1: number, matteColor: RgbColor | null): boolean {
  for (let y = y0; y <= y1; y++) {
    if (!isTransparentAt(pixels, x, y, matteColor)) return true
  }
  return false
}

export function growRectangle(
  pixels: PixelBuffer,
  seed: Point,
  sheetBounds: Rect,
  matteColor: RgbColor | null,
): Rect | null {
  if (isTransparentAt(pixels, seed.x, seed.y, matteColor)) return null

  const bx0 = sheetBounds.x
  const by0 = sheetBounds.y
  const bx1 = sheetBounds.x + sheetBounds.w - 1
  const by1 = sheetBounds.y + sheetBounds.h - 1

  let x0 = seed.x
  let y0 = seed.y
  let x1 = seed.x
  let y1 = seed.y

  let changed = true
  while (changed) {
    changed = false
    if (y0 > by0 && rowHasOpaque(pixels, y0 - 1, x0, x1, matteColor)) { y0--; changed = true }
    if (y1 < by1 && rowHasOpaque(pixels, y1 + 1, x0, x1, matteColor)) { y1++; changed = true }
    if (x0 > bx0 && colHasOpaque(pixels, x0 - 1, y0, y1, matteColor)) { x0--; changed = true }
    if (x1 < bx1 && colHasOpaque(pixels, x1 + 1, y0, y1, matteColor)) { x1++; changed = true }
  }

  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

export function shrinkRectangle(
  pixels: PixelBuffer,
  startRect: Rect,
  _sheetBounds: Rect,
  matteColor: RgbColor | null,
): Rect | null {
  let x0 = startRect.x
  let y0 = startRect.y
  let x1 = startRect.x + startRect.w - 1
  let y1 = startRect.y + startRect.h - 1

  while (y0 <= y1 && !rowHasOpaque(pixels, y0, x0, x1, matteColor)) y0++
  while (y1 >= y0 && !rowHasOpaque(pixels, y1, x0, x1, matteColor)) y1--
  while (x0 <= x1 && !colHasOpaque(pixels, x0, y0, y1, matteColor)) x0++
  while (x1 >= x0 && !colHasOpaque(pixels, x1, y0, y1, matteColor)) x1--

  if (x0 > x1 || y0 > y1) return null
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

export function collectUniqueColors(
  pixels: PixelBuffer,
  rect: Rect,
  matteColor: RgbColor | null,
): RgbColor[] {
  const seen = new Set<string>()
  const result: RgbColor[] = []
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const [r, g, b, a] = getPixel(pixels, x, y)
      if (!isTransparentPixel(r, g, b, a, matteColor)) {
        const key = `${r},${g},${b}`
        if (!seen.has(key)) {
          seen.add(key)
          result.push({ r, g, b })
        }
      }
    }
  }
  return result
}

export function buildIndexedLayer(
  pixels: PixelBuffer,
  rect: Rect,
  matteColor: RgbColor | null,
  palette: RgbColor[],
): Uint8Array {
  const out = new Uint8Array(rect.w * rect.h)
  for (let row = 0; row < rect.h; row++) {
    for (let col = 0; col < rect.w; col++) {
      const [r, g, b, a] = getPixel(pixels, rect.x + col, rect.y + row)
      if (isTransparentPixel(r, g, b, a, matteColor)) {
        out[row * rect.w + col] = 0
      } else {
        let idx = 0
        for (let p = 1; p < palette.length; p++) {
          if (palette[p].r === r && palette[p].g === g && palette[p].b === b) {
            idx = p
            break
          }
        }
        out[row * rect.w + col] = idx
      }
    }
  }
  return out
}
