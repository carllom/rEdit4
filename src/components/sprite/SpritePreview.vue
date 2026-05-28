<script setup lang="ts">
import { ref, computed, watch, onMounted, toRaw } from 'vue'
import type { ReImage, Palette } from '../../domain/model'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { compositeImage } from '../../domain/color'

const props = defineProps<{ spriteId: string }>()

const project = useProjectStore()
const { settings } = useSettingsStore()

const canvas = ref<HTMLCanvasElement | null>(null)

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

const MAX_DIM = 256

function render() {
  const c = canvas.value
  const spr = sprite.value
  if (!c) return
  if (!spr || spr.parts.length === 0) {
    c.width = 1
    c.height = 1
    return
  }

  const zoom = settings.spritePreviewZoom
  const parts = spr.parts

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const part of parts) {
    const img = imgMap.value.get(part.imageId)
    if (!img) continue
    minX = Math.min(minX, part.position.x)
    minY = Math.min(minY, part.position.y)
    maxX = Math.max(maxX, part.position.x + img.width)
    maxY = Math.max(maxY, part.position.y + img.height)
  }

  if (minX === Infinity) {
    c.width = 1
    c.height = 1
    return
  }

  const cw = Math.min((maxX - minX) * zoom, MAX_DIM)
  const ch = Math.min((maxY - minY) * zoom, MAX_DIM)
  c.width = cw
  c.height = ch

  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  if (settings.previewBackground === 'solid') {
    ctx.fillStyle = settings.previewBackgroundColor
    ctx.fillRect(0, 0, cw, ch)
  } else {
    ctx.fillStyle = getCheckerPattern(ctx)
    ctx.fillRect(0, 0, cw, ch)
  }

  for (const part of parts) {
    const img = imgMap.value.get(part.imageId)
    const pal = img ? palMap.value.get(img.paletteId) : null
    if (!img || !pal) continue

    const rgba = compositeImage(toRaw(img), toRaw(pal))
    const offscreen = document.createElement('canvas')
    offscreen.width = img.width
    offscreen.height = img.height
    offscreen.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0,
    )

    const dx = (part.position.x - minX) * zoom
    const dy = (part.position.y - minY) * zoom
    ctx.drawImage(offscreen, 0, 0, img.width, img.height, dx, dy, img.width * zoom, img.height * zoom)
  }
}

onMounted(render)

watch(
  [
    () => sprite.value?.parts,
    () => imgMap.value,
    () => palMap.value,
    () => settings.spritePreviewZoom,
    () => settings.previewBackground,
    () => settings.previewBackgroundColor,
  ],
  render,
  { flush: 'post' },
)
</script>

<template>
  <div class="sprite-preview-section">
    <div class="preview-label">Preview</div>
    <div class="preview-wrap">
      <canvas ref="canvas" class="preview-canvas" />
    </div>
  </div>
</template>

<style scoped>
.sprite-preview-section {
  padding: var(--rd-space-4) var(--rd-space-5);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
  flex-shrink: 0;
}

.preview-label {
  font-size: var(--rd-text-10);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preview-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 24px;
}

.preview-canvas {
  display: block;
  image-rendering: pixelated;
}
</style>
