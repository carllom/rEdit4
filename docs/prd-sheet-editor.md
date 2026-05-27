## Problem Statement

As a pixel artist, I frequently work with existing sprite sheets — large PNG files containing many small sub-images for characters, tiles, UI elements, and animations. There is currently no way to bring these assets into rEdit. I have to manually identify each sub-image's pixel bounds, recreate every Image by hand, and guess at which colors belong to which palette. This is tedious, error-prone, and makes rEdit unusable as a tool for working with legacy or externally-sourced assets.

## Solution

Implement the Sheet Editor — a dedicated view in the [Sheet] tab — that lets the user load a PNG sprite sheet, define the bounding rectangles of its sub-images using interactive tools, and extract selected sub-images into the project as palette-indexed Images with generated Palettes.

The workflow is:
1. Load a PNG as a new Sheet; give it a name.
2. (Optionally) pick a MatteColor — the background color that represents transparency.
3. Define SheetEntry rects using one of three tools: manual Draw Rect, Growing Rectangle (expand outward from a seed pixel), or Shrinking Rectangle (contract inward from a drawn rect).
4. Fine-tune each rect with drag handles, keyboard nudge, or numeric inputs, then accept it.
5. Select entries in the entry list and extract them as Images — each with its own Palette (Individual mode) or all sharing one merged Palette (Merged mode).

Sheets are permanent project assets. The user can return at any time to define more entries or extract more Images.

## User Stories

### Sheet management

1. As a pixel artist, I want to load a PNG file as a new Sheet so that I can start slicing it into Images.
2. As a pixel artist, I want the Sheet to be named after the loaded PNG filename by default so that I do not have to type a name manually.
3. As a pixel artist, I want to rename a Sheet inline so that I can keep names meaningful.
4. As a pixel artist, I want a Sheet selector at the top of the Sheet Editor so that I can switch between multiple Sheets in the same project.
5. As a pixel artist, I want to create multiple Sheets in one project so that I can work with a character sheet, a tileset sheet, and a UI sheet simultaneously.
6. As a pixel artist, I want Sheets to be saved with the project (in IndexedDB and the `.redit` file) so that my defined entries are preserved across sessions.
7. As a pixel artist, I want to return to a Sheet at any time and define more entries or extract more Images so that I can work incrementally.

### MatteColor

8. As a pixel artist, I want to pick a MatteColor by clicking any pixel on the Sheet canvas so that the editor knows which background color to treat as transparent.
9. As a pixel artist, I want the Pick Matte tool to auto-switch back to my previous tool after one click so that picking a matte does not interrupt my workflow.
10. As a pixel artist, I want the current MatteColor displayed as a color swatch in the tool strip so that I always know what matte is active.
11. As a pixel artist, I want clicking a fully-transparent pixel to set MatteColor to null (no matte) so that I can revert to alpha-only transparency without a separate clear action.
12. As a pixel artist, I want a checkerboard pattern in the MatteColor swatch when no matte is set so that the null state is visually distinct.

### Sheet canvas

13. As a pixel artist, I want the Sheet canvas to use the same zoom and pan mechanics as the Image Editor (scroll to zoom, Space+drag or middle mouse to pan, Home to re-center) so that I do not have to learn a new interaction model.
14. As a pixel artist, I want to zoom from 1× to 32× on the Sheet canvas so that I can work on both large overview sheets and fine pixel-level details.
15. As a pixel artist, I want the Sheet canvas to fit inside a fixed-size Viewport so that the layout remains stable at any zoom level.

### Drawing rects manually

16. As a pixel artist, I want to draw a rectangle on the Sheet canvas by clicking and dragging so that I can define a SheetEntry boundary by hand.
17. As a pixel artist, I want an in-progress rect displayed as a zoom-invariant 1px outline (drawn in screen-space, not scaled with zoom) so that the boundary is always crisp and visible at any zoom level.

### Growing Rectangle

18. As a pixel artist, I want to click a non-transparent pixel and have the editor automatically expand a rectangle outward until all four edges contain only transparent pixels so that I can detect a sub-image boundary with one click.
19. As a pixel artist, I want the Growing Rectangle to clamp at the Sheet image boundary so that sub-images that extend to the edge of the sheet are detected correctly.
20. As a pixel artist, I want clicking a transparent pixel with the Growing Rectangle tool to be a silent no-op so that misclicks do not produce broken results.

### Shrinking Rectangle

21. As a pixel artist, I want to draw an approximate rectangle and have the editor automatically shrink each edge inward until it touches a non-transparent pixel so that I can snap to tight bounds without precise drawing.
22. As a pixel artist, I want edges that already touch non-transparent content to remain in place during shrinking so that a rect drawn tight on one side is not disturbed.
23. As a pixel artist, I want a fully-transparent drawn rect to be discarded silently so that drawing over empty space produces no unwanted entry.

### Rect adjustment

24. As a pixel artist, I want drag handles on the four corners and four edge midpoints of the in-progress rect so that I can resize it with the mouse.
25. As a pixel artist, I want arrow keys to nudge the entire in-progress rect by 1px so that I can make fine positional adjustments without the mouse.
26. As a pixel artist, I want Shift+arrow keys to nudge the rect by 10px so that I can make coarser adjustments quickly.
27. As a pixel artist, I want x, y, w, h numeric input fields (using the existing NumericInput component) in the right panel so that I can set exact pixel values for the rect.
28. As a pixel artist, I want to press Enter or click an Accept button to commit the in-progress rect as a SheetEntry so that acceptance is available from both keyboard and mouse.
29. As a pixel artist, I want to press Escape or click a Cancel button to discard the in-progress rect so that I can abandon a bad selection without creating an entry.

### SheetEntry management

30. As a pixel artist, I want accepted SheetEntries to receive an auto-generated name (entry_01, entry_02, …) so that I can accept entries rapidly without stopping to type a name.
31. As a pixel artist, I want to rename a SheetEntry by clicking its name in the entry list so that I can give entries meaningful names at any time.
32. As a pixel artist, I want accepted SheetEntries to be shown on the Sheet canvas as semi-transparent accent-color fills with a 1px border so that I can see all defined regions at a glance.
33. As a pixel artist, I want the selected SheetEntry to be highlighted with a brighter fill and thicker border so that I can clearly identify the active entry.
34. As a pixel artist, I want overlapping SheetEntries to stack visually without any warning so that the editor does not block intentional or exploratory overlap.
35. As a pixel artist, I want to click a SheetEntry in the entry list to select it and make its rect adjustable so that I can refine any entry after the fact.
36. As a pixel artist, I want to delete a SheetEntry immediately with no confirmation dialog so that cleanup stays fast.
37. As a pixel artist, I want deleting a SheetEntry to leave any already-extracted Images untouched so that my project assets are never removed without my explicit action.
38. As a pixel artist, I want to drag-reorder entries in the entry list so that I can group related entries before a merged palette extraction.

### Extraction

39. As a pixel artist, I want to select entries for extraction using checkboxes in the entry list so that I can choose exactly which sub-images to bring into the project.
40. As a pixel artist, I want an Individual extraction mode that gives each selected SheetEntry its own Image and Palette (both named after the SheetEntry) so that unrelated sprites keep separate color sets.
41. As a pixel artist, I want a Merged extraction mode that gives all selected SheetEntries individual Images but a single shared Palette so that related sprites (e.g. animation frames) share one color set.
42. As a pixel artist, I want to be prompted for a palette name before a Merged extraction so that the shared Palette has a meaningful name in the project.
43. As a pixel artist, I want extraction to be blocked with a clear error if any sub-image (or merged group) contains more than 255 unique colors, showing the actual count, so that I know exactly what needs to be resolved.
44. As a pixel artist, I want extracted Images to be independent project assets with no persistent link back to the SheetEntry so that editing or deleting the SheetEntry later has no side-effects on my artwork.

## Implementation Decisions

### Module A — Domain model updates

- `Sheet` gains `matteColor: { r: number; g: number; b: number } | null`. Default is `null`.
- `SheetEntry.anchor` becomes optional (`anchor?: Point`). Anchor is deferred to a future phase; the field is retained in the model to avoid a breaking schema change later.
- `Sheet.sourceRef` remains a data URL of the imported PNG (embedded in the `.redit` ZIP at `sheets/<sheetId>.png` on export).

### Module B — Sheet algorithms (`src/domain/sheetOps.ts`)

Pure functions, no Vue or DOM dependencies. The transparency predicate is the foundation shared by all algorithms:

- `isTransparentPixel(r, g, b, a, matteColor)` — returns true if `a === 0` OR (`matteColor !== null` AND `r/g/b` matches matteColor exactly). No tolerance.
- `growRectangle(pixels, seed, sheetBounds, matteColor): Rect | null` — seed must be non-transparent (returns null otherwise). Expands each of the four edges outward one step at a time until the full edge row/column is transparent; clamps at `sheetBounds`.
- `shrinkRectangle(pixels, startRect, sheetBounds, matteColor): Rect | null` — shrinks each edge inward while its row/column is entirely transparent; returns null if the entire rect is transparent.
- `collectUniqueColors(pixels, rect, matteColor): RgbColor[]` — returns the unique non-transparent `{r,g,b}` values found within `rect`. Used for palette generation and overflow checking.
- `buildIndexedLayer(pixels, rect, matteColor, palette): Uint8Array` — maps each pixel in `rect` to its palette index; transparent pixels → index 0.

`pixels` is always a plain `{ data: Uint8ClampedArray, width: number, height: number }` shape (compatible with `ImageData` but no DOM dependency).

### Module C — Extraction service (`src/domain/sheetExtraction.ts`)

Pure functions. Calls Module B internally.

- `checkColorOverflow(pixels, entries, matteColor, mode): Map<entryName, colorCount>` — returns only entries (or the merged group) that would exceed 255 unique colors. Empty map = safe to extract.
- `extractIndividual(pixels, sheet, entries): { images: ReImage[], palettes: Palette[] }` — for each entry, calls `collectUniqueColors` to build a Palette (index 0 = transparent, indices 1–N = unique colors in order found), then calls `buildIndexedLayer` to produce a single-layer Image. Image and Palette are named after the SheetEntry.
- `extractMerged(pixels, sheet, entries, paletteName): { images: ReImage[], palettes: Palette[] }` — collects the union of unique colors across all entries, builds one shared Palette, then builds one Image per entry using that Palette. Images are named after their SheetEntries; the shared Palette uses the user-provided `paletteName`.

All functions produce plain domain objects (`ReImage`, `Palette`, `Layer`) ready to be appended to the project by the store.

### Module D — Sheet store (`src/stores/sheetStore.ts`)

Pinia store. Thin coordination layer; pixel data never enters reactive state.

State:
- `activeSheetId: string | null`
- `activeEntryName: string | null` — name of the selected SheetEntry
- `inProgressRect: Rect | null` — the rect currently being drawn/adjusted; not yet a SheetEntry
- `activeTool: 'pickMatte' | 'drawRect' | 'growRect' | 'shrinkRect'`
- `previousTool` — tool to restore after Pick Matte auto-switches back
- `checkedEntryNames: string[]` — entries selected for extraction

Actions manage sheet CRUD (delegating persistence to the project store), entry add/update/delete, MatteColor set, and tool switching.

### Module E — Rect interaction composable (`useRectInteraction`)

Encapsulates all in-progress rect input logic; consumed by `SheetCanvas.vue`. Manages:
- Rect draw start/resize via mouse events on the canvas
- Eight drag handles (4 corners + 4 edge midpoints) with hit-testing
- Arrow key nudge (1px) and Shift+arrow (10px) for whole-rect move
- Accept (Enter) and Cancel (Escape) keyboard bindings
- Growing/Shrinking trigger: on mouse-down in the relevant tool mode, reads the clicked pixel from the canvas `ImageData`, calls the appropriate Module B function, and sets the result as the in-progress rect

### Module F — Sheet Editor UI (Vue components)

- `SheetEditorView.vue` — top-level coordinator; owns layout
- `SheetSelector.vue` — Sheet dropdown + New Sheet (load PNG) button + inline rename
- `SheetToolStrip.vue` — four tool buttons + MatteColor swatch (checkerboard when null)
- `SheetCanvas.vue` — fixed-size Viewport canvas; renders source PNG + SheetEntry overlays + in-progress rect; delegates input to Module E composable; zoom/pan identical to Image Editor
- `SheetEntryList.vue` — scrollable list of SheetEntry rows (thumbnail, name, w×h, checkbox, delete-on-hover); supports inline rename and drag-to-reorder
- `SheetExtractionPanel.vue` — Individual/Merged toggle; Merged palette name input (shown only in Merged mode); Extract button; overflow error display

### Canvas overlay rendering

SheetEntry overlays and the in-progress rect are drawn on a decoration canvas layer stacked above the source PNG canvas (same stacked-canvas pattern as the Image Editor). The decoration canvas is the same size as the Viewport.

- Accepted entries: filled rect using `--rd-color-accent` at ~30% opacity + 1px border at full accent opacity
- Selected entry: filled rect at ~60% opacity + 2px border
- In-progress rect: 1px outline only (no fill, or very low alpha fill); drawn in screen-space so it is always 1px regardless of zoom

### Zoom-invariant outline technique

The in-progress rect outline is drawn using the screen-space coordinates of the rect edges (derived from pixel coords via the standard `panOffset`/`zoom` transform) and `ctx.strokeRect` at 1px line width. It is never scaled by zoom — the line width is always 1 CSS pixel.

### Thumbnail generation

On SheetEntry acceptance, a 24×24 thumbnail is generated by drawing the sub-image region (source PNG cropped to `entry.rect`) to an offscreen canvas scaled to fit 24×24 and saved as a data URL on the SheetEntry. Rendered once; not recomputed on zoom/pan changes.

### Schema changes

`Sheet` model change is backward-compatible: `matteColor` defaults to `null` on load if absent, requiring no migration of existing saved data. `SheetEntry.anchor` is already in the model; making it optional is non-breaking.

### File storage

The source PNG for each Sheet is stored as a data URL in `Sheet.sourceRef` in IndexedDB. On `.redit` export it is written to `sheets/<sheetId>.png` inside the ZIP, consistent with the existing file format spec.

## Testing Decisions

Tests verify external behavior only — given inputs, assert outputs. No assertions on internal variable names, intermediate state, or Vue component internals.

**Module B — Sheet algorithms (`sheetOps.test.ts`):**
- `isTransparentPixel`: transparent when alpha=0 regardless of matteColor; transparent when RGB matches matteColor and alpha>0; opaque when RGB differs and alpha>0; null matteColor only triggers alpha rule.
- `growRectangle`: expands correctly around a simple bounded sprite; clamps at sheet boundary when sprite touches edge; returns null for transparent seed; produces correct rect for an asymmetric sprite region.
- `shrinkRectangle`: shrinks to tight bounds on a bordered rect; leaves non-transparent edges in place; returns null for a fully-transparent input rect; no-op when all edges already touch non-transparent pixels.
- `collectUniqueColors`: returns correct set for a simple palette-art region; transparent pixels excluded; matteColor pixels excluded; returns empty for a fully-transparent region.
- `buildIndexedLayer`: pixel at matteColor maps to index 0; pixel matching palette entry maps to correct index; fully transparent pixel maps to index 0; output length equals `rect.w * rect.h`.

**Module C — Extraction service (`sheetExtraction.test.ts`):**
- `checkColorOverflow`: returns empty map when all entries are within 255 colors; flags individual entries exceeding 255 in Individual mode; flags the merged group when union exceeds 255 in Merged mode; does not flag entries within limit.
- `extractIndividual`: result contains one Image and one Palette per entry; Image name matches SheetEntry name; Palette name matches SheetEntry name; Palette index 0 is transparent; pixel data maps correctly to palette indices.
- `extractMerged`: result contains one Image per entry and exactly one shared Palette; shared Palette name matches provided `paletteName`; all Images reference the same Palette id; pixel data maps correctly to shared palette indices; union of colors across entries is complete.

**Module D — Sheet store (`sheetStore.test.ts`):**
- Setting MatteColor via Pick Matte tool reverts to previous tool.
- Accepting an in-progress rect adds a SheetEntry with auto-generated name and clears `inProgressRect`.
- Deleting an entry removes it from the active Sheet's entries; does not affect other sheets.
- Checked entry names are cleared after extraction.

Prior art: `src/domain/__tests__/paletteOps.test.ts` and `src/stores/__tests__/projectStore.test.ts` — Vitest, no DOM required for Modules B and C.

## Out of Scope

- **Anchor points on SheetEntries** — deferred to a later phase. The `anchor` field is kept optional in the model.
- **Re-running Growing/Shrinking on an existing SheetEntry** — delete the entry and redo.
- **MatteColor tolerance matching** — only exact RGB match is supported. JPEG source images are not a supported input.
- **Multiple MatteColors per Sheet** — exactly one MatteColor (or null) per Sheet.
- **Automatic grid-based slicing** — no fixed-stride or uniform-cell slicing tool. All entries are defined interactively.
- **Anchor point definition UI** — not in this phase.
- **Sprite and Animation assembly from extracted Images** — that is the concern of the Sprite and Animation editors (Phases 2 and 3).
- **Export of the Sheet itself** — the `.redit` project file stores the Sheet; standalone sprite sheet PNG export is a Phase 5 concern.
- **Undo/redo within the Sheet Editor** — SheetEntry add/delete/edit do not participate in the per-image undo stack.
- **Color quantization** — if a region exceeds 255 unique colors, extraction is blocked. No automatic quantization.
- **JPEG or lossy source images** — only PNG (lossless) is supported as a Sheet source.

## Further Notes

- The transparency predicate (`alpha === 0 OR rgb === matteColor`) is the single shared definition used by all three rect tools and the extraction service. It must be implemented once in Module B and called everywhere — never inlined.
- Picking a transparent pixel as MatteColor sets it to `null`, which is a valid and useful state meaning "alpha-only transparency." This is not an error condition.
- Extracted Images are entirely independent of the Sheet and their source SheetEntry from the moment of extraction. There is no live link. Subsequent edits to a SheetEntry rect, or deletion of the entry, have no effect on extracted Images.
- The Sheet canvas zoom/pan state follows the same per-asset session pattern as the Image Editor: auto-fit on first open, restored on subsequent opens within the same session, reset on page reload.
- The auto-generated SheetEntry name sequence (entry_01, entry_02, …) is based on creation order across the lifetime of the Sheet, not the current count of entries. Deleting entry_03 does not cause the next entry to be named entry_03 again.
