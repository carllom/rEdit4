<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Palette } from '../../domain/model'
import PaletteEntryCard from './PaletteEntryCard.vue'
import CheckerSwatch from '../ui/CheckerSwatch.vue'

const TRIGGER_SWATCH_CAP = 32

const props = defineProps<{
  palettes: Palette[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const focusedIndex = ref(0)
const rootEl = ref<HTMLDivElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const itemEls = ref<HTMLButtonElement[]>([])

const selectedPalette = computed(() =>
  props.palettes.find(p => p.id === props.modelValue) ?? null
)

const triggerSwatches = computed(() =>
  selectedPalette.value
    ? selectedPalette.value.colors.slice(0, TRIGGER_SWATCH_CAP)
    : []
)


function open() {
  const idx = props.palettes.findIndex(p => p.id === props.modelValue)
  focusedIndex.value = idx >= 0 ? idx : 0
  isOpen.value = true
  nextTick(() => itemEls.value[focusedIndex.value]?.focus())
}

function close() {
  isOpen.value = false
}

function select(id: string) {
  emit('update:modelValue', id)
  close()
  nextTick(() => triggerEl.value?.focus())
}

function moveFocus(delta: number) {
  const next = Math.max(0, Math.min(props.palettes.length - 1, focusedIndex.value + delta))
  focusedIndex.value = next
  itemEls.value[next]?.focus()
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    open()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    isOpen.value ? moveFocus(1) : open()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!isOpen.value) {
      focusedIndex.value = props.palettes.length - 1
      isOpen.value = true
      nextTick(() => itemEls.value[focusedIndex.value]?.focus())
    } else {
      moveFocus(-1)
    }
  }
}

function onPopoverKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    moveFocus(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveFocus(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const palette = props.palettes[focusedIndex.value]
    if (palette) select(palette.id)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
    nextTick(() => triggerEl.value?.focus())
  } else if (e.key === 'Tab') {
    close()
  }
}

function onDocumentClick(e: MouseEvent) {
  if (!rootEl.value?.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="ps-root" ref="rootEl">
    <button
      ref="triggerEl"
      class="ps-trigger"
      :class="{ 'ps-trigger--open': isOpen }"
      type="button"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="isOpen ? close() : open()"
      @keydown="onTriggerKeydown"
    >
      <span class="ps-trigger-name">{{ selectedPalette?.name ?? 'Select palette…' }}</span>
      <span class="ps-trigger-swatches">
        <CheckerSwatch
          v-for="(color, i) in triggerSwatches"
          :key="i"
          class="ps-swatch"
          :color="color"
        />
      </span>
      <span class="ps-chevron" aria-hidden="true">▾</span>
    </button>

    <div
      v-if="isOpen"
      class="ps-popover"
      role="listbox"
      @keydown="onPopoverKeydown"
    >
      <button
        v-for="(palette, i) in palettes"
        :key="palette.id"
        ref="itemEls"
        type="button"
        role="option"
        :aria-selected="palette.id === modelValue"
        :class="['ps-item', { 'ps-item--selected': palette.id === modelValue }]"
        @click="select(palette.id)"
        @mouseenter="focusedIndex = i"
      >
        <PaletteEntryCard :palette="palette" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ps-root {
  position: relative;
  width: 100%;
}

/* ── Trigger ── */
.ps-trigger {
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
  width: 100%;
  padding: var(--rd-space-2) var(--rd-space-3);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  cursor: pointer;
  text-align: left;
  min-height: var(--rd-hit-md);
}
.ps-trigger:hover { border-color: var(--rd-color-text-muted); }
.ps-trigger:focus { outline: none; border-color: var(--rd-color-accent); }
.ps-trigger--open { border-color: var(--rd-color-accent); }

.ps-trigger-name {
  font-size: var(--rd-text-12);
  white-space: nowrap;
  flex-shrink: 0;
}

.ps-trigger-swatches {
  display: flex;
  flex-wrap: nowrap;
  gap: 1px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.ps-swatch {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
}


.ps-chevron {
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  flex-shrink: 0;
  line-height: 1;
  transition: transform var(--rd-duration-fast);
}
.ps-trigger--open .ps-chevron { transform: rotate(180deg); }

/* ── Popover ── */
.ps-popover {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: var(--rd-z-dropdown);
  background: var(--rd-color-surface-1);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  box-shadow: var(--rd-shadow-dialog);
  max-height: 320px;
  overflow-y: auto;
}

/* ── Items ── */
.ps-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--rd-space-4) var(--rd-space-5);
  border: none;
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  border-left: var(--rd-border-w-active) solid transparent;
  background: none;
  color: var(--rd-color-text);
  cursor: pointer;
}
.ps-item:last-child { border-bottom: none; }
.ps-item:hover,
.ps-item:focus {
  background: var(--rd-color-surface-2);
  outline: none;
}
.ps-item--selected {
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
}
</style>
