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

### Color Cycling
A retro animation technique where palette indices are rotated on a timer, creating motion
effects (flowing water, fire, etc.) without modifying pixel data. Defined per-Palette.
Managed in the Palette Manager tab — not in the sidebar editor.

## Color
A single palette slot: name + R, G, B, A (0–255 each). Index 0 is always transparent (a=0).

## Image
A pixel bitmap of fixed width × height. Has one or more Layers and references one Palette.
Pixel data is palette-indexed: each byte is a Color index (0–255).

## Layer
A single plane of indexed pixel data within an Image. Has opacity (0.0–1.0) and visibility.
Layers are composited bottom-to-top. Only the active Layer is painted into.

## Sprite
A composition of one or more Images arranged at offsets, with a named anchor point.
The anchor is used by Animation Frames for positional reference.

## Animation
An ordered sequence of Frames. Each Frame references a Sprite, a position, and a duration (ms).

## Sheet
An imported PNG sprite sheet. Contains named SheetEntries, each with a bounding rectangle
and anchor point. Used for slicing external assets into Images.

## Tool
The active paint instrument. Phase 1 tools: Draw, Erase, Fill, Eyedropper, Line, Rectangle.

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
