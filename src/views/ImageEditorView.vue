<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppSidebar from '../components/ui/AppSidebar.vue'
import AppButton from '../components/ui/AppButton.vue'
import CanvasEditor from '../components/canvas/CanvasEditor.vue'
import LayerPanel from '../components/layers/LayerPanel.vue'
import NewImageDialog from '../components/canvas/NewImageDialog.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import ImagePicker from '../components/ui/ImagePicker.vue'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'
import { exportImageAsPNG, downloadBlob } from '../storage/fileIO'
import { canRemoveImage } from '../domain/spriteOps'
import { compositeImage } from '../domain/color'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()

const images = computed(() => project.project?.images ?? [])
const activeImage = computed(() => editor.activeImageId ? project.getImage(editor.activeImageId) ?? null : null)

const showNewImageDialog = ref(false)
const showImagePicker = ref(false)
const imageToRemoveId = ref<string | null>(null)
const imageToRemoveName = computed(() => imageToRemoveId.value ? (project.getImage(imageToRemoveId.value)?.name ?? '') : '')
const removeImageBlockers = ref<string[]>([])

const thumbCanvas = ref<HTMLCanvasElement | null>(null)

function renderThumb() {
  const canvas = thumbCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, 24, 24)
  const img = activeImage.value
  if (!img) return
  const palette = project.getPalette(img.paletteId)
  if (!palette) return
  const rgba = compositeImage(img, palette)
  const offscreen = document.createElement('canvas')
  offscreen.width = img.width
  offscreen.height = img.height
  offscreen.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0)
  ctx.imageSmoothingEnabled = false
  const scale = Math.min(24 / img.width, 24 / img.height)
  const dw = Math.round(img.width * scale)
  const dh = Math.round(img.height * scale)
  ctx.drawImage(offscreen, 0, 0, img.width, img.height, Math.round((24 - dw) / 2), Math.round((24 - dh) / 2), dw, dh)
}

watch([() => activeImage.value?.id, thumbCanvas], renderThumb)

watch(() => editor.activeImageId, (id) => {
  history.setActiveImage(id)
  if (id) {
    const img = project.getImage(id)
    if (img && img.layers.length > 0) {
      const hasLayer = img.layers.some(l => l.id === editor.activeLayerId)
      if (!hasLayer) editor.setActiveLayer(img.layers[img.layers.length - 1].id)
    }
  }
}, { immediate: true })

function onNewImage(name: string, width: number, height: number) {
  showNewImageDialog.value = false
  const img = project.addImage(width, height, name)
  if (!img) return
  editor.setActiveImage(img.id, img.layers[0].id, img.paletteId)
}

function selectImage(id: string) {
  const img = project.getImage(id)
  if (!img) return
  editor.setActiveImage(img.id, img.layers[img.layers.length - 1].id, img.paletteId)
}

function requestRemoveImage(id: string) {
  const sprites = project.project?.sprites ?? []
  const blockers = canRemoveImage(sprites, id)
  if (blockers.length > 0) {
    removeImageBlockers.value = blockers
  } else {
    imageToRemoveId.value = id
  }
}

function confirmRemoveImage() {
  const id = imageToRemoveId.value
  if (!id) return
  const imgs = images.value
  const idx = imgs.findIndex(img => img.id === id)
  const sibling = imgs[idx + 1] ?? imgs[idx - 1] ?? null
  history.clearFor(id)
  project.removeImage(id)
  if (sibling) selectImage(sibling.id)
  else editor.clearActiveImage()
  imageToRemoveId.value = null
}

function onPickerSelect(ids: string[]) {
  showImagePicker.value = false
  if (ids[0]) selectImage(ids[0])
}

async function exportPNG() {
  const img = activeImage.value
  if (!img) return
  const palette = project.getPalette(img.paletteId)
  if (!palette) return
  const blob = await exportImageAsPNG(img, palette)
  downloadBlob(blob, `${img.name}.png`)
}
</script>

<template>
  <div class="image-editor-view">
    <AppSidebar />
    <div class="editor-main">
    <div class="image-toolbar">
      <AppButton size="compact" @click="showNewImageDialog = true">+ New Image</AppButton>
      <AppButton size="compact" :disabled="!activeImage" @click="exportPNG">Export PNG</AppButton>
      <button
        class="image-indicator"
        :class="{ empty: !activeImage }"
        :disabled="!project.hasProject"
        title="Browse images"
        @click="showImagePicker = true"
      >
        <canvas ref="thumbCanvas" width="24" height="24" class="indicator-thumb" />
        <span class="indicator-name">
          {{ activeImage ? `${activeImage.name} (${activeImage.width}×${activeImage.height})` : 'No image' }}
        </span>
        <span class="indicator-chevron">▾</span>
      </button>
      <button
        v-if="activeImage"
        class="indicator-remove"
        title="Remove active image"
        @click="requestRemoveImage(activeImage.id)"
      >×</button>
    </div>

    <div class="editor-area">
      <template v-if="activeImage">
        <CanvasEditor :image-id="activeImage.id" />
        <LayerPanel />
      </template>
      <div v-else-if="!project.hasProject" class="empty-state">
        <p>No project open.</p>
        <AppButton size="compact" @click="project.newProject()">New Project</AppButton>
      </div>
      <div v-else class="empty-state">
        <p>No image — create one to start drawing.</p>
        <AppButton size="compact" @click="showNewImageDialog = true">+ New Image</AppButton>
      </div>
    </div>

    </div> <!-- editor-main -->
    <NewImageDialog
      :open="showNewImageDialog"
      @confirm="onNewImage"
      @cancel="showNewImageDialog = false"
    />
    <ConfirmDialog
      :open="imageToRemoveId !== null"
      title="Remove Image"
      :message="`Remove '${imageToRemoveName}'? This cannot be undone.`"
      confirm-label="Remove"
      @confirm="confirmRemoveImage"
      @cancel="imageToRemoveId = null"
    />
    <ConfirmDialog
      :open="removeImageBlockers.length > 0"
      title="Cannot Remove Image"
      :message="`This image is used by: ${removeImageBlockers.join(', ')}. Remove all references before deleting.`"
      confirm-label="OK"
      @confirm="removeImageBlockers = []"
      @cancel="removeImageBlockers = []"
    />
    <ImagePicker
      :open="showImagePicker"
      title="Select Image"
      mode="single"
      @confirm="onPickerSelect"
      @cancel="showImagePicker = false"
    />
  </div>
</template>

<style scoped>
.image-editor-view {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

.editor-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.image-toolbar {
  display: flex;
  align-items: center;
  gap: var(--rd-space-4);
  padding: var(--rd-space-2) var(--rd-space-4);
  background: var(--rd-color-surface-1);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}


.image-indicator {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
  padding: var(--rd-space-1) var(--rd-space-3);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  cursor: pointer;
  min-width: 140px;
  max-width: 260px;
}
.image-indicator:hover:not(:disabled) { background: var(--rd-color-surface-4); border-color: var(--rd-color-border-hover); }
.image-indicator:disabled { opacity: 0.5; cursor: default; }
.image-indicator.empty { color: var(--rd-color-text-muted); }

.indicator-thumb {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  background: var(--rd-color-surface-1);
  border-radius: var(--rd-radius-1);
  flex-shrink: 0;
}

.indicator-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.indicator-chevron {
  font-size: 10px;
  opacity: 0.6;
  flex-shrink: 0;
}

.indicator-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-14);
  line-height: 1;
  cursor: pointer;
}
.indicator-remove:hover { background: var(--rd-color-surface-3); color: var(--rd-color-danger); }

.editor-area { display: flex; flex: 1; overflow: hidden; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--rd-space-6);
  color: var(--rd-color-text-muted);
}
</style>
