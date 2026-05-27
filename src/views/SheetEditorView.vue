<script setup lang="ts">
import SheetSelector from '../components/sheet/SheetSelector.vue'
import SheetToolStrip from '../components/sheet/SheetToolStrip.vue'
import SheetCanvas from '../components/sheet/SheetCanvas.vue'
import { useSheetStore } from '../stores/sheetStore'

const sheetStore = useSheetStore()
</script>

<template>
  <div class="sheet-editor-view">
    <div class="sheet-toolbar">
      <SheetSelector />
    </div>
    <div class="sheet-content">
      <SheetToolStrip />
      <SheetCanvas />
      <div class="sheet-right-panel">
        <div class="panel-section">
          <button
            class="action-btn accent"
            :disabled="!sheetStore.inProgressRect"
            @click="sheetStore.acceptInProgressRect()"
          >Accept</button>
          <button
            class="action-btn"
            :disabled="!sheetStore.inProgressRect"
            @click="sheetStore.setInProgressRect(null)"
          >Cancel</button>
        </div>
        <div class="placeholder-section">
          <span class="placeholder-label">Rect fields (next slice)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-editor-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.sheet-toolbar {
  display: flex;
  align-items: center;
  padding: var(--rd-space-2) var(--rd-space-4);
  background: var(--rd-color-surface-1);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

.sheet-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sheet-right-panel {
  width: var(--rd-sidebar-w-narrow);
  display: flex;
  flex-direction: column;
  background: var(--rd-color-surface-1);
  border-left: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
  overflow-y: auto;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
  padding: var(--rd-space-5);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
}

.action-btn {
  width: 100%;
  padding: var(--rd-space-2) var(--rd-space-5);
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  cursor: pointer;
  font-size: var(--rd-text-12);
  font-family: inherit;
  text-align: center;
}
.action-btn:hover:not(:disabled) { background: var(--rd-color-surface-3); border-color: var(--rd-color-text-muted); }
.action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.action-btn.accent {
  background: var(--rd-color-accent-soft);
  border-color: var(--rd-color-accent-soft-border);
  color: var(--rd-color-accent);
}
.action-btn.accent:hover:not(:disabled) {
  background: var(--rd-color-accent);
  color: var(--rd-color-accent-fg);
}

.placeholder-section {
  padding: var(--rd-space-5);
  flex: 1;
}

.placeholder-label {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
}
</style>
