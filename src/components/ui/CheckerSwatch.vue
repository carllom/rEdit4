<script setup lang="ts">
import { computed } from 'vue'
interface RGBColor { r: number; g: number; b: number; a?: number }
const props = defineProps<{ color?: RGBColor }>()
const cssColor = computed(() => props.color
  ? `rgba(${props.color.r},${props.color.g},${props.color.b},${(props.color.a ?? 255) / 255})`
  : null
)
</script>

<template>
  <div class="checker-swatch" :style="cssColor ? { '--cs-color': cssColor } : {}" />
</template>

<style scoped>
.checker-swatch {
  position: relative;
  overflow: hidden;
  background-image:
    linear-gradient(45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(-45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--rd-color-checker-light) 75%),
    linear-gradient(-45deg, transparent 75%, var(--rd-color-checker-light) 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: var(--rd-color-checker-dark);
}
.checker-swatch::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--cs-color, transparent);
}
</style>
