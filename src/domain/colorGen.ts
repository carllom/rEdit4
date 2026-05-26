import type { Color } from './model'
import { uid } from './color'

export type InterpolationMode = 'linear' | 'hue' | 'saturation' | 'lightness'

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2

  if (max === min) return [0, 0, l]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h: number
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0)
  } else if (max === gn) {
    h = (bn - rn) / d + 2
  } else {
    h = (rn - gn) / d + 4
  }
  h /= 6

  return [h, s, l]
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ]
}

export function interpolateColors(
  a: Color,
  b: Color,
  count: number,
  mode: InterpolationMode,
): Color[] {
  if (count === 0) return []

  const result: Color[] = []

  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1)
    let r: number, g: number, bl: number, alpha: number

    alpha = Math.round(a.a + (b.a - a.a) * t)

    if (mode === 'linear') {
      r = Math.round(a.r + (b.r - a.r) * t)
      g = Math.round(a.g + (b.g - a.g) * t)
      bl = Math.round(a.b + (b.b - a.b) * t)
    } else {
      const [ha, sa, la] = rgbToHsl(a.r, a.g, a.b)
      const [hb, sb, lb] = rgbToHsl(b.r, b.g, b.b)

      let h = ha, s = sa, l = la

      if (mode === 'hue') {
        let dh = hb - ha
        if (dh > 0.5) dh -= 1
        if (dh < -0.5) dh += 1
        h = ((ha + dh * t) % 1 + 1) % 1
      } else if (mode === 'saturation') {
        s = sa + (sb - sa) * t
      } else {
        l = la + (lb - la) * t
      }

      ;[r, g, bl] = hslToRgb(h, s, l)
    }

    result.push({ id: uid(), name: 'Generated', r, g, b: bl, a: alpha })
  }

  return result
}
