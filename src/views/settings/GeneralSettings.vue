<script setup lang="ts">
import { useSettingsStore } from '../../stores/settingsStore'
import NumericInput from '../../components/ui/NumericInput.vue'

const { settings } = useSettingsStore()
</script>

<template>
  <div class="settings-panel">
    <h2 class="panel-title">General</h2>

    <div class="setting-row">
      <div class="setting-label">
        <span class="setting-name">Auto-save frequency</span>
        <span class="setting-desc">Seconds after a change before the project is auto-saved</span>
      </div>
      <div class="setting-control">
        <NumericInput v-model="settings.autosaveFrequency" :min="1" :max="60" />
        <span class="setting-unit">s</span>
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

.setting-unit { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }
</style>
