<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Color, Palette } from '../../domain/model'
import { interpolateColors, type InterpolationMode } from '../../domain/colorGen'
import CheckerSwatch from '../ui/CheckerSwatch.vue'
import AppSelect from '../ui/AppSelect.vue'
import NumericInput from '../ui/NumericInput.vue'
import AppButton from '../ui/AppButton.vue'

const props = defineProps<{ palette: Palette }>()
const emit = defineEmits<{ insert: [colors: Color[]] }>()

const startIdx = ref<number | null>(null)
const endIdx = ref<number | null>(null)
const count = ref(3)
const mode = ref<InterpolationMode>('linear')

watch(() => props.palette.id, () => {
  startIdx.value = null
  endIdx.value = null
})

const slotOptions = computed(() =>
  props.palette.colors
    .map((c, i) => ({ index: i, name: c.name, color: c }))
    .filter(o => o.index > 0)
)

function colorAt(idx: number | null): Color | null {
  if (idx === null || idx < 1 || idx >= props.palette.colors.length) return null
  return props.palette.colors[idx]
}

const startColor = computed(() => colorAt(startIdx.value))
const endColor = computed(() => colorAt(endIdx.value))
const canPreview = computed(() => startColor.value !== null && endColor.value !== null && count.value >= 1)
const preview = computed<Color[]>(() => {
  if (!canPreview.value) return []
  return interpolateColors(startColor.value!, endColor.value!, count.value, mode.value)
})

function setStart(v: string) { startIdx.value = v !== '' ? parseInt(v) : null }
function setEnd(v: string) { endIdx.value = v !== '' ? parseInt(v) : null }
function setMode(v: string) { mode.value = v as InterpolationMode }

function insertSpread() {
  if (!canPreview.value || preview.value.length === 0) return
  emit('insert', preview.value)
}
</script>

<template>
  <div class="spread-panel">
    <!-- Endpoint selectors -->
    <div class="spread-row">
      <div class="spread-field">
        <span class="spread-label">From</span>
        <div class="spread-selector">
          <CheckerSwatch class="spread-swatch" :color="startColor ?? undefined" />
          <AppSelect
            :modelValue="startIdx?.toString() ?? ''"
            @update:modelValue="setStart"
          >
            <option value="">— pick slot —</option>
            <option
              v-for="opt in slotOptions"
              :key="opt.index"
              :value="opt.index.toString()"
            >[{{ opt.index }}] {{ opt.name }}</option>
          </AppSelect>
        </div>
      </div>

      <div class="spread-field">
        <span class="spread-label">To</span>
        <div class="spread-selector">
          <CheckerSwatch class="spread-swatch" :color="endColor ?? undefined" />
          <AppSelect
            :modelValue="endIdx?.toString() ?? ''"
            @update:modelValue="setEnd"
          >
            <option value="">— pick slot —</option>
            <option
              v-for="opt in slotOptions"
              :key="opt.index"
              :value="opt.index.toString()"
            >[{{ opt.index }}] {{ opt.name }}</option>
          </AppSelect>
        </div>
      </div>
    </div>

    <!-- Count + mode -->
    <div class="spread-row">
      <div class="spread-field">
        <span class="spread-label">Count</span>
        <NumericInput class="spread-count" :min="1" :max="254" v-model="count" />
      </div>
      <div class="spread-field spread-field--grow">
        <span class="spread-label">Mode</span>
        <AppSelect :modelValue="mode" @update:modelValue="setMode">
          <option value="linear">Linear RGB</option>
          <option value="hue">Hue</option>
          <option value="saturation">Saturation</option>
          <option value="lightness">Lightness</option>
        </AppSelect>
      </div>
    </div>

    <!-- Preview strip -->
    <div class="spread-preview-area">
      <template v-if="canPreview && preview.length > 0">
        <div class="spread-strip">
          <CheckerSwatch class="spread-strip-swatch spread-strip-swatch--endpoint" :color="startColor!" />
          <div class="spread-strip-arrow">›</div>
          <CheckerSwatch
            v-for="c in preview"
            :key="c.id"
            class="spread-strip-swatch"
            :color="c"
          />
          <div class="spread-strip-arrow">›</div>
          <CheckerSwatch class="spread-strip-swatch spread-strip-swatch--endpoint" :color="endColor!" />
        </div>
        <div class="spread-strip-count">{{ preview.length }} color{{ preview.length !== 1 ? 's' : '' }}</div>
      </template>
      <div v-else class="spread-preview-empty">
        Select two slots and a count to preview
      </div>
    </div>

    <!-- Insert action -->
    <div class="spread-actions">
      <AppButton :disabled="!canPreview" @click="insertSpread">
        Insert {{ canPreview ? preview.length : '' }} color{{ count !== 1 ? 's' : '' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.spread-panel {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-4);
}

.spread-row {
  display: flex;
  gap: var(--rd-space-5);
  flex-wrap: wrap;
}

.spread-field {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-1);
}

.spread-field--grow {
  flex: 1;
}

.spread-label {
  font-size: var(--rd-text-10);
  font-weight: var(--rd-weight-semibold);
  letter-spacing: var(--rd-tracking-wide);
  text-transform: uppercase;
  color: var(--rd-color-text-muted);
}

.spread-selector {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
}

.spread-swatch {
  width: 18px;
  height: 18px;
  border-radius: var(--rd-radius-1);
  border: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

.spread-count {
  width: 52px;
}

/* Preview */
.spread-preview-area {
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  padding: var(--rd-space-4);
  min-height: 52px;
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
  justify-content: center;
}

.spread-preview-empty {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  text-align: center;
}

.spread-strip {
  display: flex;
  align-items: center;
  gap: var(--rd-space-1);
  flex-wrap: wrap;
}

.spread-strip-swatch {
  width: 24px;
  height: 24px;
  border-radius: var(--rd-radius-1);
  border: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

.spread-strip-swatch--endpoint {
  border-color: var(--rd-color-text-muted);
  opacity: 0.8;
}

.spread-strip-arrow {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text-muted);
  flex-shrink: 0;
}

.spread-strip-count {
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  letter-spacing: var(--rd-tracking-wide);
}

.spread-actions {
  display: flex;
}
</style>
