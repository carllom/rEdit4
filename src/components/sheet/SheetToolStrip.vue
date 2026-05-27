<script setup lang="ts">
import { computed } from 'vue'
import { useSheetStore } from '../../stores/sheetStore'
import { useProjectStore } from '../../stores/projectStore'
import type { SheetTool } from '../../stores/sheetStore'

const sheetStore = useSheetStore()
const projectStore = useProjectStore()

const tools: Array<{ id: SheetTool; label: string; title: string }> = [
  { id: 'drawRect',   label: '▭', title: 'Draw Rect' },
  { id: 'growRect',   label: '⊕', title: 'Grow Rect' },
  { id: 'shrinkRect', label: '⊖', title: 'Shrink Rect' },
  { id: 'pickMatte',  label: '◉', title: 'Pick Matte — click canvas to pick' },
]

const matteColor = computed(() =>
  projectStore.project?.sheets.find(s => s.id === sheetStore.activeSheetId)?.matteColor ?? null
)

const swatchStyle = computed(() =>
  matteColor.value
    ? { background: `rgb(${matteColor.value.r}, ${matteColor.value.g}, ${matteColor.value.b})` }
    : {}
)
</script>

<template>
  <div class="tool-strip">
    <button
      v-for="tool in tools"
      :key="tool.id"
      :class="['tool-btn', { active: sheetStore.activeTool === tool.id }]"
      :title="tool.title"
      @click="sheetStore.setActiveTool(tool.id)"
    >{{ tool.label }}</button>
    <div
      :class="['matte-swatch', { 'no-matte': !matteColor }]"
      :style="swatchStyle"
      :title="matteColor ? `Matte: rgb(${matteColor.r}, ${matteColor.g}, ${matteColor.b})` : 'Matte: none (alpha)'"
    />
  </div>
</template>

<style scoped>
.tool-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--rd-space-1);
  padding: var(--rd-space-3) var(--rd-space-2);
  background: var(--rd-color-surface-1);
  border-right: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

.tool-btn {
  width: var(--rd-hit-lg);
  height: var(--rd-hit-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: var(--rd-border-w) solid transparent;
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  cursor: pointer;
  font-size: var(--rd-text-14);
  position: relative;
  font-family: inherit;
}
.tool-btn:hover { background: var(--rd-color-surface-2); color: var(--rd-color-text); }
.tool-btn.active {
  color: var(--rd-color-text);
  background: var(--rd-color-surface-2);
}
.tool-btn.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--rd-border-w-active);
  background: var(--rd-color-accent);
  border-radius: var(--rd-radius-1) 0 0 var(--rd-radius-1);
}

.matte-swatch {
  margin-top: var(--rd-space-3);
  width: var(--rd-hit-md);
  height: var(--rd-hit-md);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
}

.matte-swatch.no-matte {
  background-color: var(--rd-color-checker-light);
  background-image:
    linear-gradient(45deg, var(--rd-color-checker-dark) 25%, transparent 25%),
    linear-gradient(-45deg, var(--rd-color-checker-dark) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--rd-color-checker-dark) 75%),
    linear-gradient(-45deg, transparent 75%, var(--rd-color-checker-dark) 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
}
</style>
