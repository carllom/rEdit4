# rEdit Mind Maps — Requirements Archive

Parsed from `rEdit.mm` (v1) and `rEdit2.mm` (v2), FreeMind format.
Context: early design sessions for a retro pixel-graphics editor (TS/Vue PWA).

---

## rEdit.mm — Version 1

### 1. Entity Structure

Data model hierarchy for all core domain objects.

```
Animation
├── name
└── ordered list of Frames
    ├── Sprite (reference)
    ├── position
    └── duration

Sprite
├── name
├── anchor
└── list of Parts
    ├── name
    ├── Image (reference)
    └── position

Image
├── name
└── ordered list of Layers
    ├── Bitmap [native object]
    ├── name
    └── transparency

Palette
├── name
└── ordered list of Colors
    ├── Color (with transparency) [native object]
    └── name
```

---

### 2. Entity Functions (CRUD operations per entity)

#### Image

- Clone image
- Edit image name
- Add layer
- Duplicate layer
- Reorder layer
- Remove layer
- **Layer**
  - Edit layer name
  - Edit layer transparency

#### Sprite

- Clone sprite
- Edit sprite name
- Set sprite anchor position
- Add image → position
- Move image
- Remove image

#### Palette

- Clone palette
- Edit palette name
- Add color
- Remove color
- Reorder colors
- **Color**
  - Edit color name
  - Edit values: rgb | hsl | cmyk | transparency

#### Animation

- Clone animation
- Edit animation name
- Add frame → select sprite
- Duplicate frame
- Remove frame
- Reorder frame
- **Frame**
  - Change sprite
  - Set position
  - Set duration

#### Sheet

- Clone sheet
- Edit sheet name
- Import sprite → as composite | as images
- Import animation

---

### 3. UI Components

#### Palette (Color Picker)

- Color editor

#### Image Editor

- Bitmap editor (grid)
- Layer list
- Tool selector
- Image preview

#### Sprite Editor

- Image picker
- Image composer
  - Anchor point
- Sprite preview

#### Animation Editor

- Sprite picker
- Preview window
  - Onion skin settings
- Animation settings
- Timeline (Frames)

#### Sheet Import

- Selection view
- Image preview

---

### 4. Application Functions & Features

- **Import images** (single layer) from uploaded bitmap / sprite sheet
  - Auto-shrinking selection box
  - Select multiple images from a single upload

- **Bitmap editing functions**
  - Freehand draw
  - Freehand erase
  - Fill
  - **Application keeps reference to palette color used** (key design intent)
    - Color swap & edit across layers and image
    - "Shade/tint" brush
    - Query color use

---

### 5. Functionality / Wish List

*(Source: rEdit notes.txt)*

#### Zoomed Editor

- Grid decoration layer
- Cursors: dot | rectangle | cross
- Set anchor point for sprite
- Extra tools
  - Color manipulation pen (lighten, darken, saturate, desaturate)
  - Line | box | fill
  - Replace color tool
  - Eyedropper

#### Merged Preview Window

- Zoom functionality

#### Layer Viewer / Manager

- Layer transparency
- Layer visibility
- Active layer indicator
- Merge | copy | add | delete layer

#### Asset Manager

- Drag/add assets to current sprite as new layer
- Export sprite to assets
- Multilayer assets? *(open question)*
- How are assets arranged? *(open question)*

#### Color Chooser

- Palette selector
- Variable amount of predefined hues
- RGBA | HSL entry

#### Palette Editor

- Load/store palette
- Add/remove color
- RGBA | HSL entry
- Color comment (annotation per color)

#### Sheet Editor

- Load/store sheet
- Add/remove sprites from sheet
- Space optimization

#### Project Scope

- Store sprites / assets / palettes / animations within a project scope

---

## rEdit2.mm — Version 2

### Functionality Details (Implementation-Level)

#### CanvasService

Stateful service keeping the current paint state:

- tool
- pen position
- paint layer
- color

#### CursorLayer

Overlay layer component:

- Optional gridlines
- Display cursor
- Generate cursor events

#### ImageLayer

Canvas element component per layer:

- Contains the layer `<canvas>` element
- Contains layer data (reference)
- Size determined at creation time

---

## Key Design Intentions (cross-cutting)

1. **Palette-indexed color** — the editor tracks which palette color was used per pixel, enabling global color swaps, shade/tint brushes, and color-use queries across the whole image.
2. **Layered images inside composited sprites inside animated sequences** — a clear three-tier hierarchy: Image → Sprite (Parts) → Animation (Frames).
3. **Sheet import** — sprite sheets can be sliced into individual images with auto-shrink bounding boxes.
4. **Anchor points** — sprites carry an anchor, settable in the zoomed editor, used for positioning in animation frames.
5. **Onion skinning** — animation preview includes onion skin settings.
6. **Project scope** — all assets (sprites, palettes, animations, images) live within a named project container.
7. **CanvasService / CursorLayer / ImageLayer** — v2 started decomposing the rendering into discrete Angular-style services and components; carry this separation forward.
