<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSheetStore } from '../../stores/sheetStore'
import { useProjectStore } from '../../stores/projectStore'
import AppButton from '../ui/AppButton.vue'
import type { ExtractionMode } from '../../domain/sheetExtraction'
import { MERGED_SENTINEL } from '../../domain/sheetExtraction'

const sheetStore = useSheetStore()
const projectStore = useProjectStore()

const mode = ref<ExtractionMode>('individual')
const paletteName = ref('')
const extracting = ref(false)
const overflowErrors = ref<Map<string, number>>(new Map())

const checkedCount = computed(() => sheetStore.checkedEntryNames.length)

const canExtract = computed(() =>
  !extracting.value &&
  checkedCount.value > 0 &&
  (mode.value === 'individual' || paletteName.value.trim().length > 0)
)

function setMode(m: ExtractionMode) {
  mode.value = m
  overflowErrors.value = new Map()
}

async function onExtract() {
  overflowErrors.value = new Map()
  extracting.value = true
  try {
    const errors = await sheetStore.extract(mode.value, paletteName.value.trim() || undefined)
    overflowErrors.value = errors
    if (errors.size === 0) paletteName.value = ''
  } finally {
    extracting.value = false
  }
}

function overflowLabel(key: string): string {
  return key === MERGED_SENTINEL ? 'merged group' : key
}
</script>

<template>
  <div class="extraction-panel">
    <div class="rd-section-label panel-label">Extraction</div>

    <div class="panel-body">
      <!-- Mode toggle -->
      <div class="mode-row">
        <AppButton
          class="mode-btn"
          size="compact"
          :variant="mode === 'individual' ? 'accent' : 'default'"
          @click="setMode('individual')"
        >Individual</AppButton>
        <AppButton
          class="mode-btn"
          size="compact"
          :variant="mode === 'merged' ? 'accent' : 'default'"
          @click="setMode('merged')"
        >Merged</AppButton>
      </div>

      <!-- Palette name (Merged only) -->
      <div v-if="mode === 'merged'" class="field-row">
        <span class="field-label rd-caption">Palette</span>
        <input
          class="palette-input"
          type="text"
          placeholder="Palette name"
          v-model="paletteName"
          @input="overflowErrors = new Map()"
        />
      </div>

      <!-- Extract button -->
      <AppButton
        class="full-width"
        variant="primary"
        size="compact"
        :disabled="!canExtract"
        @click="onExtract"
      >{{ extracting ? 'Extracting…' : `Extract${checkedCount ? ` (${checkedCount})` : ''}` }}</AppButton>

      <!-- Overflow errors -->
      <template v-if="overflowErrors.size > 0">
        <div
          v-for="[key, count] in overflowErrors"
          :key="key"
          class="msg msg--error"
        >
          <span class="msg-name">{{ overflowLabel(key) }}</span>
          <span class="msg-count">{{ count }}&thinsp;/&thinsp;255 colors</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.extraction-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-top: var(--rd-border-w) solid var(--rd-color-border);
}

.panel-label {
  padding: var(--rd-space-2) var(--rd-space-5) var(--rd-space-1);
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
  padding: var(--rd-space-3) var(--rd-space-5) var(--rd-space-5);
}

.mode-row {
  display: flex;
  gap: var(--rd-space-2);
}

.mode-btn { flex: 1; }

.field-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
}

.field-label {
  flex-shrink: 0;
  width: 40px;
}

.palette-input {
  font-family: inherit;
  font-size: var(--rd-text-12);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  padding: 3px var(--rd-space-3);
  outline: none;
  flex: 1;
  min-width: 0;
}

.palette-input:focus { border-color: var(--rd-color-accent); }
.palette-input::placeholder { color: var(--rd-color-text-muted); }

.full-width { width: 100%; }

.msg {
  font-size: var(--rd-text-11);
  padding: var(--rd-space-2) var(--rd-space-4);
  border-radius: var(--rd-radius-1);
  border-left: var(--rd-border-w-active) solid var(--rd-color-text-muted);
  background: var(--rd-color-surface-3);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--rd-space-2);
}

.msg--error {
  border-left-color: var(--rd-color-danger);
  background: var(--rd-color-danger-soft);
  color: var(--rd-color-danger);
}

.msg-name {
  font-weight: var(--rd-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.msg-count {
  flex-shrink: 0;
  font-family: var(--rd-font-mono);
  font-size: var(--rd-text-10);
}
</style>
