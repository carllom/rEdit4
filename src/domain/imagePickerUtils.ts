import type { ReImage } from './model'

// Returns the name-prefix group for an image name: text before the first `_`.
// Returns null if the name contains no `_`, or if the prefix would be empty
// (i.e. the name starts with `_`).
export function namePrefix(name: string): string | null {
  const idx = name.indexOf('_')
  if (idx <= 0) return null
  return name.slice(0, idx)
}

export interface ImageGroup {
  prefix: string | null   // null = ungrouped
  images: ReImage[]
}

// Groups images by name-prefix, alphabetically by prefix.
// The ungrouped section (prefix=null) is appended last.
export function groupImages(images: ReImage[], search = ''): ImageGroup[] {
  const q = search.trim().toLowerCase()
  const filtered = q ? images.filter(img => img.name.toLowerCase().includes(q)) : images

  const prefixMap = new Map<string, ReImage[]>()
  const ungrouped: ReImage[] = []

  for (const img of filtered) {
    const p = namePrefix(img.name)
    if (p === null) {
      ungrouped.push(img)
    } else {
      if (!prefixMap.has(p)) prefixMap.set(p, [])
      prefixMap.get(p)!.push(img)
    }
  }

  const groups: ImageGroup[] = [...prefixMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, imgs]) => ({ prefix, images: imgs }))

  if (ungrouped.length > 0) groups.push({ prefix: null, images: ungrouped })
  return groups
}
