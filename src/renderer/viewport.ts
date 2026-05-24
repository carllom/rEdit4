import type { Point } from '../domain/model'

export function screenToPixel(screenX: number, screenY: number, zoom: number): Point {
  return {
    x: Math.floor(screenX / zoom),
    y: Math.floor(screenY / zoom),
  }
}

export function pixelToScreen(pixelX: number, pixelY: number, zoom: number): Point {
  return {
    x: pixelX * zoom,
    y: pixelY * zoom,
  }
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height
}

export function linearIndex(x: number, y: number, width: number): number {
  return y * width + x
}
