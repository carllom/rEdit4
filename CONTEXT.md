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
