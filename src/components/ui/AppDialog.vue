<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  stack?: boolean
  width?: string
}>()

defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="overlay"
      @click.self="$emit('close')"
      @keydown.esc.stop="$emit('close')"
    >
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        :style="props.width ? { width: props.width } : {}"
      >
        <div class="dialog-title">{{ props.title }}</div>
        <slot />
        <div :class="['dialog-actions', { stack: props.stack }]">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--rd-color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--rd-z-overlay);
}

.dialog {
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-3);
  box-shadow: var(--rd-shadow-dialog);
  padding: var(--rd-space-8) var(--rd-space-9);
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-6);
}

.dialog-title {
  font-size: var(--rd-text-14);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-strong);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--rd-space-4);
  margin-top: var(--rd-space-2);
}

.dialog-actions.stack {
  flex-direction: column;
  gap: var(--rd-space-3);
}
</style>
