<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { screenToPixel } from '../../renderer/viewport'
import { bresenhamLine } from '../../renderer/tools/lineTool'
import { rectOutlinePoints } from '../../renderer/tools/rectTool'
import type { Point } from '../../domain/model'
import type { Tool } from '../../stores/paintStore'

function makeCursor(paths: string[], hx: number, hy: number): string {
  const inner = paths.map(d =>
    `<path stroke='black' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round' fill='none' d='${d}'/>` +
    `<path stroke='white' stroke-width='2'   stroke-linecap='round' stroke-linejoin='round' fill='none' d='${d}'/>`
  ).join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>${inner}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}, auto`
}

const TOOL_CURSORS: Record<Tool, string> = {
  draw: 'crosshair',
  line: 'crosshair',
  rect: 'crosshair',
  erase: makeCursor([
    "M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21",
    "m5.082 11.09 8.828 8.828",
  ], 8, 21),
  fill: makeCursor([
    "M11 7 6 2",
    "M18.992 12H2.041",
    "M21.145 18.38A3.34 3.34 0 0 1 20 16.5a3.3 3.3 0 0 1-1.145 1.88c-.575.46-.855 1.02-.855 1.595A2 2 0 0 0 20 22a2 2 0 0 0 2-2.025c0-.58-.285-1.13-.855-1.595",
    "m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33",
  ], 20, 22),
  eyedropper: makeCursor([
    "m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12",
    "m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z",
    "m2 22 .414-.414",
  ], 2, 21),
}

const props = defineProps<{
  width: number      // image width in pixels
  height: number     // image height in pixels
  zoom: number
  panOffset: Point
  viewW: number
  viewH: number
  activeTool: Tool
  panMode: boolean
  isPanning: boolean
  previewColor: string
}>()

const emit = defineEmits<{
  pixelPress:   [pixel: Point]
  pixelDrag:    [pixel: Point]
  pixelRelease: []
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let lastCell: Point = { x: -1, y: -1 }
const isDown = ref(false)
let dragStart: Point | null = null
let shiftHeld = false

const cursor = computed(() => {
  if (props.isPanning) return 'grabbing'
  if (props.panMode) return 'grab'
  return TOOL_CURSORS[props.activeTool]
})

function isShapeTool() { return props.activeTool === 'line' || props.activeTool === 'rect' }

function getCell(e: MouseEvent): Point {
  return screenToPixel(e.offsetX, e.offsetY, props.zoom, props.panOffset)
}

function cellChanged(p: Point): boolean {
  return p.x !== lastCell.x || p.y !== lastCell.y
}

// Convert image pixel coord to screen coord on the canvas
function cellScreenX(px: number): number { return (px - props.panOffset.x) * props.zoom }
function cellScreenY(py: number): number { return (py - props.panOffset.y) * props.zoom }

function constrain(start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (props.activeTool === 'line') {
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)
    if (adx > ady * 2)       return { x: end.x, y: start.y }
    if (ady > adx * 2)       return { x: start.x, y: end.y }
    const d = Math.min(adx, ady)
    return { x: start.x + Math.sign(dx) * d, y: start.y + Math.sign(dy) * d }
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
  const sx = cellScreenX(x)
  const sy = cellScreenY(y)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(sx, sy, z, z)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(sx + 0.5, sy + 0.5, z - 1, z - 1)
}

function drawPreviewCell(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const z = props.zoom
  const sx = cellScreenX(x)
  const sy = cellScreenY(y)
  ctx.fillStyle = props.previewColor
  ctx.fillRect(sx, sy, z, z)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(sx + 0.5, sy + 0.5, z - 1, z - 1)
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
    const lsx = cellScreenX(lastCell.x)
    const lsy = cellScreenY(lastCell.y)
    ctx.clearRect(lsx - 1, lsy - 1, z + 2, z + 2)
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
  if (isShapeTool() && isDown.value && dragStart) {
    drawShapePreview(cell)
    lastCell = { ...cell }
    emit('pixelDrag', effectiveEnd(cell))
    return
  }
  if (cellChanged(cell)) {
    drawCursor(cell)
    if (isDown.value) emit('pixelDrag', cell)
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  shiftHeld = e.shiftKey
  isDown.value = true
  const cell = getCell(e)
  if (isShapeTool() && !props.panMode) {
    dragStart = { ...cell }
    drawShapePreview(cell)
  }
  emit('pixelPress', cell)
}

function onMouseUp(e: MouseEvent) {
  shiftHeld = e.shiftKey
  isDown.value = false
  if (isShapeTool() && dragStart) {
    const cell = getCell(e)
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
    isDown.value = false
    emit('pixelRelease')
    return
  }
  drawCursor({ x: -1, y: -1 }, true)
  if (isDown.value) { isDown.value = false; emit('pixelRelease') }
}

// When the viewport changes (pan, zoom, resize), the cell highlight is at a stale screen
// position. Clear and redraw it at the correct new position.
watch(
  () => [props.panOffset.x, props.panOffset.y, props.zoom, props.viewW, props.viewH],
  () => {
    const cnv = canvas.value
    if (!cnv) return
    const ctx = cnv.getContext('2d')!
    ctx.clearRect(0, 0, cnv.width, cnv.height)
    if (lastCell.x >= 0 && lastCell.y >= 0) drawCell(ctx, lastCell.x, lastCell.y)
  },
  { flush: 'post' },
)

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
  <canvas ref="canvas" :width="viewW" :height="viewH" :style="{ cursor }" />
</template>
