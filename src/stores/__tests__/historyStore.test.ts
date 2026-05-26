import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from '../historyStore'

// Use unique image IDs per test to avoid cross-test contamination from the
// module-level managers Map (which persists across Pinia resets).
let seq = 0
function freshId() { return `img-${++seq}` }

beforeEach(() => {
  setActivePinia(createPinia())
})

// ─── initial state ─────────────────────────────────────────────────────────

describe('initial state', () => {
  it('canUndo is false', () => {
    const store = useHistoryStore()
    store.setActiveImage(freshId())
    expect(store.canUndo).toBe(false)
  })

  it('canRedo is false', () => {
    const store = useHistoryStore()
    store.setActiveImage(freshId())
    expect(store.canRedo).toBe(false)
  })

  it('activeImageId is null', () => {
    expect(useHistoryStore().activeImageId).toBeNull()
  })
})

// ─── setActiveImage ────────────────────────────────────────────────────────

describe('setActiveImage', () => {
  it('updates activeImageId', () => {
    const store = useHistoryStore()
    store.setActiveImage('img-test')
    expect(store.activeImageId).toBe('img-test')
  })

  it('accepts null', () => {
    const store = useHistoryStore()
    store.setActiveImage('img-test')
    store.setActiveImage(null)
    expect(store.activeImageId).toBeNull()
  })

  it('canUndo is false when activeImageId is null', () => {
    const store = useHistoryStore()
    store.setActiveImage(null)
    expect(store.canUndo).toBe(false)
  })
})

// ─── stroke lifecycle ──────────────────────────────────────────────────────

describe('beginStroke / recordPixel / commitStroke', () => {
  it('commitStroke returns null when no stroke was begun', () => {
    const id = freshId()
    const store = useHistoryStore()
    expect(store.commitStroke(id)).toBeNull()
  })

  it('commitStroke returns null when no pixels were recorded', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'Draw')
    expect(store.commitStroke(id)).toBeNull()
  })

  it('commitStroke returns null when all recorded pixels are no-ops (oldIdx === newIdx)', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'Draw')
    store.recordPixel(id, 0, 0, 0, 1, 1)  // same index
    expect(store.commitStroke(id)).toBeNull()
  })

  it('commitStroke returns a Command with the recorded pixels', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'Draw')
    store.recordPixel(id, 0, 0, 0, 0, 3)
    const cmd = store.commitStroke(id)
    expect(cmd).not.toBeNull()
    expect(cmd?.imageId).toBe(id)
    expect(cmd?.layerId).toBe('layer-1')
    expect(cmd?.label).toBe('Draw')
    expect(cmd?.pixels).toHaveLength(1)
    expect(cmd?.pixels[0]).toMatchObject({ x: 0, y: 0, oldIndex: 0, newIndex: 3 })
  })

  it('canUndo is true after a successful commit', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.setActiveImage(id)
    store.beginStroke(id, 'layer-1', 'Draw')
    store.recordPixel(id, 0, 0, 0, 0, 2)
    store.commitStroke(id)
    expect(store.canUndo).toBe(true)
  })

  it('later recordPixel calls for the same pixel update newIndex only', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'Draw')
    store.recordPixel(id, 5, 1, 2, 0, 1)  // first touch: old=0, new=1
    store.recordPixel(id, 5, 1, 2, 1, 4)  // second touch: newIndex updates to 4
    const cmd = store.commitStroke(id)
    expect(cmd?.pixels[0].oldIndex).toBe(0)
    expect(cmd?.pixels[0].newIndex).toBe(4)
  })
})

// ─── undo ──────────────────────────────────────────────────────────────────

describe('undo', () => {
  it('returns the last committed command', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    const committed = store.commitStroke(id)
    const undone = store.undo(id)
    expect(undone).toEqual(committed)
  })

  it('returns null when history is empty', () => {
    const id = freshId()
    const store = useHistoryStore()
    expect(store.undo(id)).toBeNull()
  })

  it('canUndo becomes false after undoing the only command', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.setActiveImage(id)
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.undo(id)
    expect(store.canUndo).toBe(false)
  })

  it('canRedo becomes true after undo', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.setActiveImage(id)
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.undo(id)
    expect(store.canRedo).toBe(true)
  })

  it('undoes commands in LIFO order', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'First')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.beginStroke(id, 'layer-1', 'Second')
    store.recordPixel(id, 1, 1, 0, 0, 2)
    store.commitStroke(id)
    expect(store.undo(id)?.label).toBe('Second')
    expect(store.undo(id)?.label).toBe('First')
  })
})

// ─── redo ──────────────────────────────────────────────────────────────────

describe('redo', () => {
  it('returns null when there is nothing to redo', () => {
    const id = freshId()
    const store = useHistoryStore()
    expect(store.redo(id)).toBeNull()
  })

  it('returns the undone command', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    const committed = store.commitStroke(id)!
    store.undo(id)
    const redone = store.redo(id)
    expect(redone).toEqual(committed)
  })

  it('canRedo becomes false after redo', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.setActiveImage(id)
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.undo(id)
    store.redo(id)
    expect(store.canRedo).toBe(false)
  })

  it('new commit after undo clears the redo stack', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.setActiveImage(id)
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.undo(id)
    store.beginStroke(id, 'layer-1', 'B')
    store.recordPixel(id, 1, 1, 0, 0, 2)
    store.commitStroke(id)
    expect(store.canRedo).toBe(false)
  })
})

// ─── clearFor ──────────────────────────────────────────────────────────────

describe('clearFor', () => {
  it('resets canUndo to false for the cleared image', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.setActiveImage(id)
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.clearFor(id)
    expect(store.canUndo).toBe(false)
  })

  it('resets canRedo to false for the cleared image', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.setActiveImage(id)
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.undo(id)
    store.clearFor(id)
    expect(store.canRedo).toBe(false)
  })

  it('does not throw for an image with no history', () => {
    const store = useHistoryStore()
    expect(() => store.clearFor('nonexistent')).not.toThrow()
  })

  it('undo returns null after clearFor', () => {
    const id = freshId()
    const store = useHistoryStore()
    store.beginStroke(id, 'layer-1', 'A')
    store.recordPixel(id, 0, 0, 0, 0, 1)
    store.commitStroke(id)
    store.clearFor(id)
    expect(store.undo(id)).toBeNull()
  })
})

