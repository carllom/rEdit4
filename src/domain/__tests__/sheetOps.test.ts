import { describe, it, expect } from 'vitest'
import type { Rect } from '../model'
import type { RgbColor } from '../model'
import {
  isTransparentPixel,
  growRectangle,
  shrinkRectangle,
  collectUniqueColors,
  buildIndexedLayer,
  type PixelBuffer,
} from '../sheetOps'

// ─── helpers ─────────────────────────────────────────────────────────────────

type Pixel = [number, number, number, number] // r, g, b, a

const T: Pixel = [0, 0, 0, 0]
const R: Pixel = [255, 0, 0, 255]
const G: Pixel = [0, 255, 0, 255]
const B: Pixel = [0, 0, 255, 255]
const W: Pixel = [255, 255, 255, 255]

function buf(grid: Pixel[][]): PixelBuffer {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = grid[y][x]
      const i = (y * width + x) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a
    }
  }
  return { data, width, height }
}

const BOUNDS: Rect = { x: 0, y: 0, w: 5, h: 5 }
const MATTE: RgbColor = { r: 0, g: 255, b: 0 } // green is matte

// ─── isTransparentPixel ───────────────────────────────────────────────────────

describe('isTransparentPixel', () => {
  it('alpha=0 is transparent regardless of matteColor', () => {
    expect(isTransparentPixel(255, 0, 0, 0, null)).toBe(true)
    expect(isTransparentPixel(255, 0, 0, 0, MATTE)).toBe(true)
  })

  it('RGB matches matteColor with alpha>0 is transparent', () => {
    expect(isTransparentPixel(0, 255, 0, 255, MATTE)).toBe(true)
    expect(isTransparentPixel(0, 255, 0, 128, MATTE)).toBe(true)
  })

  it('RGB differs from matteColor is opaque', () => {
    expect(isTransparentPixel(255, 0, 0, 255, MATTE)).toBe(false)
    expect(isTransparentPixel(0, 254, 0, 255, MATTE)).toBe(false)
  })

  it('null matteColor only triggers alpha rule', () => {
    expect(isTransparentPixel(0, 255, 0, 255, null)).toBe(false)
    expect(isTransparentPixel(0, 0, 0, 255, null)).toBe(false)
    expect(isTransparentPixel(0, 0, 0, 0, null)).toBe(true)
  })
})

// ─── growRectangle ────────────────────────────────────────────────────────────

describe('growRectangle', () => {
  it('returns null for a transparent seed', () => {
    const pixels = buf([
      [T, T, T],
      [T, T, T],
      [T, T, T],
    ])
    expect(growRectangle(pixels, { x: 1, y: 1 }, { x: 0, y: 0, w: 3, h: 3 }, null)).toBeNull()
  })

  it('expands correctly around a simple bounded sprite', () => {
    //  T T T T T
    //  T R R T T
    //  T R R T T
    //  T T T T T
    //  T T T T T
    const pixels = buf([
      [T, T, T, T, T],
      [T, R, R, T, T],
      [T, R, R, T, T],
      [T, T, T, T, T],
      [T, T, T, T, T],
    ])
    const result = growRectangle(pixels, { x: 1, y: 1 }, BOUNDS, null)
    expect(result).toEqual({ x: 1, y: 1, w: 2, h: 2 })
  })

  it('clamps at sheet boundary when sprite touches edge', () => {
    //  R R T T T
    //  R R T T T
    //  T T T T T
    //  T T T T T
    //  T T T T T
    const pixels = buf([
      [R, R, T, T, T],
      [R, R, T, T, T],
      [T, T, T, T, T],
      [T, T, T, T, T],
      [T, T, T, T, T],
    ])
    const result = growRectangle(pixels, { x: 0, y: 0 }, BOUNDS, null)
    expect(result).toEqual({ x: 0, y: 0, w: 2, h: 2 })
  })

  it('returns correct rect for an asymmetric region', () => {
    //  T T T T T
    //  T R T T T
    //  T R R T T
    //  T R R T T
    //  T T T T T
    const pixels = buf([
      [T, T, T, T, T],
      [T, R, T, T, T],
      [T, R, R, T, T],
      [T, R, R, T, T],
      [T, T, T, T, T],
    ])
    const result = growRectangle(pixels, { x: 1, y: 1 }, BOUNDS, null)
    expect(result).toEqual({ x: 1, y: 1, w: 2, h: 3 })
  })

  it('treats matteColor pixels as transparent', () => {
    //  G G G G G  (G = matte green → transparent)
    //  G R R G G
    //  G R R G G
    //  G G G G G
    //  G G G G G
    const pixels = buf([
      [G, G, G, G, G],
      [G, R, R, G, G],
      [G, R, R, G, G],
      [G, G, G, G, G],
      [G, G, G, G, G],
    ])
    const result = growRectangle(pixels, { x: 1, y: 1 }, BOUNDS, MATTE)
    expect(result).toEqual({ x: 1, y: 1, w: 2, h: 2 })
  })
})

// ─── shrinkRectangle ─────────────────────────────────────────────────────────

describe('shrinkRectangle', () => {
  it('shrinks to tight bounds', () => {
    //  T T T T T
    //  T R R T T
    //  T R R T T
    //  T T T T T
    //  T T T T T
    const pixels = buf([
      [T, T, T, T, T],
      [T, R, R, T, T],
      [T, R, R, T, T],
      [T, T, T, T, T],
      [T, T, T, T, T],
    ])
    const result = shrinkRectangle(pixels, BOUNDS, BOUNDS, null)
    expect(result).toEqual({ x: 1, y: 1, w: 2, h: 2 })
  })

  it('leaves non-transparent edges in place', () => {
    //  R R R R R
    //  R T T T R
    //  R T T T R
    //  R T T T R
    //  R R R R R
    const pixels = buf([
      [R, R, R, R, R],
      [R, T, T, T, R],
      [R, T, T, T, R],
      [R, T, T, T, R],
      [R, R, R, R, R],
    ])
    const result = shrinkRectangle(pixels, BOUNDS, BOUNDS, null)
    expect(result).toEqual(BOUNDS)
  })

  it('returns null for a fully-transparent input', () => {
    const pixels = buf([
      [T, T, T],
      [T, T, T],
      [T, T, T],
    ])
    const bounds = { x: 0, y: 0, w: 3, h: 3 }
    expect(shrinkRectangle(pixels, bounds, bounds, null)).toBeNull()
  })

  it('no-op when all edges already touch non-transparent pixels', () => {
    //  R T T T R
    //  T T T T T
    //  T T T T T
    //  T T T T T
    //  R T T T R
    const pixels = buf([
      [R, T, T, T, R],
      [T, T, T, T, T],
      [T, T, T, T, T],
      [T, T, T, T, T],
      [R, T, T, T, R],
    ])
    const result = shrinkRectangle(pixels, BOUNDS, BOUNDS, null)
    expect(result).toEqual(BOUNDS)
  })

  it('treats matteColor pixels as transparent when shrinking', () => {
    //  G G G G G
    //  G R R G G
    //  G R R G G
    //  G G G G G
    //  G G G G G
    const pixels = buf([
      [G, G, G, G, G],
      [G, R, R, G, G],
      [G, R, R, G, G],
      [G, G, G, G, G],
      [G, G, G, G, G],
    ])
    const result = shrinkRectangle(pixels, BOUNDS, BOUNDS, MATTE)
    expect(result).toEqual({ x: 1, y: 1, w: 2, h: 2 })
  })
})

// ─── collectUniqueColors ──────────────────────────────────────────────────────

describe('collectUniqueColors', () => {
  it('returns correct set for simple palette art', () => {
    const pixels = buf([
      [R, G, B],
      [R, R, B],
    ])
    const rect: Rect = { x: 0, y: 0, w: 3, h: 2 }
    const result = collectUniqueColors(pixels, rect, null)
    expect(result).toHaveLength(3)
    expect(result).toContainEqual({ r: 255, g: 0, b: 0 })
    expect(result).toContainEqual({ r: 0, g: 255, b: 0 })
    expect(result).toContainEqual({ r: 0, g: 0, b: 255 })
  })

  it('excludes transparent pixels', () => {
    const pixels = buf([
      [T, R, T],
      [T, T, T],
    ])
    const rect: Rect = { x: 0, y: 0, w: 3, h: 2 }
    const result = collectUniqueColors(pixels, rect, null)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('excludes matteColor pixels', () => {
    const pixels = buf([
      [G, R, G],
      [G, G, G],
    ])
    const rect: Rect = { x: 0, y: 0, w: 3, h: 2 }
    const result = collectUniqueColors(pixels, rect, MATTE)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('returns empty for a fully-transparent region', () => {
    const pixels = buf([
      [T, T],
      [T, T],
    ])
    const rect: Rect = { x: 0, y: 0, w: 2, h: 2 }
    expect(collectUniqueColors(pixels, rect, null)).toEqual([])
  })

  it('does not include duplicate colors', () => {
    const pixels = buf([
      [R, R, R],
      [R, R, R],
    ])
    const rect: Rect = { x: 0, y: 0, w: 3, h: 2 }
    const result = collectUniqueColors(pixels, rect, null)
    expect(result).toHaveLength(1)
  })
})

// ─── buildIndexedLayer ────────────────────────────────────────────────────────

describe('buildIndexedLayer', () => {
  const palette: RgbColor[] = [
    { r: 0, g: 0, b: 0 },     // index 0 = transparent slot (not actually used for matching)
    { r: 255, g: 0, b: 0 },   // index 1 = red
    { r: 0, g: 0, b: 255 },   // index 2 = blue
    { r: 255, g: 255, b: 255 }, // index 3 = white
  ]

  it('output length equals rect.w * rect.h', () => {
    const pixels = buf([[R, R, R], [R, R, R]])
    const rect: Rect = { x: 0, y: 0, w: 3, h: 2 }
    const result = buildIndexedLayer(pixels, rect, null, palette)
    expect(result.length).toBe(6)
  })

  it('transparent pixel maps to index 0', () => {
    const pixels = buf([[T]])
    const rect: Rect = { x: 0, y: 0, w: 1, h: 1 }
    expect(buildIndexedLayer(pixels, rect, null, palette)[0]).toBe(0)
  })

  it('matteColor pixel maps to index 0', () => {
    const pixels = buf([[G]])
    const rect: Rect = { x: 0, y: 0, w: 1, h: 1 }
    expect(buildIndexedLayer(pixels, rect, MATTE, palette)[0]).toBe(0)
  })

  it('palette match maps to correct index', () => {
    const pixels = buf([[R, B, W]])
    const rect: Rect = { x: 0, y: 0, w: 3, h: 1 }
    const result = buildIndexedLayer(pixels, rect, null, palette)
    expect(result[0]).toBe(1) // red
    expect(result[1]).toBe(2) // blue
    expect(result[2]).toBe(3) // white
  })

  it('fully transparent rect produces all zeros', () => {
    const pixels = buf([[T, T], [T, T]])
    const rect: Rect = { x: 0, y: 0, w: 2, h: 2 }
    const result = buildIndexedLayer(pixels, rect, null, palette)
    expect(Array.from(result)).toEqual([0, 0, 0, 0])
  })
})
