<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CanvasEditor from '../components/canvas/CanvasEditor.vue'
import LayerPanel from '../components/layers/LayerPanel.vue'
import NewImageDialog from '../components/canvas/NewImageDialog.vue'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()

const images = computed(() => project.project?.images ?? [])
const activeImage = computed(() => editor.activeImageId ? project.getImage(editor.activeImageId) ?? null : null)

const showNewImageDialog = ref(false)

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
</script>

<template>
  <div class="image-editor-view">
    <div class="image-toolbar">
      <button class="toolbar-btn" @click="showNewImageDialog = true">+ New Image</button>
      <div class="image-tabs">
        <button
          v-for="img in images"
          :key="img.id"
          :class="['image-tab', { active: editor.activeImageId === img.id }]"
          @click="selectImage(img.id)"
        >
          {{ img.name }} ({{ img.width }}×{{ img.height }})
        </button>
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

    <NewImageDialog
      :open="showNewImageDialog"
      @confirm="onNewImage"
      @cancel="showNewImageDialog = false"
    />
  </div>
</template>

<style scoped>
.image-editor-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.image-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toolbar-btn {
  padding: 3px 10px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}
.toolbar-btn:hover { background: var(--color-surface-3); }

.image-tabs { display: flex; gap: 2px; overflow-x: auto; }

.image-tab {
  padding: 3px 10px;
  background: none;
  border: 1px solid transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 11px;
  border-radius: 3px 3px 0 0;
  white-space: nowrap;
}
.image-tab:hover { color: var(--color-text); background: var(--color-surface-2); }
.image-tab.active { color: var(--color-text); background: var(--color-surface-2); border-color: var(--color-border); }

.editor-area { display: flex; flex: 1; overflow: hidden; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-muted);
}
</style>
