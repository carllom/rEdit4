import { describe, it, expect } from 'vitest'
import type { Sheet, SheetEntry, Rect } from '../model'
import {
  checkColorOverflow,
  extractIndividual,
  extractMerged,
  MERGED_SENTINEL,
} from '../sheetExtraction'
import type { PixelBuffer } from '../sheetOps'

// ─── helpers ─────────────────────────────────────────────────────────────────

type Pixel = [number, number, number, number]

const T: Pixel = [0, 0, 0, 0]
const R: Pixel = [255, 0, 0, 255]
const G: Pixel = [0, 255, 0, 255]
const B: Pixel = [0, 0, 255, 255]

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

// Creates a 1×N buffer where each pixel has a unique opaque color (index-encoded).
// Generates up to 65536 unique colors using (r=i>>8, g=i&255, b=42).
function uniqueColorBuf(count: number): PixelBuffer {
  const data = new Uint8ClampedArray(count * 4)
  for (let i = 0; i < count; i++) {
    data[i * 4 + 0] = Math.floor(i / 256)
    data[i * 4 + 1] = i % 256
    data[i * 4 + 2] = 42
    data[i * 4 + 3] = 255
  }
  return { data, width: count, height: 1 }
}

function entry(name: string, rect: Rect): SheetEntry {
  return { name, rect }
}

function sheet(entries: SheetEntry[] = []): Sheet {
  return { id: 'sh-1', name: 'Sheet', sourceRef: '', entries, matteColor: null }
}

// ─── checkColorOverflow ───────────────────────────────────────────────────────

describe('checkColorOverflow', () => {
  it('returns empty map when all entries are within 255 colors (individual)', () => {
    const pixels = buf([[R, G, B]])
    const entries = [entry('e1', { x: 0, y: 0, w: 3, h: 1 })]
    const result = checkColorOverflow(pixels, entries, null, 'individual')
    expect(result.size).toBe(0)
  })

  it('flags individual entries exceeding 255 colors', () => {
    // 256 unique colors → overflows
    const pixels = uniqueColorBuf(256)
    const entries = [entry('big', { x: 0, y: 0, w: 256, h: 1 })]
    const result = checkColorOverflow(pixels, entries, null, 'individual')
    expect(result.has('big')).toBe(true)
    expect(result.get('big')).toBe(256)
  })

  it('does not flag individual entries within 255 colors', () => {
    // 255 unique colors: exactly at limit (not over)
    const pixels = uniqueColorBuf(255)
    const entries = [entry('ok', { x: 0, y: 0, w: 255, h: 1 })]
    const result = checkColorOverflow(pixels, entries, null, 'individual')
    expect(result.size).toBe(0)
  })

  it('only flags overflowing entry when another is within limit (individual)', () => {
    // 300-pixel buffer: first 254 pixels are one entry, last 46 + overlap pushed to 256
    // Simpler: one big entry (256 colors) and one small entry (3 colors)
    const bigBuf = uniqueColorBuf(256)
    // Append R, G, B at positions 256, 257, 258
    const combined = new Uint8ClampedArray(bigBuf.data.length + 12)
    combined.set(bigBuf.data, 0)
    combined[256 * 4 + 0] = 255; combined[256 * 4 + 3] = 255
    combined[257 * 4 + 1] = 255; combined[257 * 4 + 3] = 255
    combined[258 * 4 + 2] = 255; combined[258 * 4 + 3] = 255
    const pixels: PixelBuffer = { data: combined, width: 259, height: 1 }
    const entries = [
      entry('small', { x: 256, y: 0, w: 3, h: 1 }),
      entry('big', { x: 0, y: 0, w: 256, h: 1 }),
    ]
    const result = checkColorOverflow(pixels, entries, null, 'individual')
    expect(result.has('big')).toBe(true)
    expect(result.has('small')).toBe(false)
  })

  it('flags merged group when union exceeds 255 colors', () => {
    // Two non-overlapping ranges: 150 + 150 = 300 unique colors total
    const pixels = uniqueColorBuf(300)
    const entries = [
      entry('a', { x: 0, y: 0, w: 150, h: 1 }),
      entry('b', { x: 150, y: 0, w: 150, h: 1 }),
    ]
    const result = checkColorOverflow(pixels, entries, null, 'merged')
    expect(result.has(MERGED_SENTINEL)).toBe(true)
    expect(result.get(MERGED_SENTINEL)).toBe(300)
  })

  it('returns empty map when merged union is within 255 colors', () => {
    const pixels = buf([[R, G, B]])
    const entries = [
      entry('a', { x: 0, y: 0, w: 2, h: 1 }),
      entry('b', { x: 1, y: 0, w: 2, h: 1 }),
    ]
    const result = checkColorOverflow(pixels, entries, null, 'merged')
    expect(result.size).toBe(0)
  })

  it('deduplicates colors shared between entries in merged mode', () => {
    // Both entries see the same R and G: union is still 2
    const pixels = buf([[R, G, R, G]])
    const entries = [
      entry('a', { x: 0, y: 0, w: 2, h: 1 }),
      entry('b', { x: 2, y: 0, w: 2, h: 1 }),
    ]
    const result = checkColorOverflow(pixels, entries, null, 'merged')
    expect(result.size).toBe(0)
  })
})

// ─── extractIndividual ────────────────────────────────────────────────────────

describe('extractIndividual', () => {
  // Buffer layout:
  //  col:  0  1
  //  row0: R  B
  //  row1: G  T
  const pixels = buf([[R, B], [G, T]])
  const entryLeft = entry('left', { x: 0, y: 0, w: 1, h: 2 })   // R, G
  const entryRight = entry('right', { x: 1, y: 0, w: 1, h: 2 }) // B, T
  const s = sheet([entryLeft, entryRight])

  it('produces one Image and one Palette per entry', () => {
    const { images, palettes } = extractIndividual(pixels, s, [entryLeft, entryRight])
    expect(images).toHaveLength(2)
    expect(palettes).toHaveLength(2)
  })

  it('Image and Palette names match the SheetEntry name', () => {
    const { images, palettes } = extractIndividual(pixels, s, [entryLeft, entryRight])
    expect(images[0].name).toBe('left')
    expect(palettes[0].name).toBe('left')
    expect(images[1].name).toBe('right')
    expect(palettes[1].name).toBe('right')
  })

  it('Palette index 0 is transparent', () => {
    const { palettes } = extractIndividual(pixels, s, [entryLeft])
    expect(palettes[0].colors[0].a).toBe(0)
    expect(palettes[0].colors[0].id).toBe('transparent')
  })

  it('Image references its own Palette id', () => {
    const { images, palettes } = extractIndividual(pixels, s, [entryLeft, entryRight])
    expect(images[0].paletteId).toBe(palettes[0].id)
    expect(images[1].paletteId).toBe(palettes[1].id)
  })

  it('pixel data maps correctly to palette indices (left entry: R and G)', () => {
    const { images, palettes } = extractIndividual(pixels, s, [entryLeft])
    const palette = palettes[0]
    const layer = images[0].layers[0]
    // palette[1] = R (255,0,0), palette[2] = G (0,255,0) in discovery order
    const colorAt = (i: number) => palette.colors[layer.data[i]]
    expect(colorAt(0)).toMatchObject({ r: 255, g: 0, b: 0 }) // top pixel = R
    expect(colorAt(1)).toMatchObject({ r: 0, g: 255, b: 0 }) // bottom pixel = G
  })

  it('transparent pixels map to index 0 (right entry)', () => {
    const { images } = extractIndividual(pixels, s, [entryRight])
    const layer = images[0].layers[0]
    expect(layer.data[0]).toBeGreaterThan(0) // B is opaque
    expect(layer.data[1]).toBe(0)             // T is transparent → index 0
  })

  it('Image dimensions match the SheetEntry rect', () => {
    const { images } = extractIndividual(pixels, s, [entryLeft, entryRight])
    expect(images[0].width).toBe(1)
    expect(images[0].height).toBe(2)
    expect(images[1].width).toBe(1)
    expect(images[1].height).toBe(2)
  })
})

// ─── extractMerged ────────────────────────────────────────────────────────────

describe('extractMerged', () => {
  // Buffer layout:
  //  col:  0  1  2
  //  row0: R  G  B
  const pixels = buf([[R, G, B]])
  const entryA = entry('sprite-a', { x: 0, y: 0, w: 2, h: 1 }) // R, G
  const entryB = entry('sprite-b', { x: 1, y: 0, w: 2, h: 1 }) // G, B
  const s = sheet([entryA, entryB])

  it('produces one Image per entry and exactly one shared Palette', () => {
    const { images, palettes } = extractMerged(pixels, s, [entryA, entryB], 'Shared')
    expect(images).toHaveLength(2)
    expect(palettes).toHaveLength(1)
  })

  it('Palette name matches paletteName argument', () => {
    const { palettes } = extractMerged(pixels, s, [entryA, entryB], 'My Palette')
    expect(palettes[0].name).toBe('My Palette')
  })

  it('all Images reference the same Palette id', () => {
    const { images, palettes } = extractMerged(pixels, s, [entryA, entryB], 'Shared')
    const sharedId = palettes[0].id
    for (const img of images) {
      expect(img.paletteId).toBe(sharedId)
    }
  })

  it('Images are named after their SheetEntries', () => {
    const { images } = extractMerged(pixels, s, [entryA, entryB], 'Shared')
    expect(images[0].name).toBe('sprite-a')
    expect(images[1].name).toBe('sprite-b')
  })

  it('union of colors is complete — shared Palette contains all unique colors from all entries', () => {
    const { palettes } = extractMerged(pixels, s, [entryA, entryB], 'Shared')
    // Union of R, G (from A) + G, B (from B) = R, G, B → 3 non-transparent slots
    expect(palettes[0].colors).toHaveLength(4) // transparent + R + G + B
    expect(palettes[0].colors[0].a).toBe(0)    // index 0 = transparent
  })

  it('pixel data maps correctly against the shared palette', () => {
    const { images, palettes } = extractMerged(pixels, s, [entryA, entryB], 'Shared')
    const palette = palettes[0]
    const colorOf = (img: (typeof images)[0], pixelIdx: number) =>
      palette.colors[img.layers[0].data[pixelIdx]]

    // entryA covers col 0..1: R at [0], G at [1]
    expect(colorOf(images[0], 0)).toMatchObject({ r: 255, g: 0, b: 0 })
    expect(colorOf(images[0], 1)).toMatchObject({ r: 0, g: 255, b: 0 })
    // entryB covers col 1..2: G at [0], B at [1]
    expect(colorOf(images[1], 0)).toMatchObject({ r: 0, g: 255, b: 0 })
    expect(colorOf(images[1], 1)).toMatchObject({ r: 0, g: 0, b: 255 })
  })

  it('shared colors between entries get the same palette index', () => {
    const { images, palettes } = extractMerged(pixels, s, [entryA, entryB], 'Shared')
    // G appears in both entries — should map to the same palette index
    const gInA = images[0].layers[0].data[1] // second pixel of entryA is G
    const gInB = images[1].layers[0].data[0] // first pixel of entryB is G
    expect(gInA).toBe(gInB)
    expect(gInA).toBeGreaterThan(0)
  })
})
