<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import SpritePicker from './SpritePicker.vue'
import NumericInput from '../ui/NumericInput.vue'
import { renderSpriteThumbnail, SPRITE_THUMB_PX } from '../../renderer/spriteThumbnail'
import { removeFrame, reorderFrame, updateFrameDuration, duplicateFrame } from '../../domain/animationOps'
import { uid } from '../../domain/color'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useAnimationHistoryStore } from '../../stores/animationHistoryStore'
import type { Frame } from '../../domain/model'

const project = useProjectStore()
const editor = useEditorStore()
const animHist = useAnimationHistoryStore()

const props = withDefaults(defineProps<{ isPlaying?: boolean }>(), { isPlaying: false })

const stripEl = ref<HTMLElement | null>(null)
const pickerOpen = ref(false)

const animation = computed(() => {
  const id = editor.activeAnimationId
  return id ? project.getAnimation(id) : null
})

const frames = computed(() => animation.value?.frames ?? [])
const activeIndex = computed(() => editor.activeFrameIndex)

// Scroll active frame cell into view during playback
watch(activeIndex, (idx) => {
  nextTick(() => {
    if (!stripEl.value) return
    const cells = stripEl.value.querySelectorAll<HTMLElement>('.frame-cell')
    cells[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
})

// --- SpritePicker ---

function openPicker() {
  pickerOpen.value = true
}

function onSpriteConfirmed(spriteId: string) {
  pickerOpen.value = false
  const anim = animation.value
  if (!anim) return
  const insertIndex = frames.value.length === 0 ? 0 : Math.min(activeIndex.value + 1, frames.value.length)
  const newFrame: Frame = { id: uid(), spriteId, position: { x: 0, y: 0 }, duration: 100 }
  const newFrames = [...anim.frames]
  newFrames.splice(insertIndex, 0, newFrame)
  anim.frames = newFrames
  animHist.push(anim.id, { type: 'add-frame', frame: newFrame, insertIndex })
  editor.setActiveFrameIndex(insertIndex)
  project.markDirty()
}

// --- Frame selection ---

function selectFrame(index: number) {
  editor.setActiveFrameIndex(index)
}

// --- Delete frame ---

function deleteFrame(index: number) {
  const anim = animation.value
  if (!anim || anim.frames.length === 0) return
  const frame = anim.frames[index]
  if (!frame) return
  anim.frames = removeFrame(anim.frames, index)
  animHist.push(anim.id, { type: 'remove-frame', frame, removedIndex: index })
  editor.clampFrameIndex(anim.frames.length)
  project.markDirty()
}

// --- Duplicate frame (exposed for parent keyboard handler) ---

function duplicateActiveFrame() {
  const anim = animation.value
  if (!anim || anim.frames.length === 0) return
  const idx = editor.activeFrameIndex
  const newFrames = duplicateFrame(anim.frames, idx)
  const insertIndex = idx + 1
  const newFrame = newFrames[insertIndex]
  anim.frames = newFrames
  animHist.push(anim.id, { type: 'duplicate-frame', originalIndex: idx, newFrame, insertIndex })
  editor.setActiveFrameIndex(insertIndex)
  project.markDirty()
}

defineExpose({ deleteActiveFrame: () => deleteFrame(editor.activeFrameIndex), duplicateActiveFrame })

// --- Duration editing (before-snapshot pattern) ---

const durationBefore = ref<number | null>(null)
const durationBeforeIdx = ref(-1)

function onDurationUpdate(index: number, value: number) {
  const anim = animation.value
  if (!anim) return
  const frame = anim.frames[index]
  if (!frame) return
  if (durationBefore.value === null || durationBeforeIdx.value !== index) {
    durationBefore.value = frame.duration
    durationBeforeIdx.value = index
  }
  anim.frames = updateFrameDuration(anim.frames, index, value)
  project.markDirty()
}

function onDurationCommit(index: number) {
  const anim = animation.value
  if (!anim || durationBefore.value === null || durationBeforeIdx.value !== index) return
  const frame = anim.frames[index]
  if (!frame) return
  const before = durationBefore.value
  durationBefore.value = null
  durationBeforeIdx.value = -1
  if (before === frame.duration) return
  animHist.push(anim.id, {
    type: 'duration-change',
    frameIndex: index,
    oldDuration: before,
    newDuration: frame.duration,
  })
}

// --- Drag-to-reorder (pointer events, horizontal) ---

const dragSourceIdx = ref(-1)
const dragOverIdx = ref(-1)
const dropIndicatorLeft = ref(-1)

function onDragStart(e: PointerEvent, idx: number) {
  if (props.isPlaying) return
  e.preventDefault()
  dragSourceIdx.value = idx
  dragOverIdx.value = idx
  dropIndicatorLeft.value = -1
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd, { once: true })
  window.addEventListener('pointercancel', onDragCancel, { once: true })
}

function onDragMove(e: PointerEvent) {
  if (!stripEl.value || dragSourceIdx.value === -1) return
  const cells = stripEl.value.querySelectorAll<HTMLElement>('.frame-cell')
  const stripRect = stripEl.value.getBoundingClientRect()
  let insertIdx = frames.value.length
  let indicatorX = -1

  for (let i = 0; i < cells.length; i++) {
    const rect = cells[i].getBoundingClientRect()
    if (e.clientX < rect.left + rect.width / 2) {
      insertIdx = i
      indicatorX = rect.left - stripRect.left + stripEl.value.scrollLeft - 2
      break
    }
  }

  if (insertIdx === frames.value.length && cells.length > 0) {
    const lastRect = cells[cells.length - 1].getBoundingClientRect()
    indicatorX = lastRect.right - stripRect.left + stripEl.value.scrollLeft - 2
  }

  dragOverIdx.value = insertIdx
  dropIndicatorLeft.value = indicatorX
}

function onDragEnd() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointercancel', onDragCancel)
  const from = dragSourceIdx.value
  const insertIdx = dragOverIdx.value
  dragSourceIdx.value = -1
  dragOverIdx.value = -1
  dropIndicatorLeft.value = -1
  if (from === -1) return
  const toIdx = from < insertIdx ? insertIdx - 1 : insertIdx
  if (toIdx === from) return
  const anim = animation.value
  if (!anim) return
  anim.frames = reorderFrame(anim.frames, from, toIdx)
  animHist.push(anim.id, { type: 'reorder-frame', fromIdx: from, toIdx })
  if (editor.activeFrameIndex === from) editor.setActiveFrameIndex(toIdx)
  project.markDirty()
}

function onDragCancel() {
  window.removeEventListener('pointermove', onDragMove)
  dragSourceIdx.value = -1
  dragOverIdx.value = -1
  dropIndicatorLeft.value = -1
}

// --- Sprite thumbnail rendering ---

function mountThumbCanvas(el: HTMLCanvasElement | null, spriteId: string) {
  if (!el) return
  const proj = project.project
  if (!proj) return
  const sprite = project.getSprite(spriteId)
  if (!sprite) return
  const imgMap = new Map(proj.images.map(img => [img.id, img]))
  const palMap = new Map(proj.palettes.map(p => [p.id, p]))
  renderSpriteThumbnail(el, sprite, imgMap, palMap)
}

</script>

<template>
  <div class="timeline-wrap">

    <!-- Empty state -->
    <div v-if="!animation" class="empty-state">
      Select an animation to start editing.
    </div>

    <template v-else>
      <div v-if="frames.length === 0" class="empty-state">
        No frames yet — click <strong>+</strong> to add the first frame.
      </div>

      <div ref="stripEl" class="frame-strip">
        <!-- Frame cells -->
        <div
          v-for="(frame, idx) in frames"
          :key="frame.id"
          :class="[
            'frame-cell',
            { active: idx === activeIndex },
            { dragging: idx === dragSourceIdx },
          ]"
          @click="selectFrame(idx)"
          @pointerdown.stop="onDragStart($event, idx)"
        >
          <canvas
            :key="frame.spriteId"
            :ref="(el) => mountThumbCanvas(el as HTMLCanvasElement | null, frame.spriteId)"
            :width="SPRITE_THUMB_PX"
            :height="SPRITE_THUMB_PX"
            class="frame-thumb"
          />
          <div class="cell-footer">
            <NumericInput
              :model-value="frame.duration"
              :min="1"
              :max="9999"
              :disabled="props.isPlaying"
              @update:modelValue="(v) => onDurationUpdate(idx, v)"
              @change="onDurationCommit(idx)"
              @blur="onDurationCommit(idx)"
              @click.stop
              @pointerdown.stop
            />
            <button
              class="delete-btn"
              :disabled="props.isPlaying"
              title="Delete frame"
              @click.stop="deleteFrame(idx)"
              @pointerdown.stop
            >×</button>
          </div>
          <!-- Frame index label -->
          <span class="frame-index">{{ idx + 1 }}</span>
        </div>

        <!-- Add frame cell -->
        <button class="add-cell" :disabled="props.isPlaying" title="Add Frame" @click="openPicker">
          <span class="add-icon">+</span>
        </button>

        <!-- Drag drop indicator line -->
        <div
          v-if="dropIndicatorLeft >= 0"
          class="drop-indicator"
          :style="{ left: dropIndicatorLeft + 'px' }"
        />
      </div>
    </template>

    <SpritePicker
      :open="pickerOpen"
      @confirm="onSpriteConfirmed"
      @cancel="pickerOpen = false"
    />
  </div>
</template>

<style scoped>
.timeline-wrap {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  font-size: var(--rd-text-11);
  color: var(--rd-color-text-muted);
  font-style: italic;
}

.frame-strip {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--rd-space-2);
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--rd-space-2) var(--rd-space-3);
  flex: 1;
  position: relative;
}

.frame-cell {
  flex-shrink: 0;
  width: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--rd-space-1);
  padding: var(--rd-space-2) var(--rd-space-2) var(--rd-space-1);
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  cursor: pointer;
  position: relative;
  border-left: 2px solid transparent;
  user-select: none;
}

.frame-cell:hover {
  background: var(--rd-color-surface-3);
  border-color: var(--rd-color-border-hover);
  border-left-color: transparent;
}

.frame-cell.active {
  background: color-mix(in srgb, var(--rd-color-accent) 10%, var(--rd-color-surface-2));
  border-color: var(--rd-color-border);
  border-left-color: var(--rd-color-accent);
}

.frame-cell.dragging {
  opacity: 0.4;
}

.frame-thumb {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  background: var(--rd-color-surface-1);
  border-radius: var(--rd-radius-1);
  pointer-events: none;
}

.cell-footer {
  display: flex;
  align-items: center;
  gap: var(--rd-space-1);
  width: 100%;
}

.cell-footer :deep(input) {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.delete-btn {
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

.frame-cell:hover .delete-btn,
.frame-cell.active .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--rd-color-surface-4);
  color: var(--rd-color-danger);
}

.frame-index {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  line-height: 1;
  pointer-events: none;
}

.add-cell {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: var(--rd-border-w) dashed var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  cursor: pointer;
  color: var(--rd-color-text-muted);
  align-self: center;
}

.add-cell:hover {
  background: var(--rd-color-surface-3);
  border-color: var(--rd-color-accent);
  color: var(--rd-color-accent);
}

.add-icon {
  font-size: 20px;
  line-height: 1;
}

.drop-indicator {
  position: absolute;
  top: var(--rd-space-2);
  bottom: var(--rd-space-2);
  width: 2px;
  background: var(--rd-color-accent);
  border-radius: 1px;
  pointer-events: none;
  z-index: 10;
}
</style>
