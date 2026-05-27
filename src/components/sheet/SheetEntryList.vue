<script setup lang="ts">
import { ref, computed } from 'vue'

const vFocusSelect = {
  mounted(el: HTMLInputElement) { el.focus(); el.select() },
}
import { useSheetStore } from '../../stores/sheetStore'
import { useProjectStore } from '../../stores/projectStore'

const sheetStore = useSheetStore()
const projectStore = useProjectStore()

const entries = computed(() =>
  projectStore.project?.sheets.find(s => s.id === sheetStore.activeSheetId)?.entries ?? []
)

// ─── Inline rename ────────────────────────────────────────────────────────────

const editingName = ref<string | null>(null)
const editValue = ref('')

function startRename(name: string) {
  editingName.value = name
  editValue.value = name
}

function commitRename(oldName: string) {
  const newName = editValue.value.trim()
  if (newName && newName !== oldName && sheetStore.activeSheetId) {
    sheetStore.renameEntry(sheetStore.activeSheetId, oldName, newName)
  }
  editingName.value = null
}

function onRenameKeydown(e: KeyboardEvent, oldName: string) {
  if (e.key === 'Enter') { e.preventDefault(); commitRename(oldName) }
  if (e.key === 'Escape') { e.preventDefault(); editingName.value = null }
}

// ─── Row selection ────────────────────────────────────────────────────────────

function onRowClick(entryName: string) {
  if (!sheetStore.activeSheetId) return
  sheetStore.selectEntry(sheetStore.activeSheetId, entryName)
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function onCheck(entryName: string, checked: boolean) {
  const list = sheetStore.checkedEntryNames
  if (checked) {
    if (!list.includes(entryName)) list.push(entryName)
  } else {
    const idx = list.indexOf(entryName)
    if (idx >= 0) list.splice(idx, 1)
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function onDelete(entryName: string) {
  if (sheetStore.activeSheetId) {
    sheetStore.deleteEntry(sheetStore.activeSheetId, entryName)
  }
}

// ─── Drag-to-reorder ─────────────────────────────────────────────────────────

const dragFromIdx = ref<number | null>(null)
const dragOverIdx = ref<number | null>(null)

function onDragStart(e: DragEvent, idx: number) {
  dragFromIdx.value = idx
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e: DragEvent, idx: number) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverIdx.value = idx
}

function onDrop(e: DragEvent, idx: number) {
  e.preventDefault()
  if (dragFromIdx.value !== null && dragFromIdx.value !== idx && sheetStore.activeSheetId) {
    sheetStore.reorderEntry(sheetStore.activeSheetId, dragFromIdx.value, idx)
  }
  dragFromIdx.value = null
  dragOverIdx.value = null
}

function onDragEnd() {
  dragFromIdx.value = null
  dragOverIdx.value = null
}
</script>

<template>
  <div class="entry-list">
    <div class="rd-section-label list-label">Entries</div>
    <div v-if="entries.length === 0" class="empty-hint rd-caption">
      No entries yet. Accept a rect to add one.
    </div>
    <div
      v-for="(entry, idx) in entries"
      :key="entry.name"
      class="entry-row"
      :class="{
        active: sheetStore.activeEntryName === entry.name,
        'drag-over': dragOverIdx === idx && dragFromIdx !== idx,
        dragging: dragFromIdx === idx,
      }"
      draggable="true"
      @dragstart="onDragStart($event, idx)"
      @dragover="onDragOver($event, idx)"
      @drop="onDrop($event, idx)"
      @dragend="onDragEnd"
      @click.stop="onRowClick(entry.name)"
    >
      <!-- Thumbnail -->
      <div class="thumb checker">
        <img v-if="entry.thumbnail" :src="entry.thumbnail" class="thumb-img" alt="" />
      </div>

      <!-- Name + dimensions -->
      <div class="entry-info">
        <input
          v-if="editingName === entry.name"
          v-focus-select
          class="rename-input"
          v-model="editValue"
          @blur="commitRename(entry.name)"
          @keydown="onRenameKeydown($event, entry.name)"
          @click.stop
        />
        <span
          v-else
          class="entry-name"
          @dblclick.stop="startRename(entry.name)"
          @click.stop="onRowClick(entry.name)"
        >{{ entry.name }}</span>
        <span class="rd-caption">{{ entry.rect.w }}×{{ entry.rect.h }}</span>
      </div>

      <!-- Checkbox -->
      <input
        type="checkbox"
        class="entry-check"
        :checked="sheetStore.checkedEntryNames.includes(entry.name)"
        @change="onCheck(entry.name, ($event.target as HTMLInputElement).checked)"
        @click.stop
      />

      <!-- Delete (appears on row hover) -->
      <button
        class="delete-btn"
        title="Delete entry"
        @click.stop="onDelete(entry.name)"
      >×</button>
    </div>
  </div>
</template>

<style scoped>
.entry-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.list-label {
  padding: var(--rd-space-2) var(--rd-space-5) var(--rd-space-1);
  flex-shrink: 0;
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
}

.empty-hint {
  padding: var(--rd-space-5);
}

.entry-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
  padding: var(--rd-space-2) var(--rd-space-3) var(--rd-space-2) calc(var(--rd-space-3) - var(--rd-border-w-active));
  border-left: var(--rd-border-w-active) solid transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  border-top: var(--rd-border-w-active) solid transparent;
}

.entry-row:hover {
  background: var(--rd-color-surface-2);
}

.entry-row.active {
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
}

.entry-row.drag-over {
  border-top-color: var(--rd-color-accent);
}

.entry-row.dragging {
  opacity: 0.4;
}

/* Thumbnail */
.thumb {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  overflow: hidden;
}

.checker {
  background-image:
    linear-gradient(45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(-45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--rd-color-checker-light) 75%),
    linear-gradient(-45deg, transparent 75%, var(--rd-color-checker-light) 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: var(--rd-color-checker-dark);
}

.thumb-img {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  display: block;
}

/* Info column */
.entry-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: var(--rd-space-1);
}

.entry-name {
  font-size: var(--rd-text-12);
  font-weight: var(--rd-weight-medium);
  color: var(--rd-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rename-input {
  font-family: inherit;
  font-size: var(--rd-text-12);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-accent);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  padding: 1px var(--rd-space-2);
  width: 100%;
  outline: none;
}

/* Checkbox */
.entry-check {
  flex-shrink: 0;
  accent-color: var(--rd-color-accent);
  cursor: pointer;
  width: 14px;
  height: 14px;
}

/* Delete button */
.delete-btn {
  flex-shrink: 0;
  width: var(--rd-hit-sm);
  height: var(--rd-hit-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-13);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--rd-duration-fast) var(--rd-easing-standard),
    color var(--rd-duration-fast) var(--rd-easing-standard),
    background var(--rd-duration-fast) var(--rd-easing-standard);
}

.entry-row:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--rd-color-danger);
  background: var(--rd-color-danger-soft);
}
</style>
