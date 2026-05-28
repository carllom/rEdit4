import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SpriteHistoryManager, type SpriteCommand } from '../domain/spriteHistory'
import type { Point } from '../domain/model'

// Per-sprite managers held outside reactive state (same pattern as historyStore)
const managers = new Map<string, SpriteHistoryManager>()

function manager(spriteId: string): SpriteHistoryManager {
  let m = managers.get(spriteId)
  if (!m) { m = new SpriteHistoryManager(); managers.set(spriteId, m) }
  return m
}

export const useSpriteHistoryStore = defineStore('spriteHistory', () => {
  const undoVersion = ref(0)
  const redoVersion = ref(0)
  const activeSpriteId = ref<string | null>(null)

  const canUndo = computed(() => { undoVersion.value; return activeSpriteId.value ? manager(activeSpriteId.value).canUndo : false })
  const canRedo = computed(() => { redoVersion.value; return activeSpriteId.value ? manager(activeSpriteId.value).canRedo : false })

  function setActiveSprite(id: string | null) { activeSpriteId.value = id }

  function push(spriteId: string, cmd: SpriteCommand): SpriteCommand {
    const result = manager(spriteId).push(cmd)
    undoVersion.value++
    redoVersion.value++
    return result
  }

  function undo(spriteId: string): SpriteCommand | null {
    const cmd = manager(spriteId).undo()
    undoVersion.value++
    redoVersion.value++
    return cmd
  }

  function redo(spriteId: string): SpriteCommand | null {
    const cmd = manager(spriteId).redo()
    undoVersion.value++
    redoVersion.value++
    return cmd
  }

  function beginPartDrag(spriteId: string, partIndex: number, initialPosition: Point): void {
    manager(spriteId).beginPartDrag(partIndex, initialPosition)
  }

  function beginAnchorDrag(spriteId: string, initialAnchor: Point): void {
    manager(spriteId).beginAnchorDrag(initialAnchor)
  }

  // Returns the committed command (null if nothing moved).
  function commitDrag(spriteId: string, finalValue: Point): SpriteCommand | null {
    const cmd = manager(spriteId).commitDrag(finalValue)
    if (cmd) { undoVersion.value++; redoVersion.value++ }
    return cmd
  }

  function clearFor(spriteId: string) {
    managers.get(spriteId)?.reset()
    managers.delete(spriteId)
    undoVersion.value++
    redoVersion.value++
  }

  return { canUndo, canRedo, activeSpriteId, setActiveSprite, push, undo, redo, clearFor, beginPartDrag, beginAnchorDrag, commitDrag }
})
