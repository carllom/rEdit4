<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ImageLayer from './ImageLayer.vue'
import CursorLayer from './CursorLayer.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { usePaintStore } from '../../stores/paintStore'
import { useHistoryStore } from '../../stores/historyStore'
import { inBounds, linearIndex } from '../../renderer/viewport'
import { drawCheckerboard, drawGrid } from '../../renderer/layerRenderer'
import { floodFill } from '../../renderer/tools/fillTool'
import { applyLine } from '../../renderer/tools/lineTool'
import { applyRect } from '../../renderer/tools/rectTool'
import { colorToCSSRGBA } from '../../domain/color'
import type { Point } from '../../domain/model'

const props = defineProps<{ imageId: string }>()

const project = useProjectStore()
const editor = useEditorStore()
const paint = usePaintStore()
const history = useHistoryStore()

const image = computed(() => project.getImage(props.imageId))
const palette = computed(() => image.value ? project.getPalette(image.value.paletteId) ?? null : null)
const activeLayer = computed(() => image.value?.layers.find(l => l.id === editor.activeLayerId))

const previewColor = computed(() => {
  const color = palette.value?.colors[paint.activeColorIndex]
  return color ? colorToCSSRGBA(color) : 'rgba(255,255,255,0.8)'
})

const displayW = computed(() => (image.value?.width ?? 0) * paint.zoom)
const displayH = computed(() => (image.value?.height ?? 0) * paint.zoom)

// --- Checkerboard ---
const bgCanvas = ref<HTMLCanvasElement | null>(null)
watch([displayW, displayH], () => {
  const ctx = bgCanvas.value?.getContext('2d')
  if (ctx) drawCheckerboard(ctx, displayW.value, displayH.value)
}, { flush: 'post' })
onMounted(() => {
  const ctx = bgCanvas.value?.getContext('2d')
  if (ctx) drawCheckerboard(ctx, displayW.value, displayH.value)
})

// --- Grid ---
const gridCanvas = ref<HTMLCanvasElement | null>(null)
watch([displayW, displayH, () => paint.zoom], () => {
  const ctx = gridCanvas.value?.getContext('2d')
  if (ctx) drawGrid(ctx, displayW.value, displayH.value, paint.zoom)
}, { flush: 'post' })
onMounted(() => {
  const ctx = gridCanvas.value?.getContext('2d')
  if (ctx) drawGrid(ctx, displayW.value, displayH.value, paint.zoom)
})

// --- Layer ref map ---
const layerRefs = new Map<string, InstanceType<typeof ImageLayer>>()
function setLayerRef(layerId: string, el: unknown) {
  if (el) layerRefs.set(layerId, el as InstanceType<typeof ImageLayer>)
  else layerRefs.delete(layerId)
}
function requestLayerRedraw(layerId: string) {
  layerRefs.get(layerId)?.requestRedraw()
}
function requestAllLayersRedraw() {
  image.value?.layers.forEach(l => requestLayerRedraw(l.id))
}

// --- Tool application ---
function applyTool(pixel: Point) {
  const img = image.value
  const layer = activeLayer.value
  if (!img || !layer || !layer.visible) return
  if (!inBounds(pixel.x, pixel.y, img.width, img.height)) return

  const linIdx = linearIndex(pixel.x, pixel.y, img.width)
  const oldIdx = layer.data[linIdx]

  if (paint.activeTool === 'draw') {
    const newIdx = paint.activeColorIndex
    if (oldIdx === newIdx) return
    history.recordPixel(props.imageId, linIdx, pixel.x, pixel.y, oldIdx, newIdx)
    layer.data[linIdx] = newIdx
    requestLayerRedraw(layer.id)
    project.markDirty()
  } else if (paint.activeTool === 'erase') {
    if (oldIdx === 0) return
    history.recordPixel(props.imageId, linIdx, pixel.x, pixel.y, oldIdx, 0)
    layer.data[linIdx] = 0
    requestLayerRedraw(layer.id)
    project.markDirty()
  } else if (paint.activeTool === 'eyedropper') {
    paint.setColorIndex(oldIdx)
    paint.setTool('draw')
  }
}

function applyFill(pixel: Point) {
  const img = image.value
  const layer = activeLayer.value
  if (!img || !layer || !layer.visible) return
  if (!inBounds(pixel.x, pixel.y, img.width, img.height)) return

  const fillIdx = paint.activeColorIndex
  const targetIdx = layer.data[linearIndex(pixel.x, pixel.y, img.width)]
  if (targetIdx === fillIdx) return  // no-op

  const diffs = floodFill(layer.data, img.width, img.height, pixel.x, pixel.y, targetIdx, fillIdx)
  if (diffs.length === 0) return

  history.beginStroke(props.imageId, layer.id, 'fill')
  diffs.forEach(d => history.recordPixel(props.imageId, linearIndex(d.x, d.y, img.width), d.x, d.y, d.oldIndex, d.newIndex))
  history.commitStroke(props.imageId)
  requestLayerRedraw(layer.id)
  project.markDirty()
}

// Track drag endpoints for shape tools
let shapeStart: Point | null = null
let shapeEnd: Point | null = null

function isShapeTool() { return paint.activeTool === 'line' || paint.activeTool === 'rect' }

function applyShape() {
  const img = image.value
  const layer = activeLayer.value
  if (!img || !layer || !layer.visible || !shapeStart || !shapeEnd) return

  const colorIdx = paint.activeColorIndex
  let diffs
  if (paint.activeTool === 'line') {
    diffs = applyLine(layer.data, img.width, img.height, shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, colorIdx)
  } else {
    diffs = applyRect(layer.data, img.width, img.height, shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, colorIdx)
  }
  if (diffs.length === 0) return

  history.beginStroke(props.imageId, layer.id, paint.activeTool)
  diffs.forEach(d => history.recordPixel(props.imageId, linearIndex(d.x, d.y, img.width), d.x, d.y, d.oldIndex, d.newIndex))
  history.commitStroke(props.imageId)
  requestLayerRedraw(layer.id)
  project.markDirty()
}

function onPixelPress(pixel: Point) {
  if (isPanMode.value) return
  if (paint.activeTool === 'fill') {
    applyFill(pixel)
    return
  }
  if (isShapeTool()) {
    shapeStart = { ...pixel }
    shapeEnd = { ...pixel }
    paint.isDrawing = true
    return
  }
  paint.isDrawing = true
  history.beginStroke(props.imageId, editor.activeLayerId ?? '', paint.activeTool)
  applyTool(pixel)
}

function onPixelDrag(pixel: Point) {
  if (isPanMode.value || !paint.isDrawing) return
  if (isShapeTool()) {
    shapeEnd = { ...pixel }
    return
  }
  applyTool(pixel)
}

function onPixelRelease() {
  if (!paint.isDrawing) return
  paint.isDrawing = false
  if (isShapeTool()) {
    applyShape()
    shapeStart = null
    shapeEnd = null
    return
  }
  history.commitStroke(props.imageId)
}

// --- Undo / Redo ---
function applyUndo() {
  const cmd = history.undo(props.imageId)
  if (!cmd) return
  const layer = image.value?.layers.find(l => l.id === cmd.layerId)
  if (layer) {
    cmd.pixels.forEach(p => { layer.data[linearIndex(p.x, p.y, image.value!.width)] = p.oldIndex })
    requestLayerRedraw(layer.id)
  }
  project.markDirty()
}

function applyRedo() {
  const cmd = history.redo(props.imageId)
  if (!cmd) return
  const layer = image.value?.layers.find(l => l.id === cmd.layerId)
  if (layer) {
    cmd.pixels.forEach(p => { layer.data[linearIndex(p.x, p.y, image.value!.width)] = p.newIndex })
    requestLayerRedraw(layer.id)
  }
  project.markDirty()
}

// --- Zoom ---
const ZOOM_LEVELS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32]
const viewport = ref<HTMLDivElement | null>(null)

function zoomIn() {
  const idx = ZOOM_LEVELS.indexOf(paint.zoom)
  if (idx < ZOOM_LEVELS.length - 1) paint.setZoom(ZOOM_LEVELS[idx + 1])
}
function zoomOut() {
  const idx = ZOOM_LEVELS.indexOf(paint.zoom)
  if (idx > 0) paint.setZoom(ZOOM_LEVELS[idx - 1])
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (paint.isDrawing) return
  if (e.deltaY < 0) zoomIn(); else zoomOut()
}

// --- Pan (Space+drag and middle-mouse drag) ---
const isPanMode = ref(false)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panAnchorScrollX = 0
let panAnchorScrollY = 0

function startPan(screenX: number, screenY: number) {
  isPanning.value = true
  panStartX = screenX
  panStartY = screenY
  panAnchorScrollX = viewport.value?.scrollLeft ?? 0
  panAnchorScrollY = viewport.value?.scrollTop ?? 0
}

function updatePan(screenX: number, screenY: number) {
  if (!isPanning.value || !viewport.value) return
  viewport.value.scrollLeft = panAnchorScrollX + (panStartX - screenX)
  viewport.value.scrollTop  = panAnchorScrollY + (panStartY - screenY)
}

function stopPan() { isPanning.value = false }

// --- Keyboard ---
function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Space') { isPanMode.value = true; e.preventDefault(); return }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); applyUndo(); return }
  if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); applyRedo(); return }
  if (e.key === '=' || e.key === '+') { zoomIn(); return }
  if (e.key === '-') { zoomOut(); return }
  const toolKeys: Record<string, string> = { d: 'draw', e: 'erase', f: 'fill', i: 'eyedropper', l: 'line', r: 'rect' }
  if (!e.ctrlKey && !e.metaKey && toolKeys[e.key.toLowerCase()]) {
    paint.setTool(toolKeys[e.key.toLowerCase()] as Parameters<typeof paint.setTool>[0])
  }
}
function onKeyup(e: KeyboardEvent) {
  if (e.code === 'Space') { isPanMode.value = false; if (isPanning.value) stopPan() }
}

// Viewport mouse events for pan
function onViewportMousedown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && isPanMode.value)) {
    e.preventDefault()
    startPan(e.clientX, e.clientY)
  }
}
function onViewportMousemove(e: MouseEvent) { updatePan(e.clientX, e.clientY) }
function onViewportMouseup(e: MouseEvent) { if (e.button === 1 || e.button === 0) stopPan() }

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('mousemove', onViewportMousemove)
  window.addEventListener('mouseup', onViewportMouseup)
  viewport.value?.addEventListener('wheel', onWheel, { passive: false })
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
  window.removeEventListener('mousemove', onViewportMousemove)
  window.removeEventListener('mouseup', onViewportMouseup)
  viewport.value?.removeEventListener('wheel', onWheel)
})

// Redraw all layers when zoom changes (canvas sizes change)
watch(() => paint.zoom, requestAllLayersRedraw)
</script>

<template>
  <div class="canvas-editor">
    <div
      ref="viewport"
      class="canvas-viewport"
      :style="{ cursor: isPanMode ? 'grab' : 'default' }"
      @mousedown="onViewportMousedown"
    >
      <div
        class="canvas-stack"
        :style="{ width: `${displayW}px`, height: `${displayH}px` }"
      >
        <canvas ref="bgCanvas" class="stack-layer" :width="displayW" :height="displayH" style="z-index:0" />
        <ImageLayer
          v-for="layer in image?.layers"
          :key="layer.id"
          :ref="(el) => setLayerRef(layer.id, el)"
          :layer="layer"
          :palette="palette!"
          :width="image!.width"
          :height="image!.height"
          :zoom="paint.zoom"
          class="stack-layer"
          style="z-index:1"
        />
        <canvas ref="gridCanvas" class="stack-layer" :width="displayW" :height="displayH" style="z-index:2" />
        <CursorLayer
          class="stack-layer"
          :width="image?.width ?? 0"
          :height="image?.height ?? 0"
          :zoom="paint.zoom"
          :active-tool="paint.activeTool"
          :pan-mode="isPanMode"
          :is-panning="isPanning"
          :preview-color="previewColor"
          style="z-index:3"
          @pixel-press="onPixelPress"
          @pixel-drag="onPixelDrag"
          @pixel-release="onPixelRelease"
        />
      </div>
    </div>
    <div class="statusbar">
      {{ image?.width }}×{{ image?.height }} px
      &nbsp;|&nbsp; zoom: {{ paint.zoom }}×
      &nbsp;|&nbsp; <button class="zoom-btn" @click="zoomOut">−</button>
      <button class="zoom-btn" @click="zoomIn">+</button>
    </div>
  </div>
</template>

<style scoped>
.canvas-editor { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

.canvas-viewport {
  flex: 1;
  overflow: auto;
  background: var(--color-bg);
  padding: 16px;
}

.canvas-stack {
  position: relative;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.stack-layer {
  position: absolute;
  top: 0;
  left: 0;
  image-rendering: pixelated;
}

.statusbar {
  height: 22px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 2px 10px;
  font-size: 11px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.zoom-btn {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0 5px;
  border-radius: 2px;
}
.zoom-btn:hover { background: var(--color-surface-2); }
</style>
