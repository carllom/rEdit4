<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import NumericInput from '../ui/NumericInput.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useAnimationHistoryStore } from '../../stores/animationHistoryStore'
import { updateFramePosition } from '../../domain/animationOps'
import type { Point } from '../../domain/model'

const project = useProjectStore()
const editor = useEditorStore()
const animHist = useAnimationHistoryStore()

const animations = computed(() => project.project?.animations ?? [])
const activeAnimation = computed(() =>
  editor.activeAnimationId ? project.getAnimation(editor.activeAnimationId) ?? null : null
)

// Sync history store's active animation with editor store
watch(() => editor.activeAnimationId, id => animHist.setActiveAnimation(id ?? null), { immediate: true })

// Auto-select first animation if nothing is selected
watch(animations, (list) => {
  if (!editor.activeAnimationId && list.length > 0) {
    editor.setActiveAnimation(list[0].id)
  }
}, { immediate: true })

// --- Add Animation dialog ---
const showAddDialog = ref(false)
const newAnimName = ref('Animation')
const newAnimWidth = ref(16)
const newAnimHeight = ref(16)

function openAddDialog() {
  newAnimName.value = 'Animation'
  newAnimWidth.value = 16
  newAnimHeight.value = 16
  showAddDialog.value = true
}

function confirmAddAnimation() {
  showAddDialog.value = false
  const name = newAnimName.value.trim() || 'Animation'
  const anim = project.addAnimation(name, newAnimWidth.value, newAnimHeight.value)
  if (anim) editor.setActiveAnimation(anim.id)
}

// --- Delete Animation ---
const animToDeleteId = ref<string | null>(null)
const animToDelete = computed(() =>
  animToDeleteId.value ? project.getAnimation(animToDeleteId.value) ?? null : null
)

function requestDeleteAnimation(id: string) {
  const anim = project.getAnimation(id)
  if (!anim) return
  if (anim.frames.length > 0) {
    animToDeleteId.value = id
  } else {
    doDeleteAnimation(id)
  }
}

function doDeleteAnimation(id: string) {
  animHist.clearFor(id)
  project.removeAnimation(id)
  if (editor.activeAnimationId === id) {
    const remaining = animations.value.filter(a => a.id !== id)
    editor.setActiveAnimation(remaining.length > 0 ? remaining[0].id : null)
  }
}

function confirmDeleteAnimation() {
  const id = animToDeleteId.value
  animToDeleteId.value = null
  if (id) doDeleteAnimation(id)
}

// --- Inline rename ---
const renamingAnimId = ref<string | null>(null)
const renameDraft = ref('')

function beginRenameAnimation(id: string, currentName: string) {
  renamingAnimId.value = id
  renameDraft.value = currentName
}

function commitRenameAnimation() {
  const id = renamingAnimId.value
  renamingAnimId.value = null
  const anim = id ? project.getAnimation(id) : null
  if (!anim) return
  const newName = renameDraft.value.trim() || anim.name
  if (newName === anim.name) return
  animHist.push(id!, { type: 'rename-animation', oldName: anim.name, newName })
  anim.name = newName
  project.markDirty()
}

// --- Stage resize (with "before" snapshot for single history entry per interaction) ---
const stageResizeBefore = ref<{ width: number; height: number } | null>(null)

watch(() => editor.activeAnimationId, () => { stageResizeBefore.value = null })

const stageWidth = computed({
  get() { return activeAnimation.value?.width ?? 16 },
  set(v: number) {
    const anim = activeAnimation.value
    if (!anim) return
    if (stageResizeBefore.value === null) stageResizeBefore.value = { width: anim.width, height: anim.height }
    anim.width = v
    project.markDirty()
  },
})

const stageHeight = computed({
  get() { return activeAnimation.value?.height ?? 16 },
  set(v: number) {
    const anim = activeAnimation.value
    if (!anim) return
    if (stageResizeBefore.value === null) stageResizeBefore.value = { width: anim.width, height: anim.height }
    anim.height = v
    project.markDirty()
  },
})

function commitStageResize() {
  const anim = activeAnimation.value
  const before = stageResizeBefore.value
  stageResizeBefore.value = null
  if (!before || !anim) return
  if (before.width === anim.width && before.height === anim.height) return
  animHist.push(anim.id, {
    type: 'stage-resize',
    oldWidth: before.width, oldHeight: before.height,
    newWidth: anim.width, newHeight: anim.height,
  })
}

// --- Active frame position (with "before" snapshot) ---
const activeFrame = computed(() => {
  const anim = activeAnimation.value
  if (!anim) return null
  return anim.frames[editor.activeFrameIndex] ?? null
})

const framePosBefore = ref<Point | null>(null)

watch(() => editor.activeAnimationId, () => { framePosBefore.value = null })
watch(() => editor.activeFrameIndex, () => { framePosBefore.value = null })

const frameX = computed({
  get() { return activeFrame.value?.position.x ?? 0 },
  set(v: number) {
    const anim = activeAnimation.value
    const frame = activeFrame.value
    if (!anim || !frame) return
    if (framePosBefore.value === null) framePosBefore.value = { ...frame.position }
    anim.frames = updateFramePosition(anim.frames, editor.activeFrameIndex, { x: v, y: frame.position.y })
    project.markDirty()
  },
})

const frameY = computed({
  get() { return activeFrame.value?.position.y ?? 0 },
  set(v: number) {
    const anim = activeAnimation.value
    const frame = activeFrame.value
    if (!anim || !frame) return
    if (framePosBefore.value === null) framePosBefore.value = { ...frame.position }
    anim.frames = updateFramePosition(anim.frames, editor.activeFrameIndex, { x: frame.position.x, y: v })
    project.markDirty()
  },
})

function commitFramePos() {
  const anim = activeAnimation.value
  const frame = activeFrame.value
  const before = framePosBefore.value
  framePosBefore.value = null
  if (!anim || !frame || !before) return
  if (before.x === frame.position.x && before.y === frame.position.y) return
  animHist.push(anim.id, {
    type: 'move-frame',
    frameIndex: editor.activeFrameIndex,
    oldPosition: before,
    newPosition: { ...frame.position },
  })
}

// --- Expose for parent undo/redo row ---
defineExpose({ animHist })
</script>

<template>
  <aside class="animation-panel">

    <div class="panel-header">
      <span class="panel-title">Animations</span>
      <AppButton size="compact" variant="accent" @click="openAddDialog">+</AppButton>
    </div>

    <div class="anim-list">
      <div v-if="animations.length === 0" class="empty-list">No animations</div>
      <div
        v-for="anim in animations"
        :key="anim.id"
        :class="['anim-item', { active: editor.activeAnimationId === anim.id }]"
        @click="editor.setActiveAnimation(anim.id)"
        @dblclick="beginRenameAnimation(anim.id, anim.name)"
      >
        <div class="anim-item-body">
          <input
            v-if="renamingAnimId === anim.id"
            v-model="renameDraft"
            class="rename-input"
            autofocus
            @blur="commitRenameAnimation"
            @keydown.enter.prevent="commitRenameAnimation"
            @keydown.escape.prevent="renamingAnimId = null"
            @click.stop
          />
          <span v-else class="anim-name">{{ anim.name }}</span>
          <span class="anim-dims">{{ anim.width }}×{{ anim.height }}</span>
        </div>
        <button class="anim-delete" title="Delete animation" @click.stop="requestDeleteAnimation(anim.id)">×</button>
      </div>
    </div>

    <!-- Stage size inputs for active animation -->
    <div v-if="activeAnimation" class="stage-section">
      <div class="section-label">Stage</div>
      <div class="stage-row">
        <label class="field-label">W</label>
        <NumericInput v-model="stageWidth" :min="1" :max="1024" @blur="commitStageResize" @change="commitStageResize" />
        <label class="field-label">H</label>
        <NumericInput v-model="stageHeight" :min="1" :max="1024" @blur="commitStageResize" @change="commitStageResize" />
      </div>
    </div>

    <!-- Frame position inputs -->
    <div v-if="activeFrame" class="stage-section">
      <div class="section-label">Frame position</div>
      <div class="stage-row">
        <label class="field-label">X</label>
        <NumericInput v-model="frameX" :min="-4096" :max="4096" @blur="commitFramePos" @change="commitFramePos" />
        <label class="field-label">Y</label>
        <NumericInput v-model="frameY" :min="-4096" :max="4096" @blur="commitFramePos" @change="commitFramePos" />
      </div>
    </div>

    <!-- Undo / Redo -->
    <div v-if="editor.activeAnimationId" class="undo-row">
      <AppButton size="compact" variant="ghost" :disabled="!animHist.canUndo" @click="$emit('undo')">↩ Undo</AppButton>
      <AppButton size="compact" variant="ghost" :disabled="!animHist.canRedo" @click="$emit('redo')">↪ Redo</AppButton>
    </div>

  </aside>

  <!-- New Animation dialog -->
  <AppDialog :open="showAddDialog" title="New Animation" @close="showAddDialog = false">
    <div class="field">
      <label class="field-label">Name</label>
      <input
        v-model="newAnimName"
        class="dialog-input"
        type="text"
        maxlength="64"
        autofocus
        @keydown.enter.prevent="confirmAddAnimation"
      />
    </div>
    <div class="field-row">
      <div class="field">
        <label class="field-label">Width</label>
        <NumericInput v-model="newAnimWidth" :min="1" :max="1024" />
      </div>
      <div class="field">
        <label class="field-label">Height</label>
        <NumericInput v-model="newAnimHeight" :min="1" :max="1024" />
      </div>
    </div>
    <template #actions>
      <AppButton @click="showAddDialog = false">Cancel</AppButton>
      <AppButton variant="primary" @click="confirmAddAnimation">Create</AppButton>
    </template>
  </AppDialog>

  <!-- Delete confirmation -->
  <ConfirmDialog
    :open="animToDeleteId !== null"
    title="Delete Animation"
    :message="`Delete '${animToDelete?.name ?? ''}'? This cannot be undone.`"
    confirm-label="Delete"
    @confirm="confirmDeleteAnimation"
    @cancel="animToDeleteId = null"
  />
</template>

<style scoped>
.animation-panel {
  width: 180px;
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  border-right: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--rd-space-3) var(--rd-space-4);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

.panel-title {
  font-size: var(--rd-text-11);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.anim-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--rd-space-2) 0;
}

.empty-list {
  padding: var(--rd-space-4) var(--rd-space-5);
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
}

.anim-item {
  display: flex;
  align-items: center;
  padding: var(--rd-space-2) var(--rd-space-4);
  cursor: pointer;
  border-left: 2px solid transparent;
  gap: var(--rd-space-2);
}
.anim-item:hover { background: var(--rd-color-surface-2); }
.anim-item.active {
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
}

.anim-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.anim-name {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anim-dims {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  font-family: var(--rd-font-mono);
}

.rename-input {
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-accent);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  padding: 1px var(--rd-space-2);
  outline: none;
  min-width: 0;
  width: 100%;
}

.anim-delete {
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
.anim-item:hover .anim-delete { opacity: 1; }
.anim-delete:hover { background: var(--rd-color-surface-3); color: var(--rd-color-danger); }

/* Stage resize section */
.stage-section {
  padding: var(--rd-space-3) var(--rd-space-4);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
}

.section-label {
  font-size: var(--rd-text-11);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stage-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
}

.field-label {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
}

.stage-row :deep(input) {
  width: 48px;
}

/* Undo row */
.undo-row {
  display: flex;
  gap: var(--rd-space-2);
  padding: var(--rd-space-3) var(--rd-space-4);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  flex-shrink: 0;
}

/* Dialog fields */
.field { display: flex; flex-direction: column; gap: var(--rd-space-2); }
.field-row { display: flex; gap: var(--rd-space-4); }
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
