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
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 20px 24px;
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.dialog-message {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

.btn {
  padding: 5px 14px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-3);
  color: var(--color-text);
  cursor: pointer;
  font-size: 12px;
}
.btn:hover { background: var(--color-surface); }
.btn.danger { background: var(--color-danger); border-color: var(--color-danger); color: #fff; font-weight: 600; }
.btn.danger:hover { opacity: 0.85; }
</style>
