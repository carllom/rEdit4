import type { ReImage, Palette } from '../domain/model'
import { compositeImage } from '../domain/color'

// Composite all visible layers and return a PNG blob
export async function exportImageAsPNG(image: ReImage, palette: Palette): Promise<Blob> {
  const { width, height } = image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const rgba = compositeImage(image, palette)
  const imageData = new ImageData(rgba, width, height)
  ctx.putImageData(imageData, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
  })
}

// Export a single layer as PNG
export async function exportLayerAsPNG(image: ReImage, layerIndex: number, palette: Palette): Promise<Blob> {
  const layer = image.layers[layerIndex]
  if (!layer) throw new Error('Layer not found')
  const { width, height } = image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Build RGBA manually for this layer
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < layer.data.length; i++) {
    const idx = layer.data[i]
    if (idx === 0) continue
    const color = palette.colors[idx]
    if (!color) continue
    rgba[i * 4 + 0] = color.r
    rgba[i * 4 + 1] = color.g
    rgba[i * 4 + 2] = color.b
    rgba[i * 4 + 3] = color.a
  }
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
  })
}

// Trigger a browser download of a blob
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
