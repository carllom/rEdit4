<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { Download, Eye, EyeOff } from '@lucide/vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { makeLayer } from '../../domain/color'
import { exportLayerAsPNG, downloadBlob } from '../../storage/fileIO'
import type { Layer } from '../../domain/model'
import NumericInput from '../ui/NumericInput.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'

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

// --- Add / remove ---
function addLayer() {
  if (!image.value) return
  const { width, height } = image.value
  const layer = makeLayer(width, height, `Layer ${image.value.layers.length + 1}`)
  image.value.layers.push(layer)
  editor.setActiveLayer(layer.id)
  project.markDirty()
}

const layerToRemoveId = ref<string | null>(null)
const layerToRemoveName = computed(() =>
  image.value?.layers.find(l => l.id === layerToRemoveId.value)?.name ?? ''
)

function removeLayer(layerId: string) {
  if (!image.value || image.value.layers.length <= 1) return
  const idx = image.value.layers.findIndex(l => l.id === layerId)
  if (idx === -1) return
  image.value.layers.splice(idx, 1)
  const newActive = image.value.layers[Math.min(idx, image.value.layers.length - 1)]
  editor.setActiveLayer(newActive.id)
  project.markDirty()
}

function confirmRemoveLayer() {
  if (layerToRemoveId.value) removeLayer(layerToRemoveId.value)
  layerToRemoveId.value = null
}

async function exportLayer(layer: Layer) {
  const img = image.value
  if (!img) return
  const palette = project.getPalette(img.paletteId)
  if (!palette) return
  const idx = img.layers.indexOf(layer)
  if (idx === -1) return
  const blob = await exportLayerAsPNG(img, idx, palette)
  downloadBlob(blob, `${img.name}_${layer.name}.png`)
}

// --- Drag reorder ---
const listEl = ref<HTMLElement | null>(null)
const dragLayerId = ref<string | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(e: PointerEvent, layer: Layer) {
  e.preventDefault()
  dragLayerId.value = layer.id
  dragOverIndex.value = displayLayers.value.findIndex(l => l.id === layer.id)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd, { once: true })
  window.addEventListener('pointercancel', onDragCancel, { once: true })
}

function onDragMove(e: PointerEvent) {
  if (!listEl.value || !dragLayerId.value) return
  const rows = listEl.value.querySelectorAll<HTMLElement>('.layer-row')
  let insertIndex = displayLayers.value.length
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i].getBoundingClientRect()
    if (e.clientY < rect.top + rect.height / 2) {
      insertIndex = i
      break
    }
  }
  dragOverIndex.value = insertIndex
}

function onDragEnd() {
  window.removeEventListener('pointermove', onDragMove)
  const img = image.value
  if (img && dragLayerId.value && dragOverIndex.value !== null) {
    const fromDisplayIdx = displayLayers.value.findIndex(l => l.id === dragLayerId.value)
    const di = dragOverIndex.value
    // di === fromDisplayIdx or fromDisplayIdx+1 means no movement
    if (fromDisplayIdx !== -1 && di !== fromDisplayIdx && di !== fromDisplayIdx + 1) {
      const n = img.layers.length
      const fromInternal = n - 1 - fromDisplayIdx
      const targetDisplayIdx = di <= fromDisplayIdx ? di : di - 1
      const toInternal = n - 1 - targetDisplayIdx
      project.reorderLayer(img.id, fromInternal, toInternal)
    }
  }
  dragLayerId.value = null
  dragOverIndex.value = null
}

function onDragCancel() {
  window.removeEventListener('pointermove', onDragMove)
  dragLayerId.value = null
  dragOverIndex.value = null
}

onUnmounted(() => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragCancel)
})
</script>

<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span class="section-label">Layers</span>
      <button class="icon-btn" title="Add layer" @click="addLayer">+</button>
    </div>

    <div v-if="image" class="layer-list" ref="listEl">
      <template v-for="(layer, i) in displayLayers" :key="layer.id">
        <div class="drop-line" :class="{ active: dragLayerId && dragOverIndex === i }" />
        <div
          :class="['layer-row', { active: editor.activeLayerId === layer.id, dragging: dragLayerId === layer.id }]"
          @click="editor.setActiveLayer(layer.id)"
        >
          <!-- Drag handle -->
          <span
            class="drag-handle"
            title="Drag to reorder"
            @pointerdown.stop="onDragStart($event, layer)"
          >⠿</span>

          <!-- Visibility toggle -->
          <button
            class="vis-btn"
            :title="layer.visible ? 'Hide' : 'Show'"
            @click.stop="layer.visible = !layer.visible; project.markDirty()"
          ><Eye v-if="layer.visible" :size="12" /><EyeOff v-else :size="12" /></button>

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
          <NumericInput
            class="opacity-input"
            :min="0"
            :max="100"
            :modelValue="Math.round(layer.opacity * 100)"
            title="Opacity %"
            @update:modelValue="v => setOpacity(layer, v)"
            @click.stop
            @pointerdown.stop
          />
          <span class="opacity-pct">%</span>

          <!-- Actions -->
          <div class="layer-actions">
            <button class="icon-btn" title="Export layer as PNG" @click.stop="exportLayer(layer)"><Download :size="12" /></button>
            <button class="icon-btn danger" title="Delete" @click.stop="layerToRemoveId = layer.id">×</button>
          </div>
        </div>
      </template>
      <div class="drop-line" :class="{ active: dragLayerId && dragOverIndex === displayLayers.length }" />
    </div>

    <div v-else class="no-image">No image selected</div>

    <ConfirmDialog
      :open="layerToRemoveId !== null"
      title="Delete Layer"
      :message="`Delete '${layerToRemoveName}'? This cannot be undone.`"
      confirm-label="Delete"
      @confirm="confirmRemoveLayer"
      @cancel="layerToRemoveId = null"
    />
  </div>
</template>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  width: var(--rd-sidebar-w);
  min-width: var(--rd-sidebar-w);
  background: var(--rd-color-surface-1);
  border-left: var(--rd-border-w) solid var(--rd-color-border);
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--rd-space-3) var(--rd-space-4) var(--rd-space-2);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

.section-label {
  font-size: var(--rd-text-10);
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
  color: var(--rd-color-text-muted);
}

.layer-list { flex: 1; overflow-y: auto; }

.drop-line {
  height: 0;
  margin: 0;
  background: transparent;
  flex-shrink: 0;
  pointer-events: none;
}
.drop-line.active {
  height: var(--rd-border-w-active);
  background: var(--rd-color-accent);
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: var(--rd-space-2) var(--rd-space-3);
  cursor: pointer;
  border-left: var(--rd-border-w-active) solid transparent;
  min-height: 28px;
}
.layer-row:hover { background: var(--rd-color-surface-2); }
.layer-row.active { background: var(--rd-color-surface-2); border-left-color: var(--rd-color-accent); }
.layer-row.dragging { opacity: 0.4; }

.drag-handle {
  color: var(--rd-color-text-muted);
  cursor: grab;
  font-size: var(--rd-text-12);
  padding: 0 1px;
  flex-shrink: 0;
  opacity: 0;
  user-select: none;
  line-height: 1;
}
.layer-row:hover .drag-handle { opacity: 1; }
.layer-row.dragging .drag-handle { cursor: grabbing; }

.vis-btn {
  background: none;
  border: none;
  color: var(--rd-color-text-muted);
  cursor: pointer;
  font-size: var(--rd-text-10);
  padding: 0 var(--rd-space-1);
  width: 14px;
  flex-shrink: 0;
}

.layer-name {
  flex: 1;
  font-size: var(--rd-text-11);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.rename-input {
  flex: 1;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-accent);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  padding: 1px 4px;
  outline: none;
  min-width: 0;
}

.opacity-input {
  width: 46px;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-10);
  padding: 1px 3px;
  text-align: right;
  outline: none;
  flex-shrink: 0;
  font-family: var(--rd-font-mono);
  font-variant-numeric: tabular-nums;
}
.opacity-input:focus { border-color: var(--rd-color-accent); }

.opacity-pct {
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  flex-shrink: 0;
}

.layer-actions { display: flex; gap: 1px; opacity: 0; flex-shrink: 0; }
.layer-row:hover .layer-actions { opacity: 1; }

.icon-btn {
  background: none;
  border: none;
  color: var(--rd-color-text-muted);
  cursor: pointer;
  font-size: var(--rd-text-12);
  padding: 0 3px;
  border-radius: var(--rd-radius-1);
}
.icon-btn:hover { color: var(--rd-color-text); background: var(--rd-color-surface-3); }
.icon-btn.danger:hover { color: var(--rd-color-danger); }

.no-image { padding: var(--rd-space-6) var(--rd-space-4); color: var(--rd-color-text-muted); font-size: var(--rd-text-11); }
</style>
