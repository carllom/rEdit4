<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { screenToPixel } from '../../renderer/viewport'
import type { Point } from '../../domain/model'

const props = defineProps<{
  width: number   // image pixel width
  height: number  // image pixel height
  zoom: number
  panX: number
  panY: number
}>()

const emit = defineEmits<{
  pixelPress:   [pixel: Point]
  pixelDrag:    [pixel: Point]
  pixelRelease: []
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let lastCell: Point = { x: -1, y: -1 }
let isDown = false

function getCell(e: MouseEvent): Point {
  return screenToPixel(e.offsetX, e.offsetY, props.zoom, props.panX, props.panY)
}

function cellChanged(p: Point): boolean {
  return p.x !== lastCell.x || p.y !== lastCell.y
}

function drawCursor(cell: Point, clear = false) {
  const cnv = canvas.value
  if (!cnv) return
  const ctx = cnv.getContext('2d')!
  const { zoom } = props
  // Clear previous
  if (lastCell.x >= 0) {
    ctx.clearRect(lastCell.x * zoom, lastCell.y * zoom, zoom, zoom)
  }
  if (!clear && cell.x >= 0 && cell.y >= 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(cell.x * zoom, cell.y * zoom, zoom, zoom)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.strokeRect(cell.x * zoom + 0.5, cell.y * zoom + 0.5, zoom - 1, zoom - 1)
  }
  lastCell = { ...cell }
}

function onMouseMove(e: MouseEvent) {
  const cell = getCell(e)
  if (cellChanged(cell)) {
    drawCursor(cell)
    if (isDown) emit('pixelDrag', cell)
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDown = true
  emit('pixelPress', getCell(e))
}

function onMouseUp() {
  isDown = false
  emit('pixelRelease')
}

function onMouseLeave() {
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
