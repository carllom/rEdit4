import type { Layer, Palette, Point } from '../domain/model'
import { layerToRGBA } from '../domain/color'

export interface ViewportContext {
  viewW: number
  viewH: number
  zoom: number
  panOffset: Point
  imgW: number
  imgH: number
}

// Renders a single layer's indexed pixel data onto a canvas context at 1:1 (native) scale.
// Caller scales via the 9-arg drawImage for viewport display.
export function renderLayer(layer: Layer, palette: Palette, width: number, height: number, ctx: CanvasRenderingContext2D) {
  const rgba = layerToRGBA(layer, palette, width, height)
  const imageData = new ImageData(rgba, width, height)
  ctx.putImageData(imageData, 0, 0)
}

// Cached 16×16 checker tile: two light and two dark 8×8 squares.
// Created once on first use; shared across all drawCheckerboard calls.
let _checkerPattern: CanvasPattern | null = null

function getCheckerPattern(ctx: CanvasRenderingContext2D, cellSize: number): CanvasPattern {
  if (_checkerPattern) return _checkerPattern
  const tile = document.createElement('canvas')
  tile.width  = cellSize * 2
  tile.height = cellSize * 2
  const tCtx = tile.getContext('2d')!
  tCtx.fillStyle = '#cccccc'
  tCtx.fillRect(0, 0, cellSize * 2, cellSize * 2)
  tCtx.fillStyle = '#888888'
  tCtx.fillRect(0, 0, cellSize, cellSize)
  tCtx.fillRect(cellSize, cellSize, cellSize, cellSize)
  _checkerPattern = ctx.createPattern(tile, 'repeat')!
  return _checkerPattern
}

// Draws the background layer: dark fill for the whole viewport, checkerboard inside the image
// boundary, and a 1px outline marking the image edge.
//
// The checkerboard is a single pattern fill over the visible intersection of the image and the
// viewport — O(viewW × viewH) GPU work regardless of image size or zoom level.
export function drawCheckerboard(ctx: CanvasRenderingContext2D, vp: ViewportContext, cellSize = 8) {
  const { viewW, viewH, zoom, panOffset, imgW, imgH } = vp

  ctx.clearRect(0, 0, viewW, viewH)

  // Dark fill for area outside the image
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, viewW, viewH)

  // Image boundary in screen space
  const imgScreenX = -panOffset.x * zoom
  const imgScreenY = -panOffset.y * zoom
  const imgScreenW = imgW * zoom
  const imgScreenH = imgH * zoom

  // Visible intersection of image and viewport — the only area we need to paint
  const visL = Math.max(imgScreenX, 0)
  const visT = Math.max(imgScreenY, 0)
  const visR = Math.min(imgScreenX + imgScreenW, viewW)
  const visB = Math.min(imgScreenY + imgScreenH, viewH)

  if (visR > visL && visB > visT) {
    // Offset the repeating pattern so checker tile (0,0) stays anchored to the image origin
    // as the viewport pans. Uses modulo to keep the offset within one tile period.
    const period = cellSize * 2
    const offX = ((imgScreenX % period) + period) % period
    const offY = ((imgScreenY % period) + period) % period
    const pattern = getCheckerPattern(ctx, cellSize)
    pattern.setTransform(new DOMMatrix().translate(offX, offY))
    ctx.fillStyle = pattern
    ctx.fillRect(visL, visT, visR - visL, visB - visT)
  }

  // Image boundary outline
  ctx.strokeStyle = 'rgba(140,140,140,0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(Math.round(imgScreenX) + 0.5, Math.round(imgScreenY) + 0.5, Math.round(imgScreenW) - 1, Math.round(imgScreenH) - 1)
}

// Draws pixel grid lines over the image area only.
export function drawGrid(ctx: CanvasRenderingContext2D, vp: ViewportContext) {
  const { viewW, viewH, zoom, panOffset, imgW, imgH } = vp

  ctx.clearRect(0, 0, viewW, viewH)
  if (zoom < 4) return

  const imgScreenX = -panOffset.x * zoom
  const imgScreenY = -panOffset.y * zoom
  const imgScreenW = imgW * zoom
  const imgScreenH = imgH * zoom

  // Only iterate over visible pixel columns/rows for performance
  const firstPxX = Math.max(0, Math.floor(panOffset.x))
  const lastPxX  = Math.min(imgW, Math.ceil(panOffset.x + viewW / zoom))
  const firstPxY = Math.max(0, Math.floor(panOffset.y))
  const lastPxY  = Math.min(imgH, Math.ceil(panOffset.y + viewH / zoom))

  ctx.save()
  ctx.beginPath()
  ctx.rect(imgScreenX, imgScreenY, imgScreenW, imgScreenH)
  ctx.clip()

  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.5
  ctx.beginPath()

  for (let px = firstPxX; px <= lastPxX; px++) {
    const sx = imgScreenX + px * zoom
    ctx.moveTo(sx + 0.5, imgScreenY)
    ctx.lineTo(sx + 0.5, imgScreenY + imgScreenH)
  }
  for (let py = firstPxY; py <= lastPxY; py++) {
    const sy = imgScreenY + py * zoom
    ctx.moveTo(imgScreenX, sy + 0.5)
    ctx.lineTo(imgScreenX + imgScreenW, sy + 0.5)
  }

  ctx.stroke()
  ctx.restore()
}
