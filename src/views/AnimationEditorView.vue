<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AnimationPanel from '../components/animation/AnimationPanel.vue'
import AnimationTimeline from '../components/animation/AnimationTimeline.vue'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { useAnimationHistoryStore } from '../stores/animationHistoryStore'
import { reorderFrame, updateFrameDuration } from '../domain/animationOps'
import type { AnimationCommand } from '../domain/animationHistory'

const project = useProjectStore()
const editor = useEditorStore()
const animHist = useAnimationHistoryStore()

const timelineRef = ref<InstanceType<typeof AnimationTimeline> | null>(null)

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
    case 'add-frame': {
      const frames = [...anim.frames]
      if (reverse) {
        frames.splice(cmd.insertIndex, 1)
      } else {
        frames.splice(cmd.insertIndex, 0, cmd.frame)
      }
      anim.frames = frames
      editor.clampFrameIndex(anim.frames.length)
      break
    }
    case 'remove-frame': {
      const frames = [...anim.frames]
      if (reverse) {
        frames.splice(cmd.removedIndex, 0, cmd.frame)
      } else {
        frames.splice(cmd.removedIndex, 1)
      }
      anim.frames = frames
      editor.clampFrameIndex(anim.frames.length)
      break
    }
    case 'reorder-frame':
      anim.frames = reorderFrame(
        anim.frames,
        reverse ? cmd.toIdx : cmd.fromIdx,
        reverse ? cmd.fromIdx : cmd.toIdx,
      )
      break
    case 'duration-change':
      anim.frames = updateFrameDuration(
        anim.frames,
        cmd.frameIndex,
        reverse ? cmd.oldDuration : cmd.newDuration,
      )
      break
    case 'duplicate-frame': {
      const frames = [...anim.frames]
      if (reverse) {
        frames.splice(cmd.insertIndex, 1)
      } else {
        frames.splice(cmd.insertIndex, 0, cmd.newFrame)
      }
      anim.frames = frames
      editor.clampFrameIndex(anim.frames.length)
      break
    }
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

  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
    e.preventDefault(); applyUndo(); return
  }
  if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
      (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
    e.preventDefault(); applyRedo(); return
  }
  if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault(); timelineRef.value?.deleteActiveFrame(); return
  }
  if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault(); timelineRef.value?.duplicateActiveFrame(); return
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
        <AnimationTimeline ref="timelineRef" />
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
  background: var(--rd-color-surface-1);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  overflow: hidden;
}

.placeholder-label {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  font-style: italic;
}
</style>
