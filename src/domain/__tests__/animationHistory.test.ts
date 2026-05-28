import { describe, it, expect, beforeEach } from 'vitest'
import { AnimationHistoryManager, type AnimationCommand } from '../animationHistory'
import type { Frame } from '../model'

let mgr: AnimationHistoryManager

beforeEach(() => {
  mgr = new AnimationHistoryManager()
})

function makeFrame(id: string): Frame {
  return { id, spriteId: 'spr-1', position: { x: 0, y: 0 }, duration: 100 }
}

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
    const cmd: AnimationCommand = { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 }
    expect(mgr.push(cmd)).toBe(cmd)
  })

  it('canUndo becomes true after a push', () => {
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    expect(mgr.canUndo).toBe(true)
  })

  it('clears the redo stack on push', () => {
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    mgr.undo()
    expect(mgr.canRedo).toBe(true)
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 512, newHeight: 64 })
    expect(mgr.canRedo).toBe(false)
  })

  it('caps the stack at 100 commands', () => {
    for (let i = 0; i < 101; i++) {
      mgr.push({ type: 'duration-change', frameIndex: 0, oldDuration: i, newDuration: i + 1 })
    }
    for (let i = 0; i < 100; i++) mgr.undo()
    expect(mgr.canUndo).toBe(false)
  })
})

// ─── undo ─────────────────────────────────────────────────────────────────────

describe('undo', () => {
  it('returns the last pushed command', () => {
    const cmd: AnimationCommand = { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 }
    mgr.push(cmd)
    expect(mgr.undo()).toEqual(cmd)
  })

  it('returns null when there is nothing to undo', () => {
    expect(mgr.undo()).toBeNull()
  })

  it('canUndo becomes false after undoing the only command', () => {
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    mgr.undo()
    expect(mgr.canUndo).toBe(false)
  })

  it('canRedo becomes true after undo', () => {
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    mgr.undo()
    expect(mgr.canRedo).toBe(true)
  })

  it('undoes in LIFO order', () => {
    const first: AnimationCommand = { type: 'duration-change', frameIndex: 0, oldDuration: 100, newDuration: 200 }
    const second: AnimationCommand = { type: 'duration-change', frameIndex: 0, oldDuration: 200, newDuration: 300 }
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
    const cmd: AnimationCommand = { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 }
    mgr.push(cmd)
    mgr.undo()
    expect(mgr.redo()).toEqual(cmd)
  })

  it('canRedo becomes false after redo', () => {
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    mgr.undo()
    mgr.redo()
    expect(mgr.canRedo).toBe(false)
  })
})

// ─── drag operations ──────────────────────────────────────────────────────────

describe('beginFrameDrag + commitDrag', () => {
  it('commits a move-frame command when position changed', () => {
    mgr.beginFrameDrag(2, { x: 0, y: 0 })
    const cmd = mgr.commitDrag({ x: 5, y: 10 })
    expect(cmd).not.toBeNull()
    expect(cmd?.type).toBe('move-frame')
    if (cmd?.type === 'move-frame') {
      expect(cmd.frameIndex).toBe(2)
      expect(cmd.oldPosition).toEqual({ x: 0, y: 0 })
      expect(cmd.newPosition).toEqual({ x: 5, y: 10 })
    }
  })

  it('returns null when position did not change', () => {
    mgr.beginFrameDrag(0, { x: 3, y: 4 })
    expect(mgr.commitDrag({ x: 3, y: 4 })).toBeNull()
  })

  it('canUndo becomes true after a committed frame drag', () => {
    mgr.beginFrameDrag(0, { x: 0, y: 0 })
    mgr.commitDrag({ x: 1, y: 0 })
    expect(mgr.canUndo).toBe(true)
  })

  it('produces a single undoable command for a full drag lifecycle', () => {
    mgr.beginFrameDrag(0, { x: 0, y: 0 })
    mgr.commitDrag({ x: 10, y: 20 })
    mgr.undo()
    expect(mgr.canUndo).toBe(false)
  })
})

describe('commitDrag with no pending drag', () => {
  it('returns null when commitDrag is called without a beginDrag', () => {
    expect(mgr.commitDrag({ x: 1, y: 1 })).toBeNull()
  })
})

// ─── undo/redo round-trip for each command type ───────────────────────────────

describe('undo/redo round-trip for each command type', () => {
  const frame = makeFrame('frm-1')
  const commands: AnimationCommand[] = [
    { type: 'add-frame', frame, insertIndex: 0 },
    { type: 'remove-frame', frame, removedIndex: 1 },
    { type: 'reorder-frame', fromIdx: 0, toIdx: 2 },
    { type: 'move-frame', frameIndex: 0, oldPosition: { x: 0, y: 0 }, newPosition: { x: 5, y: 5 } },
    { type: 'duration-change', frameIndex: 0, oldDuration: 100, newDuration: 200 },
    { type: 'duplicate-frame', originalIndex: 0, newFrame: frame, insertIndex: 1 },
    { type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 },
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
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    mgr.undo()
    mgr.reset()
    expect(mgr.canUndo).toBe(false)
    expect(mgr.canRedo).toBe(false)
  })

  it('undo returns null after reset', () => {
    mgr.push({ type: 'stage-resize', oldWidth: 128, oldHeight: 128, newWidth: 256, newHeight: 64 })
    mgr.reset()
    expect(mgr.undo()).toBeNull()
  })

  it('clears a pending drag', () => {
    mgr.beginFrameDrag(0, { x: 0, y: 0 })
    mgr.reset()
    expect(mgr.commitDrag({ x: 5, y: 5 })).toBeNull()
  })
})
