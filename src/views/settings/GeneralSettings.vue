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

.setting-unit { font-size: 11px; color: var(--color-text-muted); }
</style>
