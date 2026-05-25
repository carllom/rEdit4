<script setup lang="ts">
import { ref, computed, watch, onMounted, toRaw } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { compositeImage } from '../../domain/color'

const props = defineProps<{ imageId: string; previewZoom: number }>()

const project = useProjectStore()
const { settings } = useSettingsStore()

const canvas = ref<HTMLCanvasElement | null>(null)
const image = computed(() => project.getImage(props.imageId))
const palette = computed(() => image.value ? project.getPalette(image.value.paletteId) ?? null : null)

const scratch = document.createElement('canvas')

let checkerPattern: CanvasPattern | null = null

function getCheckerPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  if (checkerPattern) return checkerPattern
  const cell = 8
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

function render() {
  const img = image.value
  const pal = palette.value
  const c = canvas.value
  if (!img || !pal || !c) return

  const pz = props.previewZoom
  c.width = img.width * pz
  c.height = img.height * pz

  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  if (settings.previewBackground === 'solid') {
    ctx.fillStyle = settings.previewBackgroundColor
    ctx.fillRect(0, 0, c.width, c.height)
  } else {
    ctx.fillStyle = getCheckerPattern(ctx)
    ctx.fillRect(0, 0, c.width, c.height)
  }

  if (scratch.width !== img.width || scratch.height !== img.height) {
    scratch.width = img.width
    scratch.height = img.height
  }
  const rgba = compositeImage(toRaw(img), toRaw(pal))
  scratch.getContext('2d')!.putImageData(new ImageData(rgba, img.width, img.height), 0, 0)
  ctx.drawImage(scratch, 0, 0, img.width, img.height, 0, 0, c.width, c.height)
}

onMounted(render)
watch(
  () => [props.imageId, props.previewZoom, settings.previewBackground, settings.previewBackgroundColor],
  render,
  { flush: 'post' },
)
</script>

<template>
  <canvas ref="canvas" class="flash-canvas" />
</template>

<style scoped>
.flash-canvas {
  display: block;
  image-rendering: pixelated;
}
</style>
