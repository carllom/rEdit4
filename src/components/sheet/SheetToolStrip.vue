<script setup lang="ts">
import { useSheetStore } from '../../stores/sheetStore'
import type { SheetTool } from '../../stores/sheetStore'

const sheetStore = useSheetStore()

const tools: Array<{ id: SheetTool; label: string; title: string }> = [
  { id: 'drawRect',   label: '▭', title: 'Draw Rect' },
  { id: 'growRect',   label: '⊕', title: 'Grow Rect' },
  { id: 'shrinkRect', label: '⊖', title: 'Shrink Rect' },
  { id: 'pickMatte',  label: '◉', title: 'Pick Matte' },
]
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
    <div class="matte-swatch" title="Matte color (placeholder)" />
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
  background: var(--rd-color-surface-3);
}
</style>
