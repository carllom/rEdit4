<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  stacked?: boolean
}>()
</script>

<template>
  <div :class="['setting-row', { 'setting-row--stacked': stacked }]">
    <div class="setting-label">
      <span class="setting-name">{{ label }}</span>
      <span v-if="description" class="rd-caption">{{ description }}</span>
    </div>
    <div class="setting-control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
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

.setting-control {
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
  flex-shrink: 0;
}
</style>
