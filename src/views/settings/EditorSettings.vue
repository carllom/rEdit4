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
.settings-panel { display: flex; flex-direction: column; gap: 2px; }

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.setting-name { font-size: 12px; color: var(--color-text); }

.setting-desc { font-size: 11px; color: var(--color-text-muted); }

.setting-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.setting-control input[type='number'] {
  width: 52px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  font-size: 12px;
  padding: 3px 6px;
  text-align: right;
}

.setting-control input[type='number']:focus {
  outline: none;
  border-color: var(--color-accent);
}

.setting-control input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.setting-unit { font-size: 11px; color: var(--color-text-muted); }

.setting-select {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  font-size: 11px;
  padding: 3px 6px;
  cursor: pointer;
}

.color-input {
  width: 28px;
  height: 22px;
  padding: 1px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface-2);
  cursor: pointer;
}
</style>
