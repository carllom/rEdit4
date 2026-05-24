<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { makeLayer } from '../../domain/color'
import type { Layer } from '../../domain/model'

const project = useProjectStore()
const editor = useEditorStore()

const image = computed(() => {
  if (!editor.activeImageId) return null
  return project.getImage(editor.activeImageId) ?? null
})

// Layers displayed top-to-bottom (topmost layer first)
const displayLayers = computed(() => image.value ? [...image.value.layers].reverse() : [])

// --- Rename ---
const renamingId = ref<string | null>(null)

function startRename(layer: Layer) { renamingId.value = layer.id }

// After DOM updates, focus+select the rename input (only one exists at a time)
watch(renamingId, (id) => {
  if (!id) return
  document.querySelector<HTMLInputElement>('.rename-input')?.select()
}, { flush: 'post' })

function commitRename(layer: Layer, value: string) {
  layer.name = value.trim() || layer.name
  renamingId.value = null
  project.markDirty()
}

function cancelRename() { renamingId.value = null }

// --- Opacity ---
function setOpacity(layer: Layer, value: number) {
  layer.opacity = Math.max(0, Math.min(1, value / 100))
  project.markDirty()
}

// --- Add / remove / reorder ---
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

// direction: 1 = move up visually (increase index in array), -1 = move down
function moveLayer(layerId: string, direction: 1 | -1) {
  if (!image.value) return
  const layers = image.value.layers
  const idx = layers.findIndex(l => l.id === layerId)
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= layers.length) return
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
      <div
        v-for="layer in displayLayers"
        :key="layer.id"
        :class="['layer-row', { active: editor.activeLayerId === layer.id }]"
        @click="editor.setActiveLayer(layer.id)"
      >
        <!-- Visibility toggle -->
        <button
          class="vis-btn"
          :title="layer.visible ? 'Hide' : 'Show'"
          @click.stop="layer.visible = !layer.visible; project.markDirty()"
        >{{ layer.visible ? '●' : '○' }}</button>

        <!-- Name — static or rename input -->
        <span
          v-if="renamingId !== layer.id"
          class="layer-name"
          @dblclick.stop="startRename(layer)"
        >{{ layer.name }}</span>
        <input
          v-else
          class="rename-input"
          :value="layer.name"
          @blur="commitRename(layer, ($event.target as HTMLInputElement).value)"
          @keydown.enter="commitRename(layer, ($event.target as HTMLInputElement).value)"
          @keydown.escape="cancelRename"
          @click.stop
        />

        <!-- Opacity -->
        <input
          class="opacity-input"
          type="number"
          min="0"
          max="100"
          :value="Math.round(layer.opacity * 100)"
          title="Opacity %"
          @input.stop="setOpacity(layer, +($event.target as HTMLInputElement).value)"
          @click.stop
        />
        <span class="opacity-pct">%</span>

        <!-- Reorder / delete -->
        <div class="layer-actions">
          <button class="icon-btn" title="Move up" @click.stop="moveLayer(layer.id, 1)">↑</button>
          <button class="icon-btn" title="Move down" @click.stop="moveLayer(layer.id, -1)">↓</button>
          <button class="icon-btn danger" title="Delete" @click.stop="removeLayer(layer.id)">×</button>
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
  width: 240px;
  min-width: 240px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 4px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.layer-list { flex: 1; overflow-y: auto; }

.layer-row {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  cursor: pointer;
  border-left: 2px solid transparent;
  min-height: 28px;
}
.layer-row:hover { background: var(--color-surface-2); }
.layer-row.active { background: var(--color-surface-2); border-left-color: var(--color-accent); }

.vis-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 0 2px;
  width: 14px;
  flex-shrink: 0;
}

.layer-name {
  flex: 1;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.rename-input {
  flex: 1;
  background: var(--color-surface-3);
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  color: var(--color-text);
  font-size: 11px;
  padding: 1px 4px;
  outline: none;
  min-width: 0;
}

.opacity-input {
  width: 46px;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  color: var(--color-text);
  font-size: 10px;
  padding: 1px 3px;
  text-align: right;
  outline: none;
  flex-shrink: 0;
}
.opacity-input:focus { border-color: var(--color-accent); }

.opacity-pct {
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.layer-actions { display: flex; gap: 1px; opacity: 0; flex-shrink: 0; }
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

.no-image { padding: 12px 8px; color: var(--color-text-muted); font-size: 11px; }
</style>
