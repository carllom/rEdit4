<script setup lang="ts">
defineProps<{ modelValue?: string | number }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <select
    class="app-select"
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <slot />
  </select>
</template>

<style scoped>
.app-select {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-11);
  font-family: inherit;
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
}
.app-select:focus { border-color: var(--rd-color-accent); }
.app-select:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
