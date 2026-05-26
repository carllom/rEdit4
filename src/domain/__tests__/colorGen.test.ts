import { describe, it, expect } from 'vitest'
import type { Color } from '../model'
import { interpolateColors, rgbToHsl, hslToRgb } from '../colorGen'

function makeColor(r: number, g: number, b: number, a = 255): Color {
  return { id: 'test', name: 'test', r, g, b, a }
}

// ─── interpolateColors — edge cases ───────────────────────────────────────────

describe('interpolateColors — edge cases', () => {
  it('count 0 returns empty array', () => {
    expect(interpolateColors(makeColor(0, 0, 0), makeColor(255, 255, 255), 0, 'linear')).toEqual([])
  })

  it('count 1 returns a single color', () => {
    const result = interpolateColors(makeColor(0, 0, 0), makeColor(200, 100, 50), 1, 'linear')
    expect(result).toHaveLength(1)
  })

  it('count 1 linear is the midpoint of each channel', () => {
    const a = makeColor(0, 0, 0, 0)
    const b = makeColor(200, 100, 50, 200)
    const [c] = interpolateColors(a, b, 1, 'linear')
    expect(c.r).toBe(100)
    expect(c.g).toBe(50)
    expect(c.b).toBe(25)
    expect(c.a).toBe(100)
  })

  it('generated colors have fresh ids', () => {
    const result = interpolateColors(makeColor(0, 0, 0), makeColor(255, 255, 255), 2, 'linear')
    expect(result[0].id).not.toBe('test')
    expect(result[0].id).not.toBe(result[1].id)
  })
})

// ─── interpolateColors — linear mode ─────────────────────────────────────────

describe('interpolateColors — linear mode', () => {
  it('count 3 interpolates R, G, B, A independently', () => {
    const a = makeColor(0, 0, 0, 0)
    const b = makeColor(100, 200, 100, 200)
    const result = interpolateColors(a, b, 3, 'linear')
    expect(result).toHaveLength(3)
    // t = 0.25, 0.5, 0.75
    expect(result[0]).toMatchObject({ r: 25, g: 50, b: 25, a: 50 })
    expect(result[1]).toMatchObject({ r: 50, g: 100, b: 50, a: 100 })
    expect(result[2]).toMatchObject({ r: 75, g: 150, b: 75, a: 150 })
  })

  it('endpoints are excluded', () => {
    const a = makeColor(0, 0, 0)
    const b = makeColor(255, 255, 255)
    const result = interpolateColors(a, b, 3, 'linear')
    for (const c of result) {
      expect(c.r).toBeGreaterThan(0)
      expect(c.r).toBeLessThan(255)
    }
  })
})

// ─── interpolateColors — hue mode ─────────────────────────────────────────────

describe('interpolateColors — hue mode', () => {
  it('midpoint between red and green is yellow', () => {
    // red hsl(0,1,0.5) → green hsl(1/3,1,0.5) — shortest arc through yellow
    const [c] = interpolateColors(makeColor(255, 0, 0), makeColor(0, 255, 0), 1, 'hue')
    expect(c.r).toBe(255)
    expect(c.g).toBe(255)
    expect(c.b).toBe(0)
  })

  it('output saturation and lightness match a', () => {
    const a = makeColor(255, 0, 0)  // hsl(0, 1, 0.5)
    const b = makeColor(0, 255, 0)  // hsl(1/3, 1, 0.5)
    const [c] = interpolateColors(a, b, 1, 'hue')
    const [, s, l] = rgbToHsl(c.r, c.g, c.b)
    const [, sa, la] = rgbToHsl(a.r, a.g, a.b)
    expect(Math.abs(s - sa)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(l - la)).toBeLessThanOrEqual(0.01)
  })

  it('uses the shortest hue arc', () => {
    // red (h=0) to blue (h=2/3): shortest arc is backward through magenta (−1/3), not forward through green
    const result = interpolateColors(makeColor(255, 0, 0), makeColor(0, 0, 255), 1, 'hue')
    const [h] = rgbToHsl(result[0].r, result[0].g, result[0].b)
    // midpoint arc goes backward, ending near h=5/6 (magenta/pink region)
    expect(h).toBeGreaterThan(0.8)
  })
})

// ─── interpolateColors — saturation mode ─────────────────────────────────────

describe('interpolateColors — saturation mode', () => {
  it('hue and lightness from a are held constant', () => {
    const a = makeColor(255, 0, 0)    // hsl(0, 1, 0.5)
    const b = makeColor(128, 128, 128) // gray, s≈0
    const [c] = interpolateColors(a, b, 1, 'saturation')
    const [ha, , la] = rgbToHsl(a.r, a.g, a.b)
    const [hc, , lc] = rgbToHsl(c.r, c.g, c.b)
    expect(Math.abs(hc - ha)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(lc - la)).toBeLessThanOrEqual(0.01)
  })

  it('saturation is swept between a and b', () => {
    const a = makeColor(255, 0, 0)    // s=1
    const b = makeColor(128, 128, 128) // s≈0
    const [c] = interpolateColors(a, b, 1, 'saturation')
    const [, sc] = rgbToHsl(c.r, c.g, c.b)
    expect(sc).toBeGreaterThan(0)
    expect(sc).toBeLessThan(1)
  })
})

// ─── interpolateColors — lightness mode ───────────────────────────────────────

describe('interpolateColors — lightness mode', () => {
  it('hue and saturation from a are held constant', () => {
    const a = makeColor(255, 0, 0)  // hsl(0, 1, 0.5)
    const b = makeColor(64, 0, 0)   // hsl(0, 1, 0.125) — darker red
    const [c] = interpolateColors(a, b, 1, 'lightness')
    const [ha, sa] = rgbToHsl(a.r, a.g, a.b)
    const [hc, sc] = rgbToHsl(c.r, c.g, c.b)
    expect(Math.abs(hc - ha)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(sc - sa)).toBeLessThanOrEqual(0.01)
  })

  it('lightness is swept between a and b', () => {
    const a = makeColor(255, 0, 0)  // l=0.5
    const b = makeColor(64, 0, 0)   // l≈0.125
    const [c] = interpolateColors(a, b, 1, 'lightness')
    const [, , la] = rgbToHsl(a.r, a.g, a.b)
    const [, , lb] = rgbToHsl(b.r, b.g, b.b)
    const [, , lc] = rgbToHsl(c.r, c.g, c.b)
    expect(lc).toBeGreaterThan(lb)
    expect(lc).toBeLessThan(la)
  })
})

// ─── rgbToHsl / hslToRgb round-trip ───────────────────────────────────────────

describe('HSL round-trip', () => {
  const cases: [number, number, number][] = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
    [0, 255, 255],
    [255, 0, 255],
    [128, 128, 128],
    [100, 150, 200],
    [64, 32, 180],
  ]

  for (const [r, g, b] of cases) {
    it(`round-trips (${r}, ${g}, ${b}) within ±1`, () => {
      const [h, s, l] = rgbToHsl(r, g, b)
      const [r2, g2, b2] = hslToRgb(h, s, l)
      expect(Math.abs(r2 - r)).toBeLessThanOrEqual(1)
      expect(Math.abs(g2 - g)).toBeLessThanOrEqual(1)
      expect(Math.abs(b2 - b)).toBeLessThanOrEqual(1)
    })
  }
})
