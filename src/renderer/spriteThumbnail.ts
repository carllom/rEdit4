import type { Sprite, ReImage, Palette } from '../domain/model'
import { compositeImage } from '../domain/color'

export const SPRITE_THUMB_PX = 64

export function renderSpriteThumbnail(
  canvas: HTMLCanvasElement,
  sprite: Sprite,
  imgMap: Map<string, ReImage>,
  palMap: Map<string, Palette>,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const size = canvas.width

  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = false

  if (sprite.parts.length === 0) return

  // Build per-part offscreen canvases and compute content bounds
  type PartEntry = { offscreen: HTMLCanvasElement; x: number; y: number; w: number; h: number }
  const entries: (PartEntry | null)[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const part of sprite.parts) {
    const img = imgMap.get(part.imageId)
    if (!img) { entries.push(null); continue }
    const pal = palMap.get(img.paletteId)
    if (!pal) { entries.push(null); continue }

    const rgba = compositeImage(img, pal)
    const offscreen = document.createElement('canvas')
    offscreen.width = img.width
    offscreen.height = img.height
    offscreen.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0,
    )

    minX = Math.min(minX, part.position.x)
    minY = Math.min(minY, part.position.y)
    maxX = Math.max(maxX, part.position.x + img.width)
    maxY = Math.max(maxY, part.position.y + img.height)
    entries.push({ offscreen, x: part.position.x, y: part.position.y, w: img.width, h: img.height })
  }

  if (!isFinite(minX)) return

  const contentW = Math.max(maxX - minX, 1)
  const contentH = Math.max(maxY - minY, 1)
  const scale = Math.min(size / contentW, size / contentH)
  const dw = Math.round(contentW * scale)
  const dh = Math.round(contentH * scale)
  const ox = Math.round((size - dw) / 2)
  const oy = Math.round((size - dh) / 2)

  for (const e of entries) {
    if (!e) continue
    const px = Math.round((e.x - minX) * scale) + ox
    const py = Math.round((e.y - minY) * scale) + oy
    const pw = Math.max(1, Math.round(e.w * scale))
    const ph = Math.max(1, Math.round(e.h * scale))
    ctx.drawImage(e.offscreen, 0, 0, e.w, e.h, px, py, pw, ph)
  }
}
