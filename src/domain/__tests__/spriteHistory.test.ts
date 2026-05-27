import { describe, it, expect, beforeEach } from 'vitest'
import { SpriteHistoryManager } from '../spriteHistory'
import type { SpriteCommand } from '../spriteHistory'

let mgr: SpriteHistoryManager

beforeEach(() => {
  mgr = new SpriteHistoryManager()
})

// ─── initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('canUndo is false', () => {
    expect(mgr.canUndo).toBe(false)
  })

  it('canRedo is false', () => {
    expect(mgr.canRedo).toBe(false)
  })
})

// ─── push ─────────────────────────────────────────────────────────────────────

describe('push', () => {
  it('returns the command that was pushed', () => {
    const cmd: SpriteCommand = { type: 'rename-sprite', oldName: 'A', newName: 'B' }
    expect(mgr.push(cmd)).toBe(cmd)
  })

  it('canUndo becomes true after a push', () => {
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'B' })
    expect(mgr.canUndo).toBe(true)
  })

  it('clears the redo stack on push', () => {
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'B' })
    mgr.undo()
    expect(mgr.canRedo).toBe(true)
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'C' })
    expect(mgr.canRedo).toBe(false)
  })

  it('caps the stack at 100 commands', () => {
    for (let i = 0; i < 101; i++) {
      mgr.push({ type: 'rename-sprite', oldName: String(i), newName: String(i + 1) })
    }
    // After 101 pushes the oldest (i=0) is dropped; only 100 remain.
    // Undo 100 times should exhaust the stack.
    for (let i = 0; i < 100; i++) mgr.undo()
    expect(mgr.canUndo).toBe(false)
  })
})

// ─── undo ─────────────────────────────────────────────────────────────────────

describe('undo', () => {
  it('returns the last pushed command', () => {
    const cmd: SpriteCommand = { type: 'rename-sprite', oldName: 'A', newName: 'B' }
    mgr.push(cmd)
    expect(mgr.undo()).toEqual(cmd)
  })

  it('returns null when there is nothing to undo', () => {
    expect(mgr.undo()).toBeNull()
  })

  it('canUndo becomes false after undoing the only command', () => {
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'B' })
    mgr.undo()
    expect(mgr.canUndo).toBe(false)
  })

  it('canRedo becomes true after undo', () => {
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'B' })
    mgr.undo()
    expect(mgr.canRedo).toBe(true)
  })

  it('undoes in LIFO order', () => {
    const first: SpriteCommand = { type: 'rename-sprite', oldName: 'A', newName: 'B' }
    const second: SpriteCommand = { type: 'rename-sprite', oldName: 'B', newName: 'C' }
    mgr.push(first)
    mgr.push(second)
    expect(mgr.undo()).toEqual(second)
    expect(mgr.undo()).toEqual(first)
  })
})

// ─── redo ─────────────────────────────────────────────────────────────────────

describe('redo', () => {
  it('returns null when there is nothing to redo', () => {
    expect(mgr.redo()).toBeNull()
  })

  it('returns the undone command', () => {
    const cmd: SpriteCommand = { type: 'rename-sprite', oldName: 'A', newName: 'B' }
    mgr.push(cmd)
    mgr.undo()
    expect(mgr.redo()).toEqual(cmd)
  })

  it('canRedo becomes false after redo', () => {
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'B' })
    mgr.undo()
    mgr.redo()
    expect(mgr.canRedo).toBe(false)
  })
})

// ─── drag operations ──────────────────────────────────────────────────────────

describe('beginPartDrag + commitDrag', () => {
  it('commits a move-part command when position changed', () => {
    mgr.beginPartDrag(2, { x: 0, y: 0 })
    const cmd = mgr.commitDrag({ x: 5, y: 10 })
    expect(cmd).not.toBeNull()
    expect(cmd?.type).toBe('move-part')
    if (cmd?.type === 'move-part') {
      expect(cmd.partIndex).toBe(2)
      expect(cmd.oldPosition).toEqual({ x: 0, y: 0 })
      expect(cmd.newPosition).toEqual({ x: 5, y: 10 })
    }
  })

  it('returns null when position did not change', () => {
    mgr.beginPartDrag(0, { x: 3, y: 4 })
    expect(mgr.commitDrag({ x: 3, y: 4 })).toBeNull()
  })

  it('canUndo becomes true after a committed part drag', () => {
    mgr.beginPartDrag(0, { x: 0, y: 0 })
    mgr.commitDrag({ x: 1, y: 0 })
    expect(mgr.canUndo).toBe(true)
  })
})

describe('beginAnchorDrag + commitDrag', () => {
  it('commits a move-anchor command when anchor changed', () => {
    mgr.beginAnchorDrag({ x: 0, y: 0 })
    const cmd = mgr.commitDrag({ x: 8, y: 16 })
    expect(cmd?.type).toBe('move-anchor')
    if (cmd?.type === 'move-anchor') {
      expect(cmd.oldAnchor).toEqual({ x: 0, y: 0 })
      expect(cmd.newAnchor).toEqual({ x: 8, y: 16 })
    }
  })

  it('returns null when anchor did not change', () => {
    mgr.beginAnchorDrag({ x: 4, y: 4 })
    expect(mgr.commitDrag({ x: 4, y: 4 })).toBeNull()
  })
})

describe('commitDrag with no pending drag', () => {
  it('returns null when commitDrag is called without a beginDrag', () => {
    expect(mgr.commitDrag({ x: 1, y: 1 })).toBeNull()
  })
})

// ─── all command types round-trip ─────────────────────────────────────────────

describe('undo/redo round-trip for each command type', () => {
  const commands: SpriteCommand[] = [
    { type: 'move-part', partIndex: 0, oldPosition: { x: 0, y: 0 }, newPosition: { x: 5, y: 5 } },
    { type: 'add-part', part: { imageId: 'img-1', position: { x: 0, y: 0 } }, insertIndex: 0 },
    { type: 'remove-part', part: { imageId: 'img-1', position: { x: 0, y: 0 } }, removedIndex: 1 },
    { type: 'reorder-part', fromIdx: 0, toIdx: 2 },
    { type: 'move-anchor', oldAnchor: { x: 0, y: 0 }, newAnchor: { x: 8, y: 8 } },
    { type: 'rename-part', partIndex: 0, oldName: undefined, newName: 'Leg' },
    { type: 'rename-sprite', oldName: 'Old', newName: 'New' },
  ]

  for (const cmd of commands) {
    it(`${cmd.type}: undo returns the command, redo returns it again`, () => {
      mgr.push(cmd)
      const undone = mgr.undo()
      expect(undone).toEqual(cmd)
      const redone = mgr.redo()
      expect(redone).toEqual(cmd)
    })
  }
})

// ─── reset ────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears canUndo and canRedo', () => {
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'B' })
    mgr.undo()
    mgr.reset()
    expect(mgr.canUndo).toBe(false)
    expect(mgr.canRedo).toBe(false)
  })

  it('undo returns null after reset', () => {
    mgr.push({ type: 'rename-sprite', oldName: 'A', newName: 'B' })
    mgr.reset()
    expect(mgr.undo()).toBeNull()
  })

  it('clears a pending drag', () => {
    mgr.beginPartDrag(0, { x: 0, y: 0 })
    mgr.reset()
    expect(mgr.commitDrag({ x: 5, y: 5 })).toBeNull()
  })
})
