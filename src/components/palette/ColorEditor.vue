<script setup lang="ts">
import { computed } from 'vue'
import type { Color } from '../../domain/model'
import { colorToCSSHex } from '../../domain/color'
import NumericInput from '../ui/NumericInput.vue'
import CheckerSwatch from '../ui/CheckerSwatch.vue'

const props = defineProps<{ color: Color }>()
const emit = defineEmits<{ change: [] }>()

// Hex input — two-way: reading derives from r/g/b, writing parses back
const hex = computed({
  get: () => colorToCSSHex(props.color),
  set: (v: string) => {
    const m = v.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    if (!m) return
    props.color.r = parseInt(m[1], 16)
    props.color.g = parseInt(m[2], 16)
    props.color.b = parseInt(m[3], 16)
    emit('change')
  },
})

function clamp(v: number) { return Math.max(0, Math.min(255, v | 0)) }

function setR(v: number) { props.color.r = clamp(v); emit('change') }
function setG(v: number) { props.color.g = clamp(v); emit('change') }
function setB(v: number) { props.color.b = clamp(v); emit('change') }
function setA(v: number) { props.color.a = clamp(v); emit('change') }
</script>

<template>
  <div class="color-editor">
    <div class="preview-row">
      <CheckerSwatch class="preview" :color="color" />
      <input class="hex-input" type="text" :value="hex" maxlength="7" spellcheck="false"
        @change="hex = ($event.target as HTMLInputElement).value" />
    </div>
    <div class="channel-row">
      <span class="channel-label">R</span>
      <NumericInput class="channel-num" :min="0" :max="255" :modelValue="color.r" @update:modelValue="setR" />
    </div>
    <div class="channel-row">
      <span class="channel-label">G</span>
      <NumericInput class="channel-num" :min="0" :max="255" :modelValue="color.g" @update:modelValue="setG" />
    </div>
    <div class="channel-row">
      <span class="channel-label">B</span>
      <NumericInput class="channel-num" :min="0" :max="255" :modelValue="color.b" @update:modelValue="setB" />
    </div>
    <div class="channel-row">
      <span class="channel-label">A</span>
      <NumericInput class="channel-num" :min="0" :max="255" :modelValue="color.a" @update:modelValue="setA" />
    </div>
  </div>
</template>

<style scoped>
.color-editor {
  padding: var(--rd-space-3) var(--rd-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
}

.preview-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
  margin-bottom: var(--rd-space-1);
}

.preview {
  width: 28px;
  height: 28px;
  border-radius: var(--rd-radius-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

.hex-input {
  flex: 1;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  font-family: var(--rd-font-mono);
  padding: 4px 6px;
  outline: none;
}
.hex-input:focus { border-color: var(--rd-color-accent); }

.channel-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
}

.channel-label {
  width: 12px;
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  flex-shrink: 0;
  font-weight: var(--rd-weight-semibold);
}

.channel-num { width: 46px; }
</style>
