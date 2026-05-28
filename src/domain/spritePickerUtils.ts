import type { Sprite } from './model'

function namePrefix(name: string): string | null {
  const idx = name.indexOf('_')
  if (idx <= 0) return null
  return name.slice(0, idx)
}

export interface SpriteGroup {
  prefix: string | null
  sprites: Sprite[]
}

export function groupSprites(sprites: Sprite[], search = ''): SpriteGroup[] {
  const q = search.trim().toLowerCase()
  const filtered = q ? sprites.filter(s => s.name.toLowerCase().includes(q)) : sprites

  const prefixMap = new Map<string, Sprite[]>()
  const ungrouped: Sprite[] = []

  for (const sprite of filtered) {
    const p = namePrefix(sprite.name)
    if (p === null) {
      ungrouped.push(sprite)
    } else {
      if (!prefixMap.has(p)) prefixMap.set(p, [])
      prefixMap.get(p)!.push(sprite)
    }
  }

  const groups: SpriteGroup[] = [...prefixMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, sprites]) => ({ prefix, sprites }))

  if (ungrouped.length > 0) groups.push({ prefix: null, sprites: ungrouped })
  return groups
}
