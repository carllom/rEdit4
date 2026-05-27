<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'

const props = defineProps<{
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
}

watch(() => props.open, (v) => {
  if (v) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <AppDialog :open="open" :title="title" @close="$emit('cancel')">
    <div class="dialog-message">{{ message }}</div>
    <template #actions>
      <AppButton @click="$emit('cancel')">Cancel</AppButton>
      <AppButton variant="danger" @click="$emit('confirm')">{{ confirmLabel ?? 'Confirm' }}</AppButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.dialog-message {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text-muted);
  line-height: var(--rd-leading-relaxed);
}
</style>
