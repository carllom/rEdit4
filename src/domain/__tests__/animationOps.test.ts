import { describe, it, expect } from 'vitest'
import type { Animation, Frame, Point } from '../model'
import {
  addFrame,
  removeFrame,
  reorderFrame,
  updateFrameSprite,
  updateFramePosition,
  updateFrameDuration,
  duplicateFrame,
  resizeStage,
} from '../animationOps'

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeFrame(spriteId: string, x = 0, y = 0, duration = 100): Frame {
  return { id: `frm-${spriteId}`, spriteId, position: { x, y }, duration }
}

function makeAnimation(frames: Frame[] = [], width = 128, height = 128): Animation {
  return { id: 'anim-1', name: 'TestAnim', width, height, frames }
}

// ─── addFrame ─────────────────────────────────────────────────────────────────

describe('addFrame', () => {
  it('appends a new Frame at the end', () => {
    const result = addFrame([], 'spr-1')
    expect(result).toHaveLength(1)
    expect(result[0].spriteId).toBe('spr-1')
  })

  it('new Frame has position (0, 0) by default', () => {
    const result = addFrame([], 'spr-1')
    expect(result[0].position).toEqual({ x: 0, y: 0 })
  })

  it('new Frame has duration 100 by default', () => {
    const result = addFrame([], 'spr-1')
    expect(result[0].duration).toBe(100)
  })

  it('accepts explicit position and duration', () => {
    const result = addFrame([], 'spr-1', { x: 10, y: 20 }, 200)
    expect(result[0].position).toEqual({ x: 10, y: 20 })
    expect(result[0].duration).toBe(200)
  })

  it('new Frame has a non-empty id', () => {
    const result = addFrame([], 'spr-1')
    expect(result[0].id).toBeTruthy()
  })

  it('two addFrame calls produce different ids', () => {
    const a = addFrame([], 'spr-1')[0]
    const b = addFrame([], 'spr-1')[0]
    expect(a.id).not.toBe(b.id)
  })

  it('does not mutate the original array', () => {
    const original = [makeFrame('spr-a')]
    addFrame(original, 'spr-b')
    expect(original).toHaveLength(1)
  })

  it('copies the position object (no shared reference)', () => {
    const pos: Point = { x: 5, y: 7 }
    const result = addFrame([], 'spr-1', pos)
    pos.x = 99
    expect(result[0].position.x).toBe(5)
  })
})

// ─── removeFrame ──────────────────────────────────────────────────────────────

describe('removeFrame', () => {
  it('removes the Frame at the given index', () => {
    const frames = [makeFrame('a'), makeFrame('b'), makeFrame('c')]
    const result = removeFrame(frames, 1)
    expect(result.map(f => f.spriteId)).toEqual(['a', 'c'])
  })

  it('does not mutate the original array', () => {
    const frames = [makeFrame('a'), makeFrame('b')]
    removeFrame(frames, 0)
    expect(frames).toHaveLength(2)
  })

  it('can remove the only remaining Frame', () => {
    const result = removeFrame([makeFrame('a')], 0)
    expect(result).toHaveLength(0)
  })
})

// ─── reorderFrame ─────────────────────────────────────────────────────────────

describe('reorderFrame', () => {
  it('moves a Frame from fromIdx to toIdx', () => {
    const frames = [makeFrame('a'), makeFrame('b'), makeFrame('c')]
    const result = reorderFrame(frames, 0, 2)
    expect(result.map(f => f.spriteId)).toEqual(['b', 'c', 'a'])
  })

  it('returns the same array reference when fromIdx equals toIdx', () => {
    const frames = [makeFrame('a'), makeFrame('b')]
    expect(reorderFrame(frames, 1, 1)).toBe(frames)
  })

  it('does not mutate the original array', () => {
    const frames = [makeFrame('a'), makeFrame('b'), makeFrame('c')]
    reorderFrame(frames, 0, 2)
    expect(frames.map(f => f.spriteId)).toEqual(['a', 'b', 'c'])
  })

  it('can move last element to first position', () => {
    const frames = [makeFrame('a'), makeFrame('b'), makeFrame('c')]
    const result = reorderFrame(frames, 2, 0)
    expect(result.map(f => f.spriteId)).toEqual(['c', 'a', 'b'])
  })
})

// ─── updateFrameSprite ────────────────────────────────────────────────────────

describe('updateFrameSprite', () => {
  it('updates the spriteId of the Frame at the given index', () => {
    const frames = [makeFrame('spr-1'), makeFrame('spr-2')]
    const result = updateFrameSprite(frames, 0, 'spr-new')
    expect(result[0].spriteId).toBe('spr-new')
  })

  it('does not affect other Frames', () => {
    const frames = [makeFrame('spr-1'), makeFrame('spr-2')]
    const result = updateFrameSprite(frames, 0, 'spr-new')
    expect(result[1].spriteId).toBe('spr-2')
  })

  it('does not mutate the original array', () => {
    const frames = [makeFrame('spr-1')]
    updateFrameSprite(frames, 0, 'spr-new')
    expect(frames[0].spriteId).toBe('spr-1')
  })
})

// ─── updateFramePosition ─────────────────────────────────────────────────────

describe('updateFramePosition', () => {
  it('updates the position of the Frame at the given index', () => {
    const frames = [makeFrame('a', 0, 0), makeFrame('b', 5, 5)]
    const result = updateFramePosition(frames, 0, { x: 10, y: 20 })
    expect(result[0].position).toEqual({ x: 10, y: 20 })
  })

  it('does not affect other Frames', () => {
    const frames = [makeFrame('a', 1, 2), makeFrame('b', 3, 4)]
    const result = updateFramePosition(frames, 0, { x: 99, y: 99 })
    expect(result[1].position).toEqual({ x: 3, y: 4 })
  })

  it('does not mutate the original array', () => {
    const frames = [makeFrame('a', 1, 2)]
    updateFramePosition(frames, 0, { x: 10, y: 10 })
    expect(frames[0].position).toEqual({ x: 1, y: 2 })
  })

  it('copies the position object (no shared reference)', () => {
    const frames = [makeFrame('a')]
    const pos: Point = { x: 5, y: 7 }
    const result = updateFramePosition(frames, 0, pos)
    pos.x = 99
    expect(result[0].position.x).toBe(5)
  })
})

// ─── updateFrameDuration ──────────────────────────────────────────────────────

describe('updateFrameDuration', () => {
  it('updates the duration of the Frame at the given index', () => {
    const frames = [makeFrame('a', 0, 0, 100), makeFrame('b', 0, 0, 200)]
    const result = updateFrameDuration(frames, 0, 300)
    expect(result[0].duration).toBe(300)
  })

  it('does not affect other Frames', () => {
    const frames = [makeFrame('a', 0, 0, 100), makeFrame('b', 0, 0, 200)]
    const result = updateFrameDuration(frames, 0, 300)
    expect(result[1].duration).toBe(200)
  })

  it('does not mutate the original array', () => {
    const frames = [makeFrame('a', 0, 0, 100)]
    updateFrameDuration(frames, 0, 500)
    expect(frames[0].duration).toBe(100)
  })
})

// ─── duplicateFrame ───────────────────────────────────────────────────────────

describe('duplicateFrame', () => {
  it('inserts a copy immediately after the source frame', () => {
    const frames = [makeFrame('a'), makeFrame('b'), makeFrame('c')]
    const result = duplicateFrame(frames, 1)
    expect(result).toHaveLength(4)
    expect(result[1].spriteId).toBe('b')
    expect(result[2].spriteId).toBe('b')
    expect(result[3].spriteId).toBe('c')
  })

  it('the duplicate has a different id than the original', () => {
    const frames = [makeFrame('a')]
    const result = duplicateFrame(frames, 0)
    expect(result[0].id).not.toBe(result[1].id)
  })

  it('the duplicate has an independent position copy', () => {
    const frames = [makeFrame('a', 5, 10)]
    const result = duplicateFrame(frames, 0)
    expect(result[1].position).toEqual({ x: 5, y: 10 })
    expect(result[1].position).not.toBe(result[0].position)
  })

  it('does not mutate the original array', () => {
    const frames = [makeFrame('a'), makeFrame('b')]
    duplicateFrame(frames, 0)
    expect(frames).toHaveLength(2)
  })

  it('returns original array when index is out of bounds', () => {
    const frames = [makeFrame('a')]
    const result = duplicateFrame(frames, 5)
    expect(result).toBe(frames)
  })

  it('can duplicate the last frame', () => {
    const frames = [makeFrame('a'), makeFrame('b')]
    const result = duplicateFrame(frames, 1)
    expect(result).toHaveLength(3)
    expect(result[2].spriteId).toBe('b')
  })
})

// ─── resizeStage ──────────────────────────────────────────────────────────────

describe('resizeStage', () => {
  it('returns an Animation with updated width and height', () => {
    const anim = makeAnimation([], 128, 128)
    const result = resizeStage(anim, 256, 64)
    expect(result.width).toBe(256)
    expect(result.height).toBe(64)
  })

  it('does not mutate the original Animation', () => {
    const anim = makeAnimation([], 128, 128)
    resizeStage(anim, 256, 64)
    expect(anim.width).toBe(128)
    expect(anim.height).toBe(128)
  })

  it('preserves all other Animation fields', () => {
    const frames = [makeFrame('a')]
    const anim = makeAnimation(frames, 128, 128)
    const result = resizeStage(anim, 256, 64)
    expect(result.id).toBe(anim.id)
    expect(result.name).toBe(anim.name)
    expect(result.frames).toBe(frames)
  })
})
