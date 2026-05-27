import { describe, it, expect } from 'vitest'
import type { Part, Point, Sprite } from '../model'
import {
  addPart,
  removePart,
  reorderPart,
  movePart,
  renamePart,
  renameSprite,
  moveAnchor,
  canRemoveImage,
} from '../spriteOps'

// ─── helpers ──────────────────────────────────────────────────────────────────

function makePart(imageId: string, x = 0, y = 0, name?: string): Part {
  return name !== undefined ? { imageId, position: { x, y }, name } : { imageId, position: { x, y } }
}

function makeSprite(parts: Part[] = [], anchor: Point = { x: 0, y: 0 }): Sprite {
  return { id: 'spr-1', name: 'MySpr', anchor, parts }
}

// ─── addPart ──────────────────────────────────────────────────────────────────

describe('addPart', () => {
  it('appends a new Part at position (0, 0)', () => {
    const result = addPart([], 'img-1')
    expect(result).toHaveLength(1)
    expect(result[0].imageId).toBe('img-1')
    expect(result[0].position).toEqual({ x: 0, y: 0 })
  })

  it('does not set a name on the new Part', () => {
    const result = addPart([], 'img-1')
    expect(result[0].name).toBeUndefined()
  })

  it('appends without mutating the original array', () => {
    const original = [makePart('img-a')]
    addPart(original, 'img-b')
    expect(original).toHaveLength(1)
  })

  it('places the new Part at the end of the list', () => {
    const original = [makePart('img-a'), makePart('img-b')]
    const result = addPart(original, 'img-c')
    expect(result[2].imageId).toBe('img-c')
  })
})

// ─── removePart ───────────────────────────────────────────────────────────────

describe('removePart', () => {
  it('removes the Part at the given index', () => {
    const parts = [makePart('a'), makePart('b'), makePart('c')]
    const result = removePart(parts, 1)
    expect(result.map(p => p.imageId)).toEqual(['a', 'c'])
  })

  it('does not mutate the original array', () => {
    const parts = [makePart('a'), makePart('b')]
    removePart(parts, 0)
    expect(parts).toHaveLength(2)
  })

  it('can remove the only remaining Part (returns empty array)', () => {
    const result = removePart([makePart('a')], 0)
    expect(result).toHaveLength(0)
  })
})

// ─── reorderPart ──────────────────────────────────────────────────────────────

describe('reorderPart', () => {
  it('moves a Part from fromIdx to toIdx', () => {
    const parts = [makePart('a'), makePart('b'), makePart('c')]
    const result = reorderPart(parts, 0, 2)
    expect(result.map(p => p.imageId)).toEqual(['b', 'c', 'a'])
  })

  it('returns the same array reference when fromIdx equals toIdx', () => {
    const parts = [makePart('a'), makePart('b')]
    const result = reorderPart(parts, 1, 1)
    expect(result).toBe(parts)
  })

  it('does not mutate the original array', () => {
    const parts = [makePart('a'), makePart('b'), makePart('c')]
    reorderPart(parts, 0, 2)
    expect(parts.map(p => p.imageId)).toEqual(['a', 'b', 'c'])
  })

  it('can move last element to first position', () => {
    const parts = [makePart('a'), makePart('b'), makePart('c')]
    const result = reorderPart(parts, 2, 0)
    expect(result.map(p => p.imageId)).toEqual(['c', 'a', 'b'])
  })
})

// ─── movePart ────────────────────────────────────────────────────────────────

describe('movePart', () => {
  it('updates the position of the Part at the given index', () => {
    const parts = [makePart('a', 0, 0), makePart('b', 5, 5)]
    const result = movePart(parts, 0, { x: 10, y: 20 })
    expect(result[0].position).toEqual({ x: 10, y: 20 })
  })

  it('does not affect other Parts', () => {
    const parts = [makePart('a', 1, 2), makePart('b', 3, 4)]
    const result = movePart(parts, 0, { x: 99, y: 99 })
    expect(result[1].position).toEqual({ x: 3, y: 4 })
  })

  it('does not mutate the original array', () => {
    const parts = [makePart('a', 1, 2)]
    movePart(parts, 0, { x: 10, y: 10 })
    expect(parts[0].position).toEqual({ x: 1, y: 2 })
  })

  it('accepts negative coordinates', () => {
    const parts = [makePart('a')]
    const result = movePart(parts, 0, { x: -5, y: -10 })
    expect(result[0].position).toEqual({ x: -5, y: -10 })
  })
})

// ─── renamePart ───────────────────────────────────────────────────────────────

describe('renamePart', () => {
  it('sets the name of the Part at the given index', () => {
    const parts = [makePart('a')]
    const result = renamePart(parts, 0, 'Left Leg')
    expect(result[0].name).toBe('Left Leg')
  })

  it('does not affect other Parts', () => {
    const parts = [makePart('a', 0, 0, 'original'), makePart('b')]
    const result = renamePart(parts, 1, 'new')
    expect(result[0].name).toBe('original')
  })

  it('removes the name when passed undefined', () => {
    const parts = [makePart('a', 0, 0, 'OldName')]
    const result = renamePart(parts, 0, undefined)
    expect(result[0].name).toBeUndefined()
  })

  it('removes the name when passed an empty string', () => {
    const parts = [makePart('a', 0, 0, 'OldName')]
    const result = renamePart(parts, 0, '')
    expect(result[0].name).toBeUndefined()
  })

  it('removes the name when passed a whitespace-only string', () => {
    const parts = [makePart('a', 0, 0, 'OldName')]
    const result = renamePart(parts, 0, '   ')
    expect(result[0].name).toBeUndefined()
  })

  it('does not mutate the original Part', () => {
    const parts = [makePart('a', 0, 0, 'original')]
    renamePart(parts, 0, 'changed')
    expect(parts[0].name).toBe('original')
  })
})

// ─── renameSprite ─────────────────────────────────────────────────────────────

describe('renameSprite', () => {
  it('returns a new Sprite with the updated name', () => {
    const sprite = makeSprite()
    const result = renameSprite(sprite, 'Walker')
    expect(result.name).toBe('Walker')
  })

  it('does not mutate the original Sprite', () => {
    const sprite = makeSprite()
    renameSprite(sprite, 'Walker')
    expect(sprite.name).toBe('MySpr')
  })

  it('preserves all other Sprite fields', () => {
    const parts = [makePart('img-1')]
    const sprite = makeSprite(parts, { x: 3, y: 7 })
    const result = renameSprite(sprite, 'NewName')
    expect(result.id).toBe(sprite.id)
    expect(result.anchor).toEqual({ x: 3, y: 7 })
    expect(result.parts).toBe(parts)
  })
})

// ─── moveAnchor ───────────────────────────────────────────────────────────────

describe('moveAnchor', () => {
  it('returns a new Sprite with the updated anchor', () => {
    const sprite = makeSprite([], { x: 0, y: 0 })
    const result = moveAnchor(sprite, { x: 8, y: 16 })
    expect(result.anchor).toEqual({ x: 8, y: 16 })
  })

  it('does not mutate the original Sprite anchor', () => {
    const sprite = makeSprite([], { x: 0, y: 0 })
    moveAnchor(sprite, { x: 8, y: 16 })
    expect(sprite.anchor).toEqual({ x: 0, y: 0 })
  })

  it('does not move any Parts', () => {
    const parts = [makePart('img-1', 5, 10)]
    const sprite = makeSprite(parts, { x: 0, y: 0 })
    const result = moveAnchor(sprite, { x: 8, y: 16 })
    expect(result.parts[0].position).toEqual({ x: 5, y: 10 })
  })

  it('preserves all other Sprite fields', () => {
    const sprite = makeSprite()
    const result = moveAnchor(sprite, { x: 1, y: 1 })
    expect(result.id).toBe(sprite.id)
    expect(result.name).toBe(sprite.name)
  })
})

// ─── canRemoveImage ───────────────────────────────────────────────────────────

describe('canRemoveImage', () => {
  it('returns empty array when no Sprites reference the imageId', () => {
    const sprites = [makeSprite([makePart('img-a'), makePart('img-b')])]
    expect(canRemoveImage(sprites, 'img-x')).toEqual([])
  })

  it('returns the name of a Sprite that references the imageId', () => {
    const sprites = [makeSprite([makePart('img-target')])]
    const result = canRemoveImage(sprites, 'img-target')
    expect(result).toEqual(['MySpr'])
  })

  it('returns names of all Sprites that reference the imageId', () => {
    const s1 = { ...makeSprite([makePart('img-target')]), id: 'spr-1', name: 'Alpha' }
    const s2 = { ...makeSprite([makePart('img-other')]), id: 'spr-2', name: 'Beta' }
    const s3 = { ...makeSprite([makePart('img-target')]), id: 'spr-3', name: 'Gamma' }
    const result = canRemoveImage([s1, s2, s3], 'img-target')
    expect(result).toEqual(['Alpha', 'Gamma'])
  })

  it('returns empty array when the sprites list is empty', () => {
    expect(canRemoveImage([], 'img-x')).toEqual([])
  })

  it('detects a reference even when the Part is not the first in the list', () => {
    const sprites = [makeSprite([makePart('img-a'), makePart('img-target')])]
    expect(canRemoveImage(sprites, 'img-target')).toHaveLength(1)
  })
})
