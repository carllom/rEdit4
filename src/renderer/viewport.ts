import type { Point } from '../domain/model'

// Stateless coordinate conversion utilities for the canvas editor.
// zoom: integer scale factor (screen pixels per image pixel)
// panX/panY: image-space offset (top-left image pixel visible at screen origin)

export function screenToPixel(screenX: number, screenY: number, zoom: number, panX: number, panY: number): Point {
  return {
    x: Math.floor(screenX / zoom) + panX,
    y: Math.floor(screenY / zoom) + panY,
  }
}

export function pixelToScreen(pixelX: number, pixelY: number, zoom: number, panX: number, panY: number): Point {
  return {
    x: (pixelX - panX) * zoom,
    y: (pixelY - panY) * zoom,
  }
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height
}

export function linearIndex(x: number, y: number, width: number): number {
  return y * width + x
}
