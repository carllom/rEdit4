import type { Color, Layer, Palette, Project, ReImage } from './model'
import { uid, makeTransparentColor } from './color'

export type RemapStrategy = 'remove' | 'remap-to-n' | 'compress'

export function clonePalette(palette: Palette): Palette {
  return {
    id: uid(),
    name: palette.name,
    description: palette.description,
    colors: palette.colors.map((c, i) =>
      i === 0 ? makeTransparentColor() : { ...c, id: uid() }
    ),
  }
}

export function findPaletteUsage(project: Project, paletteId: string): ReImage[] {
  return project.images.filter(img => img.paletteId === paletteId)
}

export function findColorUsage(image: ReImage, colorIndex: number): number {
  let count = 0
  for (const layer of image.layers) {
    for (let i = 0; i < layer.data.length; i++) {
      if (layer.data[i] === colorIndex) count++
    }
  }
  return count
}

export function swapPaletteColors(palette: Palette, indexA: number, indexB: number): void {
  if (indexA === 0 || indexB === 0) {
    throw new Error('Cannot swap slot 0 (transparent)')
  }
  const tmp: Color = palette.colors[indexA]
  palette.colors[indexA] = palette.colors[indexB]
  palette.colors[indexB] = tmp
}

export function buildRemapTable(
  usedIndices: number[],
  targetSize: number,
  strategy: RemapStrategy,
  remapToN?: number,
): Uint8Array {
  const table = new Uint8Array(256)
  if (strategy === 'remove') {
    for (let i = 0; i < 256; i++) {
      table[i] = i < targetSize ? i : 0
    }
  } else if (strategy === 'remap-to-n') {
    const n = remapToN ?? 0
    for (let i = 0; i < 256; i++) {
      table[i] = i < targetSize ? i : n
    }
  } else {
    // compress: map used non-zero indices to a contiguous range starting at 1
    const nonZeroUsed = [...new Set(usedIndices.filter(i => i !== 0))].sort((a, b) => a - b)
    // table[0] stays 0; all unmapped indices stay 0
    for (let slot = 0; slot < nonZeroUsed.length; slot++) {
      table[nonZeroUsed[slot]] = slot + 1
    }
  }
  table[0] = 0
  return table
}

export function remapLayerIndices(layer: Layer, remapTable: Uint8Array): Uint8Array {
  const out = new Uint8Array(layer.data.length)
  for (let i = 0; i < layer.data.length; i++) {
    const idx = layer.data[i]
    out[i] = idx === 0 ? 0 : remapTable[idx]
  }
  return out
}

export function reassignPalette(image: ReImage, toPalette: Palette, remapTable?: Uint8Array): void {
  image.paletteId = toPalette.id
  if (remapTable) {
    for (const layer of image.layers) {
      const remapped = remapLayerIndices(layer, remapTable)
      layer.data.set(remapped)
    }
  }
}

export function paletteExceedsImage(image: ReImage, toPalette: Palette): number[] {
  const maxValid = toPalette.colors.length - 1
  const exceeded = new Set<number>()
  for (const layer of image.layers) {
    for (let i = 0; i < layer.data.length; i++) {
      const idx = layer.data[i]
      if (idx > maxValid) exceeded.add(idx)
    }
  }
  return [...exceeded].sort((a, b) => a - b)
}
