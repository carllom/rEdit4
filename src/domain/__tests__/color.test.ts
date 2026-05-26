import { describe, it, expect } from 'vitest'
import type { Color, Layer, Palette, ReImage } from '../model'
import {
  uid,
  makeTransparentColor,
  makeColor,
  makePalette,
  makeLayer,
  makeImage,
  layerToRGBA,
  compositeImage,
  colorToCSSHex,
  colorToCSSRGBA,
} from '../color'

// ─── test helpers ─────────────────────────────────────────────────────────────

function color(r: number, g: number, b: number, a = 255): Color {
  return { id: uid(), name: 'c', r, g, b, a }
}

// Slot 0 is always transparent; supplied colors occupy slots 1+
function palette(...colors: Color[]): Palette {
  return { id: 'pal', name: 'Test', description: '', colors: [makeTransparentColor(), ...colors] }
}

function layer(data: number[], opacity = 1, visible = true): Layer {
  return { id: 'lyr', name: 'Layer', opacity, visible, data: new Uint8Array(data) }
}

function image(width: number, height: number, layers: Layer[], paletteId = 'pal'): ReImage {
  return { id: 'img', name: 'Image', width, height, paletteId, layers }
}

// Read a single pixel from a Uint8ClampedArray (row-major, 4 bytes per pixel)
function px(rgba: Uint8ClampedArray, index: number): [number, number, number, number] {
  return [rgba[index * 4], rgba[index * 4 + 1], rgba[index * 4 + 2], rgba[index * 4 + 3]]
}

// ─── uid ─────────────────────────────────────────────────────────────────────

describe('uid', () => {
  it('returns a non-empty string', () => {
    expect(typeof uid()).toBe('string')
    expect(uid().length).toBeGreaterThan(0)
  })

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, uid))
    expect(ids.size).toBe(50)
  })

  it('matches UUID v4 format', () => {
    expect(uid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

// ─── makeTransparentColor ─────────────────────────────────────────────────────

describe('makeTransparentColor', () => {
  it('has id "transparent"', () => {
    expect(makeTransparentColor().id).toBe('transparent')
  })

  it('has name "transparent"', () => {
    expect(makeTransparentColor().name).toBe('transparent')
  })

  it('is fully transparent (a = 0)', () => {
    expect(makeTransparentColor().a).toBe(0)
  })

  it('rgb channels are all zero', () => {
    const c = makeTransparentColor()
    expect(c.r).toBe(0)
    expect(c.g).toBe(0)
    expect(c.b).toBe(0)
  })
})

// ─── makeColor ────────────────────────────────────────────────────────────────

describe('makeColor', () => {
  it('defaults name to "New color"', () => {
    expect(makeColor().name).toBe('New color')
  })

  it('accepts a custom name', () => {
    expect(makeColor('Sky Blue').name).toBe('Sky Blue')
  })

  it('starts fully opaque (a = 255)', () => {
    expect(makeColor().a).toBe(255)
  })

  it('rgb channels are zero (black)', () => {
    const c = makeColor()
    expect(c.r).toBe(0)
    expect(c.g).toBe(0)
    expect(c.b).toBe(0)
  })

  it('assigns a unique id on each call', () => {
    expect(makeColor().id).not.toBe(makeColor().id)
  })

  it('id is a non-empty string', () => {
    expect(makeColor().id.length).toBeGreaterThan(0)
  })
})

// ─── makePalette ──────────────────────────────────────────────────────────────

describe('makePalette', () => {
  it('defaults name to "Default"', () => {
    expect(makePalette().name).toBe('Default')
  })

  it('accepts a custom name', () => {
    expect(makePalette('Retro').name).toBe('Retro')
  })

  it('description is empty string', () => {
    expect(makePalette().description).toBe('')
  })

  it('starts with exactly one color (the transparent slot)', () => {
    expect(makePalette().colors).toHaveLength(1)
  })

  it('slot 0 is the transparent color', () => {
    const pal = makePalette()
    expect(pal.colors[0].id).toBe('transparent')
    expect(pal.colors[0].a).toBe(0)
  })

  it('assigns a unique id on each call', () => {
    expect(makePalette().id).not.toBe(makePalette().id)
  })
})

// ─── makeLayer ────────────────────────────────────────────────────────────────

describe('makeLayer', () => {
  it('data length equals width × height', () => {
    expect(makeLayer(4, 6).data.length).toBe(24)
    expect(makeLayer(1, 1).data.length).toBe(1)
    expect(makeLayer(32, 32).data.length).toBe(1024)
  })

  it('all data bytes initialise to zero', () => {
    const l = makeLayer(8, 8)
    expect(Array.from(l.data).every(b => b === 0)).toBe(true)
  })

  it('opacity defaults to 1', () => {
    expect(makeLayer(4, 4).opacity).toBe(1)
  })

  it('visible defaults to true', () => {
    expect(makeLayer(4, 4).visible).toBe(true)
  })

  it('defaults name to "Layer"', () => {
    expect(makeLayer(4, 4).name).toBe('Layer')
  })

  it('accepts a custom name', () => {
    expect(makeLayer(4, 4, 'Background').name).toBe('Background')
  })

  it('assigns a unique id on each call', () => {
    expect(makeLayer(4, 4).id).not.toBe(makeLayer(4, 4).id)
  })

  it('returns a Uint8Array', () => {
    expect(makeLayer(2, 2).data).toBeInstanceOf(Uint8Array)
  })
})

// ─── makeImage ────────────────────────────────────────────────────────────────

describe('makeImage', () => {
  it('sets correct width and height', () => {
    const img = makeImage(16, 8, 'pal-1')
    expect(img.width).toBe(16)
    expect(img.height).toBe(8)
  })

  it('stores the given paletteId', () => {
    expect(makeImage(4, 4, 'pal-abc').paletteId).toBe('pal-abc')
  })

  it('defaults name to "Image"', () => {
    expect(makeImage(4, 4, 'pal-1').name).toBe('Image')
  })

  it('accepts a custom name', () => {
    expect(makeImage(4, 4, 'pal-1', 'Hero').name).toBe('Hero')
  })

  it('starts with exactly one layer', () => {
    expect(makeImage(4, 4, 'pal-1').layers).toHaveLength(1)
  })

  it('the initial layer has the correct pixel count', () => {
    const img = makeImage(5, 3, 'pal-1')
    expect(img.layers[0].data.length).toBe(15)
  })

  it('assigns a unique id on each call', () => {
    expect(makeImage(4, 4, 'p').id).not.toBe(makeImage(4, 4, 'p').id)
  })
})

// ─── layerToRGBA ──────────────────────────────────────────────────────────────

describe('layerToRGBA', () => {
  it('returns a Uint8ClampedArray of length width × height × 4', () => {
    const result = layerToRGBA(layer([0, 0, 0, 0]), palette(), 2, 2)
    expect(result).toBeInstanceOf(Uint8ClampedArray)
    expect(result.length).toBe(16)
  })

  it('index 0 pixels produce transparent output (0,0,0,0)', () => {
    const result = layerToRGBA(layer([0]), palette(color(255, 0, 0)), 1, 1)
    expect(px(result, 0)).toEqual([0, 0, 0, 0])
  })

  it('maps palette index to the correct RGBA values for an opaque color', () => {
    const red = color(200, 50, 30, 255)
    const result = layerToRGBA(layer([1]), palette(red), 1, 1)
    expect(px(result, 0)).toEqual([200, 50, 30, 255])
  })

  it('out-of-range palette index produces transparent output', () => {
    // palette has slots 0 (transparent) and 1; index 2 is out of range
    const result = layerToRGBA(layer([2]), palette(color(255, 0, 0)), 1, 1)
    expect(px(result, 0)).toEqual([0, 0, 0, 0])
  })

  it('layer opacity scales the output alpha', () => {
    const white = color(255, 255, 255, 255)
    // opacity 0.5 → layerAlpha = Math.round(0.5 * 255) = 128
    const result = layerToRGBA(layer([1], 0.5), palette(white), 1, 1)
    expect(result[3]).toBe(128)
  })

  it('color alpha and layer opacity combine multiplicatively', () => {
    // color a=128, opacity=0.5 → layerAlpha=128, output a = Math.round((128/255)*128) = 64
    const semiTransparent = color(0, 0, 255, 128)
    const result = layerToRGBA(layer([1], 0.5), palette(semiTransparent), 1, 1)
    expect(result[3]).toBe(64)
  })

  it('renders multiple pixels in row-major order', () => {
    const red = color(255, 0, 0)
    const blue = color(0, 0, 255)
    // 1×2 image: pixel 0 = red (index 1), pixel 1 = blue (index 2)
    const result = layerToRGBA(layer([1, 2]), palette(red, blue), 2, 1)
    expect(px(result, 0)).toEqual([255, 0, 0, 255])
    expect(px(result, 1)).toEqual([0, 0, 255, 255])
  })

  it('fully transparent color (a=0) in palette produces transparent output', () => {
    const invisible = { id: uid(), name: 'invis', r: 100, g: 100, b: 100, a: 0 }
    const result = layerToRGBA(layer([1]), palette(invisible), 1, 1)
    expect(result[3]).toBe(0)
  })
})

// ─── compositeImage ───────────────────────────────────────────────────────────

describe('compositeImage', () => {
  it('returns a Uint8ClampedArray of length width × height × 4', () => {
    const img = image(3, 2, [layer([0, 0, 0, 0, 0, 0])])
    const result = compositeImage(img, palette())
    expect(result).toBeInstanceOf(Uint8ClampedArray)
    expect(result.length).toBe(24)
  })

  it('all-transparent single layer produces all-zero output', () => {
    const img = image(2, 1, [layer([0, 0])])
    const result = compositeImage(img, palette(color(255, 0, 0)))
    expect(Array.from(result).every(b => b === 0)).toBe(true)
  })

  it('single opaque layer renders directly to output', () => {
    const red = color(200, 80, 40, 255)
    const img = image(1, 1, [layer([1])])
    const result = compositeImage(img, palette(red))
    expect(px(result, 0)).toEqual([200, 80, 40, 255])
  })

  it('invisible layers are skipped', () => {
    const red = color(255, 0, 0)
    const img = image(1, 1, [layer([1], 1, false)])  // visible=false
    const result = compositeImage(img, palette(red))
    expect(px(result, 0)).toEqual([0, 0, 0, 0])
  })

  it('fully opaque top layer occludes bottom layer', () => {
    const red = color(255, 0, 0, 255)
    const blue = color(0, 0, 255, 255)
    const bottom = layer([1])  // red
    const top = layer([2])     // blue, fully opaque
    const img = image(1, 1, [bottom, top])
    const result = compositeImage(img, palette(red, blue))
    expect(px(result, 0)).toEqual([0, 0, 255, 255])
  })

  it('transparent pixel in top layer reveals bottom layer', () => {
    const red = color(255, 0, 0, 255)
    const blue = color(0, 0, 255, 255)
    const bottom = layer([1])  // red
    const top = layer([0])     // transparent
    const img = image(1, 1, [bottom, top])
    const result = compositeImage(img, palette(red, blue))
    expect(px(result, 0)).toEqual([255, 0, 0, 255])
  })

  it('layers composite bottom-to-top', () => {
    // Three layers stacked; only the top visible, opaque one should show
    const red = color(255, 0, 0, 255)
    const green = color(0, 255, 0, 255)
    const blue = color(0, 0, 255, 255)
    const img = image(1, 1, [layer([1]), layer([2]), layer([3])])
    const result = compositeImage(img, palette(red, green, blue))
    expect(px(result, 0)).toEqual([0, 0, 255, 255])
  })

  it('semi-transparent top layer blends with bottom (Porter-Duff over)', () => {
    // dst = red (255,0,0,255), src = blue (0,0,255) at opacity=0.5
    // layerAlpha for top = Math.round(0.5 * 255) = 128
    // srcA = 128/255, dstA = 1
    // outA_float = 128/255 + 1*(1 - 128/255) = 1  → outA = 255
    // outR = Math.round((0*(128/255) + 255*1*(127/255)) / 1) = Math.round(127) = 127
    // outG = 0
    // outB = Math.round((255*(128/255) + 0) / 1) = Math.round(128) = 128
    const red = color(255, 0, 0, 255)
    const blue = color(0, 0, 255, 255)
    const bottom = layer([1])
    const top = layer([2], 0.5)
    const img = image(1, 1, [bottom, top])
    const result = compositeImage(img, palette(red, blue))
    expect(result[3]).toBe(255)            // fully opaque result
    expect(result[0]).toBe(127)            // red component
    expect(result[2]).toBe(128)            // blue component
  })

  it('composites each pixel independently', () => {
    const red = color(255, 0, 0)
    const blue = color(0, 0, 255)
    // 1×2: pixel 0 = red, pixel 1 = transparent
    const img = image(2, 1, [layer([1, 0])])
    const result = compositeImage(img, palette(red, blue))
    expect(px(result, 0)).toEqual([255, 0, 0, 255])
    expect(px(result, 1)).toEqual([0, 0, 0, 0])
  })

  it('image with no layers returns all-zero output', () => {
    const img = image(2, 2, [])
    const result = compositeImage(img, palette())
    expect(Array.from(result).every(b => b === 0)).toBe(true)
  })
})

// ─── colorToCSSHex ───────────────────────────────────────────────────────────

describe('colorToCSSHex', () => {
  it('black → #000000', () => {
    expect(colorToCSSHex({ id: '', name: '', r: 0, g: 0, b: 0, a: 255 })).toBe('#000000')
  })

  it('white → #ffffff', () => {
    expect(colorToCSSHex({ id: '', name: '', r: 255, g: 255, b: 255, a: 255 })).toBe('#ffffff')
  })

  it('pure red → #ff0000', () => {
    expect(colorToCSSHex({ id: '', name: '', r: 255, g: 0, b: 0, a: 255 })).toBe('#ff0000')
  })

  it('pure green → #00ff00', () => {
    expect(colorToCSSHex({ id: '', name: '', r: 0, g: 255, b: 0, a: 255 })).toBe('#00ff00')
  })

  it('pure blue → #0000ff', () => {
    expect(colorToCSSHex({ id: '', name: '', r: 0, g: 0, b: 255, a: 255 })).toBe('#0000ff')
  })

  it('single-digit channel values are zero-padded', () => {
    // r=15 → '0f', g=15 → '0f', b=15 → '0f'
    expect(colorToCSSHex({ id: '', name: '', r: 15, g: 15, b: 15, a: 255 })).toBe('#0f0f0f')
  })

  it('alpha channel is ignored in the output', () => {
    const opaque = colorToCSSHex({ id: '', name: '', r: 100, g: 150, b: 200, a: 255 })
    const transparent = colorToCSSHex({ id: '', name: '', r: 100, g: 150, b: 200, a: 0 })
    expect(opaque).toBe(transparent)
  })

  it('output always starts with #', () => {
    expect(colorToCSSHex({ id: '', name: '', r: 128, g: 64, b: 32, a: 255 })).toMatch(/^#/)
  })

  it('output is always 7 characters long', () => {
    expect(colorToCSSHex({ id: '', name: '', r: 1, g: 2, b: 3, a: 255 })).toHaveLength(7)
  })
})

// ─── colorToCSSRGBA ──────────────────────────────────────────────────────────

describe('colorToCSSRGBA', () => {
  it('fully opaque black → rgba(0,0,0,1.000)', () => {
    expect(colorToCSSRGBA({ id: '', name: '', r: 0, g: 0, b: 0, a: 255 })).toBe('rgba(0,0,0,1.000)')
  })

  it('fully transparent white → rgba(255,255,255,0.000)', () => {
    expect(colorToCSSRGBA({ id: '', name: '', r: 255, g: 255, b: 255, a: 0 })).toBe('rgba(255,255,255,0.000)')
  })

  it('alpha 128 → approximately 0.502', () => {
    const result = colorToCSSRGBA({ id: '', name: '', r: 0, g: 0, b: 0, a: 128 })
    expect(result).toBe(`rgba(0,0,0,${(128 / 255).toFixed(3)})`)
  })

  it('rgb values are rendered as integers, not floats', () => {
    const result = colorToCSSRGBA({ id: '', name: '', r: 10, g: 20, b: 30, a: 255 })
    expect(result).toBe('rgba(10,20,30,1.000)')
  })

  it('alpha is always rendered with 3 decimal places', () => {
    const result = colorToCSSRGBA({ id: '', name: '', r: 0, g: 0, b: 0, a: 255 })
    expect(result).toMatch(/rgba\(\d+,\d+,\d+,\d+\.\d{3}\)/)
  })

  it('output format is rgba(r,g,b,a)', () => {
    expect(colorToCSSRGBA({ id: '', name: '', r: 100, g: 150, b: 200, a: 255 })).toBe('rgba(100,150,200,1.000)')
  })
})
