<script setup lang="ts">
import { computed } from 'vue'
import SheetSelector from '../components/sheet/SheetSelector.vue'
import SheetToolStrip from '../components/sheet/SheetToolStrip.vue'
import SheetCanvas from '../components/sheet/SheetCanvas.vue'
import NumericInput from '../components/ui/NumericInput.vue'
import { useSheetStore } from '../stores/sheetStore'

const sheetStore = useSheetStore()

const rectX = computed({
  get: () => sheetStore.inProgressRect?.x ?? 0,
  set: (v: number) => sheetStore.patchInProgressRect({ x: v }),
})
const rectY = computed({
  get: () => sheetStore.inProgressRect?.y ?? 0,
  set: (v: number) => sheetStore.patchInProgressRect({ y: v }),
})
const rectW = computed({
  get: () => sheetStore.inProgressRect?.w ?? 1,
  set: (v: number) => sheetStore.patchInProgressRect({ w: v }),
})
const rectH = computed({
  get: () => sheetStore.inProgressRect?.h ?? 1,
  set: (v: number) => sheetStore.patchInProgressRect({ h: v }),
})
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
        <div v-if="sheetStore.inProgressRect" class="panel-section">
          <div class="rect-field">
            <span class="field-label">X</span>
            <NumericInput class="field-num" v-model="rectX" :min="0" :max="9999" />
          </div>
          <div class="rect-field">
            <span class="field-label">Y</span>
            <NumericInput class="field-num" v-model="rectY" :min="0" :max="9999" />
          </div>
          <div class="rect-field">
            <span class="field-label">W</span>
            <NumericInput class="field-num" v-model="rectW" :min="1" :max="9999" />
          </div>
          <div class="rect-field">
            <span class="field-label">H</span>
            <NumericInput class="field-num" v-model="rectH" :min="1" :max="9999" />
          </div>
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

.rect-field {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
}

.field-label {
  width: 12px;
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  flex-shrink: 0;
  font-weight: var(--rd-weight-semibold);
}

.field-num {
  flex: 1;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  padding: 2px 4px;
  text-align: right;
  outline: none;
  font-family: var(--rd-font-mono);
  font-variant-numeric: tabular-nums;
}
.field-num:focus { border-color: var(--rd-color-accent); }
</style>
