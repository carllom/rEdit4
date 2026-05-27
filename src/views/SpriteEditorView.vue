<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AppButton from '../components/ui/AppButton.vue'
import AppDialog from '../components/ui/AppDialog.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import SpriteCanvas from '../components/sprite/SpriteCanvas.vue'
import PartPanel from '../components/sprite/PartPanel.vue'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { useSpriteHistoryStore } from '../stores/spriteHistoryStore'
import { addPart, removePart, reorderPart, movePart, renamePart, renameSprite, moveAnchor } from '../domain/spriteOps'
import type { SpriteCommand } from '../domain/spriteHistory'
import type { Sprite } from '../domain/model'

const project = useProjectStore()
const editor = useEditorStore()
const spriteHist = useSpriteHistoryStore()

const sprites = computed(() => project.project?.sprites ?? [])
const activeSprite = computed(() => editor.activeSpriteId ? project.getSprite(editor.activeSpriteId) ?? null : null)

// Sync history store's active sprite with editor store
watch(() => editor.activeSpriteId, id => spriteHist.setActiveSprite(id ?? null), { immediate: true })

// Auto-select first sprite when opening view if nothing selected
watch(sprites, (list) => {
  if (!editor.activeSpriteId && list.length > 0) {
    editor.setActiveSprite(list[0].id)
  }
}, { immediate: true })

// --- Add Sprite dialog ---
const showAddDialog = ref(false)
const newSpriteName = ref('Sprite')

function openAddDialog() {
  newSpriteName.value = 'Sprite'
  showAddDialog.value = true
}
function confirmAddSprite() {
  showAddDialog.value = false
  const name = newSpriteName.value.trim() || 'Sprite'
  const sprite = project.addSprite(name)
  if (sprite) editor.setActiveSprite(sprite.id)
}

// --- Delete Sprite ---
const spriteToDeleteId = ref<string | null>(null)
const spriteToDeleteName = computed(() => spriteToDeleteId.value ? (project.getSprite(spriteToDeleteId.value)?.name ?? '') : '')

function requestDeleteSprite(id: string) { spriteToDeleteId.value = id }
function confirmDeleteSprite() {
  const id = spriteToDeleteId.value
  spriteToDeleteId.value = null
  if (!id) return
  spriteHist.clearFor(id)
  project.removeSprite(id)
  if (editor.activeSpriteId === id) {
    const remaining = sprites.value.filter(s => s.id !== id)
    editor.setActiveSprite(remaining.length > 0 ? remaining[0].id : null)
  }
}

// --- Inline sprite rename ---
const renamingSpriteId = ref<string | null>(null)
const renameDraft = ref('')

function beginRenameSprite(id: string, currentName: string) {
  renamingSpriteId.value = id
  renameDraft.value = currentName
}
function commitRenameSprite() {
  const id = renamingSpriteId.value
  renamingSpriteId.value = null
  const spr = id ? project.getSprite(id) : null
  if (!spr) return
  const newName = renameDraft.value.trim() || spr.name
  if (newName === spr.name) return
  spriteHist.push(id!, { type: 'rename-sprite', oldName: spr.name, newName })
  spr.name = newName
  project.markDirty()
}

// --- Canvas ref (for requestRedraw after undo/redo) ---
const canvasRef = ref<InstanceType<typeof SpriteCanvas> | null>(null)
const partPanelRef = ref<InstanceType<typeof PartPanel> | null>(null)

// --- Undo / Redo ---
function applyCmd(spr: Sprite, cmd: SpriteCommand, reverse: boolean) {
  switch (cmd.type) {
    case 'add-part': {
      if (reverse) {
        spr.parts = removePart(spr.parts, cmd.insertIndex)
        if (editor.activePartIndex === cmd.insertIndex) editor.setActivePartIndex(null)
      } else {
        const parts = [...spr.parts]
        parts.splice(cmd.insertIndex, 0, { ...cmd.part })
        spr.parts = parts
      }
      break
    }
    case 'remove-part': {
      if (reverse) {
        const parts = [...spr.parts]
        parts.splice(cmd.removedIndex, 0, { ...cmd.part })
        spr.parts = parts
      } else {
        spr.parts = removePart(spr.parts, cmd.removedIndex)
      }
      break
    }
    case 'reorder-part':
      spr.parts = reorderPart(spr.parts, reverse ? cmd.toIdx : cmd.fromIdx, reverse ? cmd.fromIdx : cmd.toIdx)
      break
    case 'move-part':
      spr.parts = movePart(spr.parts, cmd.partIndex, reverse ? cmd.oldPosition : cmd.newPosition)
      break
    case 'move-anchor':
      spr.anchor = reverse ? { ...cmd.oldAnchor } : { ...cmd.newAnchor }
      break
    case 'rename-part':
      spr.parts = renamePart(spr.parts, cmd.partIndex, reverse ? cmd.oldName : cmd.newName)
      break
    case 'rename-sprite':
      spr.name = reverse ? cmd.oldName : cmd.newName
      break
  }
}

function applyUndo() {
  const id = editor.activeSpriteId
  const spr = id ? project.getSprite(id) : null
  if (!id || !spr) return
  const cmd = spriteHist.undo(id)
  if (cmd) { applyCmd(spr, cmd, true); project.markDirty() }
  canvasRef.value?.requestRedraw()
}

function applyRedo() {
  const id = editor.activeSpriteId
  const spr = id ? project.getSprite(id) : null
  if (!id || !spr) return
  const cmd = spriteHist.redo(id)
  if (cmd) { applyCmd(spr, cmd, false); project.markDirty() }
  canvasRef.value?.requestRedraw()
}

// --- Keyboard ---
function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); applyUndo(); return }
  if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
    e.preventDefault(); applyRedo(); return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && editor.activeSpriteId) {
    partPanelRef.value?.removeSelectedPart()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="sprite-editor-view">

    <!-- Left: Sprite list sidebar -->
    <aside class="sprite-list-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">Sprites</span>
        <AppButton size="compact" variant="accent" @click="openAddDialog">+</AppButton>
      </div>

      <div class="sprite-list">
        <div v-if="sprites.length === 0" class="empty-sprites">No sprites</div>
        <div
          v-for="spr in sprites"
          :key="spr.id"
          :class="['sprite-item', { active: editor.activeSpriteId === spr.id }]"
          @click="editor.setActiveSprite(spr.id)"
          @dblclick="beginRenameSprite(spr.id, spr.name)"
        >
          <input
            v-if="renamingSpriteId === spr.id"
            v-model="renameDraft"
            class="rename-input"
            autofocus
            @blur="commitRenameSprite"
            @keydown.enter.prevent="commitRenameSprite"
            @keydown.escape.prevent="renamingSpriteId = null"
            @click.stop
          />
          <span v-else class="sprite-name">{{ spr.name }}</span>
          <button class="sprite-delete" title="Delete sprite" @click.stop="requestDeleteSprite(spr.id)">×</button>
        </div>
      </div>

      <div v-if="editor.activeSpriteId" class="sidebar-undo-row">
        <AppButton size="compact" variant="ghost" :disabled="!spriteHist.canUndo" @click="applyUndo">↩ Undo</AppButton>
        <AppButton size="compact" variant="ghost" :disabled="!spriteHist.canRedo" @click="applyRedo">↪ Redo</AppButton>
      </div>
    </aside>

    <!-- Center: Canvas or empty state -->
    <template v-if="activeSprite">
      <SpriteCanvas
        ref="canvasRef"
        :sprite-id="activeSprite.id"
        @part-selected="editor.setActivePartIndex($event)"
      />
      <PartPanel
        ref="partPanelRef"
        :sprite-id="activeSprite.id"
      />
    </template>
    <div v-else class="empty-state">
      <p>No sprite selected.</p>
      <AppButton size="compact" @click="openAddDialog">+ New Sprite</AppButton>
    </div>

    <!-- Add Sprite dialog -->
    <AppDialog :open="showAddDialog" title="New Sprite" @close="showAddDialog = false">
      <div class="field">
        <label class="field-label">Name</label>
        <input
          v-model="newSpriteName"
          class="dialog-input"
          type="text"
          maxlength="64"
          autofocus
          @keydown.enter.prevent="confirmAddSprite"
        />
      </div>
      <template #actions>
        <AppButton @click="showAddDialog = false">Cancel</AppButton>
        <AppButton variant="primary" @click="confirmAddSprite">Create</AppButton>
      </template>
    </AppDialog>

    <!-- Delete Sprite confirm -->
    <ConfirmDialog
      :open="spriteToDeleteId !== null"
      title="Delete Sprite"
      :message="`Delete '${spriteToDeleteName}'? This cannot be undone.`"
      confirm-label="Delete"
      @confirm="confirmDeleteSprite"
      @cancel="spriteToDeleteId = null"
    />
  </div>
</template>

<style scoped>
.sprite-editor-view {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

/* ---- Left sidebar ---- */
.sprite-list-sidebar {
  width: 180px;
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  border-right: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--rd-space-3) var(--rd-space-4);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}
.sidebar-title {
  font-size: var(--rd-text-11);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sprite-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--rd-space-2) 0;
}

.empty-sprites {
  padding: var(--rd-space-4) var(--rd-space-5);
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
}

.sprite-item {
  display: flex;
  align-items: center;
  padding: var(--rd-space-2) var(--rd-space-4);
  cursor: pointer;
  border-left: 2px solid transparent;
  font-size: var(--rd-text-12);
  color: var(--rd-color-text-muted);
  gap: var(--rd-space-2);
}
.sprite-item:hover { background: var(--rd-color-surface-2); color: var(--rd-color-text); }
.sprite-item.active {
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
  color: var(--rd-color-text);
}

.sprite-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.rename-input {
  flex: 1;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-accent);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  padding: 1px var(--rd-space-2);
  outline: none;
  min-width: 0;
}

.sprite-delete {
  flex-shrink: 0;
  opacity: 0;
  background: none;
  border: none;
  color: var(--rd-color-text-muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  border-radius: var(--rd-radius-1);
}
.sprite-item:hover .sprite-delete { opacity: 1; }
.sprite-delete:hover { background: var(--rd-color-surface-3); color: var(--rd-color-danger); }

.sidebar-undo-row {
  display: flex;
  gap: var(--rd-space-2);
  padding: var(--rd-space-3) var(--rd-space-4);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

/* ---- Empty state ---- */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--rd-space-6);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-13);
}

/* ---- Add dialog fields ---- */
.field { display: flex; flex-direction: column; gap: var(--rd-space-2); }
.field-label { font-size: var(--rd-text-11); color: var(--rd-color-text-muted); }
.dialog-input {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  padding: 4px 8px;
  outline: none;
}
.dialog-input:focus { border-color: var(--rd-color-accent); }
</style>
