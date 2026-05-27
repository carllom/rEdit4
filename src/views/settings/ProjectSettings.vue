<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'
import { usePaletteTemplateStore } from '../../stores/paletteTemplateStore'
import PaletteSelect from '../../components/palette/PaletteSelect.vue'
import SettingsRow from '../../components/ui/SettingsRow.vue'
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

    <SettingsRow label="Default palette" description="Palette imported into every new project on creation" stacked>
      <PaletteSelect :palettes="templatePalettes" v-model="settings.defaultPaletteTemplateId" />
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
</style>
