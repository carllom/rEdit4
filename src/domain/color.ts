import type { Color, Layer, Palette, ReImage } from './model'

export function uid(): string {
  return crypto.randomUUID()
}

export function makeTransparentColor(): Color {
  return { id: 'transparent', name: 'transparent', r: 0, g: 0, b: 0, a: 0 }
}

export function makeColor(name = 'New color'): Color {
  return { id: uid(), name, r: 0, g: 0, b: 0, a: 255 }
}

export function makePalette(name = 'Default'): Palette {
  return { id: uid(), name, colors: [makeTransparentColor()] }
}

export function makeLayer(width: number, height: number, name = 'Layer'): Layer {
  return {
    id: uid(),
    name,
    opacity: 1,
    visible: true,
    data: new Uint8Array(width * height),
  }
}

export function makeImage(width: number, height: number, paletteId: string, name = 'Image'): ReImage {
  return {
    id: uid(),
    name,
    width,
    height,
    paletteId,
    layers: [makeLayer(width, height)],
  }
}

// Render a single layer's indexed pixel data to RGBA, reading colors from the palette.
// Returns a Uint8ClampedArray suitable for use with ImageData.
export function layerToRGBA(layer: Layer, palette: Palette, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)
  const layerAlpha = Math.round(layer.opacity * 255)
  for (let i = 0; i < layer.data.length; i++) {
    const idx = layer.data[i]
    if (idx === 0) continue  // transparent — leave as 0,0,0,0
    const color = palette.colors[idx]
    if (!color) continue
    rgba[i * 4 + 0] = color.r
    rgba[i * 4 + 1] = color.g
    rgba[i * 4 + 2] = color.b
    rgba[i * 4 + 3] = Math.round((color.a / 255) * layerAlpha)
  }
  return rgba
}

// Composite all visible layers of an image into a single RGBA array (bottom to top).
export function compositeImage(image: ReImage, palette: Palette): Uint8ClampedArray {
  const { width, height } = image
  const out = new Uint8ClampedArray(width * height * 4)
  for (const layer of image.layers) {
    if (!layer.visible) continue
    const layerRGBA = layerToRGBA(layer, palette, width, height)
    for (let i = 0; i < width * height; i++) {
      const srcA = layerRGBA[i * 4 + 3] / 255
      if (srcA === 0) continue
      const dstA = out[i * 4 + 3] / 255
      const outA = srcA + dstA * (1 - srcA)
      if (outA === 0) continue
      out[i * 4 + 0] = Math.round((layerRGBA[i * 4 + 0] * srcA + out[i * 4 + 0] * dstA * (1 - srcA)) / outA)
      out[i * 4 + 1] = Math.round((layerRGBA[i * 4 + 1] * srcA + out[i * 4 + 1] * dstA * (1 - srcA)) / outA)
      out[i * 4 + 2] = Math.round((layerRGBA[i * 4 + 2] * srcA + out[i * 4 + 2] * dstA * (1 - srcA)) / outA)
      out[i * 4 + 3] = Math.round(outA * 255)
    }
  }
  return out
}

export function colorToCSSHex(color: Color): string {
  return '#' + [color.r, color.g, color.b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function colorToCSSRGBA(color: Color): string {
  return `rgba(${color.r},${color.g},${color.b},${(color.a / 255).toFixed(3)})`
}
