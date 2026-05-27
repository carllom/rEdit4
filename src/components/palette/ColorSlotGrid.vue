<script setup lang="ts">
import { ref } from 'vue'
import type { Palette } from '../../domain/model'
import CheckerSwatch from '../ui/CheckerSwatch.vue'

const props = defineProps<{
  palette: Palette
  selectedIndex: number | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  select: [index: number]
  swap: [indexA: number, indexB: number]
}>()

const dragSrc = ref<number | null>(null)
const dragTarget = ref<number | null>(null)

function onDragStart(e: DragEvent, index: number) {
  dragSrc.value = index
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(e: DragEvent, index: number) {
  if (dragSrc.value === null || index === 0 || index === dragSrc.value) return
  e.preventDefault()
  dragTarget.value = index
}

function onDragLeave(e: DragEvent, index: number) {
  if (dragTarget.value === index) dragTarget.value = null
}

function onDrop(e: DragEvent, index: number) {
  e.preventDefault()
  if (dragSrc.value !== null && index !== 0 && dragSrc.value !== index) {
    emit('swap', dragSrc.value, index)
  }
  dragSrc.value = null
  dragTarget.value = null
}

function onDragEnd() {
  dragSrc.value = null
  dragTarget.value = null
}

function onSlotClick(index: number) {
  if (index === 0 || props.readonly) return
  emit('select', index)
}
</script>

<template>
  <div class="slot-grid">
    <div
      v-for="(color, index) in palette.colors"
      :key="color.id"
      :class="[
        'slot-cell',
        {
          'slot-cell--zero': index === 0,
          'slot-cell--selected': selectedIndex === index && !readonly,
          'slot-cell--dragging': dragSrc === index,
          'slot-cell--drag-target': dragTarget === index,
          'slot-cell--interactive': index !== 0 && !readonly,
        },
      ]"
      :draggable="index !== 0 && !readonly ? true : undefined"
      :title="index === 0 ? 'Slot 0 — Transparent (locked)' : `[${index}] ${color.name}`"
      @click="onSlotClick(index)"
      @dragstart="index !== 0 && !readonly ? onDragStart($event, index) : undefined"
      @dragover="onDragOver($event, index)"
      @dragleave="onDragLeave($event, index)"
      @drop="onDrop($event, index)"
      @dragend="onDragEnd"
    >
      <CheckerSwatch class="slot-swatch" :color="index !== 0 ? color : undefined" />
      <span class="slot-index">{{ index }}</span>
      <svg v-if="index === 0" class="slot-lock" viewBox="0 0 10 12" fill="none" aria-hidden="true">
        <rect x="1" y="5" width="8" height="6.5" rx="1" fill="currentColor" />
        <path d="M3 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" stroke-width="1.4" fill="none" />
      </svg>
      <div class="slot-name">{{ index === 0 ? 'transparent' : color.name }}</div>
    </div>
  </div>
</template>

<style scoped>
.slot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rd-space-2);
}

.slot-cell {
  display: flex;
  flex-direction: column;
  width: 56px;
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  overflow: hidden;
  position: relative;
  cursor: default;
  background: var(--rd-color-surface-2);
  user-select: none;
}

.slot-cell--interactive {
  cursor: pointer;
}
.slot-cell--interactive:hover {
  border-color: var(--rd-color-text-muted);
}

.slot-cell--selected {
  border-color: var(--rd-color-accent);
  border-width: var(--rd-border-w-active);
}

.slot-cell--dragging {
  opacity: 0.35;
}

.slot-cell--drag-target {
  border-color: var(--rd-color-accent);
  border-width: var(--rd-border-w-active);
  background: var(--rd-color-accent-soft);
}

.slot-swatch {
  width: 100%;
  height: 44px;
  flex-shrink: 0;
}

.slot-index {
  position: absolute;
  top: 2px;
  left: 3px;
  font-size: var(--rd-text-9);
  font-family: var(--rd-font-mono);
  color: var(--rd-color-text-strong);
  line-height: 1;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}

.slot-lock {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -70%);
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.65);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  pointer-events: none;
}

.slot-name {
  font-size: var(--rd-text-9);
  color: var(--rd-color-text-muted);
  padding: 2px var(--rd-space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--rd-leading-tight);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  background: var(--rd-color-surface-1);
  flex-shrink: 0;
}
</style>
