<script setup lang="ts">
import ToolSelector from './ToolSelector.vue'
import PalettePanel from '../palette/PalettePanel.vue'
</script>

<template>
  <aside class="sidebar">
    <ToolSelector />
    <div class="divider" />
    <PalettePanel />
    <div class="shortcut-hints">
      <span class="hint-row">Preview <kbd class="key">`</kbd></span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

.shortcut-hints {
  margin-top: auto;
  padding: 6px 10px;
  border-top: 1px solid var(--color-border);
}

.hint-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--color-text-muted);
}

.key {
  font-family: monospace;
  font-size: 10px;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 0 4px;
  color: var(--color-text);
}
</style>
