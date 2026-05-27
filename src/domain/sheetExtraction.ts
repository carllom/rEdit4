import type { Sheet, SheetEntry, ReImage, Palette, Layer, Color, RgbColor } from './model'
import { uid, makeTransparentColor } from './color'
import { collectUniqueColors, buildIndexedLayer, type PixelBuffer } from './sheetOps'

export type ExtractionMode = 'individual' | 'merged'

export const MERGED_SENTINEL = '__merged__'

export function checkColorOverflow(
  pixels: PixelBuffer,
  entries: SheetEntry[],
  matteColor: RgbColor | null,
  mode: ExtractionMode,
): Map<string, number> {
  const result = new Map<string, number>()
  if (mode === 'individual') {
    for (const entry of entries) {
      const count = collectUniqueColors(pixels, entry.rect, matteColor).length
      if (count > 255) result.set(entry.name, count)
    }
  } else {
    const seen = new Set<string>()
    for (const entry of entries) {
      for (const c of collectUniqueColors(pixels, entry.rect, matteColor)) {
        seen.add(`${c.r},${c.g},${c.b}`)
      }
    }
    if (seen.size > 255) result.set(MERGED_SENTINEL, seen.size)
  }
  return result
}

function rgbToColor(c: RgbColor): Color {
  return { id: uid(), name: `${c.r},${c.g},${c.b}`, r: c.r, g: c.g, b: c.b, a: 255 }
}

function buildPalette(uniqueColors: RgbColor[], name: string): { palette: Palette; rgbSlots: RgbColor[] } {
  const colors: Color[] = [makeTransparentColor()]
  const rgbSlots: RgbColor[] = [{ r: 0, g: 0, b: 0 }]
  for (const c of uniqueColors) {
    colors.push(rgbToColor(c))
    rgbSlots.push(c)
  }
  return { palette: { id: uid(), name, description: '', colors }, rgbSlots }
}

function buildImage(entry: SheetEntry, paletteId: string, pixelData: Uint8Array): ReImage {
  const layer: Layer = { id: uid(), name: 'Layer', opacity: 1, visible: true, data: pixelData }
  return {
    id: uid(),
    name: entry.name,
    width: entry.rect.w,
    height: entry.rect.h,
    paletteId,
    layers: [layer],
  }
}

export function extractIndividual(
  pixels: PixelBuffer,
  sheet: Sheet,
  entries: SheetEntry[],
): { images: ReImage[]; palettes: Palette[] } {
  const images: ReImage[] = []
  const palettes: Palette[] = []
  for (const entry of entries) {
    const uniqueColors = collectUniqueColors(pixels, entry.rect, sheet.matteColor)
    const { palette, rgbSlots } = buildPalette(uniqueColors, entry.name)
    const pixelData = buildIndexedLayer(pixels, entry.rect, sheet.matteColor, rgbSlots)
    images.push(buildImage(entry, palette.id, pixelData))
    palettes.push(palette)
  }
  return { images, palettes }
}

export function extractMerged(
  pixels: PixelBuffer,
  sheet: Sheet,
  entries: SheetEntry[],
  paletteName: string,
): { images: ReImage[]; palettes: Palette[] } {
  const seen = new Map<string, RgbColor>()
  for (const entry of entries) {
    for (const c of collectUniqueColors(pixels, entry.rect, sheet.matteColor)) {
      const key = `${c.r},${c.g},${c.b}`
      if (!seen.has(key)) seen.set(key, c)
    }
  }
  const { palette, rgbSlots } = buildPalette([...seen.values()], paletteName)
  const images = entries.map(entry => {
    const pixelData = buildIndexedLayer(pixels, entry.rect, sheet.matteColor, rgbSlots)
    return buildImage(entry, palette.id, pixelData)
  })
  return { images, palettes: [palette] }
}
