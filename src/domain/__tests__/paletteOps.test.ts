import { describe, it, expect } from 'vitest'
import type { Color, Layer, Palette, Project, ReImage } from '../model'
import {
  clonePalette,
  findPaletteUsage,
  findColorUsage,
  swapPaletteColors,
  buildRemapTable,
  remapLayerIndices,
  reassignPalette,
  paletteExceedsImage,
} from '../paletteOps'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeColor(r: number, g: number, b: number, a = 255, name = 'c'): Color {
  return { id: `id-${r}-${g}-${b}`, name, r, g, b, a }
}

function transparentColor(): Color {
  return { id: 'transparent', name: 'transparent', r: 0, g: 0, b: 0, a: 0 }
}

function makePalette(colorCount = 4): Palette {
  const colors: Color[] = [transparentColor()]
  for (let i = 1; i < colorCount; i++) {
    colors.push(makeColor(i * 10, i * 20, i * 30))
  }
  return { id: 'pal-1', name: 'Test', description: '', colors }
}

function makeLayer(data: number[]): Layer {
  return {
    id: 'layer-1',
    name: 'Layer',
    opacity: 1,
    visible: true,
    data: new Uint8Array(data),
  }
}

function makeImage(layers: Layer[], paletteId = 'pal-1'): ReImage {
  return { id: 'img-1', name: 'Image', width: layers[0]?.data.length ?? 0, height: 1, paletteId, layers }
}

function makeProject(...images: ReImage[]): Project {
  return {
    id: 'proj-1', name: 'Proj', description: '',
    palettes: [], images, sprites: [], animations: [], sheets: [],
  }
}

// ─── clonePalette ─────────────────────────────────────────────────────────────

describe('clonePalette', () => {
  it('returns a new palette with a distinct id', () => {
    const src = makePalette(3)
    const clone = clonePalette(src)
    expect(clone.id).not.toBe(src.id)
  })

  it('color count matches source', () => {
    const src = makePalette(5)
    const clone = clonePalette(src)
    expect(clone.colors.length).toBe(5)
  })

  it('slot 0 retains fixed transparent id and values', () => {
    const src = makePalette(3)
    const clone = clonePalette(src)
    expect(clone.colors[0].id).toBe('transparent')
    expect(clone.colors[0].r).toBe(0)
    expect(clone.colors[0].g).toBe(0)
    expect(clone.colors[0].b).toBe(0)
    expect(clone.colors[0].a).toBe(0)
  })

  it('non-zero color slots get fresh ids', () => {
    const src = makePalette(3)
    const clone = clonePalette(src)
    for (let i = 1; i < src.colors.length; i++) {
      expect(clone.colors[i].id).not.toBe(src.colors[i].id)
    }
  })

  it('copies name and description', () => {
    const src = { ...makePalette(2), name: 'My Pal', description: 'desc' }
    const clone = clonePalette(src)
    expect(clone.name).toBe('My Pal')
    expect(clone.description).toBe('desc')
  })

  it('mutation of clone does not affect source', () => {
    const src = makePalette(3)
    const clone = clonePalette(src)
    clone.colors[1].r = 255
    expect(src.colors[1].r).not.toBe(255)
  })
})

// ─── findPaletteUsage ─────────────────────────────────────────────────────────

describe('findPaletteUsage', () => {
  it('returns images whose paletteId matches', () => {
    const img1 = makeImage([makeLayer([1, 2])], 'pal-a')
    const img2 = makeImage([makeLayer([3])], 'pal-b')
    const img3 = makeImage([makeLayer([1])], 'pal-a')
    const project = makeProject(img1, img2, img3)
    const result = findPaletteUsage(project, 'pal-a')
    expect(result).toHaveLength(2)
    expect(result.map(i => i.id)).toEqual([img1.id, img3.id])
  })

  it('returns empty array for unknown paletteId', () => {
    const img = makeImage([makeLayer([1])], 'pal-a')
    const project = makeProject(img)
    expect(findPaletteUsage(project, 'pal-zzz')).toEqual([])
  })

  it('returns empty array when project has no images', () => {
    const project = makeProject()
    expect(findPaletteUsage(project, 'pal-a')).toEqual([])
  })
})

// ─── findColorUsage ───────────────────────────────────────────────────────────

describe('findColorUsage', () => {
  it('counts pixels equal to colorIndex across a single layer', () => {
    const image = makeImage([makeLayer([1, 2, 1, 3, 1])])
    expect(findColorUsage(image, 1)).toBe(3)
  })

  it('counts across multiple layers', () => {
    const image = makeImage([makeLayer([1, 2, 1]), makeLayer([3, 1, 1])])
    expect(findColorUsage(image, 1)).toBe(4)
  })

  it('returns zero for an unused index', () => {
    const image = makeImage([makeLayer([1, 2, 3])])
    expect(findColorUsage(image, 7)).toBe(0)
  })
})

// ─── swapPaletteColors ────────────────────────────────────────────────────────

describe('swapPaletteColors', () => {
  it('exchanges the two color entries', () => {
    const pal = makePalette(4)
    const colorA = { ...pal.colors[1] }
    const colorB = { ...pal.colors[2] }
    swapPaletteColors(pal, 1, 2)
    expect(pal.colors[1]).toEqual(colorB)
    expect(pal.colors[2]).toEqual(colorA)
  })

  it('leaves all other slots unchanged', () => {
    const pal = makePalette(5)
    const before = pal.colors.map(c => ({ ...c }))
    swapPaletteColors(pal, 1, 3)
    expect(pal.colors[0]).toEqual(before[0])
    expect(pal.colors[2]).toEqual(before[2])
    expect(pal.colors[4]).toEqual(before[4])
  })

  it('throws when indexA is 0', () => {
    const pal = makePalette(3)
    expect(() => swapPaletteColors(pal, 0, 2)).toThrow()
  })

  it('throws when indexB is 0', () => {
    const pal = makePalette(3)
    expect(() => swapPaletteColors(pal, 2, 0)).toThrow()
  })
})

// ─── buildRemapTable ──────────────────────────────────────────────────────────

describe('buildRemapTable', () => {
  it('returns a Uint8Array of length 256 for all strategies', () => {
    expect(buildRemapTable([1, 2], 3, 'remove').length).toBe(256)
    expect(buildRemapTable([1, 2], 3, 'remap-to-n', 1).length).toBe(256)
    expect(buildRemapTable([1, 2], 3, 'compress').length).toBe(256)
  })

  it('index 0 always maps to 0 in remove strategy', () => {
    expect(buildRemapTable([1, 2, 3], 3, 'remove')[0]).toBe(0)
  })

  it('index 0 always maps to 0 in remap-to-n strategy', () => {
    expect(buildRemapTable([1, 2, 3], 3, 'remap-to-n', 1)[0]).toBe(0)
  })

  it('index 0 always maps to 0 in compress strategy', () => {
    expect(buildRemapTable([1, 2, 3], 3, 'compress')[0]).toBe(0)
  })

  it('remove: in-range indices are identity', () => {
    const t = buildRemapTable([1, 2, 5], 4, 'remove')
    expect(t[1]).toBe(1)
    expect(t[2]).toBe(2)
    expect(t[3]).toBe(3)
  })

  it('remove: out-of-range indices map to 0', () => {
    const t = buildRemapTable([1, 5, 10], 4, 'remove')
    expect(t[4]).toBe(0)
    expect(t[5]).toBe(0)
    expect(t[10]).toBe(0)
  })

  it('remap-to-n: out-of-range indices map to remapToN', () => {
    const t = buildRemapTable([1, 5, 10], 4, 'remap-to-n', 2)
    expect(t[4]).toBe(2)
    expect(t[5]).toBe(2)
    expect(t[10]).toBe(2)
  })

  it('remap-to-n: in-range indices are identity', () => {
    const t = buildRemapTable([1, 5], 4, 'remap-to-n', 2)
    expect(t[1]).toBe(1)
    expect(t[2]).toBe(2)
    expect(t[3]).toBe(3)
  })

  it('compress: used indices map to contiguous range from 1', () => {
    const t = buildRemapTable([3, 7, 15], 4, 'compress')
    expect(t[3]).toBe(1)
    expect(t[7]).toBe(2)
    expect(t[15]).toBe(3)
  })

  it('compress: indices not in usedIndices map to 0', () => {
    const t = buildRemapTable([3, 7], 4, 'compress')
    expect(t[1]).toBe(0)
    expect(t[2]).toBe(0)
    expect(t[4]).toBe(0)
    expect(t[8]).toBe(0)
  })

  it('compress: duplicate usedIndices are handled', () => {
    const t = buildRemapTable([3, 3, 7], 4, 'compress')
    expect(t[3]).toBe(1)
    expect(t[7]).toBe(2)
  })
})

// ─── remapLayerIndices ────────────────────────────────────────────────────────

describe('remapLayerIndices', () => {
  it('applies the remap table to pixel data', () => {
    const table = new Uint8Array(256)
    table[1] = 3
    table[2] = 4
    table[3] = 5
    const layer = makeLayer([1, 2, 3])
    const out = remapLayerIndices(layer, table)
    expect(Array.from(out)).toEqual([3, 4, 5])
  })

  it('index 0 pixels always remain 0 regardless of table', () => {
    const table = new Uint8Array(256).fill(99)
    table[0] = 99  // even if table maps 0 elsewhere, output must be 0
    const layer = makeLayer([0, 1, 0])
    const out = remapLayerIndices(layer, table)
    expect(out[0]).toBe(0)
    expect(out[2]).toBe(0)
  })

  it('returns a new Uint8Array and does not mutate the layer', () => {
    const table = new Uint8Array(256)
    table[1] = 2
    const layer = makeLayer([1, 1])
    const originalData = new Uint8Array(layer.data)
    remapLayerIndices(layer, table)
    expect(Array.from(layer.data)).toEqual(Array.from(originalData))
  })
})

// ─── reassignPalette ──────────────────────────────────────────────────────────

describe('reassignPalette', () => {
  it('sets image.paletteId to the new palette id', () => {
    const image = makeImage([makeLayer([1, 2])], 'old-pal')
    const newPal = makePalette(3)
    newPal.id = 'new-pal'
    reassignPalette(image, newPal)
    expect(image.paletteId).toBe('new-pal')
  })

  it('applies remap table to all layers when provided', () => {
    const image = makeImage([makeLayer([1, 2, 3]), makeLayer([2, 3, 1])], 'old-pal')
    const newPal = makePalette(3)
    newPal.id = 'new-pal'
    const table = new Uint8Array(256)
    table[1] = 2; table[2] = 3; table[3] = 1
    reassignPalette(image, newPal, table)
    expect(Array.from(image.layers[0].data)).toEqual([2, 3, 1])
    expect(Array.from(image.layers[1].data)).toEqual([3, 1, 2])
  })

  it('does not modify pixel data when no remap table is provided', () => {
    const image = makeImage([makeLayer([1, 2, 3])], 'old-pal')
    const newPal = makePalette(4)
    newPal.id = 'new-pal'
    reassignPalette(image, newPal)
    expect(Array.from(image.layers[0].data)).toEqual([1, 2, 3])
  })
})

// ─── paletteExceedsImage ──────────────────────────────────────────────────────

describe('paletteExceedsImage', () => {
  it('returns out-of-range indices used in the image', () => {
    const image = makeImage([makeLayer([1, 2, 5, 8])])
    const smallPal = makePalette(4)  // valid indices 0-3
    const result = paletteExceedsImage(image, smallPal)
    expect(result).toEqual([5, 8])
  })

  it('returns empty array when all used indices are within palette range', () => {
    const image = makeImage([makeLayer([1, 2, 3])])
    const pal = makePalette(5)  // valid indices 0-4
    expect(paletteExceedsImage(image, pal)).toEqual([])
  })

  it('checks across multiple layers', () => {
    const image = makeImage([makeLayer([1, 2]), makeLayer([3, 9])])
    const pal = makePalette(4)  // valid indices 0-3
    expect(paletteExceedsImage(image, pal)).toEqual([9])
  })

  it('returns each exceeded index only once (no duplicates)', () => {
    const image = makeImage([makeLayer([5, 5, 5])])
    const pal = makePalette(3)  // valid indices 0-2
    const result = paletteExceedsImage(image, pal)
    expect(result).toEqual([5])
  })

  it('transparent index 0 is never in the exceeded list', () => {
    const image = makeImage([makeLayer([0, 0, 0])])
    const pal = makePalette(1)  // only slot 0
    expect(paletteExceedsImage(image, pal)).toEqual([])
  })
})
