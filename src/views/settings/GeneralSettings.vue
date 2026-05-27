<script setup lang="ts">
import { useSettingsStore } from '../../stores/settingsStore'
import NumericInput from '../../components/ui/NumericInput.vue'
import SettingsRow from '../../components/ui/SettingsRow.vue'

const { settings } = useSettingsStore()
</script>

<template>
  <div class="settings-panel">
    <h2 class="panel-title">General</h2>

    <SettingsRow label="Auto-save frequency" description="Seconds after a change before the project is auto-saved">
      <NumericInput v-model="settings.autosaveFrequency" :min="1" :max="60" />
      <span class="setting-unit">s</span>
    </SettingsRow>
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

.setting-unit { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }
</style>
