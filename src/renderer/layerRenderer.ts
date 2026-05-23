import type { Layer, Palette } from '../domain/model'
import { layerToRGBA } from '../domain/color'

// Renders a single layer's indexed pixel data onto a canvas context at 1:1 scale.
// The caller is responsible for scaling (via ctx.scale or drawImage) for zoom.
export function renderLayer(layer: Layer, palette: Palette, width: number, height: number, ctx: CanvasRenderingContext2D) {
  const rgba = layerToRGBA(layer, palette, width, height)
  const imageData = new ImageData(rgba, width, height)
  ctx.putImageData(imageData, 0, 0)
}

// Draws a checkerboard transparency pattern onto a canvas context.
export function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, cellSize = 8) {
  ctx.clearRect(0, 0, width, height)
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isLight = ((x / cellSize) + (y / cellSize)) % 2 === 0
      ctx.fillStyle = isLight ? '#cccccc' : '#888888'
      ctx.fillRect(x, y, cellSize, cellSize)
    }
  }
}

// Draws pixel grid lines onto a canvas context.
export function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number) {
  ctx.clearRect(0, 0, width, height)
  if (zoom < 4) return  // grid is not useful at very small zoom
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (let x = 0; x <= width; x += zoom) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
  }
  for (let y = 0; y <= height; y += zoom) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
  }
  ctx.stroke()
}
