<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: number
  min: number
  max: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const inputRef = ref<HTMLInputElement | null>(null)
const isScrubbing = ref(false)

const SCRUB_THRESHOLD = 3

let lastX = 0
let lastY = 0
let currentValue = 0

function onPointerdown(e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  inputRef.value!.setPointerCapture(e.pointerId)
  lastX = e.clientX
  lastY = e.clientY
  currentValue = props.modelValue
  isScrubbing.value = false
}

function onPointermove(e: PointerEvent) {
  if (!inputRef.value?.hasPointerCapture(e.pointerId)) return

  const dx = e.clientX - lastX
  const dy = -(e.clientY - lastY)

  if (!isScrubbing.value) {
    if (Math.sqrt(dx * dx + dy * dy) < SCRUB_THRESHOLD) return
    isScrubbing.value = true
    lastX = e.clientX
    lastY = e.clientY
    return
  }

  lastX = e.clientX
  lastY = e.clientY

  const multiplier = e.shiftKey ? 0.1 : 1
  currentValue += (dx + dy) * multiplier

  const rounded = Math.round(currentValue)
  if (rounded > props.max) currentValue = props.max
  else if (rounded < props.min) currentValue = props.min

  emit('update:modelValue', Math.max(props.min, Math.min(props.max, rounded)))
}

function onPointerup(e: PointerEvent) {
  if (!inputRef.value?.hasPointerCapture(e.pointerId)) return
  inputRef.value.releasePointerCapture(e.pointerId)
  if (!isScrubbing.value) {
    inputRef.value.focus()
    inputRef.value.select()
  }
  isScrubbing.value = false
}

function onPointercancel(e: PointerEvent) {
  if (!inputRef.value?.hasPointerCapture(e.pointerId)) return
  inputRef.value.releasePointerCapture(e.pointerId)
  isScrubbing.value = false
}

function onChange(e: Event) {
  const raw = (e.target as HTMLInputElement).valueAsNumber
  if (isNaN(raw)) return
  emit('update:modelValue', Math.max(props.min, Math.min(props.max, Math.round(raw))))
}
</script>

<template>
  <input
    ref="inputRef"
    type="number"
    :min="min"
    :max="max"
    :value="modelValue"
    :class="{ 'is-scrubbing': isScrubbing }"
    @change="onChange"
    @pointerdown="onPointerdown"
    @pointermove="onPointermove"
    @pointerup="onPointerup"
    @pointercancel="onPointercancel"
  />
</template>

<style scoped>
input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
  cursor: ew-resize;
  user-select: none;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
}

input[type='number']:focus:not(.is-scrubbing) {
  cursor: text;
  user-select: auto;
}
</style>
