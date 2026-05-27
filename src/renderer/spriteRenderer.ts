import type { Part, Palette, Point, ReImage } from '../domain/model'
import { compositeImage } from '../domain/color'
import { ZOOM_LEVELS } from './viewport'

export interface SpriteVP {
  zoom: number
  panOffset: Point
  viewW: number
  viewH: number
}

function s2s(x: number, y: number, vp: SpriteVP) {
  return { x: (x - vp.panOffset.x) * vp.zoom, y: (y - vp.panOffset.y) * vp.zoom }
}

// Build a Map<imageId, offscreen canvas> for all images referenced by parts.
// If two parts share an imageId, they share one composite.
function buildCache(
  parts: Part[],
  imgMap: Map<string, ReImage>,
  palMap: Map<string, Palette>,
): Map<string, HTMLCanvasElement> {
  const cache = new Map<string, HTMLCanvasElement>()
  for (const part of parts) {
    if (cache.has(part.imageId)) continue
    const img = imgMap.get(part.imageId)
    if (!img) continue
    const pal = palMap.get(img.paletteId)
    if (!pal) continue
    const rgba = compositeImage(img, pal)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0)
    cache.set(part.imageId, canvas)
  }
  return cache
}

function crosshair(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  vp: SpriteVP,
  color: string,
  size = 10,
) {
  const sp = s2s(x, y, vp)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(Math.round(sp.x - size) + 0.5, Math.round(sp.y) + 0.5)
  ctx.lineTo(Math.round(sp.x + size) + 0.5, Math.round(sp.y) + 0.5)
  ctx.moveTo(Math.round(sp.x) + 0.5, Math.round(sp.y - size) + 0.5)
  ctx.lineTo(Math.round(sp.x) + 0.5, Math.round(sp.y + size) + 0.5)
  ctx.stroke()
}

export function renderSprite(
  ctx: CanvasRenderingContext2D,
  parts: Part[],
  anchor: Point,
  imgMap: Map<string, ReImage>,
  palMap: Map<string, Palette>,
  vp: SpriteVP,
  selectedIndex: number | null,
): void {
  const { viewW, viewH, zoom } = vp
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, viewW, viewH)

  const cache = buildCache(parts, imgMap, palMap)

  ctx.imageSmoothingEnabled = false
  for (const part of parts) {
    const offscreen = cache.get(part.imageId)
    if (!offscreen) continue
    const sp = s2s(part.position.x, part.position.y, vp)
    ctx.drawImage(offscreen, 0, 0, offscreen.width, offscreen.height,
      sp.x, sp.y, offscreen.width * zoom, offscreen.height * zoom)
  }

  // Selection outline around selected part
  if (selectedIndex !== null && selectedIndex < parts.length) {
    const part = parts[selectedIndex]
    const offscreen = cache.get(part.imageId)
    if (offscreen) {
      const sp = s2s(part.position.x, part.position.y, vp)
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.9)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(sp.x - 1.5, sp.y - 1.5, offscreen.width * zoom + 3, offscreen.height * zoom + 3)
    }
  }

  // Origin crosshair — faint white
  crosshair(ctx, 0, 0, vp, 'rgba(255,255,255,0.2)')
  // Anchor crosshair — distinct yellow/gold
  crosshair(ctx, anchor.x, anchor.y, vp, 'rgba(255,200,0,0.85)')
}

// Returns the index of the topmost Part with an opaque pixel at sprite-local (spriteX, spriteY).
// Returns -1 when no part is hit (transparent or out-of-bounds).
export function hitTestParts(
  parts: Part[],
  imgMap: Map<string, ReImage>,
  palMap: Map<string, Palette>,
  spriteX: number,
  spriteY: number,
): number {
  const cache = buildCache(parts, imgMap, palMap)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    const offscreen = cache.get(part.imageId)
    if (!offscreen) continue
    const lx = Math.floor(spriteX - part.position.x)
    const ly = Math.floor(spriteY - part.position.y)
    if (lx < 0 || ly < 0 || lx >= offscreen.width || ly >= offscreen.height) continue
    const alpha = offscreen.getContext('2d')!.getImageData(lx, ly, 1, 1).data[3]
    if (alpha > 0) return i
  }
  return -1
}

// Compute zoom + panOffset that fits origin (0,0) + all part bounds + anchor into the viewport.
export function fitSpriteToView(
  parts: Part[],
  imgMap: Map<string, ReImage>,
  anchor: Point,
  viewW: number,
  viewH: number,
  padding = 48,
): { zoom: number; panOffset: Point } {
  let minX = 0, minY = 0, maxX = 0, maxY = 0

  minX = Math.min(minX, anchor.x)
  minY = Math.min(minY, anchor.y)
  maxX = Math.max(maxX, anchor.x)
  maxY = Math.max(maxY, anchor.y)

  for (const part of parts) {
    const img = imgMap.get(part.imageId)
    const w = img?.width ?? 0
    const h = img?.height ?? 0
    minX = Math.min(minX, part.position.x)
    minY = Math.min(minY, part.position.y)
    maxX = Math.max(maxX, part.position.x + w)
    maxY = Math.max(maxY, part.position.y + h)
  }

  const cW = maxX - minX || 16
  const cH = maxY - minY || 16
  const usableW = Math.max(1, viewW - padding * 2)
  const usableH = Math.max(1, viewH - padding * 2)
  const maxFit = Math.max(1, Math.min(Math.floor(usableW / cW), Math.floor(usableH / cH)))
  const zoom = [...ZOOM_LEVELS].reverse().find(z => z <= maxFit) ?? 1

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return { zoom, panOffset: { x: cx - viewW / (2 * zoom), y: cy - viewH / (2 * zoom) } }
}
