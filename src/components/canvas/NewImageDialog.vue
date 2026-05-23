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

.field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.field label { font-size: 11px; color: var(--color-text-muted); }

.field-row { display: flex; align-items: flex-end; gap: 8px; }
.field-sep { color: var(--color-text-muted); padding-bottom: 6px; }

.input {
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  width: 100%;
}
.input:focus { border-color: var(--color-accent); }
.input.num { width: 70px; }

.hint { font-size: 10px; color: var(--color-text-muted); }

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
.btn.primary { background: var(--color-accent); border-color: var(--color-accent); color: #000; font-weight: 600; }
.btn.primary:hover { background: var(--color-accent-hover); }
</style>
