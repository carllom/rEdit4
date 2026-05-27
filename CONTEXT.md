# rEdit v4 — Domain Glossary

## Project

A named container holding all assets: Palettes, Images, Sprites, Animations, and Sheets.
One project is active at a time. Projects auto-save to IndexedDB and can be exported as `.redit` files.
On first launch, a blank project is auto-created. This will eventually be replaced by a Project Template selector.

## Project Template

A pre-defined starting point for a new Project (e.g. preset canvas size, palette, and initial structure).
Will replace the auto-create-blank-project startup behavior in a future phase.

## Palette

An ordered list of Colors. Index 0 is always the transparent slot — it cannot hold a color.
Each Image references exactly one Palette; pixel data stores indices into that Palette.

### Palette Template

A pre-defined Palette that can be loaded as a starting point (e.g. EGA, CGA, GameBoy).
Managed in the Palette Manager tab — not in the sidebar editor.

### Default Palette Template

The Palette Template automatically cloned into a new Project's palette list when the Project is created.
Configured as an Application Setting in the Project Settings Category. References a template by ID; resolves to CGA if the referenced template no longer exists (e.g. a user template was deleted).

### Color Cycling

A retro animation technique where palette indices are rotated on a timer, creating motion
effects (flowing water, fire, etc.) without modifying pixel data. Defined per-Palette.
Managed in the Palette Manager tab — not in the sidebar editor.

## Color

A single palette slot: name + R, G, B, A (0–255 each). Index 0 is always transparent (a=0).

## Image

A pixel bitmap of fixed width × height. Has one or more Layers and references one Palette.
Pixel data is palette-indexed: each byte is a Color index (0–255).

## Image Picker

A modal dialog component for selecting one or more Images from the project. Accepts a `mode`
prop (`single` | `multi`). Used wherever an Image must be chosen: adding a Part to a Sprite
(single), switching the active Image in the Image Editor (single), selecting source Images in
the Sheet Creator (multi). Displays Images as thumbnail+name tiles arranged in a grid, grouped
under collapsible Name-Prefix Group headers. Supports free-text name search. Thumbnail size is
fixed (medium) in Phase 2. Will eventually support Faceted Labels.

_Future: the Sprite list in the sidebar may need to evolve to a most-recently-used list
complemented by a Sprite Picker (analogous to the Image Picker) for projects with thousands
of Sprites. Deferred beyond Phase 2._

### Name-Prefix Group

An auto-derived grouping of Images whose names share a common prefix before the first `_`
separator (e.g. `walk_01`, `walk_02` → group `walk`). Computed at display time — no stored
metadata. Images without a `_` separator appear in an ungrouped section.

### Faceted Label

_Deferred — not in Phase 2._ A classification tag attached to an Image, in one of two forms:
a bare label (e.g. `hero`) or a key:value pair (e.g. `Direction:Left`, `Character:AAA`).
Enables multi-axis filtering in the Image Picker (e.g. show all Images where
`Character=AAA` AND `Direction=Left`). Will require a `labels: string[]` field on `ReImage`
and a label-editing UI.

## Layer

A single plane of indexed pixel data within an Image. Has opacity (0.0–1.0) and visibility.
Layers are composited bottom-to-top. Only the active Layer is painted into.

## Sprite

A named composition of one or more Parts arranged in a shared local coordinate space.
Has an Anchor point and an ordered Part list. The Sprite Editor shows a live Sprite Preview
at the bottom of the Part panel.

### Sprite Preview

A small read-only panel at the bottom of the Part panel showing the composited Sprite at a
configurable zoom (Application Setting, clamped to a reasonable range). Updated live as Parts
are moved or the Anchor changes. Purpose: see the Sprite at true pixel scale while editing.
Uses the same Preview Background Application Setting as the Flash Card Preview.
_Avoid_: thumbnail (reserved for Image Picker tiles)

### Sprite Local Space

A free 2D coordinate system with a stable origin at `(0, 0)`. All Part positions and the
Anchor are expressed as offsets from this origin. The origin is not tied to any bounding box
or visual feature of the Parts — it is an arbitrary but stable reference point. Parts may
have negative coordinates. Nothing is recalculated when Parts are moved.

### Part

A single Image placed within a Sprite's local space. Stores `imageId`, `position: Point`
(offset from the Sprite's `(0, 0)` origin), and an optional `name`. If `name` is absent,
the referenced Image's name is used as the display label. The Part list is ordered; Parts
render bottom-to-top (same direction as Layers within an Image). The same Image may appear
in multiple Parts of the same Sprite (no uniqueness constraint). Parts can be drag-reordered.
A selected Part is repositioned by dragging on the canvas, nudging with arrow keys, or editing
live `x`/`y` NumericInput fields in the Part panel.

_Avoid_: image slot, layer (within a Sprite context)

### Anchor

A named `Point` in Sprite local space that defines the placement hot-spot. When a Sprite
is placed at world position `(wx, wy)`, the Anchor lands at `(wx, wy)`. Each Part then
renders at `(wx - anchor.x + part.position.x, wy - anchor.y + part.position.y)`.
Moving the Anchor crosshair in the editor does not move Parts — only the hot-spot shifts.
Used by Animation Frames to align consecutive Sprites (e.g. foot-planting across a walk cycle).
The Anchor is repositioned by dragging its crosshair on the canvas or via `x`/`y` NumericInput fields.

_Avoid_: pivot, origin, hot-spot (use Anchor)

### Referential Integrity (Image → Part)

Deleting an Image that is referenced by one or more Parts is blocked. The user receives a
message listing the Sprites that hold the reference and must remove those Parts first.
The same block-with-message policy applies to deleting a Sprite referenced by Animation Frames.

## Animation

An ordered sequence of Frames. Each Frame references a Sprite, a position, and a duration (ms).

## Sheet

An imported PNG sprite sheet. Has a MatteColor and contains named SheetEntries, each with a bounding rectangle. Used for slicing external assets into Images via the Sheet Editor.

## MatteColor

An optional RGB color on a Sheet that marks the transparent background in the source PNG. Stored as `{ r, g, b } | null`. A pixel is considered transparent during Sheet operations if its alpha channel is 0, OR (when MatteColor is non-null) its RGB matches the MatteColor. Picked interactively by clicking any pixel in the Sheet Editor; clicking a transparent pixel (alpha = 0) sets MatteColor to null, which effectively means only alpha = 0 counts as transparent.

## SheetEntry

A named bounding rectangle within a Sheet, defining the pixel extent of one sub-image. Stored as `{ name, rect: { x, y, w, h } }`. The collection of SheetEntries on a Sheet is its entry list.
_Avoid_: image boundary, image extent, defined extent.

## Viewport

The fixed-size canvas area in the Image Editor that shows a window into the active Image.
The Viewport dimensions are determined by the editor panel size, not by the Image dimensions or zoom level.
Pan and zoom change which portion of the Image is visible, but the Viewport canvas itself never resizes.

## NumericInput

A reusable UI control for editing a bounded integer or decimal value. Supports direct text entry and scrubbing — clicking and dragging to increment/decrement the value. Dragging right or up increases the value; left or down decreases it. Shift+scrub moves in 0.1× steps. Native browser spinners are hidden; the scrub gesture replaces them.

## Tool

The active paint instrument. Phase 1 tools: Draw, Erase, Fill, Eyedropper, Line, Rectangle.
Each Tool may have one or more Tool Variants.

## Tool Variant

A named mode of a Tool that modifies its drawing behaviour without changing the interaction gestures. Each Tool has exactly one active Variant at a time; variants within a Tool are mutually exclusive. The active variant is stored per-tool and restored when switching back to that tool.

_Avoid_: tool mode, tool option, tool sub-type

## Cursor

The canvas pointer has two independent visual components:

1. **OS pointer icon** — the CSS `cursor` property, set per-Tool via a lookup table in `CursorLayer`. Draw/Line/Rectangle use `crosshair`; Erase, Fill, and Eyedropper use tool-specific SVG icons (white stroke, black outline, tip/corner hotspot).
2. **Cell highlight** — a white semi-transparent rectangle drawn on the cursor canvas layer, outlining the exact pixel cell being targeted. Present for all Tools regardless of pointer icon.

## Stroke

A single draw gesture: mousedown → mousemove* → mouseup. All pixel changes within one
Stroke are committed as a single undo Command.

## Command

An undoable unit of work. Stores per-pixel diffs (oldIndex, newIndex) for the affected Layer.
Commands are stacked per-Image with a depth limit of 100.

## Application Settings

User preferences that apply across all Projects and survive loading a new Project.
Stored in `localStorage` as a single JSON blob under the key `redit:settings`, separate from project data in IndexedDB.
Changes take effect immediately (no Save/Apply step).
Organised into named Settings Categories (e.g. General, Editor) displayed in a panel-swap layout at `/settings`.

### Settings Category

A named group of related Application Settings shown as a panel in the Settings view.
Current categories: General (auto-save frequency), Editor (isometric snap, cursor opacity, preview background), Project (default palette template).

### Preview Background

An Application Setting controlling what appears behind transparent pixels in the Flash Card Preview. Either `checkerboard` or a user-chosen solid color. Stored in the Editor settings category.

## Flash Card Preview

A transient overlay activated by holding the Backquote key. Shows the full composited Image centered over the editor with a dimmed scrim, at the current Preview Zoom. Disappears on key release. Tool and mouse actions are suppressed while active.
_Avoid_: Image preview, preview panel

### Preview Zoom

The integer zoom scale used by the Flash Card Preview. Per-image session state: auto-fit on first use (largest integer scale where the full Image fits the Viewport), adjustable via scroll wheel or +/− while the preview is active. Resets to auto-fit on page reload.
