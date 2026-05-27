<script setup lang="ts">
import { useSettingsStore } from '../../stores/settingsStore'
import NumericInput from '../../components/ui/NumericInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import SettingsRow from '../../components/ui/SettingsRow.vue'

const { settings } = useSettingsStore()
</script>

<template>
  <div class="settings-panel">
    <h2 class="panel-title">Editor</h2>

    <SettingsRow label="Isometric snap angles" description="Add 2:1 and 1:2 line snap angles for isometric pixel art (Shift-constrain)">
      <input type="checkbox" v-model="settings.isometricSnap" />
    </SettingsRow>

    <SettingsRow label="Cursor opacity" description="Opacity of the pixel cell highlight on the canvas">
      <NumericInput v-model="settings.cursorOpacity" :min="0" :max="100" />
      <span class="setting-unit">%</span>
    </SettingsRow>

    <SettingsRow label="Preview background" description="Background behind transparent pixels in the Flash Card Preview">
      <AppSelect v-model="settings.previewBackground">
        <option value="checkerboard">Checkerboard</option>
        <option value="solid">Solid</option>
      </AppSelect>
      <input
        v-if="settings.previewBackground === 'solid'"
        type="color"
        v-model="settings.previewBackgroundColor"
        class="color-input"
        title="Preview background color"
      />
    </SettingsRow>

    <SettingsRow label="Sprite preview zoom" description="Zoom level for the Sprite Preview panel (1–8×)">
      <NumericInput v-model="settings.spritePreviewZoom" :min="1" :max="8" />
      <span class="setting-unit">×</span>
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

input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: var(--rd-color-accent);
  cursor: pointer;
}

.setting-unit { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }

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
