<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') emit('confirm')
  if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('cancel')" @keydown="onKeydown">
      <div class="dialog" role="dialog" aria-modal="true">
        <div class="dialog-title">{{ title }}</div>
        <div class="dialog-message">{{ message }}</div>
        <div class="actions">
          <button class="btn" @click="$emit('cancel')">Cancel</button>
          <button class="btn danger" @click="$emit('confirm')">{{ confirmLabel ?? 'Confirm' }}</button>
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

.dialog-message {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text-muted);
  line-height: var(--rd-leading-relaxed);
}

.actions { display: flex; justify-content: flex-end; gap: var(--rd-space-4); margin-top: var(--rd-space-2); }

.btn {
  padding: 5px 12px;
  border-radius: var(--rd-radius-1);
  border: var(--rd-border-w) solid var(--rd-color-border);
  background: var(--rd-color-surface-3);
  color: var(--rd-color-text);
  cursor: pointer;
  font-size: var(--rd-text-12);
}
.btn:hover { background: var(--rd-color-surface-2); border-color: var(--rd-color-text-muted); }
.btn.danger {
  background: var(--rd-color-danger);
  border-color: var(--rd-color-danger);
  color: var(--rd-color-danger-fg);
  font-weight: var(--rd-weight-semibold);
}
.btn.danger:hover { opacity: 0.85; }
</style>
