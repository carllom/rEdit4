<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useSheetStore } from '../../stores/sheetStore'
import { useProjectStore } from '../../stores/projectStore'

const sheetStore = useSheetStore()
const projectStore = useProjectStore()

const sheets = computed(() => projectStore.project?.sheets ?? [])
const activeSheet = computed(() => sheets.value.find(s => s.id === sheetStore.activeSheetId) ?? null)

const isRenaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

function selectSheet(id: string) {
  sheetStore.activeSheetId = id
}

async function startRename() {
  if (!activeSheet.value) return
  renameValue.value = activeSheet.value.name
  isRenaming.value = true
  await nextTick()
  renameInput.value?.select()
}

function commitRename() {
  if (!activeSheet.value) return
  const name = renameValue.value.trim()
  if (name) sheetStore.renameSheet(activeSheet.value.id, name)
  isRenaming.value = false
}

function cancelRename() {
  isRenaming.value = false
}

function onRenameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); commitRename() }
  else if (e.key === 'Escape') cancelRename()
}

function onNewSheet() {
  if (!projectStore.project) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const name = file.name.replace(/\.png$/i, '')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const sheet = sheetStore.addSheet(name)
      if (sheet) {
        sheet.sourceRef = dataUrl
        projectStore.markDirty()
      }
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
</script>

<template>
  <div class="sheet-selector">
    <template v-if="!isRenaming">
      <select
        class="sheet-select"
        :value="sheetStore.activeSheetId ?? ''"
        :disabled="sheets.length === 0"
        @change="(e) => selectSheet((e.target as HTMLSelectElement).value)"
      >
        <option v-if="sheets.length === 0" value="">No sheets</option>
        <option v-for="s in sheets" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <button
        class="icon-btn"
        :disabled="!activeSheet"
        title="Rename sheet"
        @click="startRename"
      >✎</button>
    </template>
    <template v-else>
      <input
        ref="renameInput"
        v-model="renameValue"
        class="rename-input"
        @keydown="onRenameKeydown"
        @blur="commitRename"
      />
    </template>
    <button class="new-btn" :disabled="!projectStore.project" @click="onNewSheet">+ New Sheet</button>
  </div>
</template>

<style scoped>
.sheet-selector {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
}

.sheet-select {
  height: var(--rd-hit-md);
  padding: 0 var(--rd-space-4);
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  font-family: inherit;
  cursor: pointer;
  min-width: 140px;
}
.sheet-select:disabled { opacity: 0.5; cursor: not-allowed; }

.rename-input {
  height: var(--rd-hit-md);
  padding: 0 var(--rd-space-4);
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-accent);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  font-family: inherit;
  min-width: 140px;
  outline: none;
}

.icon-btn {
  width: var(--rd-hit-md);
  height: var(--rd-hit-md);
  background: none;
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text-muted);
  cursor: pointer;
  font-size: var(--rd-text-12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover:not(:disabled) { background: var(--rd-color-surface-2); color: var(--rd-color-text); }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.new-btn {
  padding: 0 var(--rd-space-5);
  height: var(--rd-hit-md);
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  cursor: pointer;
  font-size: var(--rd-text-11);
  white-space: nowrap;
  font-family: inherit;
}
.new-btn:hover:not(:disabled) { background: var(--rd-color-surface-3); border-color: var(--rd-color-text-muted); }
.new-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
