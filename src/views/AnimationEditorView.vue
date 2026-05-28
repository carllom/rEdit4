<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AnimationPanel from '../components/animation/AnimationPanel.vue'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { useAnimationHistoryStore } from '../stores/animationHistoryStore'
import type { AnimationCommand } from '../domain/animationHistory'

const project = useProjectStore()
const editor = useEditorStore()
const animHist = useAnimationHistoryStore()

function applyCmd(cmd: AnimationCommand, reverse: boolean) {
  const id = editor.activeAnimationId
  const anim = id ? project.getAnimation(id) : null
  if (!anim) return

  switch (cmd.type) {
    case 'rename-animation':
      anim.name = reverse ? cmd.oldName : cmd.newName
      break
    case 'stage-resize':
      anim.width = reverse ? cmd.oldWidth : cmd.newWidth
      anim.height = reverse ? cmd.oldHeight : cmd.newHeight
      break
    // Frame commands handled in later slices
  }
  project.markDirty()
}

function applyUndo() {
  const id = editor.activeAnimationId
  if (!id) return
  const cmd = animHist.undo(id)
  if (cmd) applyCmd(cmd, true)
}

function applyRedo() {
  const id = editor.activeAnimationId
  if (!id) return
  const cmd = animHist.redo(id)
  if (cmd) applyCmd(cmd, false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); applyUndo(); return }
  if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
    e.preventDefault(); applyRedo(); return
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="animation-editor-view">

    <AnimationPanel @undo="applyUndo" @redo="applyRedo" />

    <div class="main-area">
      <div class="stage-area">
        <span class="placeholder-label">Stage — coming in next slice</span>
      </div>
      <div class="timeline-area">
        <span class="placeholder-label">Timeline — coming in next slice</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animation-editor-view {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.stage-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rd-color-surface-0, var(--rd-color-surface-1));
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
}

.timeline-area {
  height: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rd-color-surface-1);
}

.placeholder-label {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  font-style: italic;
}
</style>
