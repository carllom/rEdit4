<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'

const emit = defineEmits<{
  confirm: [name: string, width: number, height: number]
  cancel: []
}>()

const props = defineProps<{ open: boolean }>()

const name = ref('Image')
const width = ref(16)
const height = ref(16)

watch(() => props.open, (v) => {
  if (v) {
    name.value = 'Image'; width.value = 16; height.value = 16
    window.addEventListener('keydown', onKeydown)
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function clamp(v: number) { return Math.max(1, Math.min(512, v | 0)) }

function confirm() {
  const w = clamp(width.value)
  const h = clamp(height.value)
  if (w > 0 && h > 0) emit('confirm', name.value.trim() || 'Image', w, h)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') confirm()
}
</script>

<template>
  <AppDialog :open="open" title="New Image" @close="$emit('cancel')">
    <div class="field">
      <label>Name</label>
      <input v-model="name" type="text" class="input" maxlength="64" autofocus />
    </div>
    <div class="field-row">
      <div class="field">
        <label>Width</label>
        <input v-model.number="width" type="number" class="input num" min="1" max="512" />
      </div>
      <div class="field-sep">×</div>
      <div class="field">
        <label>Height</label>
        <input v-model.number="height" type="number" class="input num" min="1" max="512" />
      </div>
    </div>
    <div class="hint">1–512 pixels per axis</div>
    <template #actions>
      <AppButton @click="$emit('cancel')">Cancel</AppButton>
      <AppButton variant="primary" @click="confirm">Create</AppButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: var(--rd-space-2); flex: 1; }
.field label { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }

.field-row { display: flex; align-items: flex-end; gap: var(--rd-space-4); }
.field-sep { color: var(--rd-color-text-muted); padding-bottom: var(--rd-space-3); }

.input {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  padding: 4px 8px;
  outline: none;
  width: 100%;
}
.input:focus { border-color: var(--rd-color-accent); }
.input.num { width: 70px; }

.hint { font-size: var(--rd-text-10); color: var(--rd-color-text-muted); }
</style>
