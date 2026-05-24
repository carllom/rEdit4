<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { screenToPixel } from '../../renderer/viewport'
import { bresenhamLine } from '../../renderer/tools/lineTool'
import { rectOutlinePoints } from '../../renderer/tools/rectTool'
import type { Point } from '../../domain/model'
import type { Tool } from '../../stores/paintStore'

const props = defineProps<{
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
  activeTool: Tool
  previewColor: string   // CSS color string for shape tool preview fill
}>()

const emit = defineEmits<{
  pixelPress:   [pixel: Point]
  pixelDrag:    [pixel: Point]
  pixelRelease: []
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let lastCell: Point = { x: -1, y: -1 }
let isDown = false
let dragStart: Point | null = null
let shiftHeld = false

function isShapeTool() { return props.activeTool === 'line' || props.activeTool === 'rect' }

function getCell(e: MouseEvent): Point {
  return screenToPixel(e.offsetX, e.offsetY, props.zoom, props.panX, props.panY)
}

function cellChanged(p: Point): boolean {
  return p.x !== lastCell.x || p.y !== lastCell.y
}

// Apply Shift-constrain to an endpoint relative to a start point
function constrain(start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (props.activeTool === 'line') {
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)
    if (adx > ady * 2)       return { x: end.x, y: start.y }           // horizontal
    if (ady > adx * 2)       return { x: start.x, y: end.y }           // vertical
    const d = Math.min(adx, ady)
    return { x: start.x + Math.sign(dx) * d, y: start.y + Math.sign(dy) * d } // 45°
  } else {
    const d = Math.min(Math.abs(dx), Math.abs(dy))
    return { x: start.x + Math.sign(dx) * d, y: start.y + Math.sign(dy) * d }
  }
}

function effectiveEnd(raw: Point): Point {
  if (shiftHeld && dragStart) return constrain(dragStart, raw)
  return raw
}

// ---- Drawing ----

function clearCanvas() {
  const cnv = canvas.value
  if (!cnv) return
  cnv.getContext('2d')!.clearRect(0, 0, cnv.width, cnv.height)
}

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const z = props.zoom
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(x * z, y * z, z, z)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(x * z + 0.5, y * z + 0.5, z - 1, z - 1)
}

function drawPreviewCell(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const z = props.zoom
  ctx.fillStyle = props.previewColor
  ctx.fillRect(x * z, y * z, z, z)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(x * z + 0.5, y * z + 0.5, z - 1, z - 1)
}

function drawShapePreview(end: Point) {
  const cnv = canvas.value
  if (!cnv || !dragStart) return
  const ctx = cnv.getContext('2d')!
  clearCanvas()
  const eff = effectiveEnd(end)

  let points: { x: number; y: number }[]
  if (props.activeTool === 'line') {
    points = bresenhamLine(dragStart.x, dragStart.y, eff.x, eff.y)
  } else {
    points = rectOutlinePoints(dragStart.x, dragStart.y, eff.x, eff.y)
  }
  for (const p of points) {
    drawPreviewCell(ctx, p.x, p.y)
  }
}

function drawCursor(cell: Point, clear = false) {
  const cnv = canvas.value
  if (!cnv) return
  const ctx = cnv.getContext('2d')!
  const z = props.zoom

  if (lastCell.x >= 0) {
    ctx.clearRect(lastCell.x * z, lastCell.y * z, z, z)
  }
  if (!clear && cell.x >= 0 && cell.y >= 0) {
    drawCell(ctx, cell.x, cell.y)
  }
  lastCell = { ...cell }
}

// ---- Events ----

function onMouseMove(e: MouseEvent) {
  shiftHeld = e.shiftKey
  const cell = getCell(e)
  if (isShapeTool() && isDown && dragStart) {
    drawShapePreview(cell)
    lastCell = { ...cell }
    emit('pixelDrag', effectiveEnd(cell))
    return
  }
  if (cellChanged(cell)) {
    drawCursor(cell)
    if (isDown) emit('pixelDrag', cell)
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  shiftHeld = e.shiftKey
  isDown = true
  const cell = getCell(e)
  if (isShapeTool()) {
    dragStart = { ...cell }
    drawShapePreview(cell)
  }
  emit('pixelPress', cell)
}

function onMouseUp(e: MouseEvent) {
  shiftHeld = e.shiftKey
  isDown = false
  if (isShapeTool() && dragStart) {
    const cell = getCell(e)
    const eff = effectiveEnd(cell)
    clearCanvas()
    dragStart = null
    lastCell = { x: -1, y: -1 }
    drawCursor(cell)
    emit('pixelRelease')
    return
  }
  dragStart = null
  emit('pixelRelease')
}

function onMouseLeave() {
  shiftHeld = false
  if (isShapeTool() && isDown) {
    clearCanvas()
    dragStart = null
    lastCell = { x: -1, y: -1 }
    isDown = false
    emit('pixelRelease')
    return
  }
  drawCursor({ x: -1, y: -1 }, true)
  if (isDown) { isDown = false; emit('pixelRelease') }
}

onMounted(() => {
  const cnv = canvas.value
  if (!cnv) return
  cnv.addEventListener('mousemove',  onMouseMove)
  cnv.addEventListener('mousedown',  onMouseDown)
  cnv.addEventListener('mouseup',    onMouseUp)
  cnv.addEventListener('mouseleave', onMouseLeave)
})
</script>

<template>
  <canvas
    ref="canvas"
    :width="width * zoom"
    :height="height * zoom"
    style="cursor: crosshair"
  />
</template>
