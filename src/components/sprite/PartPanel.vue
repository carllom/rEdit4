<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppButton from '../ui/AppButton.vue'
import NumericInput from '../ui/NumericInput.vue'
import ImagePicker from '../ui/ImagePicker.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useSpriteHistoryStore } from '../../stores/spriteHistoryStore'
import { addPart, removePart, reorderPart, renamePart, movePart } from '../../domain/spriteOps'
import type { Point } from '../../domain/model'

const props = defineProps<{ spriteId: string }>()

const project = useProjectStore()
const editor = useEditorStore()
const spriteHist = useSpriteHistoryStore()

const sprite = computed(() => project.getSprite(props.spriteId))
const parts = computed(() => sprite.value?.parts ?? [])

const selectedPart = computed(() => {
  const idx = editor.activePartIndex
  if (idx === null || !sprite.value) return null
  return sprite.value.parts[idx] ?? null
})

const imgNameMap = computed(() => {
  const m = new Map<string, string>()
  for (const img of project.project?.images ?? []) m.set(img.id, img.name)
  return m
})

function partDisplayName(idx: number): string {
  const part = parts.value[idx]
  if (!part) return ''
  return part.name?.trim() || imgNameMap.value.get(part.imageId) || `Part ${idx + 1}`
}

// --- Sprite name rename ---
const editingSpriteName = ref(false)
const spriteNameDraft = ref('')

function beginRenameSprite() {
  spriteNameDraft.value = sprite.value?.name ?? ''
  editingSpriteName.value = true
}
function commitRenameSprite() {
  editingSpriteName.value = false
  const spr = sprite.value
  if (!spr) return
  const newName = spriteNameDraft.value.trim() || spr.name
  if (newName === spr.name) return
  spriteHist.push(props.spriteId, { type: 'rename-sprite', oldName: spr.name, newName })
  spr.name = newName
  project.markDirty()
}

// --- Part name rename ---
const editingPartIdx = ref<number | null>(null)
const partNameDraft = ref('')

function beginRenamePart(idx: number) {
  editingPartIdx.value = idx
  partNameDraft.value = parts.value[idx]?.name ?? ''
}
function commitRenamePart() {
  const idx = editingPartIdx.value
  editingPartIdx.value = null
  const spr = sprite.value
  if (idx === null || !spr) return
  const oldName = spr.parts[idx]?.name
  const newName = partNameDraft.value.trim() || undefined
  if (oldName === newName) return
  spriteHist.push(props.spriteId, { type: 'rename-part', partIndex: idx, oldName, newName })
  spr.parts = renamePart(spr.parts, idx, newName)
  project.markDirty()
}

// --- Part position ---
const partPosBefore = ref<Point | null>(null)

watch(() => editor.activePartIndex, () => { partPosBefore.value = null })

const partX = computed({
  get() { return selectedPart.value?.position.x ?? 0 },
  set(v: number) {
    const idx = editor.activePartIndex
    const spr = sprite.value
    if (idx === null || !spr || !spr.parts[idx]) return
    if (partPosBefore.value === null) partPosBefore.value = { ...spr.parts[idx].position }
    spr.parts = movePart(spr.parts, idx, { x: v, y: spr.parts[idx].position.y })
    project.markDirty()
  },
})
const partY = computed({
  get() { return selectedPart.value?.position.y ?? 0 },
  set(v: number) {
    const idx = editor.activePartIndex
    const spr = sprite.value
    if (idx === null || !spr || !spr.parts[idx]) return
    if (partPosBefore.value === null) partPosBefore.value = { ...spr.parts[idx].position }
    spr.parts = movePart(spr.parts, idx, { x: spr.parts[idx].position.x, y: v })
    project.markDirty()
  },
})

function commitPartPos() {
  const idx = editor.activePartIndex
  const spr = sprite.value
  const before = partPosBefore.value
  partPosBefore.value = null
  if (before === null || idx === null || !spr || !spr.parts[idx]) return
  const newPosition = { ...spr.parts[idx].position }
  if (before.x === newPosition.x && before.y === newPosition.y) return
  spriteHist.push(props.spriteId, { type: 'move-part', partIndex: idx, oldPosition: before, newPosition })
}

// --- Anchor position ---
const anchorPosBefore = ref<Point | null>(null)

const anchorX = computed({
  get() { return sprite.value?.anchor.x ?? 0 },
  set(v: number) {
    const spr = sprite.value
    if (!spr) return
    if (anchorPosBefore.value === null) anchorPosBefore.value = { ...spr.anchor }
    spr.anchor = { x: v, y: spr.anchor.y }
    project.markDirty()
  },
})
const anchorY = computed({
  get() { return sprite.value?.anchor.y ?? 0 },
  set(v: number) {
    const spr = sprite.value
    if (!spr) return
    if (anchorPosBefore.value === null) anchorPosBefore.value = { ...spr.anchor }
    spr.anchor = { x: spr.anchor.x, y: v }
    project.markDirty()
  },
})

function commitAnchorPos() {
  const spr = sprite.value
  const before = anchorPosBefore.value
  anchorPosBefore.value = null
  if (before === null || !spr) return
  const newAnchor = { ...spr.anchor }
  if (before.x === newAnchor.x && before.y === newAnchor.y) return
  spriteHist.push(props.spriteId, { type: 'move-anchor', oldAnchor: before, newAnchor })
}

// --- Add Part ---
const showPicker = ref(false)

function onPickerConfirm(ids: string[]) {
  showPicker.value = false
  const spr = sprite.value
  if (!spr || !ids[0]) return
  const insertIndex = spr.parts.length
  const newParts = addPart(spr.parts, ids[0])
  const newPart = newParts[insertIndex]
  spriteHist.push(props.spriteId, { type: 'add-part', part: { ...newPart }, insertIndex })
  spr.parts = newParts
  editor.setActivePartIndex(insertIndex)
  project.markDirty()
}

// --- Remove Part ---
function removeSelectedPart() {
  const idx = editor.activePartIndex
  const spr = sprite.value
  if (idx === null || !spr || idx >= spr.parts.length) return
  const part = { ...spr.parts[idx] }
  spriteHist.push(props.spriteId, { type: 'remove-part', part, removedIndex: idx })
  spr.parts = removePart(spr.parts, idx)
  // Select adjacent part or deselect
  const newLen = spr.parts.length
  editor.setActivePartIndex(newLen === 0 ? null : Math.min(idx, newLen - 1))
  project.markDirty()
}

function removePartAt(idx: number) {
  const spr = sprite.value
  if (!spr) return
  const part = { ...spr.parts[idx] }
  spriteHist.push(props.spriteId, { type: 'remove-part', part, removedIndex: idx })
  spr.parts = removePart(spr.parts, idx)
  const newLen = spr.parts.length
  const active = editor.activePartIndex
  if (active === null) return
  if (active === idx) editor.setActivePartIndex(newLen === 0 ? null : Math.min(idx, newLen - 1))
  else if (active > idx) editor.setActivePartIndex(active - 1)
  project.markDirty()
}

// --- Drag reorder ---
let dragSourceIdx = -1

function onDragStart(e: DragEvent, idx: number) {
  dragSourceIdx = idx
  e.dataTransfer!.effectAllowed = 'move'
}
function onDragOver(e: DragEvent, idx: number) {
  if (dragSourceIdx === -1 || dragSourceIdx === idx) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
}
function onDrop(e: DragEvent, idx: number) {
  e.preventDefault()
  const from = dragSourceIdx
  dragSourceIdx = -1
  if (from === -1 || from === idx) return
  const spr = sprite.value
  if (!spr) return
  spriteHist.push(props.spriteId, { type: 'reorder-part', fromIdx: from, toIdx: idx })
  spr.parts = reorderPart(spr.parts, from, idx)
  // Keep selection on the moved part
  if (editor.activePartIndex === from) editor.setActivePartIndex(idx)
  project.markDirty()
}
function onDragEnd() { dragSourceIdx = -1 }

// Expose remove for keyboard Delete in parent
defineExpose({ removeSelectedPart })
</script>

<template>
  <aside class="part-panel" @keydown.delete.prevent="removeSelectedPart" @keydown.backspace.prevent="removeSelectedPart">
    <!-- Sprite name -->
    <div class="panel-section">
      <div class="field-label">Sprite</div>
      <input
        v-if="editingSpriteName"
        v-model="spriteNameDraft"
        class="inline-input"
        autofocus
        @blur="commitRenameSprite"
        @keydown.enter.prevent="commitRenameSprite"
        @keydown.escape.prevent="editingSpriteName = false"
      />
      <div v-else class="field-value editable" @dblclick="beginRenameSprite" :title="'Double-click to rename'">
        {{ sprite?.name ?? '—' }}
      </div>
    </div>

    <!-- Anchor coords -->
    <div class="panel-section">
      <div class="field-label">Anchor</div>
      <div class="coord-row">
        <span class="coord-axis">X</span>
        <NumericInput
          class="coord-input"
          :min="-9999" :max="9999"
          :modelValue="anchorX"
          @update:modelValue="v => anchorX = v"
          @pointerup="commitAnchorPos"
          @change="commitAnchorPos"
        />
        <span class="coord-axis">Y</span>
        <NumericInput
          class="coord-input"
          :min="-9999" :max="9999"
          :modelValue="anchorY"
          @update:modelValue="v => anchorY = v"
          @pointerup="commitAnchorPos"
          @change="commitAnchorPos"
        />
      </div>
    </div>

    <!-- Part position (visible when a part is selected) -->
    <div v-if="selectedPart" class="panel-section">
      <div class="field-label">Position</div>
      <div class="coord-row">
        <span class="coord-axis">X</span>
        <NumericInput
          class="coord-input"
          :min="-9999" :max="9999"
          :modelValue="partX"
          @update:modelValue="v => partX = v"
          @pointerup="commitPartPos"
          @change="commitPartPos"
        />
        <span class="coord-axis">Y</span>
        <NumericInput
          class="coord-input"
          :min="-9999" :max="9999"
          :modelValue="partY"
          @update:modelValue="v => partY = v"
          @pointerup="commitPartPos"
          @change="commitPartPos"
        />
      </div>
    </div>

    <!-- Part list -->
    <div class="panel-section parts-section">
      <div class="parts-header">
        <span class="field-label">Parts</span>
        <AppButton size="compact" variant="accent" @click="showPicker = true">+ Add</AppButton>
      </div>

      <div class="parts-list">
        <div v-if="parts.length === 0" class="empty-parts">No parts</div>
        <div
          v-for="(part, idx) in parts"
          :key="idx"
          :class="['part-row', { active: editor.activePartIndex === idx }]"
          draggable="true"
          @click="editor.setActivePartIndex(idx)"
          @dragstart="(e) => onDragStart(e, idx)"
          @dragover="(e) => onDragOver(e, idx)"
          @drop="(e) => onDrop(e, idx)"
          @dragend="onDragEnd"
        >
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <div class="part-name-wrap">
            <input
              v-if="editingPartIdx === idx"
              v-model="partNameDraft"
              class="inline-input"
              autofocus
              @blur="commitRenamePart"
              @keydown.enter.prevent="commitRenamePart"
              @keydown.escape.prevent="editingPartIdx = null"
              @click.stop
            />
            <span v-else class="part-name" @dblclick.stop="beginRenamePart(idx)">
              {{ partDisplayName(idx) }}
            </span>
          </div>
          <button class="part-remove" title="Remove part" @click.stop="removePartAt(idx)">×</button>
        </div>
      </div>
    </div>

    <ImagePicker
      :open="showPicker"
      title="Add Part — Select Image"
      mode="single"
      @confirm="onPickerConfirm"
      @cancel="showPicker = false"
    />
  </aside>
</template>

<style scoped>
.part-panel {
  width: 200px;
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  border-left: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-section {
  padding: var(--rd-space-4) var(--rd-space-5);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
}

.field-label {
  font-size: var(--rd-text-10);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-value {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text);
  padding: var(--rd-space-1) 0;
}
.field-value.editable:hover { color: var(--rd-color-accent); cursor: text; }

.inline-input {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-accent);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  padding: 2px var(--rd-space-2);
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.coord-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
}
.coord-axis { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }
:deep(.coord-input) {
  width: 52px;
}

.parts-section { flex: 1; min-height: 0; }
.parts-header { display: flex; align-items: center; justify-content: space-between; }

.parts-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--rd-space-2);
  overflow-y: auto;
  max-height: 340px;
}

.empty-parts {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  padding: var(--rd-space-3) 0;
}

.part-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
  padding: var(--rd-space-1) var(--rd-space-2);
  border-radius: var(--rd-radius-1);
  border: var(--rd-border-w) solid transparent;
  cursor: pointer;
  font-size: var(--rd-text-11);
}
.part-row:hover { background: var(--rd-color-surface-3); }
.part-row.active {
  background: var(--rd-color-surface-3);
  border-color: var(--rd-color-accent);
}

.drag-handle {
  color: var(--rd-color-text-muted);
  font-size: 12px;
  cursor: grab;
  flex-shrink: 0;
  opacity: 0.5;
}
.part-row:hover .drag-handle { opacity: 1; }

.part-name-wrap { flex: 1; min-width: 0; }
.part-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--rd-color-text);
}
.part-name:hover { color: var(--rd-color-accent); cursor: text; }

.part-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  color: var(--rd-color-text-muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  border-radius: var(--rd-radius-1);
  flex-shrink: 0;
}
.part-row:hover .part-remove { opacity: 1; }
.part-remove:hover { background: var(--rd-color-surface-2); color: var(--rd-color-danger); }
</style>
