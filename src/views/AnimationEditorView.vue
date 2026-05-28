<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AnimationPanel from '../components/animation/AnimationPanel.vue'
import AnimationTimeline from '../components/animation/AnimationTimeline.vue'
import AnimationStageCanvas from '../components/animation/AnimationStageCanvas.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { useAnimationHistoryStore } from '../stores/animationHistoryStore'
import { reorderFrame, updateFrameDuration, updateFramePosition } from '../domain/animationOps'
import type { AnimationCommand } from '../domain/animationHistory'

const project = useProjectStore()
const editor = useEditorStore()
const animHist = useAnimationHistoryStore()

const timelineRef = ref<InstanceType<typeof AnimationTimeline> | null>(null)

// --- Undo / Redo ---

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
    case 'move-frame':
      anim.frames = updateFramePosition(
        anim.frames,
        cmd.frameIndex,
        reverse ? cmd.oldPosition : cmd.newPosition,
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

// --- Playback engine ---

const isPlaying = ref(false)
const pingpongDir = ref(1)  // +1 = forward, -1 = backward
let rafId: number | null = null
let lastTimestamp: number | null = null
let accumulated = 0

const animation = computed(() => {
  const id = editor.activeAnimationId
  return id ? project.getAnimation(id) : null
})

const frames = computed(() => animation.value?.frames ?? [])

function advanceFrame() {
  const fc = frames.value.length
  if (fc === 0) { pause(); return }
  const cur = editor.activeFrameIndex
  const mode = editor.playbackMode

  if (mode === 'loop') {
    editor.setActiveFrameIndex((cur + 1) % fc)
  } else if (mode === 'once') {
    if (cur >= fc - 1) { pause(); return }
    editor.setActiveFrameIndex(cur + 1)
  } else { // pingpong
    let next = cur + pingpongDir.value
    if (next >= fc) {
      pingpongDir.value = -1
      next = Math.max(0, fc - 2)
    } else if (next < 0) {
      pingpongDir.value = 1
      next = Math.min(fc - 1, 1)
    }
    editor.setActiveFrameIndex(next)
  }
}

function tick(ts: number) {
  if (!isPlaying.value) return
  if (frames.value.length === 0) { pause(); return }

  if (lastTimestamp !== null) {
    accumulated += ts - lastTimestamp
    let safety = 0
    while (isPlaying.value && safety++ < 100) {
      const dur = frames.value[editor.activeFrameIndex]?.duration ?? 100
      if (accumulated < dur) break
      accumulated -= dur
      advanceFrame()
    }
  }

  lastTimestamp = ts
  if (isPlaying.value) rafId = requestAnimationFrame(tick)
}

function play() {
  if (isPlaying.value) return
  if (frames.value.length === 0) return
  isPlaying.value = true
  lastTimestamp = null
  accumulated = 0
  rafId = requestAnimationFrame(tick)
}

function pause() {
  isPlaying.value = false
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  lastTimestamp = null
  accumulated = 0
}

function togglePlay() {
  if (isPlaying.value) pause()
  else play()
}

function stepBack() {
  if (isPlaying.value) pause()
  const fc = frames.value.length
  if (fc === 0) return
  editor.setActiveFrameIndex((editor.activeFrameIndex - 1 + fc) % fc)
}

function stepForward() {
  if (isPlaying.value) pause()
  const fc = frames.value.length
  if (fc === 0) return
  editor.setActiveFrameIndex((editor.activeFrameIndex + 1) % fc)
}

// Pause and reset direction when switching animations
watch(() => editor.activeAnimationId, () => {
  pause()
  pingpongDir.value = 1
})

// --- Keyboard ---

function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault(); togglePlay(); return
  }
  if (e.key === ',' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); stepBack(); return
  }
  if (e.key === '.' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault(); stepForward(); return
  }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
    e.preventDefault(); applyUndo(); return
  }
  if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
      (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
    e.preventDefault(); applyRedo(); return
  }
  if (e.key === 'Delete' && !isPlaying.value && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault(); timelineRef.value?.deleteActiveFrame(); return
  }
  if (e.key === 'd' && (e.ctrlKey || e.metaKey) && !isPlaying.value) {
    e.preventDefault(); timelineRef.value?.duplicateActiveFrame(); return
  }
}

function onVisibilityChange() {
  if (document.hidden) pause()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  pause()
})
</script>

<template>
  <div class="animation-editor-view">

    <AnimationPanel @undo="applyUndo" @redo="applyRedo" />

    <div class="main-area">
      <div class="stage-area">
        <AnimationStageCanvas :is-playing="isPlaying" />
      </div>
      <div class="playback-toolbar">
        <AppButton
          size="compact"
          :variant="isPlaying ? 'accent' : 'default'"
          :disabled="frames.length === 0"
          @click="togglePlay"
        >{{ isPlaying ? '⏸' : '▶' }}</AppButton>
        <span v-if="frames.length > 0" class="frame-counter">
          {{ editor.activeFrameIndex + 1 }} / {{ frames.length }}
        </span>
      </div>
      <div class="timeline-area">
        <AnimationTimeline ref="timelineRef" :is-playing="isPlaying" />
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
  align-items: stretch;
  overflow: hidden;
  background: var(--rd-color-surface-0, var(--rd-color-surface-1));
}

.playback-toolbar {
  height: var(--rd-hit-md);
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  border-top: var(--rd-border-w) solid var(--rd-color-border);
  border-bottom: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  align-items: center;
  padding: 0 var(--rd-space-4);
  gap: var(--rd-space-3);
}

.frame-counter {
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  font-family: var(--rd-font-mono);
}

.timeline-area {
  height: 120px;
  flex-shrink: 0;
  background: var(--rd-color-surface-1);
  overflow: hidden;
}
</style>
