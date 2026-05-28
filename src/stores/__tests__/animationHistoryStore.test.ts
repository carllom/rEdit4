import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnimationHistoryStore } from '../animationHistoryStore'
import type { AnimationCommand } from '../../domain/animationHistory'

// Use unique animation IDs per test to avoid cross-test contamination from the
// module-level managers Map (which persists across Pinia resets).
let seq = 0
function freshId() { return `anim-${++seq}` }

beforeEach(() => {
  setActivePinia(createPinia())
})

// ─── initial state ─────────────────────────────────────────────────────────

describe('initial state', () => {
  it('canUndo is false', () => {
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(freshId())
    expect(store.canUndo).toBe(false)
  })

  it('canRedo is false', () => {
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(freshId())
    expect(store.canRedo).toBe(false)
  })

  it('activeAnimationId is null', () => {
    expect(useAnimationHistoryStore().activeAnimationId).toBeNull()
  })
})

// ─── setActiveAnimation ────────────────────────────────────────────────────

describe('setActiveAnimation', () => {
  it('updates activeAnimationId', () => {
    const store = useAnimationHistoryStore()
    store.setActiveAnimation('anim-test')
    expect(store.activeAnimationId).toBe('anim-test')
  })

  it('accepts null', () => {
    const store = useAnimationHistoryStore()
    store.setActiveAnimation('anim-test')
    store.setActiveAnimation(null)
    expect(store.activeAnimationId).toBeNull()
  })

  it('canUndo is false when activeAnimationId is null', () => {
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(null)
    expect(store.canUndo).toBe(false)
  })
})

// ─── push / undo / redo ────────────────────────────────────────────────────

describe('push', () => {
  it('returns the pushed command', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    const cmd: AnimationCommand = { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 }
    expect(store.push(id, cmd)).toBe(cmd)
  })

  it('canUndo becomes true after push', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    expect(store.canUndo).toBe(true)
  })

  it('clears the redo stack on new push after undo', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    store.undo(id)
    expect(store.canRedo).toBe(true)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 512, newHeight: 64 })
    expect(store.canRedo).toBe(false)
  })
})

describe('undo', () => {
  it('returns the last pushed command', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    const cmd: AnimationCommand = { type: 'duration-change', frameIndex: 0, oldDuration: 100, newDuration: 200 }
    store.push(id, cmd)
    expect(store.undo(id)).toEqual(cmd)
  })

  it('returns null when history is empty', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    expect(store.undo(id)).toBeNull()
  })

  it('canUndo becomes false after undoing the only command', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    store.undo(id)
    expect(store.canUndo).toBe(false)
  })

  it('canRedo becomes true after undo', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    store.undo(id)
    expect(store.canRedo).toBe(true)
  })
})

describe('redo', () => {
  it('returns null when there is nothing to redo', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    expect(store.redo(id)).toBeNull()
  })

  it('returns the undone command', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    const cmd: AnimationCommand = { type: 'reorder-frame', fromIdx: 0, toIdx: 2 }
    store.push(id, cmd)
    store.undo(id)
    expect(store.redo(id)).toEqual(cmd)
  })

  it('canRedo becomes false after redo', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    store.undo(id)
    store.redo(id)
    expect(store.canRedo).toBe(false)
  })
})

// ─── drag operations ────────────────────────────────────────────────────────

describe('beginFrameDrag + commitDrag', () => {
  it('returns a committed move-frame command when position changed', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.beginFrameDrag(id, 0, { x: 0, y: 0 })
    const cmd = store.commitDrag(id, { x: 5, y: 10 })
    expect(cmd?.type).toBe('move-frame')
    expect(store.canUndo).toBe(true)
  })

  it('returns null when position did not change', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.beginFrameDrag(id, 0, { x: 3, y: 4 })
    expect(store.commitDrag(id, { x: 3, y: 4 })).toBeNull()
  })

  it('does not update version counters when drag produces no command', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.beginFrameDrag(id, 0, { x: 0, y: 0 })
    store.commitDrag(id, { x: 0, y: 0 })
    expect(store.canUndo).toBe(false)
  })
})

// ─── clearFor ───────────────────────────────────────────────────────────────

describe('clearFor', () => {
  it('resets canUndo to false for the cleared animation', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    store.clearFor(id)
    expect(store.canUndo).toBe(false)
  })

  it('resets canRedo to false for the cleared animation', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.setActiveAnimation(id)
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    store.undo(id)
    store.clearFor(id)
    expect(store.canRedo).toBe(false)
  })

  it('does not throw for an animation with no history', () => {
    const store = useAnimationHistoryStore()
    expect(() => store.clearFor('nonexistent')).not.toThrow()
  })

  it('undo returns null after clearFor', () => {
    const id = freshId()
    const store = useAnimationHistoryStore()
    store.push(id, { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    store.clearFor(id)
    expect(store.undo(id)).toBeNull()
  })
})
