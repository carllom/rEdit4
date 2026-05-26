// Core domain types for rEdit v4.
// All pixel data is palette-indexed: each byte in Layer.data is a palette color index.
// Index 0 is reserved for transparent (no color).

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Color {
  id: string
  name: string
  r: number   // 0–255
  g: number
  b: number
  a: number   // 0–255, 255 = fully opaque
}

export interface Palette {
  id: string
  name: string
  description: string
  colors: Color[]  // index 0 = transparent (reserved, always present)
}

export interface PaletteTemplate extends Palette {
  isBuiltIn: boolean
}

export type PaletteKind = 'project' | 'builtin' | 'user-template'

export interface Layer {
  id: string
  name: string
  opacity: number   // 0.0–1.0
  visible: boolean
  data: Uint8Array  // length = image.width * image.height; each byte = palette color index
}

export interface ReImage {
  id: string
  name: string
  width: number
  height: number
  paletteId: string
  layers: Layer[]
}

export interface Part {
  imageId: string
  position: Point
}

export interface Sprite {
  id: string
  name: string
  anchor: Point
  parts: Part[]
}

export interface Frame {
  spriteId: string
  position: Point
  duration: number  // milliseconds
}

export interface Animation {
  id: string
  name: string
  frames: Frame[]
}

export interface SheetEntry {
  name: string
  rect: Rect
  anchor: Point
}

export interface Sheet {
  id: string
  name: string
  sourceRef: string  // data URL of imported source PNG
  entries: SheetEntry[]
}

export interface Project {
  id: string
  name: string
  description: string
  palettes: Palette[]
  images: ReImage[]
  sprites: Sprite[]
  animations: Animation[]
  sheets: Sheet[]
}
