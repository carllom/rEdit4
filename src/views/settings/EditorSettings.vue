<script setup lang="ts">
import { useSettingsStore } from '../../stores/settingsStore'
import NumericInput from '../../components/ui/NumericInput.vue'

const { settings } = useSettingsStore()
</script>

<template>
  <div class="settings-panel">
    <h2 class="panel-title">Editor</h2>

    <div class="setting-row">
      <div class="setting-label">
        <span class="setting-name">Isometric snap angles</span>
        <span class="setting-desc">Add 2:1 and 1:2 line snap angles for isometric pixel art (Shift-constrain)</span>
      </div>
      <div class="setting-control">
        <input type="checkbox" v-model="settings.isometricSnap" />
      </div>
    </div>

    <div class="setting-row">
      <div class="setting-label">
        <span class="setting-name">Cursor opacity</span>
        <span class="setting-desc">Opacity of the pixel cell highlight on the canvas</span>
      </div>
      <div class="setting-control">
        <NumericInput v-model="settings.cursorOpacity" :min="0" :max="100" />
        <span class="setting-unit">%</span>
      </div>
    </div>

    <div class="setting-row">
      <div class="setting-label">
        <span class="setting-name">Preview background</span>
        <span class="setting-desc">Background behind transparent pixels in the Flash Card Preview</span>
      </div>
      <div class="setting-control">
        <select v-model="settings.previewBackground" class="setting-select">
          <option value="checkerboard">Checkerboard</option>
          <option value="solid">Solid</option>
        </select>
        <input
          v-if="settings.previewBackground === 'solid'"
          type="color"
          v-model="settings.previewBackgroundColor"
          class="color-input"
          title="Preview background color"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel { display: flex; flex-direction: column; gap: var(--rd-space-1); }

.panel-title {
  font-size: var(--rd-text-13);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-strong);
  margin-bottom: var(--rd-space-7);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rd-space-9);
  padding: var(--rd-space-4) 0;
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-1);
  min-width: 0;
}

.setting-name { font-size: var(--rd-text-12); color: var(--rd-color-text); }

.setting-desc { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }

.setting-control {
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
  flex-shrink: 0;
}

.setting-control input[type='number'] {
  width: 52px;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  padding: 3px 6px;
  text-align: right;
  font-family: var(--rd-font-mono);
  font-variant-numeric: tabular-nums;
}

.setting-control input[type='number']:focus {
  outline: none;
  border-color: var(--rd-color-accent);
}

.setting-control input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: var(--rd-color-accent);
  cursor: pointer;
}

.setting-unit { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }

.setting-select {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  padding: 3px 6px;
  cursor: pointer;
}

.color-input {
  width: 28px;
  height: 22px;
  padding: 1px;
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  background: var(--rd-color-surface-3);
  cursor: pointer;
}
</style>
