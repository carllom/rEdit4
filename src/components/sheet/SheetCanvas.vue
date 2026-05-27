<script lang="ts">
import { reactive } from 'vue'
import type { Point } from '../../domain/model'

// Module-level: survives component mount/unmount for the session
const sessionViewports = reactive<Record<string, { zoom: number; panOffset: Point }>>({})
const initializedSheets = new Set<string>()
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSheetStore } from '../../stores/sheetStore'
import { useProjectStore } from '../../stores/projectStore'
import {
  ZOOM_LEVELS, fitToViewport, clampPanOffset, centerPanOffset, pixelToScreen,
} from '../../renderer/viewport'
import { useRectInteraction } from '../../composables/useRectInteraction'

const sheetStore = useSheetStore()
const projectStore = useProjectStore()

const activeSheet = computed(() =>
  projectStore.project?.sheets.find(s => s.id === sheetStore.activeSheetId) ?? null
)

// Viewport state (per-sheet, session-persistent via module-level map)
const zoom = computed(() =>
  (sheetStore.activeSheetId && sessionViewports[sheetStore.activeSheetId])
    ? sessionViewports[sheetStore.activeSheetId].zoom
    : 1
)
const panOffset = computed<Point>(() =>
  (sheetStore.activeSheetId && sessionViewports[sheetStore.activeSheetId])
    ? sessionViewports[sheetStore.activeSheetId].panOffset
    : { x: 0, y: 0 }
)

function setViewport(z: number, pan: Point) {
  const id = sheetStore.activeSheetId
  if (!id) return
  sessionViewports[id] = { zoom: z, panOffset: pan }
}

// Viewport dimensions
const container = ref<HTMLDivElement | null>(null)
const viewW = ref(0)
const viewH = ref(0)
let resizeObserver: ResizeObserver | null = null

// Source image
const sourceImg = ref<HTMLImageElement | null>(null)
const imgW = computed(() => sourceImg.value?.naturalWidth ?? 0)
const imgH = computed(() => sourceImg.value?.naturalHeight ?? 0)

watch(() => activeSheet.value?.sourceRef, (src) => {
  if (!src) { sourceImg.value = null; return }
  const img = new Image()
  img.onload = () => { sourceImg.value = img; autoFitIfNeeded() }
  img.src = src
}, { immediate: true })

function autoFitIfNeeded() {
  const id = sheetStore.activeSheetId
  if (!id || !imgW.value || !viewW.value) return
  if (initializedSheets.has(id)) return
  const { zoom: z, panOffset: pan } = fitToViewport(imgW.value, imgH.value, viewW.value, viewH.value)
  setViewport(z, pan)
  initializedSheets.add(id)
}

watch([viewW, viewH, imgW, imgH], autoFitIfNeeded)
watch(() => sheetStore.activeSheetId, () => autoFitIfNeeded())

// Canvas refs
const sourceCanvas = ref<HTMLCanvasElement | null>(null)
const decorCanvas = ref<HTMLCanvasElement | null>(null)

function redrawSource() {
  const ctx = sourceCanvas.value?.getContext('2d')
  if (!ctx || viewW.value === 0) return
  ctx.clearRect(0, 0, viewW.value, viewH.value)
  if (!sourceImg.value || !imgW.value) return
  const z = zoom.value
  const pan = panOffset.value
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sourceImg.value, -pan.x * z, -pan.y * z, imgW.value * z, imgH.value * z)
}

function redrawDecoration() {
  const ctx = decorCanvas.value?.getContext('2d')
  if (!ctx || viewW.value === 0) return
  ctx.clearRect(0, 0, viewW.value, viewH.value)
  const rect = sheetStore.inProgressRect
  if (!rect) return
  const tl = pixelToScreen(rect.x, rect.y, zoom.value, panOffset.value)
  const sw = rect.w * zoom.value
  const sh = rect.h * zoom.value
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, sw - 1, sh - 1)
  ctx.restore()
}

watch([zoom, panOffset, viewW, viewH, sourceImg], redrawSource, { flush: 'post', deep: true })
watch(
  [zoom, panOffset, viewW, viewH, () => sheetStore.inProgressRect],
  redrawDecoration,
  { flush: 'post', deep: true },
)

// Zoom
function applyZoom(newZoom: number, cx: number, cy: number) {
  if (!imgW.value) return
  const pan = panOffset.value
  const oldZoom = zoom.value
  const px = cx / oldZoom + pan.x
  const py = cy / oldZoom + pan.y
  const newPan = clampPanOffset(
    { x: px - cx / newZoom, y: py - cy / newZoom },
    imgW.value, imgH.value, viewW.value, viewH.value, newZoom,
  )
  setViewport(newZoom, newPan)
}

function zoomIn(cx = viewW.value / 2, cy = viewH.value / 2) {
  const idx = ZOOM_LEVELS.indexOf(zoom.value)
  if (idx < ZOOM_LEVELS.length - 1) applyZoom(ZOOM_LEVELS[idx + 1], cx, cy)
}

function zoomOut(cx = viewW.value / 2, cy = viewH.value / 2) {
  const idx = ZOOM_LEVELS.indexOf(zoom.value)
  if (idx > 0) applyZoom(ZOOM_LEVELS[idx - 1], cx, cy)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) zoomIn(e.offsetX, e.offsetY)
  else zoomOut(e.offsetX, e.offsetY)
}

// Pan
const isPanMode = ref(false)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panAnchor: Point = { x: 0, y: 0 }

function startPan(sx: number, sy: number) {
  isPanning.value = true
  panStartX = sx
  panStartY = sy
  panAnchor = { ...panOffset.value }
}

function updatePan(sx: number, sy: number) {
  if (!isPanning.value || !imgW.value) return
  const newPan = clampPanOffset(
    { x: panAnchor.x + (panStartX - sx) / zoom.value, y: panAnchor.y + (panStartY - sy) / zoom.value },
    imgW.value, imgH.value, viewW.value, viewH.value, zoom.value,
  )
  setViewport(zoom.value, newPan)
}

function stopPan() { isPanning.value = false }

function reCenter() {
  if (!imgW.value) return
  setViewport(zoom.value, centerPanOffset(imgW.value, imgH.value, viewW.value, viewH.value, zoom.value))
}

// Rect interaction composable
const rectInteraction = useRectInteraction(decorCanvas, zoom, panOffset, isPanMode)

// Mouse
function onCanvasMousedown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && isPanMode.value)) {
    e.preventDefault()
    startPan(e.clientX, e.clientY)
    return
  }
  if (e.button === 0) rectInteraction.onMousedown(e)
}

function onGlobalMousemove(e: MouseEvent) {
  updatePan(e.clientX, e.clientY)
  if (!isPanning.value) rectInteraction.onMousemove(e)
}

function onGlobalMouseup(e: MouseEvent) {
  if (e.button === 1 || e.button === 0) {
    stopPan()
    rectInteraction.onMouseup()
  }
}

// Keyboard
function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.code === 'Space') { isPanMode.value = true; e.preventDefault(); return }
  if (e.code === 'Home' && !e.altKey) { reCenter(); e.preventDefault(); return }
  if (e.key === '=' || e.key === '+') { zoomIn(); e.preventDefault(); return }
  if (e.key === '-') { zoomOut(); e.preventDefault(); return }
  if (e.key === 'Enter' && sheetStore.inProgressRect) { sheetStore.acceptInProgressRect(); e.preventDefault(); return }
  if (e.key === 'Escape') { sheetStore.setInProgressRect(null); e.preventDefault(); return }
}

function onKeyup(e: KeyboardEvent) {
  if (e.code === 'Space') { isPanMode.value = false; if (isPanning.value) stopPan() }
}

onMounted(() => {
  resizeObserver = new ResizeObserver(entries => {
    const r = entries[0].contentRect
    if (r.width === 0 || r.height === 0) return
    viewW.value = Math.round(r.width)
    viewH.value = Math.round(r.height)
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
</script>

<template>
  <div class="sheet-canvas">
    <div
      ref="container"
      class="canvas-viewport"
      :style="{ cursor: isPanMode ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }"
    >
      <div class="canvas-stack">
        <canvas
          ref="sourceCanvas"
          class="stack-layer"
          :width="viewW"
          :height="viewH"
          style="z-index: 0"
        />
        <canvas
          ref="decorCanvas"
          class="stack-layer"
          :width="viewW"
          :height="viewH"
          style="z-index: 1"
          @mousedown="onCanvasMousedown"
        />
      </div>
      <div v-if="!activeSheet" class="empty-hint">
        No sheet — click "+ New Sheet" to load a PNG.
      </div>
    </div>
    <div class="statusbar">
      <template v-if="activeSheet && imgW">
        {{ imgW }}×{{ imgH }} px
        &nbsp;|&nbsp; zoom: {{ zoom }}×
        &nbsp;|&nbsp;
        <button class="zoom-btn" @click="zoomOut()">−</button>
        <button class="zoom-btn" @click="zoomIn()">+</button>
      </template>
      <template v-else-if="activeSheet">
        Loading…
      </template>
      <template v-else>
        No sheet loaded
      </template>
    </div>
  </div>
</template>

<style scoped>
.sheet-canvas {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.canvas-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--rd-color-bg);
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

.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-13);
  pointer-events: none;
}

.statusbar {
  height: var(--rd-hit-md);
  background: var(--rd-color-surface-1);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  padding: var(--rd-space-1) var(--rd-space-5);
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  display: flex;
  align-items: center;
  gap: var(--rd-space-1);
  flex-shrink: 0;
}

.zoom-btn {
  background: none;
  border: var(--rd-border-w) solid var(--rd-color-border);
  color: var(--rd-color-text);
  cursor: pointer;
  font-size: var(--rd-text-12);
  line-height: 1;
  padding: 0 var(--rd-space-3);
  border-radius: var(--rd-radius-1);
  font-family: inherit;
}
.zoom-btn:hover { background: var(--rd-color-surface-2); }
</style>
