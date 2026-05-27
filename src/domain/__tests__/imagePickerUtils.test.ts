import { describe, it, expect } from 'vitest'
import { namePrefix, groupImages } from '../imagePickerUtils'
import type { ReImage } from '../model'

function makeImg(id: string, name: string): ReImage {
  return { id, name, width: 4, height: 4, paletteId: 'p1', layers: [] }
}

describe('namePrefix', () => {
  it('returns null for name with no underscore', () => {
    expect(namePrefix('idle')).toBeNull()
  })

  it('returns null for name that starts with underscore', () => {
    expect(namePrefix('_walk')).toBeNull()
  })

  it('returns prefix before first underscore', () => {
    expect(namePrefix('walk_01')).toBe('walk')
  })

  it('uses only the first underscore', () => {
    expect(namePrefix('walk_left_01')).toBe('walk')
  })

  it('handles single character prefix', () => {
    expect(namePrefix('a_test')).toBe('a')
  })

  it('returns null for name that is only a prefix (no suffix after underscore)', () => {
    expect(namePrefix('walk_')).toBe('walk')
  })

  it('returns null for empty string', () => {
    expect(namePrefix('')).toBeNull()
  })
})

describe('groupImages', () => {
  const imgs = [
    makeImg('1', 'walk_01'),
    makeImg('2', 'walk_02'),
    makeImg('3', 'idle'),
    makeImg('4', 'run_01'),
    makeImg('5', '_hidden'),
    makeImg('6', 'attack_01'),
  ]

  it('groups prefixed images by prefix', () => {
    const groups = groupImages(imgs)
    const prefixes = groups.map(g => g.prefix)
    expect(prefixes).toContain('walk')
    expect(prefixes).toContain('run')
    expect(prefixes).toContain('attack')
  })

  it('places non-prefixed and leading-underscore images in ungrouped last group', () => {
    const groups = groupImages(imgs)
    const last = groups[groups.length - 1]
    expect(last.prefix).toBeNull()
    const ungroupedIds = last.images.map(i => i.id)
    expect(ungroupedIds).toContain('3')  // 'idle'
    expect(ungroupedIds).toContain('5')  // '_hidden'
  })

  it('sorts prefix groups alphabetically', () => {
    const groups = groupImages(imgs).filter(g => g.prefix !== null)
    const prefixes = groups.map(g => g.prefix)
    expect(prefixes).toEqual([...prefixes].sort())
  })

  it('filters by search query case-insensitively', () => {
    const groups = groupImages(imgs, 'WALK')
    expect(groups.length).toBe(1)
    expect(groups[0].prefix).toBe('walk')
    expect(groups[0].images.length).toBe(2)
  })

  it('omits groups with no matching images', () => {
    const groups = groupImages(imgs, 'run')
    const prefixes = groups.map(g => g.prefix)
    expect(prefixes).not.toContain('walk')
    expect(prefixes).toContain('run')
  })

  it('returns empty array when search matches nothing', () => {
    expect(groupImages(imgs, 'zzz')).toEqual([])
  })

  it('returns all images when search is empty', () => {
    const total = groupImages(imgs).reduce((s, g) => s + g.images.length, 0)
    expect(total).toBe(imgs.length)
  })

  it('handles empty image list', () => {
    expect(groupImages([])).toEqual([])
  })
})
