<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, toRaw } from 'vue'
import type { Point, ReImage, Palette } from '../../domain/model'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useAnimationHistoryStore } from '../../stores/animationHistoryStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { ZOOM_LEVELS, fitToViewport } from '../../renderer/viewport'
import { compositeImage } from '../../domain/color'
import { updateFramePosition } from '../../domain/animationOps'

const project = useProjectStore()
const editor = useEditorStore()
const animHist = useAnimationHistoryStore()
const { settings } = useSettingsStore()

// --- Store-derived state ---

const animation = computed(() => {
  const id = editor.activeAnimationId
  return id ? project.getAnimation(id) : null
})

const frames = computed(() => animation.value?.frames ?? [])

const activeFrame = computed(() => frames.value[editor.activeFrameIndex] ?? null)

const activeSprite = computed(() => {
  const f = activeFrame.value
  return f ? project.getSprite(f.spriteId) ?? null : null
})

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

// --- Per-animation viewport cache (module-level, outside reactive state) ---
const vpCache = new Map<string, { zoom: number; panOffset: Point }>()
const zoom = ref(4)
const panOffset = ref<Point>({ x: 0, y: 0 })

function saveVp() {
  const id = editor.activeAnimationId
  if (id) vpCache.set(id, { zoom: zoom.value, panOffset: { ...panOffset.value } })
}

function setVp(z: number, pan: Point) {
  zoom.value = z
  panOffset.value = { ...pan }
  saveVp()
}

watch(() => editor.activeAnimationId, (id) => {
  if (!id) return
  const cached = vpCache.get(id)
  if (cached) {
    zoom.value = cached.zoom
    panOffset.value = { ...cached.panOffset }
  } else if (viewW.value > 0) {
    fitView()
  }
})

// --- Canvas ---
const canvas = ref<HTMLCanvasElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
const viewW = ref(0)
const viewH = ref(0)

// --- Checkerboard ---
let checkerPattern: CanvasPattern | null = null

function getCheckerPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  if (checkerPattern) return checkerPattern
  const cell = 4
  const tile = document.createElement('canvas')
  tile.width = tile.height = cell * 2
  const t = tile.getContext('2d')!
  t.fillStyle = '#cccccc'
  t.fillRect(0, 0, cell * 2, cell * 2)
  t.fillStyle = '#888888'
  t.fillRect(0, 0, cell, cell)
  t.fillRect(cell, cell, cell, cell)
  checkerPattern = ctx.createPattern(tile, 'repeat')!
  return checkerPattern
}

// --- Onion skin ---
function drawGhostFrame(
  ctx: CanvasRenderingContext2D,
  ghost: HTMLCanvasElement,
  gCtx: CanvasRenderingContext2D,
  frameIdx: number,
  opacity: number,
  tintStyle: string,
) {
  const anim = animation.value
  if (!anim) return
  const frame = anim.frames[frameIdx]
  if (!frame) return
  const sprite = project.getSprite(frame.spriteId) ?? null
  if (!sprite || sprite.parts.length === 0) return

  const z = zoom.value
  const pan = panOffset.value

  gCtx.clearRect(0, 0, ghost.width, ghost.height)
  gCtx.globalCompositeOperation = 'source-over'
  gCtx.globalAlpha = 1
  gCtx.imageSmoothingEnabled = false

  for (const part of sprite.parts) {
    const img = imgMap.value.get(part.imageId)
    if (!img) continue
    const pal = palMap.value.get(img.paletteId)
    if (!pal) continue
    const rgba = compositeImage(toRaw(img), toRaw(pal))
    const offscreen = document.createElement('canvas')
    offscreen.width = img.width
    offscreen.height = img.height
    offscreen.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0,
    )
    const px = frame.position.x - sprite.anchor.x + part.position.x
    const py = frame.position.y - sprite.anchor.y + part.position.y
    const sx = (px - pan.x) * z
    const sy = (py - pan.y) * z
    gCtx.drawImage(offscreen, 0, 0, img.width, img.height, sx, sy, img.width * z, img.height * z)
  }

  // 50% blend toward tint, only on non-transparent pixels
  gCtx.globalCompositeOperation = 'source-atop'
  gCtx.globalAlpha = 0.5
  gCtx.fillStyle = tintStyle
  gCtx.fillRect(0, 0, ghost.width, ghost.height)

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.drawImage(ghost, 0, 0)
  ctx.restore()
}

function renderOnionSkin(ctx: CanvasRenderingContext2D) {
  if (!editor.onionSkinEnabled) return
  const anim = animation.value
  if (!anim || anim.frames.length === 0) return

  const frameCount = anim.frames.length
  const currentIdx = editor.activeFrameIndex
  const opacities = [0.6, 0.3, 0.15]

  const ghost = document.createElement('canvas')
  ghost.width = viewW.value
  ghost.height = viewH.value
  const gCtx = ghost.getContext('2d')!

  // Previous frames (tint red), farthest first so closest lands on top
  for (let d = editor.onionSkinBefore; d >= 1; d--) {
    const idx = ((currentIdx - d) % frameCount + frameCount) % frameCount
    if (idx === currentIdx) continue
    drawGhostFrame(ctx, ghost, gCtx, idx, opacities[d - 1], 'rgb(255, 0, 0)')
  }

  // Next frames (tint blue), farthest first so closest lands on top
  for (let d = editor.onionSkinAfter; d >= 1; d--) {
    const idx = (currentIdx + d) % frameCount
    if (idx === currentIdx) continue
    drawGhostFrame(ctx, ghost, gCtx, idx, opacities[d - 1], 'rgb(0, 0, 255)')
  }
}

// --- Rendering ---
function redraw() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || viewW.value === 0) return

  const anim = animation.value
  const z = zoom.value
  const pan = panOffset.value

  // 1. Dark fill — entire viewport
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, viewW.value, viewH.value)

  if (!anim) return

  // Stage screen-space bounds
  const sl = -pan.x * z
  const st = -pan.y * z
  const sw = anim.width * z
  const sh = anim.height * z

  // 2. Background inside Stage (clipped)
  ctx.save()
  ctx.beginPath()
  ctx.rect(sl, st, sw, sh)
  ctx.clip()
  if (settings.previewBackground === 'solid') {
    ctx.fillStyle = settings.previewBackgroundColor
    ctx.fillRect(sl, st, sw, sh)
  } else {
    ctx.translate(sl, st)                  // align checker grid to stage origin
    ctx.fillStyle = getCheckerPattern(ctx)
    ctx.fillRect(0, 0, sw, sh)
  }
  ctx.restore()

  // 3. Onion skin ghost frames (between background and active frame)
  renderOnionSkin(ctx)

  // 4. Active frame sprite (clipped to Stage)
  const frame = activeFrame.value
  const sprite = activeSprite.value
  if (frame && sprite && sprite.parts.length > 0) {
    // Build per-imageId offscreen canvas cache for this draw
    const cache = new Map<string, HTMLCanvasElement>()
    for (const part of sprite.parts) {
      if (cache.has(part.imageId)) continue
      const img = imgMap.value.get(part.imageId)
      if (!img) continue
      const pal = palMap.value.get(img.paletteId)
      if (!pal) continue
      const rgba = compositeImage(toRaw(img), toRaw(pal))
      const offscreen = document.createElement('canvas')
      offscreen.width = img.width
      offscreen.height = img.height
      offscreen.getContext('2d')!.putImageData(
        new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0,
      )
      cache.set(part.imageId, offscreen)
    }

    ctx.imageSmoothingEnabled = false
    for (const part of sprite.parts) {
      const offscreen = cache.get(part.imageId)
      const img = imgMap.value.get(part.imageId)
      if (!offscreen || !img) continue
      // Stage position: anchor lands at frame.position; each part is relative to anchor
      const px = frame.position.x - sprite.anchor.x + part.position.x
      const py = frame.position.y - sprite.anchor.y + part.position.y
      const sx = (px - pan.x) * z
      const sy = (py - pan.y) * z
      ctx.drawImage(offscreen, 0, 0, img.width, img.height, sx, sy, img.width * z, img.height * z)
    }
  }

  // 5. Stage boundary outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 1
  ctx.strokeRect(sl + 0.5, st + 0.5, sw - 1, sh - 1)

  // 6. Origin crosshair at Stage (0, 0)
  const crossSize = 10
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(Math.round(sl - crossSize) + 0.5, Math.round(st) + 0.5)
  ctx.lineTo(Math.round(sl + crossSize) + 0.5, Math.round(st) + 0.5)
  ctx.moveTo(Math.round(sl) + 0.5, Math.round(st - crossSize) + 0.5)
  ctx.lineTo(Math.round(sl) + 0.5, Math.round(st + crossSize) + 0.5)
  ctx.stroke()
}

// --- Fit view ---
function fitView() {
  const anim = animation.value
  if (!anim || viewW.value === 0) return
  const { zoom: z, panOffset: pan } = fitToViewport(
    anim.width, anim.height, viewW.value, viewH.value,
  )
  setVp(z, pan)
}

// --- Zoom ---
function applyZoom(newZoom: number, cx: number, cy: number) {
  const old = zoom.value
  const pan = panOffset.value
  setVp(newZoom, {
    x: cx / old + pan.x - cx / newZoom,
    y: cy / old + pan.y - cy / newZoom,
  })
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
let panBase: Point = { x: 0, y: 0 }

function startPan(sx: number, sy: number) {
  isPanning.value = true
  panStart = { x: sx, y: sy }
  panBase = { ...panOffset.value }
}

function updatePan(sx: number, sy: number) {
  if (!isPanning.value) return
  setVp(zoom.value, {
    x: panBase.x + (panStart.x - sx) / zoom.value,
    y: panBase.y + (panStart.y - sy) / zoom.value,
  })
}

function stopPan() { isPanning.value = false }

// --- Sprite drag ---
const isDragging = ref(false)
let dragGrabOffset: Point = { x: 0, y: 0 }

function screenToStage(sx: number, sy: number): Point {
  return {
    x: sx / zoom.value + panOffset.value.x,
    y: sy / zoom.value + panOffset.value.y,
  }
}

// --- Mouse events ---
function onCanvasMousedown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && isPanMode.value)) {
    e.preventDefault()
    startPan(e.clientX, e.clientY)
    return
  }
  if (e.button !== 0) return

  const anim = animation.value
  const frame = activeFrame.value
  if (!anim || !frame) return

  const rect = canvas.value!.getBoundingClientRect()
  const stagePos = screenToStage(e.clientX - rect.left, e.clientY - rect.top)

  animHist.beginFrameDrag(anim.id, editor.activeFrameIndex, { ...frame.position })
  dragGrabOffset = {
    x: stagePos.x - frame.position.x,
    y: stagePos.y - frame.position.y,
  }
  isDragging.value = true
}

function onGlobalMousemove(e: MouseEvent) {
  updatePan(e.clientX, e.clientY)
  if (!isDragging.value) return
  const anim = animation.value
  const frame = activeFrame.value
  if (!anim || !frame) return
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return

  const stagePos = screenToStage(e.clientX - rect.left, e.clientY - rect.top)
  const newPos = {
    x: Math.round(stagePos.x - dragGrabOffset.x),
    y: Math.round(stagePos.y - dragGrabOffset.y),
  }
  anim.frames = updateFramePosition(anim.frames, editor.activeFrameIndex, newPos)
  project.markDirty()
}

function onGlobalMouseup(e: MouseEvent) {
  if (e.button === 0 || e.button === 1) {
    stopPan()
    if (isDragging.value) {
      const anim = animation.value
      const frame = activeFrame.value
      if (anim && frame) {
        animHist.commitDrag(anim.id, { ...frame.position })
      }
      isDragging.value = false
    }
  }
}

// --- Keyboard ---
function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  const anim = animation.value
  const frame = activeFrame.value

  // Arrow key nudge on active frame position
  if (anim && frame) {
    const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (dx !== 0 || dy !== 0) {
      e.preventDefault()
      const oldPos = { ...frame.position }
      const newPos = { x: oldPos.x + dx, y: oldPos.y + dy }
      anim.frames = updateFramePosition(anim.frames, editor.activeFrameIndex, newPos)
      animHist.push(anim.id, {
        type: 'move-frame',
        frameIndex: editor.activeFrameIndex,
        oldPosition: oldPos,
        newPosition: newPos,
      })
      project.markDirty()
      return
    }
  }

  if (e.code === 'Space' && !e.repeat) { isPanMode.value = true; e.preventDefault() }
  else if (e.code === 'Home' && !e.altKey) { fitView(); e.preventDefault() }
  else if ((e.key === '=' || e.key === '+') && !e.ctrlKey && !e.metaKey) zoomIn()
  else if (e.key === '-' && !e.ctrlKey && !e.metaKey) zoomOut()
}

function onKeyup(e: KeyboardEvent) {
  if (e.code === 'Space') { isPanMode.value = false; if (isPanning.value) stopPan() }
}

// --- Lifecycle ---
let ro: ResizeObserver | null = null

onMounted(() => {
  ro = new ResizeObserver(entries => {
    const r = entries[0].contentRect
    if (r.width === 0 || r.height === 0) return
    viewW.value = Math.round(r.width)
    viewH.value = Math.round(r.height)
    const id = editor.activeAnimationId
    if (!id || !vpCache.has(id)) fitView()
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

// --- Watch for redraws ---
watch(
  [
    zoom, panOffset, viewW, viewH,
    () => editor.activeFrameIndex,
    () => editor.onionSkinEnabled,
    () => editor.onionSkinBefore,
    () => editor.onionSkinAfter,
    () => activeFrame.value?.position,
    () => activeFrame.value?.spriteId,
    () => activeSprite.value?.parts,
    () => activeSprite.value?.anchor,
    () => animation.value?.width,
    () => animation.value?.height,
    () => animation.value?.frames,
    () => settings.previewBackground,
    () => settings.previewBackgroundColor,
    imgMap, palMap,
  ],
  redraw,
  { flush: 'post' },
)

// --- Cursor ---
const activeCursor = computed(() => {
  if (isPanMode.value) return isPanning.value ? 'grabbing' : 'grab'
  if (isDragging.value) return 'grabbing'
  if (activeFrame.value) return 'move'
  return 'default'
})

// Status info
const statusPos = computed(() => {
  const f = activeFrame.value
  return f ? `(${f.position.x}, ${f.position.y})` : '—'
})
</script>

<template>
  <div
    ref="container"
    class="stage-canvas-container"
    :style="{ cursor: activeCursor }"
  >
    <canvas
      ref="canvas"
      class="stage-canvas"
      :width="viewW"
      :height="viewH"
      @mousedown="onCanvasMousedown"
    />
    <div class="statusbar">
      <span>zoom: {{ zoom }}×</span>
      <span class="sep">|</span>
      <span>pos {{ statusPos }}</span>
      <span v-if="activeFrame" class="sep">|</span>
      <span v-if="activeFrame">frame {{ editor.activeFrameIndex + 1 }} / {{ frames.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.stage-canvas-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #1a1a1a;
}

.stage-canvas {
  flex: 1;
  display: block;
  image-rendering: pixelated;
  width: 100%;
  min-height: 0;
}

.statusbar {
  height: var(--rd-hit-md);
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  padding: 0 var(--rd-space-5);
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  font-family: var(--rd-font-mono);
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
}

.sep { opacity: 0.4; }
</style>
