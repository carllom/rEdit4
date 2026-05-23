import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { HistoryManager, type Command } from '../domain/history'

// One HistoryManager per image, held outside reactive state to avoid proxy overhead on large diffs
const managers = new Map<string, HistoryManager>()

function manager(imageId: string): HistoryManager {
  let m = managers.get(imageId)
  if (!m) { m = new HistoryManager(); managers.set(imageId, m) }
  return m
}

export const useHistoryStore = defineStore('history', () => {
  // Reactive sentinels — incremented to trigger computed/watchers after each operation
  const undoVersion = ref(0)
  const redoVersion = ref(0)

  const canUndo = computed(() => { undoVersion.value; return activeImageId.value ? manager(activeImageId.value).canUndo : false })
  const canRedo = computed(() => { redoVersion.value; return activeImageId.value ? manager(activeImageId.value).canRedo : false })

  const activeImageId = ref<string | null>(null)

  function setActiveImage(id: string | null) { activeImageId.value = id }

  function beginStroke(imageId: string, layerId: string, label: string) {
    manager(imageId).beginStroke(imageId, layerId, label)
  }

  function recordPixel(imageId: string, linearIndex: number, x: number, y: number, oldIdx: number, newIdx: number) {
    manager(imageId).recordPixel(linearIndex, x, y, oldIdx, newIdx)
  }

  function commitStroke(imageId: string): Command | null {
    const cmd = manager(imageId).commitStroke()
    undoVersion.value++
    redoVersion.value++
    return cmd
  }

  function undo(imageId: string): Command | null {
    const cmd = manager(imageId).undo()
    undoVersion.value++
    redoVersion.value++
    return cmd
  }

  function redo(imageId: string): Command | null {
    const cmd = manager(imageId).redo()
    undoVersion.value++
    redoVersion.value++
    return cmd
  }

  function clearFor(imageId: string) {
    managers.get(imageId)?.reset()
    managers.delete(imageId)
    undoVersion.value++
    redoVersion.value++
  }

  return { canUndo, canRedo, activeImageId, setActiveImage, beginStroke, recordPixel, commitStroke, undo, redo, clearFor }
})
