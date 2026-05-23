<script setup lang="ts">
import ToolSelector from './ToolSelector.vue'
import PalettePanel from '../palette/PalettePanel.vue'
</script>

<template>
  <aside class="sidebar">
    <ToolSelector />
    <div class="divider" />
    <PalettePanel />
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
</style>
