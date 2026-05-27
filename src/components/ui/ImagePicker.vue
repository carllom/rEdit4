<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppDialog from './AppDialog.vue'
import AppButton from './AppButton.vue'
import { groupImages } from '../../domain/imagePickerUtils'
import { compositeImage } from '../../domain/color'
import { useProjectStore } from '../../stores/projectStore'
import type { ReImage } from '../../domain/model'

const props = defineProps<{
  open: boolean
  title: string
  mode: 'single' | 'multi'
  /** Pre-selected imageIds (multi mode) */
  selected?: string[]
}>()

const emit = defineEmits<{
  confirm: [ids: string[]]
  cancel: []
}>()

const projectStore = useProjectStore()

const search = ref('')
const collapsed = ref<Set<string>>(new Set())
// null prefix encoded as '' for Set storage
const collapsedKey = (prefix: string | null) => prefix ?? ''

const selection = ref<Set<string>>(new Set(props.selected ?? []))

watch(() => props.open, (open) => {
  if (open) {
    search.value = ''
    collapsed.value = new Set()
    selection.value = new Set(props.selected ?? [])
  }
})

const images = computed<ReImage[]>(() => projectStore.project?.images ?? [])

const groups = computed(() => groupImages(images.value, search.value))

function toggleCollapse(prefix: string | null) {
  const k = collapsedKey(prefix)
  if (collapsed.value.has(k)) collapsed.value.delete(k)
  else collapsed.value.add(k)
}

function isCollapsed(prefix: string | null) {
  return collapsed.value.has(collapsedKey(prefix))
}

function toggleSelect(id: string) {
  if (props.mode === 'single') {
    emit('confirm', [id])
    return
  }
  if (selection.value.has(id)) selection.value.delete(id)
  else selection.value.add(id)
}

function confirm() {
  emit('confirm', [...selection.value])
}

function cancel() {
  emit('cancel')
}

// --- Thumbnail rendering ---
const THUMB_PX = 64

function renderThumbnail(canvas: HTMLCanvasElement, image: ReImage) {
  const project = projectStore.project
  if (!project) return
  const palette = project.palettes.find(p => p.id === image.paletteId)
  if (!palette) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rgba = compositeImage(image, palette)
  const imageData = new ImageData(rgba, image.width, image.height)

  // Draw to an offscreen canvas at native size then scale to thumb
  const offscreen = document.createElement('canvas')
  offscreen.width = image.width
  offscreen.height = image.height
  offscreen.getContext('2d')!.putImageData(imageData, 0, 0)

  ctx.clearRect(0, 0, THUMB_PX, THUMB_PX)
  ctx.imageSmoothingEnabled = false

  // Fit image inside THUMB_PX×THUMB_PX preserving aspect ratio
  const scale = Math.min(THUMB_PX / image.width, THUMB_PX / image.height)
  const dw = Math.round(image.width * scale)
  const dh = Math.round(image.height * scale)
  const dx = Math.round((THUMB_PX - dw) / 2)
  const dy = Math.round((THUMB_PX - dh) / 2)
  ctx.drawImage(offscreen, 0, 0, image.width, image.height, dx, dy, dw, dh)
}

// v-canvas directive equivalent: use a composable ref callback
function mountCanvas(el: HTMLCanvasElement | null, image: ReImage) {
  if (el) renderThumbnail(el, image)
}

// Re-render all canvases when images change
watch(images, () => {}, { deep: true })
</script>

<template>
  <AppDialog :open="open" :title="title" width="560px" @close="cancel">
    <div class="picker-body">
      <input
        v-model="search"
        class="search-input"
        type="text"
        placeholder="Search images…"
        autocomplete="off"
      />

      <div class="groups-scroll">
        <div v-if="groups.length === 0" class="empty-state">
          No images found.
        </div>

        <div v-for="group in groups" :key="group.prefix ?? '__ungrouped__'" class="group">
          <button
            class="group-header"
            @click="toggleCollapse(group.prefix)"
          >
            <span class="chevron" :class="{ collapsed: isCollapsed(group.prefix) }">▾</span>
            <span class="group-label">{{ group.prefix ?? 'Ungrouped' }}</span>
            <span class="group-count">{{ group.images.length }}</span>
          </button>

          <div v-show="!isCollapsed(group.prefix)" class="tile-grid">
            <button
              v-for="img in group.images"
              :key="img.id"
              class="tile"
              :class="{ selected: selection.has(img.id) }"
              @click="toggleSelect(img.id)"
            >
              <canvas
                :ref="(el) => mountCanvas(el as HTMLCanvasElement | null, img)"
                :width="THUMB_PX"
                :height="THUMB_PX"
                class="thumb"
              />
              <span class="tile-name">{{ img.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #actions>
      <AppButton variant="default" @click="cancel">Cancel</AppButton>
      <AppButton
        v-if="mode === 'multi'"
        variant="primary"
        :disabled="selection.size === 0"
        @click="confirm"
      >
        Confirm ({{ selection.size }})
      </AppButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.picker-body {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-4);
  min-height: 0;
}

.search-input {
  width: 100%;
  padding: var(--rd-space-3) var(--rd-space-4);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--rd-color-accent);
}

.groups-scroll {
  max-height: 380px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
}

.empty-state {
  text-align: center;
  padding: var(--rd-space-8);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-12);
}

.group {
  display: flex;
  flex-direction: column;
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
  padding: var(--rd-space-2) var(--rd-space-3);
  background: var(--rd-color-surface-3);
  border: none;
  border-radius: var(--rd-radius-2);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-11);
  font-weight: var(--rd-weight-semibold);
  text-align: left;
  cursor: pointer;
  user-select: none;
}

.group-header:hover {
  background: var(--rd-color-surface-4);
  color: var(--rd-color-text);
}

.chevron {
  display: inline-block;
  transition: transform 120ms ease;
  font-size: 10px;
  line-height: 1;
}

.chevron.collapsed {
  transform: rotate(-90deg);
}

.group-label {
  flex: 1;
}

.group-count {
  font-size: var(--rd-text-10);
  opacity: 0.6;
}

.tile-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rd-space-3);
  padding: var(--rd-space-3) var(--rd-space-2);
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--rd-space-2);
  padding: var(--rd-space-2);
  width: 84px;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  cursor: pointer;
  color: var(--rd-color-text);
}

.tile:hover {
  background: var(--rd-color-surface-4);
  border-color: var(--rd-color-border-hover);
}

.tile.selected {
  border-color: var(--rd-color-accent);
  background: color-mix(in srgb, var(--rd-color-accent) 15%, var(--rd-color-surface-3));
}

.thumb {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  background: var(--rd-color-surface-1);
  border-radius: var(--rd-radius-1);
}

.tile-name {
  font-size: var(--rd-text-10);
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
</style>
