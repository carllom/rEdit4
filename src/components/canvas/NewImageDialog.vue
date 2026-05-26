<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  confirm: [name: string, width: number, height: number]
  cancel: []
}>()

const props = defineProps<{ open: boolean }>()

const name = ref('Image')
const width = ref(16)
const height = ref(16)

watch(() => props.open, (v) => {
  if (v) { name.value = 'Image'; width.value = 16; height.value = 16 }
})

function clamp(v: number) { return Math.max(1, Math.min(512, v | 0)) }

function confirm() {
  const w = clamp(width.value)
  const h = clamp(height.value)
  if (w > 0 && h > 0) emit('confirm', name.value.trim() || 'Image', w, h)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') confirm()
  if (e.key === 'Escape') emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('cancel')" @keydown="onKeydown">
      <div class="dialog" role="dialog" aria-modal="true" aria-label="New Image">
        <div class="dialog-title">New Image</div>
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
        <div class="actions">
          <button class="btn" @click="$emit('cancel')">Cancel</button>
          <button class="btn primary" @click="confirm">Create</button>
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
.btn.primary {
  background: var(--rd-color-accent);
  border-color: var(--rd-color-accent);
  color: var(--rd-color-accent-fg);
  font-weight: var(--rd-weight-semibold);
}
.btn.primary:hover { background: var(--rd-color-accent-hover); border-color: var(--rd-color-accent-hover); }
</style>
