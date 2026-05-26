<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppSidebar from '../components/ui/AppSidebar.vue'
import CanvasEditor from '../components/canvas/CanvasEditor.vue'
import LayerPanel from '../components/layers/LayerPanel.vue'
import NewImageDialog from '../components/canvas/NewImageDialog.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'
import { exportImageAsPNG, downloadBlob } from '../storage/fileIO'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()

const images = computed(() => project.project?.images ?? [])
const activeImage = computed(() => editor.activeImageId ? project.getImage(editor.activeImageId) ?? null : null)

const showNewImageDialog = ref(false)
const imageToRemoveId = ref<string | null>(null)
const imageToRemoveName = computed(() => imageToRemoveId.value ? (project.getImage(imageToRemoveId.value)?.name ?? '') : '')

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
      <button class="toolbar-btn" @click="showNewImageDialog = true">+ New Image</button>
      <button class="toolbar-btn" :disabled="!activeImage" @click="exportPNG">Export PNG</button>
      <div class="image-tabs">
        <div
          v-for="img in images"
          :key="img.id"
          :class="['image-tab', { active: editor.activeImageId === img.id }]"
          @click="selectImage(img.id)"
        >
          <span class="tab-label">{{ img.name }} ({{ img.width }}×{{ img.height }})</span>
          <button class="tab-close" title="Remove image" @click.stop="imageToRemoveId = img.id">×</button>
        </div>
      </div>
    </div>

    <div class="editor-area">
      <template v-if="activeImage">
        <CanvasEditor :image-id="activeImage.id" />
        <LayerPanel />
      </template>
      <div v-else-if="!project.hasProject" class="empty-state">
        <p>No project open.</p>
        <button class="toolbar-btn" @click="project.newProject()">New Project</button>
      </div>
      <div v-else class="empty-state">
        <p>No image — create one to start drawing.</p>
        <button class="toolbar-btn" @click="showNewImageDialog = true">+ New Image</button>
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

.toolbar-btn {
  padding: 3px var(--rd-space-5);
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  cursor: pointer;
  font-size: var(--rd-text-11);
  white-space: nowrap;
}
.toolbar-btn:hover { background: var(--rd-color-surface-3); border-color: var(--rd-color-text-muted); }
.toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.image-tabs { display: flex; gap: var(--rd-space-1); overflow-x: auto; }

.image-tab {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
  padding: 3px var(--rd-space-3) 3px var(--rd-space-5);
  background: none;
  border: var(--rd-border-w) solid transparent;
  color: var(--rd-color-text-muted);
  cursor: pointer;
  font-size: var(--rd-text-11);
  border-radius: var(--rd-radius-1) var(--rd-radius-1) 0 0;
  white-space: nowrap;
}
.image-tab:hover { color: var(--rd-color-text); background: var(--rd-color-surface-2); }
.image-tab.active { color: var(--rd-color-text); background: var(--rd-color-surface-2); border-color: var(--rd-color-border); }

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-13);
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--rd-duration-fast) var(--rd-easing-standard);
  flex-shrink: 0;
}
.image-tab:hover .tab-close { opacity: 1; }
.tab-close:hover { background: var(--rd-color-surface-3); color: var(--rd-color-danger); }

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
