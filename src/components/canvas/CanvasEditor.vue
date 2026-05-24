<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, toRaw } from 'vue'
import ImageLayer from './ImageLayer.vue'
import CursorLayer from './CursorLayer.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { usePaintStore } from '../../stores/paintStore'
import { useHistoryStore } from '../../stores/historyStore'
import { inBounds, linearIndex, ZOOM_LEVELS, fitToViewport, clampPanOffset, centerPanOffset } from '../../renderer/viewport'
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

// --- Viewport state (per-image, from store) ---
const zoom = computed(() => paint.viewports[props.imageId]?.zoom ?? 1)
const panOffset = computed(() => paint.viewports[props.imageId]?.panOffset ?? { x: 0, y: 0 })

// --- Viewport dimensions (tracked via ResizeObserver) ---
const viewW = ref(0)
const viewH = ref(0)
const container = ref<HTMLDivElement | null>(null)

function initViewportIfNeeded() {
  const img = image.value
  if (!img || viewW.value === 0 || viewH.value === 0) return
  const { zoom: z, panOffset: pan } = fitToViewport(img.width, img.height, viewW.value, viewH.value)
  paint.initViewport(props.imageId, z, pan)
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver(entries => {
    const rect = entries[0].contentRect
    if (rect.width === 0 || rect.height === 0) return
    viewW.value = Math.round(rect.width)
    viewH.value = Math.round(rect.height)
    initViewportIfNeeded()
  })
  resizeObserver.observe(container.value!)

  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('mousemove', onGlobalMousemove)
  window.addEventListener('mouseup', onGlobalMouseup)
  container.value?.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
  window.removeEventListener('mousemove', onGlobalMousemove)
  window.removeEventListener('mouseup', onGlobalMouseup)
  container.value?.removeEventListener('wheel', onWheel)
})

// --- Background / Grid redraw ---
const bgCanvas = ref<HTMLCanvasElement | null>(null)
const gridCanvas = ref<HTMLCanvasElement | null>(null)

function vpContext() {
  const img = image.value
  return {
    viewW: viewW.value,
    viewH: viewH.value,
    zoom: zoom.value,
    panOffset: panOffset.value,
    imgW: img?.width ?? 0,
    imgH: img?.height ?? 0,
  }
}

function redrawBg() {
  const ctx = bgCanvas.value?.getContext('2d')
  if (ctx && viewW.value > 0) drawCheckerboard(ctx, vpContext())
}

function redrawGrid() {
  const ctx = gridCanvas.value?.getContext('2d')
  if (ctx && viewW.value > 0) drawGrid(ctx, vpContext())
}

// Redraw static layers whenever the viewport state or dimensions change
watch([viewW, viewH, zoom, panOffset], () => {
  redrawBg()
  redrawGrid()
}, { flush: 'post', deep: true })

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

// Re-render all layers when viewport changes (zoom, pan, resize)
watch([zoom, panOffset, viewW, viewH], requestAllLayersRedraw, { flush: 'post', deep: true })

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
  const rawData = toRaw(layer).data
  const targetIdx = rawData[linearIndex(pixel.x, pixel.y, img.width)]
  if (targetIdx === fillIdx) return

  const diffs = floodFill(rawData, img.width, img.height, pixel.x, pixel.y, targetIdx, fillIdx)
  if (diffs.length === 0) return

  history.beginStroke(props.imageId, layer.id, 'fill')
  diffs.forEach(d => history.recordPixel(props.imageId, linearIndex(d.x, d.y, img.width), d.x, d.y, d.oldIndex, d.newIndex))
  history.commitStroke(props.imageId)
  requestLayerRedraw(layer.id)
  project.markDirty()
}

let shapeStart: Point | null = null
let shapeEnd: Point | null = null

function isShapeTool() { return paint.activeTool === 'line' || paint.activeTool === 'rect' }

function applyShape() {
  const img = image.value
  const layer = activeLayer.value
  if (!img || !layer || !layer.visible || !shapeStart || !shapeEnd) return

  const colorIdx = paint.activeColorIndex
  const rawData = toRaw(layer).data
  let diffs
  if (paint.activeTool === 'line') {
    diffs = applyLine(rawData, img.width, img.height, shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, colorIdx)
  } else {
    diffs = applyRect(rawData, img.width, img.height, shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y, colorIdx)
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
  if (paint.activeTool === 'fill') { applyFill(pixel); return }
  if (isShapeTool()) {
    shapeStart = { ...pixel }
    shapeEnd   = { ...pixel }
    paint.isDrawing = true
    return
  }
  paint.isDrawing = true
  history.beginStroke(props.imageId, editor.activeLayerId ?? '', paint.activeTool)
  applyTool(pixel)
}

function onPixelDrag(pixel: Point) {
  if (isPanMode.value || !paint.isDrawing) return
  if (isShapeTool()) { shapeEnd = { ...pixel }; return }
  applyTool(pixel)
}

function onPixelRelease() {
  if (!paint.isDrawing) return
  paint.isDrawing = false
  if (isShapeTool()) {
    applyShape()
    shapeStart = null
    shapeEnd   = null
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
function applyZoom(newZoom: number, cursorScreenX: number, cursorScreenY: number) {
  const img = image.value
  if (!img) return
  const pan = panOffset.value
  const oldZoom = zoom.value
  // Keep the image pixel under the cursor fixed in screen space
  const pixelX = cursorScreenX / oldZoom + pan.x
  const pixelY = cursorScreenY / oldZoom + pan.y
  const newPan = clampPanOffset(
    { x: pixelX - cursorScreenX / newZoom, y: pixelY - cursorScreenY / newZoom },
    img.width, img.height, viewW.value, viewH.value, newZoom,
  )
  paint.setViewport(props.imageId, { zoom: newZoom, panOffset: newPan })
}

function zoomIn(cursorX = viewW.value / 2, cursorY = viewH.value / 2) {
  const idx = ZOOM_LEVELS.indexOf(zoom.value)
  if (idx < ZOOM_LEVELS.length - 1) applyZoom(ZOOM_LEVELS[idx + 1], cursorX, cursorY)
}

function zoomOut(cursorX = viewW.value / 2, cursorY = viewH.value / 2) {
  const idx = ZOOM_LEVELS.indexOf(zoom.value)
  if (idx > 0) applyZoom(ZOOM_LEVELS[idx - 1], cursorX, cursorY)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (paint.isDrawing) return
  if (e.deltaY < 0) zoomIn(e.offsetX, e.offsetY)
  else              zoomOut(e.offsetX, e.offsetY)
}

// --- Pan (Space+drag and middle-mouse drag) ---
const isPanMode = ref(false)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panAnchorOffset: Point = { x: 0, y: 0 }

function startPan(screenX: number, screenY: number) {
  isPanning.value = true
  panStartX = screenX
  panStartY = screenY
  panAnchorOffset = { ...panOffset.value }
}

function updatePan(screenX: number, screenY: number) {
  if (!isPanning.value) return
  const img = image.value
  if (!img) return
  const dxPixel = (panStartX - screenX) / zoom.value
  const dyPixel = (panStartY - screenY) / zoom.value
  const newPan = clampPanOffset(
    { x: panAnchorOffset.x + dxPixel, y: panAnchorOffset.y + dyPixel },
    img.width, img.height, viewW.value, viewH.value, zoom.value,
  )
  paint.setViewport(props.imageId, { zoom: zoom.value, panOffset: newPan })
}

function stopPan() { isPanning.value = false }

function reCenter() {
  const img = image.value
  if (!img) return
  paint.setViewport(props.imageId, {
    zoom: zoom.value,
    panOffset: centerPanOffset(img.width, img.height, viewW.value, viewH.value, zoom.value),
  })
}

// --- Keyboard ---
function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.code === 'Space')               { isPanMode.value = true; e.preventDefault(); return }
  if (e.code === 'Home' && !e.altKey)   { reCenter(); return }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); applyUndo(); return }
  if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); applyRedo(); return }
  if (e.key === '=' || e.key === '+') { zoomIn(); return }
  if (e.key === '-')                  { zoomOut(); return }
  if (e.altKey && (e.code === 'PageUp' || e.code === 'PageDown' || e.code === 'Home' || e.code === 'End')) {
    e.preventDefault()
    const img = image.value
    if (img && editor.activeLayerId) {
      const layers = img.layers
      const fromIdx = layers.findIndex(l => l.id === editor.activeLayerId)
      if (fromIdx !== -1) {
        const n = layers.length
        let toIdx = fromIdx
        if (e.code === 'PageUp')   toIdx = Math.min(fromIdx + 1, n - 1)
        if (e.code === 'PageDown') toIdx = Math.max(fromIdx - 1, 0)
        if (e.code === 'Home')     toIdx = n - 1
        if (e.code === 'End')      toIdx = 0
        project.reorderLayer(props.imageId, fromIdx, toIdx)
      }
    }
    return
  }
  const toolKeys: Record<string, string> = { d: 'draw', e: 'erase', f: 'fill', i: 'eyedropper', l: 'line', r: 'rect' }
  if (!e.ctrlKey && !e.metaKey && toolKeys[e.key.toLowerCase()]) {
    paint.setTool(toolKeys[e.key.toLowerCase()] as Parameters<typeof paint.setTool>[0])
  }
}

function onKeyup(e: KeyboardEvent) {
  if (e.code === 'Space') { isPanMode.value = false; if (isPanning.value) stopPan() }
}

// Container mouse events for pan
function onContainerMousedown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && isPanMode.value)) {
    e.preventDefault()
    startPan(e.clientX, e.clientY)
  }
}
function onGlobalMousemove(e: MouseEvent) { updatePan(e.clientX, e.clientY) }
function onGlobalMouseup(e: MouseEvent) { if (e.button === 1 || e.button === 0) stopPan() }
</script>

<template>
  <div class="canvas-editor">
    <div
      ref="container"
      class="canvas-viewport"
      :style="{ cursor: isPanMode ? (isPanning ? 'grabbing' : 'grab') : 'default' }"
      @mousedown="onContainerMousedown"
    >
      <div class="canvas-stack">
        <canvas ref="bgCanvas"   class="stack-layer" :width="viewW" :height="viewH" style="z-index:0" />
        <ImageLayer
          v-for="layer in image?.layers"
          :key="layer.id"
          :ref="(el) => setLayerRef(layer.id, el)"
          :layer="layer"
          :palette="palette!"
          :width="image!.width"
          :height="image!.height"
          :zoom="zoom"
          :pan-offset="panOffset"
          :view-w="viewW"
          :view-h="viewH"
          class="stack-layer"
          style="z-index:1"
        />
        <canvas ref="gridCanvas" class="stack-layer" :width="viewW" :height="viewH" style="z-index:2" />
        <CursorLayer
          class="stack-layer"
          :width="image?.width ?? 0"
          :height="image?.height ?? 0"
          :zoom="zoom"
          :pan-offset="panOffset"
          :view-w="viewW"
          :view-h="viewH"
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
      &nbsp;|&nbsp; zoom: {{ zoom }}×
      &nbsp;|&nbsp; <button class="zoom-btn" @click="zoomOut()">−</button>
      <button class="zoom-btn" @click="zoomIn()">+</button>
    </div>
  </div>
</template>

<style scoped>
.canvas-editor { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

.canvas-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #1e1e1e;
}

.canvas-stack {
  position: absolute;
  inset: 0;
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
