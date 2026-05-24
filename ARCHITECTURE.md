# rEdit v4 — Architecture & Technology Specification

## Overview

rEdit is a browser-based retro pixel graphics editor, sprite composer, and animation workstation.
It is designed as a desktop-first PWA targeting mouse and keyboard input.

This document records the agreed technology choices and architecture decisions for version 4.

---

## Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Vue 3 + Composition API | Clean reactive model, Composition API suits editor-panel architecture |
| Language | TypeScript | Strict types across domain model and canvas code |
| Build tool | Vite | Fast HMR, first-class Vue + TS support, PWA plugin |
| State management | Pinia | Purpose-built for Vue 3, well-typed, modular stores |
| PWA | `vite-plugin-pwa` | Offline support, installable |
| Project persistence | IndexedDB via `idb` | Local, browser-native, handles binary data well |
| File I/O | File System Access API + download fallback | Open/save `.redit` project files and export PNGs |
| Styling | CSS Modules or scoped Vue SFC styles | No CSS-in-JS overhead; clean component isolation |
| Testing | Vitest + Vue Test Utils | Co-located with Vite build, fast unit tests |

**Not used:** Angular, React, Electron, any backend server.

---

## Domain Model

The full data hierarchy, from project root down:

```
Project
├── name: string
├── description: string
├── palettes: Palette[]
├── images: Image[]
├── sprites: Sprite[]
├── animations: Animation[]
└── sheets: Sheet[]
```

### Palette
```
Palette {
  id: string
  name: string
  colors: Color[]        // ordered; index = palette slot
}

Color {
  id: string
  name: string
  r: number              // 0–255
  g: number
  b: number
  a: number              // 0–255 (255 = fully opaque)
}
```

### Image and Layer
```
Image {
  id: string
  name: string
  width: number          // canvas size in pixels
  height: number
  paletteId: string      // reference to the owning Palette
  layers: Layer[]        // ordered bottom to top
}

Layer {
  id: string
  name: string
  opacity: number        // 0.0–1.0
  visible: boolean
  data: Uint8Array       // length = width * height; each byte = palette color index (0–255)
}
```

**Key design constraint:** pixels store a palette color index, not RGBA values. This is what
makes global color swap, shade/tint brushes, and color-use queries possible. Index 0 is reserved
for transparent (no color). All rendering reads through the palette at draw time.

### Sprite
```
Sprite {
  id: string
  name: string
  anchor: Point          // { x, y } — reference point used by animation frames
  parts: Part[]
}

Part {
  imageId: string
  position: Point        // { x, y } — offset relative to sprite origin
}
```

### Animation
```
Animation {
  id: string
  name: string
  frames: Frame[]
}

Frame {
  spriteId: string
  position: Point        // { x, y } — relative to animation canvas origin
  duration: number       // milliseconds
}
```

### Sheet
```
Sheet {
  id: string
  name: string
  sourceRef: string      // file reference or embedded data URL of imported PNG
  entries: SheetEntry[]
}

SheetEntry {
  name: string
  rect: Rect             // { x, y, w, h } — bounding box in the source image
  anchor: Point
}
```

---

## Canvas Rendering Architecture

Canvas rendering is **entirely imperative** — Vue's reactivity system never touches pixel data.
Vue manages UI structure, metadata, and editor state. The canvas is rendered via direct
Canvas 2D API calls in response to explicit signals.

### Stacked Canvas Pattern

The image editor uses stacked `<canvas>` elements, all `position: absolute` within a relative
container. From bottom to top (ascending z-index):

```
┌─────────────────────────────────┐
│  5. Cursor layer                │  ← topmost; captures all mouse events; draws cursor cell highlight
│  4. Decoration layer (grid)     │  ← grid lines; redrawn only on zoom change
│  3. Image layers [one per Layer]│  ← ordered by layer stack; redrawn when layer pixel data changes
│  2. Composite preview           │  ← merged view of all visible layers (debounced, optional)
│  1. Checkerboard background     │  ← static transparency pattern; drawn once
└─────────────────────────────────┘
```

### Pixel Coordinate System

- **Pixel coordinates** — the native pixel grid of the image (e.g., 16×16)
- **Screen coordinates** — the displayed pixel position on the canvas element
- **zoom** — integer scale factor (e.g., 8 → each pixel = 8×8 screen pixels)
- **pan offset** — `{ x, y }` in pixel coordinates; controls viewport for large images

Cursor layer converts screen position to pixel coordinates:
```
pixelX = Math.floor((screenX + panOffsetX * zoom) / zoom)
pixelY = Math.floor((screenY + panOffsetY * zoom) / zoom)
```

### Layer Rendering

Each image layer canvas renders its `Uint8Array` data through the palette:
1. Build a `Uint8ClampedArray` (RGBA) from the layer's indexed data + palette
2. Write to an `ImageData`
3. Call `ctx.putImageData(imageData, 0, 0)` on a scratch canvas
4. Scale-blit to the display canvas: `ctx.drawImage(scratchCanvas, 0, 0, displayW, displayH)`
   with `imageSmoothingEnabled = false` to preserve crisp pixels

Rendering of a single pixel after a draw operation uses a partial `putImageData` for performance.

### Cursor and Input

The cursor layer:
- Draws a highlight rectangle (or crosshair) at the current pixel cell
- Listens for `mousemove`, `mousedown`, `mouseup`, `mouseleave`, `mouseenter`
- Emits `pixelAction` events: `{ type: 'move'|'press'|'release', pixel: Point, buttons: number }`
- The image editor component receives these and dispatches to the active tool

**Cursor icon design:** The CSS `cursor` property is controlled by a `Record<Tool, string>` lookup
table inside `CursorLayer.vue`. Pan modes (`grab`/`grabbing`) always override the tool cursor.
Draw, Line, and Rectangle use the native `crosshair` cursor. Erase, Fill, and Eyedropper use inline
SVG data URIs (Lucide icon paths, white stroke with black outline, tip/corner hotspot) — no cursor
asset files required. The cell highlight (canvas-drawn pixel outline) is shown for all tools.

---

## Pinia Store Design

Stores are organized by concern. Pixel data is never placed in reactive state.

### `useProjectStore`
```
state: {
  project: Project | null
  isDirty: boolean
}
actions: loadProject, saveProject, newProject
```

### `usePaintStore`
```
state: {
  activeTool: Tool          // 'draw' | 'erase' | 'fill' | 'eyedropper' | 'line' | 'rect' | 'colorpick'
  activeColorIndex: number  // index into current palette
  zoom: number              // 1–32
  panOffset: Point
  isDrawing: boolean
  brushSize: number         // 1×1 for now; extensible
}
```

### `useEditorStore`
```
state: {
  activeImageId: string | null
  activeLayerId: string | null
  activePaletteId: string | null
  activeSpriteId: string | null
  activeAnimationId: string | null
  activeTab: 'image' | 'sprite' | 'animation' | 'sheet'
}
```

### `useHistoryStore`
Edit history is managed per-image as a command stack. Pixel data diffs are stored outside
Pinia (plain JS arrays) to avoid reactive overhead. Pinia tracks only stack depth and
dirty state.

---

## Edit History (Undo/Redo)

Command pattern. Each undoable operation is a `Command` object:
```
Command {
  imageId: string
  layerId: string
  pixels: Array<{ x: number, y: number, oldIndex: number, newIndex: number }>
  label: string
}
```

Rules:
- Contiguous mouse-drag draw strokes are accumulated into a single command (committed on `mouseup`)
- Fill, line, and rect tools produce a single command per operation
- Stack depth limit: 100 commands; oldest dropped when exceeded
- Undo/redo is image-scoped; switching images does not clear history

---

## UI Layout

Tab-based layout with a persistent sidebar.

```
┌────────────────────────────────────────────────────────────────────┐
│  App header: project name, menu bar, global actions                │
├─────────────┬──────────────────────────────────────────────────────┤
│  Sidebar    │  Tab bar: [Image Editor] [Sprite] [Animation] [Sheet]│
│             ├──────────────────────────────────────────────────────┤
│  - Tool     │                                                      │
│    selector │  Active editor panel                                 │
│             │                                                      │
│  - Palette  │  Image Editor:                                       │
│    + color  │    ┌──────────────┐  ┌─────────────────────────┐     │
│    picker   │    │ Canvas       │  │ Layer panel             │     │
│             │    │ (stacked     │  │ - Layer list            │     │
│  - Image    │    │  canvases)   │  │ - Add/remove/reorder    │     │
│    preview  │    │              │  │ - Opacity / visibility  │     │
│             │    └──────────────┘  └─────────────────────────┘     │
│             │    Zoom controls, coordinates                        │
└─────────────┴──────────────────────────────────────────────────────┘
```

The sidebar is present across all tabs. The active editor fills the remaining space.

### Tool Selector
Initially implements: Draw, Erase, Fill (flood), Eyedropper.
Later: Line, Rectangle, Color Manipulation (lighten/darken/saturate/desaturate).

### Palette Panel
- Displays all swatches for the active palette as a color grid
- Click to select active color (highlighted with index indicator)
- Right-click swatch → edit color (RGBA + HSL input)
- "Manage palettes" action → palette CRUD (rename, reorder, delete colors)

---

## Storage Design

### Auto-save (IndexedDB)
All project changes are persisted to IndexedDB automatically (debounced ~2s).
Uses `idb` library. Separate object stores for metadata vs. pixel data blobs.

Schema:
```
projects (store)
  key: projectId
  value: { id, name, description, palettes[], images[metadata], sprites[], animations[], sheets[] }

layerData (store)
  key: layerId
  value: Uint8Array           // raw palette-indexed pixel data
```

### File Format (`.redit`)

A ZIP archive (via `fflate` or `jszip`) containing:
```
project.json          — project metadata, palette, sprite, animation structure
layers/
  <layerId>.bin       — raw Uint8Array pixel data (palette indices), one file per layer
sheets/
  <sheetId>.png       — imported sprite sheet source images
```

Open: File System Access API (`showOpenFilePicker`), fallback to `<input type="file">`.
Save: File System Access API (`showSaveFilePicker`), fallback to programmatic download.

---

## Export

### PNG export (single image)
Flatten visible layers → composite RGBA canvas → `canvas.toBlob()` → download.

### Sprite sheet PNG + metadata
Pack selected sprites/animation frames using a simple bin-packing algorithm.
Produce a single PNG + a JSON sidecar:
```json
{
  "sprites": [
    { "name": "walk_01", "x": 0, "y": 0, "w": 16, "h": 16, "anchorX": 8, "anchorY": 16 }
  ]
}
```

### CSS sprite sheet
Alongside the PNG, generate a CSS file with `background-position` classes per sprite entry.

---

## Development Phases

### Phase 1 — MVP: Image Editor ✓ complete

- ✓ Project: create, name, auto-save/load via IndexedDB (debounced 2s) _verified_
- ✓ Palette: create, add/edit colors (RGBA + hex), select active color; transparent slot (index 0) selectable as draw color. Remove/delete deferred. _verified_
- ✓ Image: create via dialog (name, width 1–512, height 1–512) _verified_
- ✓ Layers: add, remove, reorder, rename (double-click), opacity (live), visibility toggle _verified_
- ✓ Canvas editor: zoom (scroll wheel, +/− keys, 1–32×), pan (Space+drag, middle mouse) _verified_
- ✓ Draw tool, Erase tool, Flood fill (4-connected, exact index match), Eyedropper _verified_
- ✓ Line tool (Bresenham, Shift-constrain to 45°) _verified_ (isometric snap angles deferred — see Deferred Design Decisions)
- ✓ Rectangle tool (outline, Shift-constrain to square) _verified_
- ✓ Undo/redo (100 levels, per-image command stack) _verified_
- ✓ Export image as PNG (composite all visible layers) _verified_
- ✓ Export single layer as PNG _verified_
- ☐ Project file export/import (`.redit` ZIP format) → moved to Phase 5

### Phase 2 — Sprite Editor
- Compose images into sprites
- Set anchor point
- Sprite preview at 1× and 2×

### Phase 3 — Animation Editor
- Frame timeline, add/remove/reorder frames
- Per-frame sprite + position + duration
- Preview playback
- Onion skinning

### Phase 4 — Sheet Editor
- Import PNG → slice into named entries with anchor points
- Auto-shrink bounding box
- Export sprite sheet PNG + JSON + CSS

### Phase 5 — Advanced Tools & Export

- Color manipulation brush (lighten, darken, saturate, desaturate)
- Replace color tool
- Color-use query (which sprites/layers use a given palette slot)
- Full `.redit` zip project file format (open/save via File System Access API, download fallback)
- Palette templates and color cycling definitions (separate Palette Manager tab)

---

## Deferred Design Decisions

### Shape Tool Preview Color Mode

Currently the line/rect drag preview fills each cell with the committed palette color plus a white
outline stroke. A future settings toggle should let the user choose between:

- **Committed color** (current default) — fill = actual palette color, outline = white highlight
- **Cursor opacity** — fill = semi-transparent white (original cursor style), no color information

When color-manipulation tools (darken, lighten, saturate, desaturate) are added, the preview color
for a given pixel is no longer a single palette color — it is a function of the existing pixel's
current color. The `previewColor` prop on `CursorLayer` (currently a single CSS string) will need
to evolve into a per-pixel color function, e.g.:

```ts
type PreviewColorFn = (existingIndex: number, palette: Palette) => string
```

The cursor layer would need access to the underlying layer data to sample existing pixel indices
and compute the resulting preview color per cell.

### Line Tool — Isometric Shift-Constrain Angles

Currently Shift-constrain on the line tool snaps to three directions: horizontal, 45°, and vertical.
For isometric pixel art, two additional snap angles are useful:

- **2:1 shallow** — arctan(1/2) ≈ 26.57°: 2 pixels across for every 1 pixel down
- **1:2 steep** — arctan(2) ≈ 63.43°: 1 pixel across for every 2 pixels down

These are the standard isometric projection angles in pixel art.

The five-zone nearest-angle snap approach: place zone boundaries at the angular midpoints
between adjacent snap angles (~13°, ~36°, ~54°, ~77°). The constrained endpoint for a 2:1 or
1:2 snap is computed by projecting (dx, dy) onto the target direction vector and rounding to
the nearest integer step.

These extra angles should be **off by default** and enabled via a user settings toggle
(e.g. "Isometric snap angles"). The base three-angle snap (0°/45°/90°) is always available.

### Palette Color Removal — Index Remapping

Removing a color from the palette shifts every subsequent palette index down by one, which can
corrupt pixel data in all layers across all images. Two options under consideration:

- **Remap on delete** — scan all layers in all images: pixels at the removed index → 0
  (transparent), pixels at index > removed → index − 1. Pixel data stays consistent.
  Cost: O(width × height × layers × images). Each affected layer produces a undo `Command`.
- **No remap** — splice the color out. Any pixel using that index silently points to a
  different color. Simple, but quietly corrupts existing artwork.

Leaning toward **remap on delete** given the palette-indexed model, but deferred pending decision.
Also consider: should the remove action be blocked if any pixel in any layer uses that index?

---

## Key Architectural Constraints (non-negotiable)

1. **Pixel data never enters Vue reactivity.** `Uint8Array` layer data lives in plain JS
   objects. Components receive a render signal and call canvas APIs directly.

2. **Palette indices are the ground truth.** Rendered RGBA is always derived from
   `(layer.data[i], image.paletteId) → palette.colors[index]`. Never store RGBA in layers.

3. **Rendering is synchronous within a paint operation.** No async rendering pipeline in Phase 1.
   Long operations (fill, composite) may be moved to a Web Worker in later phases if performance demands it.

4. **Edit history captures only changed pixels.** A full-layer snapshot approach wastes memory.
   Store per-pixel diffs (oldIndex, newIndex) and accumulate within a stroke.

5. **Storage is layered.** Auto-save to IndexedDB is the safety net. File save is explicit user
   action. The storage layer is abstracted behind a service interface so a cloud backend can be
   added in a later version without changing domain or UI code.


## Maybes, nice to haves

* We have a number of numeric inputs that I would like to share style and behavior. Hidden up/down icons Click/focus+drag to increase/decrease value. Right/Up increase, Left/Down decrease.
* Close/remove button for image.

## Possible Reconsiderations

Now we are generating a canvas the size of the image*zoom. For zoomed in 512x512 it can amount to a canvas of 16384x16384, which makes it quite unwieldy.
What if we skipped native scrolling and always had a canvas the size of the application canvas area, regardless of zooming or image size. We would then only render the visible window to the canvas.