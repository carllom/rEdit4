<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Layer, Palette } from '../../domain/model'
import { renderLayer } from '../../renderer/layerRenderer'

const props = defineProps<{
  layer: Layer
  palette: Palette
  width: number
  height: number
  zoom: number
}>()

const offscreen = document.createElement('canvas')
const displayCanvas = ref<HTMLCanvasElement | null>(null)
let rafId: number | null = null

function redraw() {
  const { width, height, zoom, palette, layer } = props
  offscreen.width = width
  offscreen.height = height
  const offCtx = offscreen.getContext('2d')!
  renderLayer(layer, palette, width, height, offCtx)

  const canvas = displayCanvas.value
  if (!canvas) return
  canvas.width = width * zoom
  canvas.height = height * zoom
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalAlpha = layer.visible ? layer.opacity : 0
  ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height)
  ctx.globalAlpha = 1
  rafId = null
}

function requestRedraw() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(redraw)
}

onMounted(redraw)
onUnmounted(() => { if (rafId !== null) cancelAnimationFrame(rafId) })

watch(() => [props.layer, props.zoom], requestRedraw, { flush: 'post' })
watch(() => [props.layer.opacity, props.layer.visible], requestRedraw, { flush: 'post' })
watch(() => props.palette, requestRedraw, { deep: true, flush: 'post' })

defineExpose({ requestRedraw })
</script>

<template>
  <canvas
    ref="displayCanvas"
    :width="width * zoom"
    :height="height * zoom"
  />
</template>
