import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AnimationHistoryManager, type AnimationCommand } from '../domain/animationHistory'
import type { Point } from '../domain/model'

// Per-animation managers held outside reactive state (same pattern as spriteHistoryStore)
const managers = new Map<string, AnimationHistoryManager>()

function manager(animationId: string): AnimationHistoryManager {
  let m = managers.get(animationId)
  if (!m) { m = new AnimationHistoryManager(); managers.set(animationId, m) }
  return m
}

export const useAnimationHistoryStore = defineStore('animationHistory', () => {
  const undoVersion = ref(0)
  const redoVersion = ref(0)
  const activeAnimationId = ref<string | null>(null)

  const canUndo = computed(() => { undoVersion.value; return activeAnimationId.value ? manager(activeAnimationId.value).canUndo : false })
  const canRedo = computed(() => { redoVersion.value; return activeAnimationId.value ? manager(activeAnimationId.value).canRedo : false })

  function setActiveAnimation(id: string | null) { activeAnimationId.value = id }

  function push(animationId: string, cmd: AnimationCommand): AnimationCommand {
    const result = manager(animationId).push(cmd)
    undoVersion.value++
    redoVersion.value++
    return result
  }

  function undo(animationId: string): AnimationCommand | null {
    const cmd = manager(animationId).undo()
    undoVersion.value++
    redoVersion.value++
    return cmd
  }

  function redo(animationId: string): AnimationCommand | null {
    const cmd = manager(animationId).redo()
    undoVersion.value++
    redoVersion.value++
    return cmd
  }

  function beginFrameDrag(animationId: string, frameIndex: number, initialPosition: Point): void {
    manager(animationId).beginFrameDrag(frameIndex, initialPosition)
  }

  // Returns the committed command (null if nothing moved).
  function commitDrag(animationId: string, finalPosition: Point): AnimationCommand | null {
    const cmd = manager(animationId).commitDrag(finalPosition)
    if (cmd) { undoVersion.value++; redoVersion.value++ }
    return cmd
  }

  function clearFor(animationId: string) {
    managers.get(animationId)?.reset()
    managers.delete(animationId)
    undoVersion.value++
    redoVersion.value++
  }

  return { canUndo, canRedo, activeAnimationId, setActiveAnimation, push, undo, redo, clearFor, beginFrameDrag, commitDrag }
})
