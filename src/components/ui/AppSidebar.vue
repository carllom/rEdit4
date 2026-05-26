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
  width: var(--rd-sidebar-w);
  background: var(--rd-color-surface-1);
  border-right: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.divider {
  height: var(--rd-border-w);
  background: var(--rd-color-border);
  margin: var(--rd-space-2) 0;
}

.shortcut-hints {
  margin-top: auto;
  padding: var(--rd-space-3) var(--rd-space-5);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
}

.hint-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
}

.key {
  font-family: var(--rd-font-mono);
  font-size: var(--rd-text-10);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  padding: 0 4px;
  color: var(--rd-color-text);
}
</style>
