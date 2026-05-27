import type { Part, Point, Sprite } from './model'

export function addPart(parts: Part[], imageId: string): Part[] {
  return [...parts, { imageId, position: { x: 0, y: 0 } }]
}

export function removePart(parts: Part[], index: number): Part[] {
  return parts.filter((_, i) => i !== index)
}

export function reorderPart(parts: Part[], fromIdx: number, toIdx: number): Part[] {
  if (fromIdx === toIdx) return parts
  const result = [...parts]
  const [item] = result.splice(fromIdx, 1)
  result.splice(toIdx, 0, item)
  return result
}

export function movePart(parts: Part[], index: number, position: Point): Part[] {
  return parts.map((p, i) => i === index ? { ...p, position: { ...position } } : p)
}

export function renamePart(parts: Part[], index: number, name: string | undefined): Part[] {
  return parts.map((p, i) => {
    if (i !== index) return p
    const { name: _omit, ...rest } = p
    return (name !== undefined && name.trim() !== '') ? { ...rest, name } : rest
  })
}

export function renameSprite(sprite: Sprite, name: string): Sprite {
  return { ...sprite, name }
}

export function moveAnchor(sprite: Sprite, anchor: Point): Sprite {
  return { ...sprite, anchor: { ...anchor } }
}

// Returns the names of Sprites that reference imageId in any of their Parts.
// An empty result means the Image is safe to remove.
export function canRemoveImage(sprites: Sprite[], imageId: string): string[] {
  return sprites
    .filter(s => s.parts.some(p => p.imageId === imageId))
    .map(s => s.name)
}
