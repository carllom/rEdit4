<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, toRaw } from 'vue'
import type { Layer, Palette, Point } from '../../domain/model'
import { renderLayer } from '../../renderer/layerRenderer'

const props = defineProps<{
  layer: Layer
  palette: Palette
  width: number      // image width in pixels
  height: number     // image height in pixels
  zoom: number
  panOffset: Point
  viewW: number      // viewport canvas width in screen pixels
  viewH: number      // viewport canvas height in screen pixels
}>()

const offscreen = document.createElement('canvas')
const displayCanvas = ref<HTMLCanvasElement | null>(null)
let rafId: number | null = null

function redraw() {
  rafId = null
  const { width, height, zoom, palette, layer, panOffset, viewW, viewH } = props

  // Render full layer to offscreen at native (1:1) resolution
  if (offscreen.width !== width || offscreen.height !== height) {
    offscreen.width = width
    offscreen.height = height
  }
  const offCtx = offscreen.getContext('2d')!
  renderLayer(toRaw(layer), toRaw(palette), width, height, offCtx)

  const canvas = displayCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, viewW, viewH)

  if (!layer.visible) return

  // srcX/srcY: first integer image pixel at or before the viewport's left/top edge.
  // fracX/fracY: how far into that pixel the viewport starts (0–1), giving sub-pixel smooth pan.
  const srcX = Math.floor(panOffset.x)
  const srcY = Math.floor(panOffset.y)
  const fracX = panOffset.x - srcX
  const fracY = panOffset.y - srcY

  // How many image pixels span the viewport (plus 1 to cover the fractional leading pixel)
  const visPixW = Math.ceil(viewW / zoom) + 1
  const visPixH = Math.ceil(viewH / zoom) + 1

  // Clamp source region to image bounds
  const actualSrcX = Math.max(0, srcX)
  const actualSrcY = Math.max(0, srcY)
  const actualSrcW = Math.min(visPixW - (actualSrcX - srcX), width  - actualSrcX)
  const actualSrcH = Math.min(visPixH - (actualSrcY - srcY), height - actualSrcY)

  if (actualSrcW <= 0 || actualSrcH <= 0) return

  // destX/destY: where the first source pixel lands on screen.
  // Negative fracX shifts the image left by a sub-pixel amount for smooth panning.
  // The (actualSrcX - srcX) term compensates when srcX was clamped (image not yet at left edge).
  const destX = (-fracX + (actualSrcX - srcX)) * zoom
  const destY = (-fracY + (actualSrcY - srcY)) * zoom

  ctx.globalAlpha = layer.opacity
  ctx.drawImage(offscreen, actualSrcX, actualSrcY, actualSrcW, actualSrcH, destX, destY, actualSrcW * zoom, actualSrcH * zoom)
  ctx.globalAlpha = 1
}

function requestRedraw() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(redraw)
}

onMounted(redraw)
onUnmounted(() => { if (rafId !== null) cancelAnimationFrame(rafId) })

watch(() => [props.layer, props.zoom, props.panOffset.x, props.panOffset.y, props.viewW, props.viewH], requestRedraw, { flush: 'post' })
watch(() => [props.layer.opacity, props.layer.visible], requestRedraw, { flush: 'post' })
watch(() => props.palette, requestRedraw, { deep: true, flush: 'post' })

defineExpose({ requestRedraw })
</script>

<template>
  <canvas ref="displayCanvas" :width="viewW" :height="viewH" />
</template>
