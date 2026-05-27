<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Point, ReImage, Palette } from '../../domain/model'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { renderSprite, hitTestParts, fitSpriteToView } from '../../renderer/spriteRenderer'
import { ZOOM_LEVELS } from '../../renderer/viewport'
import type { ViewportState } from '../../stores/paintStore'

const props = defineProps<{ spriteId: string }>()
const emit = defineEmits<{ partSelected: [index: number | null] }>()

const project = useProjectStore()
const editor = useEditorStore()

const sprite = computed(() => project.getSprite(props.spriteId))

const imgMap = computed<Map<string, ReImage>>(() => {
  const m = new Map<string, ReImage>()
  for (const img of project.project?.images ?? []) m.set(img.id, img)
  return m
})
const palMap = computed<Map<string, Palette>>(() => {
  const m = new Map<string, Palette>()
  for (const pal of project.project?.palettes ?? []) m.set(pal.id, pal)
  return m
})

// --- Per-sprite viewport cache (module-level, outside reactive state) ---
const vpCache = new Map<string, ViewportState>()
const zoom = ref(4)
const panOffset = ref<Point>({ x: -8, y: -8 })

function saveVp() {
  vpCache.set(props.spriteId, { zoom: zoom.value, panOffset: { ...panOffset.value } })
}
function setVp(z: number, pan: Point) {
  zoom.value = z
  panOffset.value = { ...pan }
  saveVp()
}

watch(() => props.spriteId, (id) => {
  const cached = vpCache.get(id)
  if (cached) {
    zoom.value = cached.zoom
    panOffset.value = { ...cached.panOffset }
  } else {
    if (viewW.value > 0) fitView()
  }
})

// --- Canvas ---
const canvas = ref<HTMLCanvasElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
const viewW = ref(0)
const viewH = ref(0)

function redraw() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || viewW.value === 0) return
  const spr = sprite.value
  if (!spr) {
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, viewW.value, viewH.value)
    return
  }
  renderSprite(ctx, spr.parts, spr.anchor, imgMap.value, palMap.value,
    { zoom: zoom.value, panOffset: panOffset.value, viewW: viewW.value, viewH: viewH.value },
    editor.activePartIndex)
}

// Expose so parent can request a redraw after mutations
defineExpose({ requestRedraw: redraw })

watch(
  [zoom, panOffset, viewW, viewH,
   () => editor.activePartIndex,
   () => sprite.value?.parts,
   () => sprite.value?.anchor],
  redraw,
  { flush: 'post' },
)

// --- Resize ---
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(entries => {
    const r = entries[0].contentRect
    if (r.width === 0 || r.height === 0) return
    viewW.value = Math.round(r.width)
    viewH.value = Math.round(r.height)
    if (!vpCache.has(props.spriteId)) fitView()
    else redraw()
  })
  ro.observe(container.value!)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('mousemove', onGlobalMousemove)
  window.addEventListener('mouseup', onGlobalMouseup)
  container.value!.addEventListener('wheel', onWheel, { passive: false })
})
onUnmounted(() => {
  ro?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
  window.removeEventListener('mousemove', onGlobalMousemove)
  window.removeEventListener('mouseup', onGlobalMouseup)
  container.value?.removeEventListener('wheel', onWheel)
})

function fitView() {
  if (viewW.value === 0) return
  const spr = sprite.value
  if (!spr || (spr.parts.length === 0 && spr.anchor.x === 0 && spr.anchor.y === 0)) {
    setVp(4, { x: -viewW.value / 8, y: -viewH.value / 8 })
    return
  }
  const { zoom: z, panOffset: pan } = fitSpriteToView(spr.parts, imgMap.value, spr.anchor, viewW.value, viewH.value)
  setVp(z, pan)
}

// --- Zoom ---
function applyZoom(newZoom: number, cx: number, cy: number) {
  const old = zoom.value
  const pan = panOffset.value
  const pixX = cx / old + pan.x
  const pixY = cy / old + pan.y
  setVp(newZoom, { x: pixX - cx / newZoom, y: pixY - cy / newZoom })
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

// --- Pan ---
const isPanMode = ref(false)
const isPanning = ref(false)
let panStart = { x: 0, y: 0 }
let panAnchor: Point = { x: 0, y: 0 }

function startPan(sx: number, sy: number) {
  isPanning.value = true
  panStart = { x: sx, y: sy }
  panAnchor = { ...panOffset.value }
}
function updatePan(sx: number, sy: number) {
  if (!isPanning.value) return
  setVp(zoom.value, {
    x: panAnchor.x + (panStart.x - sx) / zoom.value,
    y: panAnchor.y + (panStart.y - sy) / zoom.value,
  })
}
function stopPan() { isPanning.value = false }

function onGlobalMousemove(e: MouseEvent) { updatePan(e.clientX, e.clientY) }
function onGlobalMouseup(e: MouseEvent) { if (e.button === 0 || e.button === 1) stopPan() }

// --- Click to select part ---
function onCanvasMousedown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && isPanMode.value)) {
    e.preventDefault()
    startPan(e.clientX, e.clientY)
    return
  }
  if (e.button === 0) {
    const rect = canvas.value!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const spX = sx / zoom.value + panOffset.value.x
    const spY = sy / zoom.value + panOffset.value.y
    const spr = sprite.value
    if (!spr) return
    const hit = hitTestParts(spr.parts, imgMap.value, palMap.value, spX, spY)
    emit('partSelected', hit >= 0 ? hit : null)
  }
}

// --- Keyboard (viewport only — Delete/Undo are in SpriteEditorView) ---
function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.code === 'Space' && !e.repeat) { isPanMode.value = true; e.preventDefault() }
  else if (e.code === 'Home' && !e.altKey) { fitView(); e.preventDefault() }
  else if ((e.key === '=' || e.key === '+') && !e.ctrlKey && !e.metaKey) zoomIn()
  else if (e.key === '-' && !e.ctrlKey && !e.metaKey) zoomOut()
}
function onKeyup(e: KeyboardEvent) {
  if (e.code === 'Space') { isPanMode.value = false; if (isPanning.value) stopPan() }
}
</script>

<template>
  <div
    ref="container"
    class="sprite-canvas-container"
    :style="{ cursor: isPanMode ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }"
  >
    <canvas
      ref="canvas"
      class="sprite-canvas"
      :width="viewW"
      :height="viewH"
      @mousedown="onCanvasMousedown"
    />
    <div class="statusbar">
      zoom: {{ zoom }}×
      &nbsp;|&nbsp; origin (0,0) &nbsp;|&nbsp; anchor ({{ sprite?.anchor.x }}, {{ sprite?.anchor.y }})
    </div>
  </div>
</template>

<style scoped>
.sprite-canvas-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: var(--rd-color-bg);
}

.sprite-canvas {
  flex: 1;
  display: block;
  image-rendering: pixelated;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.statusbar {
  height: var(--rd-hit-md);
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  padding: 0 var(--rd-space-5);
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  display: flex;
  align-items: center;
}
</style>
