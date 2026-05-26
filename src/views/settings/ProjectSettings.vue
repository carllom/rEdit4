<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'
import { usePaletteTemplateStore } from '../../stores/paletteTemplateStore'
import PaletteSelect from '../../components/palette/PaletteSelect.vue'
import type { Palette } from '../../domain/model'

const { settings } = useSettingsStore()
const templates = usePaletteTemplateStore()

const templatePalettes = computed<Palette[]>(() => [
  ...templates.builtIn,
  ...templates.userTemplates,
])
</script>

<template>
  <div class="settings-panel">
    <h2 class="panel-title">Project</h2>

    <div class="setting-row setting-row--stacked">
      <div class="setting-label">
        <span class="setting-name">Default palette</span>
        <span class="setting-desc">Palette imported into every new project on creation</span>
      </div>
      <div class="setting-control">
        <PaletteSelect
          :palettes="templatePalettes"
          v-model="settings.defaultPaletteTemplateId"
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

.setting-row--stacked {
  flex-direction: column;
  align-items: stretch;
  gap: var(--rd-space-3);
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-1);
  min-width: 0;
}

.setting-name { font-size: var(--rd-text-12); color: var(--rd-color-text); }

.setting-desc { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }

.setting-control { flex-shrink: 0; }
</style>
