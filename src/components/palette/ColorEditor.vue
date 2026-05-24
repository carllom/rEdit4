<script setup lang="ts">
import { computed } from 'vue'
import type { Color } from '../../domain/model'
import { colorToCSSHex } from '../../domain/color'
import NumericInput from '../ui/NumericInput.vue'

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
      <div class="preview" :style="{ background: `rgba(${color.r},${color.g},${color.b},${color.a/255})` }" />
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
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--color-border);
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.preview {
  width: 28px;
  height: 28px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  background-image: linear-gradient(45deg, #555 25%, transparent 25%),
    linear-gradient(-45deg, #555 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #555 75%),
    linear-gradient(-45deg, transparent 75%, #555 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  background-color: #333;
}

.hex-input {
  flex: 1;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  font-size: 12px;
  font-family: monospace;
  padding: 4px 6px;
  outline: none;
}
.hex-input:focus { border-color: var(--color-accent); }

.channel-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.channel-label {
  width: 12px;
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  font-weight: 600;
}

.channel-num {
  width: 46px;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  font-size: 11px;
  padding: 2px 4px;
  text-align: right;
  outline: none;
}
.channel-num:focus { border-color: var(--color-accent); }
</style>
