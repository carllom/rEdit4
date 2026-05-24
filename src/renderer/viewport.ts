import type { Point } from '../domain/model'

export const ZOOM_LEVELS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32]

// panOffset is in pixel space: the image pixel that maps to screen coordinate (0,0).
// screenX = (pixelX - panOffset.x) * zoom
// pixelX  = screenX / zoom + panOffset.x

export function screenToPixel(screenX: number, screenY: number, zoom: number, panOffset: Point): Point {
  return {
    x: Math.floor(screenX / zoom + panOffset.x),
    y: Math.floor(screenY / zoom + panOffset.y),
  }
}

export function pixelToScreen(pixelX: number, pixelY: number, zoom: number, panOffset: Point): Point {
  return {
    x: (pixelX - panOffset.x) * zoom,
    y: (pixelY - panOffset.y) * zoom,
  }
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height
}

export function linearIndex(x: number, y: number, width: number): number {
  return y * width + x
}

// Returns the panOffset that centers the image in the viewport at the given zoom.
export function centerPanOffset(imgW: number, imgH: number, viewW: number, viewH: number, zoom: number): Point {
  return {
    x: imgW / 2 - viewW / (2 * zoom),
    y: imgH / 2 - viewH / (2 * zoom),
  }
}

// Computes the largest zoom step that fits the full image in the viewport with padding,
// then returns the centered panOffset for that zoom.
export function fitToViewport(imgW: number, imgH: number, viewW: number, viewH: number, padding = 32): { zoom: number; panOffset: Point } {
  const maxZoomX = Math.floor((viewW - padding * 2) / imgW)
  const maxZoomY = Math.floor((viewH - padding * 2) / imgH)
  const maxFit = Math.max(1, Math.min(maxZoomX, maxZoomY))
  const zoom = [...ZOOM_LEVELS].reverse().find(z => z <= maxFit) ?? 1
  return { zoom, panOffset: centerPanOffset(imgW, imgH, viewW, viewH, zoom) }
}

// Soft-clamps panOffset so at least one image pixel remains visible in the viewport.
export function clampPanOffset(panOffset: Point, imgW: number, imgH: number, viewW: number, viewH: number, zoom: number): Point {
  const visW = viewW / zoom
  const visH = viewH / zoom
  return {
    x: Math.max(-(visW - 1), Math.min(imgW - 1, panOffset.x)),
    y: Math.max(-(visH - 1), Math.min(imgH - 1, panOffset.y)),
  }
}
