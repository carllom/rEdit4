<script setup lang="ts">
import { usePaintStore, type Tool } from '../../stores/paintStore'

const paint = usePaintStore()

const tools: { id: Tool; label: string; shortcut: string }[] = [
  { id: 'draw',       label: 'Draw',       shortcut: 'D' },
  { id: 'erase',      label: 'Erase',      shortcut: 'E' },
  { id: 'fill',       label: 'Fill',       shortcut: 'F' },
  { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I' },
  { id: 'line',       label: 'Line',       shortcut: 'L' },
  { id: 'rect',       label: 'Rectangle',  shortcut: 'R' },
]
</script>

<template>
  <div class="tool-selector">
    <div class="section-label">Tools</div>
    <button
      v-for="tool in tools"
      :key="tool.id"
      :class="['tool-btn', { active: paint.activeTool === tool.id }]"
      :title="`${tool.label} (${tool.shortcut})`"
      @click="paint.setTool(tool.id)"
    >
      <span class="tool-label">{{ tool.label }}</span>
      <kbd class="tool-key">{{ tool.shortcut }}</kbd>
    </button>
  </div>
</template>

<style scoped>
.tool-selector {
  padding: 6px 0;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: 4px 10px 2px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 10px;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  border-left: 2px solid transparent;
}

.tool-btn:hover {
  background: var(--color-surface-2);
}

.tool-btn.active {
  background: var(--color-surface-2);
  border-left-color: var(--color-accent);
  color: var(--color-accent);
}

.tool-key {
  font-size: 10px;
  color: var(--color-text-muted);
  background: var(--color-surface-3);
  border-radius: 2px;
  padding: 1px 4px;
  font-family: monospace;
}
</style>
