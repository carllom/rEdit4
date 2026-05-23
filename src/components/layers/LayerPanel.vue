<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { makeLayer } from '../../domain/color'

const project = useProjectStore()
const editor = useEditorStore()

const image = computed(() => {
  if (!editor.activeImageId) return null
  return project.getImage(editor.activeImageId) ?? null
})

function addLayer() {
  if (!image.value) return
  const { width, height } = image.value
  const layer = makeLayer(width, height, `Layer ${image.value.layers.length + 1}`)
  image.value.layers.push(layer)
  editor.setActiveLayer(layer.id)
  project.markDirty()
}

function removeLayer(layerId: string) {
  if (!image.value || image.value.layers.length <= 1) return
  const idx = image.value.layers.findIndex(l => l.id === layerId)
  if (idx === -1) return
  image.value.layers.splice(idx, 1)
  const newActive = image.value.layers[Math.min(idx, image.value.layers.length - 1)]
  editor.setActiveLayer(newActive.id)
  project.markDirty()
}

function moveLayer(layerId: string, direction: -1 | 1) {
  if (!image.value) return
  const idx = image.value.layers.findIndex(l => l.id === layerId)
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= image.value.layers.length) return
  const layers = image.value.layers
  ;[layers[idx], layers[newIdx]] = [layers[newIdx], layers[idx]]
  project.markDirty()
}
</script>

<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span class="section-label">Layers</span>
      <button class="icon-btn" title="Add layer" @click="addLayer">+</button>
    </div>
    <div v-if="image" class="layer-list">
      <!-- Layers shown top-to-bottom = visually top layer first -->
      <div
        v-for="layer in [...image.layers].reverse()"
        :key="layer.id"
        :class="['layer-row', { active: editor.activeLayerId === layer.id }]"
        @click="editor.setActiveLayer(layer.id)"
      >
        <button
          class="vis-btn"
          :title="layer.visible ? 'Hide layer' : 'Show layer'"
          @click.stop="layer.visible = !layer.visible; project.markDirty()"
        >{{ layer.visible ? '●' : '○' }}</button>
        <span class="layer-name">{{ layer.name }}</span>
        <div class="layer-actions">
          <button class="icon-btn" title="Move up" @click.stop="moveLayer(layer.id, 1)">↑</button>
          <button class="icon-btn" title="Move down" @click.stop="moveLayer(layer.id, -1)">↓</button>
          <button class="icon-btn danger" title="Delete layer" @click.stop="removeLayer(layer.id)">×</button>
        </div>
      </div>
    </div>
    <div v-else class="no-image">No image selected</div>
  </div>
</template>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  width: 180px;
  min-width: 180px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 4px;
  border-bottom: 1px solid var(--color-border);
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.layer-list {
  flex: 1;
  overflow-y: auto;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.layer-row:hover { background: var(--color-surface-2); }
.layer-row.active {
  background: var(--color-surface-2);
  border-left-color: var(--color-accent);
}

.vis-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  width: 14px;
}

.layer-name {
  flex: 1;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
}

.layer-row:hover .layer-actions { opacity: 1; }

.icon-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 0 3px;
  border-radius: 2px;
}

.icon-btn:hover { color: var(--color-text); background: var(--color-surface-3); }
.icon-btn.danger:hover { color: var(--color-danger); }

.no-image {
  padding: 12px 8px;
  color: var(--color-text-muted);
  font-size: 11px;
}
</style>
