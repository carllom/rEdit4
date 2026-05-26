## Problem Statement

As a pixel artist working in rEdit, I have no structured way to manage palettes beyond the minimal add/edit controls in the sidebar. I cannot share a single palette across multiple images, build a library of reusable template palettes, generate color spreads systematically, or safely reassign a palette to a different image. When a palette is shared between images, there is no indication of this and no protection against accidentally editing colors that affect artwork I did not intend to touch.

## Solution

Introduce a first-class Palette & Color Management system with three pillars:

1. **Palette ownership and sharing** — palettes are project-level resources; images reference them by ID. The sidebar shows how many images share the active palette and gates edits with a clone-to-decouple flow when the palette is shared.
2. **Palette Manager page** — a dedicated full-screen route (`/palettes`) with a selector view (compare all project palettes and templates) and an editor view (full CRUD, slot operations, color generation, template promotion).
3. **Application-level template library** — palettes can be promoted out of a project and saved at app level for reuse across future projects. Shipped palettes (e.g. CGA, EGA, PICO-8, DB16) are built-in and read-only.

## User Stories

### Palette panel (sidebar)

1. As an image editor, I want to see the name of the palette currently assigned to the active image in the sidebar, so that I know which palette I am drawing with.
2. As an image editor, I want to see a "Shared with N images" badge on the palette panel when the active palette is used by more than one image, so that I understand the blast radius of any edit.
3. As an image editor, I want to click a swatch and immediately draw with that color, so that color selection remains as fast as it is today.
4. As an image editor, I want a palette picker in the sidebar that lets me assign a different palette to the active image, so that I can swap palettes without leaving the editor.
5. As an image editor, when I edit a color on a palette shared by multiple images, I want to receive a warning dialog, so that I do not accidentally alter colors used by other images.
6. As an image editor, I want a "Clone & decouple" action in the shared-palette warning dialog, so that I can fork the palette for the current image and edit in isolation without affecting other images.
7. As an image editor, I want the option to dismiss the shared-palette warning and proceed with the edit anyway, so that intentional global palette edits remain quick.
8. As an image editor, I want a "Manage palettes" shortcut in the sidebar that navigates to the Palette Manager page, so that I can access full management without hunting for the route.

### Palette Manager — selector view

9. As a palette manager, I want to see all project palettes listed in the selector view, so that I can review and compare the full palette library at a glance.
10. As a palette manager, I want to see all application-level template palettes (built-in and user-promoted) in the selector view, so that I can browse the template library alongside project palettes.
11. As a palette manager, I want the selector view to display each palette's name, description, swatch grid, and color count, so that I can distinguish between palettes without opening them.
12. As a palette manager, I want to click a palette in the selector to load it into the editor view, so that I can inspect or modify it.
13. As a palette manager, I want to be able to view a template palette in the selector view while editing a different palette in the editor view, so that I can compare them side by side.

### Palette Manager — editor view (palette-level)

14. As a palette manager, I want to create a new empty palette, so that I can start building a color set from scratch.
15. As a palette manager, I want to rename the palette currently in the editor view, so that I can keep names meaningful as the project evolves.
16. As a palette manager, I want to add and edit a text description on a palette, so that I can record the intended use or source of the palette.
17. As a palette manager, I want to clone the palette in the editor view and open the clone for editing, so that I can experiment without altering the original.
18. As a palette manager, I want to delete a palette that is not referenced by any image, so that I can clean up unused palettes.
19. As a palette manager, I want the delete action to be blocked with a clear message when the palette is still referenced by one or more images, so that I cannot accidentally orphan artwork.
20. As a palette manager, I want to promote a project palette to an application-level template, so that I can reuse it in future projects.
21. As a palette manager, I want the promoted template name to serve as its identity so that re-promoting a modified palette with the same name overwrites the previous version, so that I can maintain a living library of personal templates.
22. As a palette manager, I want the promotion action to reject names that collide with built-in template names, so that shipped palettes cannot be overwritten.
23. As a palette manager, I want to import a template palette into the current project as a new project palette, so that I can use it as a starting point.

### Palette Manager — editor view (color-level)

24. As a palette manager, I want to add new color slots to the palette, so that I can grow the palette as needed.
25. As a palette manager, I want to edit the RGBA values and name of any color slot (except slot 0), so that I can precisely define each palette entry.
26. As a palette manager, I want slot 0 to always be the transparent entry and be locked from editing, so that the index-0-transparent invariant is preserved.
27. As a palette manager, I want to swap any two color slots by dragging one onto the other, so that I can reorganize the palette layout without changing pixel data.
28. As a palette manager, I want to generate a color spread between two selected slots, choosing a count and an interpolation mode (linear RGB, hue, saturation, or lightness), so that I can quickly build gradient ramps for shading.
29. As a palette manager, I want the generated colors to be inserted into the palette as new slots (or into a selected range), so that spread generation is non-destructive.

### Palette reassignment

30. As an image editor, when I reassign a new palette to an image, I want the pixel indices to be carried over unchanged (raw swap), so that palette-swap effects are possible.
31. As an image editor, when I reassign a smaller palette to an image and higher indices are currently in use by pixels, I want a warning that identifies the out-of-range indices, so that I can make an informed decision before data loss occurs.
32. As an image editor, when warned about out-of-range indices during reassignment, I want a "Remove unmapped" option that erases all pixels with indices beyond the target palette size, so that I can clean the image to fit the new palette.
33. As an image editor, when warned about out-of-range indices during reassignment, I want a "Remap to index N" option that remaps all out-of-range pixels to a chosen target index, so that I can consolidate them to a fallback color.
34. As an image editor, when warned about out-of-range indices during reassignment and the number of unique indices used does not exceed the target palette size, I want a "Compress indices" option that remaps used indices to a contiguous range starting at 1, so that the artwork fits the new palette without erasing anything.

### Template library

35. As an application user, I want a set of built-in palette templates (e.g. CGA, EGA, PICO-8, DB16) available out of the box, so that I have classic retro palettes ready to import without manual setup.
36. As an application user, I want built-in templates to be read-only so that they are always available in their original form, so that the shipped library cannot be corrupted.
37. As an application user, I want my promoted (user-level) templates to persist across browser sessions, so that my personal template library survives page reloads.
38. As an application user, I want to delete user-promoted templates, so that I can keep my template library tidy.

### Palette import

39. As a palette manager, I want to import a palette from a supported external format (e.g. GIMP `.gpl`), so that I can bring in palettes created in other tools.

## Implementation Decisions

### Domain model extensions

- `Palette` gains an optional `description: string` field (empty string default; no breaking change to existing saved data).
- New app-level type `PaletteTemplate` extends `Palette` with `isBuiltIn: boolean`. Templates are never stored inside `Project`; they live in their own persistence layer.
- Index 0 of every palette is always the transparent entry (`r:0, g:0, b:0, a:0`, name `"transparent"`, id `"transparent"`). This is a hard invariant enforced by all mutation operations.
- No `Palette` size constraint is enforced in the domain model; the 256-slot practical limit is a consequence of `Layer.data` being a `Uint8Array` (values 0-255).

### Palette operations service (Module B)

A module of pure functions with no Vue or store dependencies, suitable for unit testing in isolation:

- `clonePalette(palette)` — deep copy with fresh IDs for palette and all colors; transparent slot retains its fixed id and values.
- `findPaletteUsage(project, paletteId): ReImage[]` — returns images whose `paletteId` matches.
- `findColorUsage(image, colorIndex): number` — counts pixels across all layers equal to `colorIndex`.
- `swapPaletteColors(palette, indexA, indexB)` — swaps the two color entries at those positions; does not remap pixel data (a separate, later-stage operation). Slot 0 cannot be involved in a swap.
- `buildRemapTable(fromCount, toCount, usedIndices, strategy)` — given the used index set and a strategy (`remove` | `remap-to-n` | `compress`), returns a `Uint8Array` of length 256 mapping old to new index.
- `remapLayerIndices(layer, remapTable)` — applies a remap table to a `Uint8Array` in-place (or returns a new one), updating every pixel. The transparent slot (0) is always mapped to 0.
- `reassignPalette(image, toPalette, remapTable?)` — sets `image.paletteId`; if a remap table is provided, applies it across all layers.
- `paletteExceedsImage(image, toPalette): number[]` — returns used indices in `image` that exceed `toPalette.colors.length - 1`. Empty array = safe to reassign without remap.

### Color generation module (Module C)

Pure functions, no Vue dependency:

- `interpolateColors(a, b, count, mode): Color[]` — returns `count` colors interpolated between `a` and `b` (exclusive of endpoints) using the selected `mode`:
  - `'linear'` — linear interpolation of R, G, B, A in sRGB space.
  - `'hue'` — hold saturation and lightness from `a`, sweep hue from `a` to `b` (HSL conversion).
  - `'saturation'` — hold hue and lightness from `a`, sweep saturation.
  - `'lightness'` — hold hue and saturation from `a`, sweep lightness.
- `rgbToHsl(r, g, b)` / `hslToRgb(h, s, l)` — internal conversion helpers; exported for use in color editors.

### Template store (Module D)

- App-level Pinia store persisted to `localStorage` under a namespaced key (e.g. `redit.palette-templates`).
- Separate from `useProjectStore`; survives project open/close/new.
- State: `{ builtIn: PaletteTemplate[], userTemplates: PaletteTemplate[] }`.
- Built-in templates are hardcoded in the store definition (not stored in `localStorage`).
- `promoteToTemplate(palette)` — clones the palette into `userTemplates`, keyed by name. Overwrites an existing user template with the same name. Throws/rejects if the name collides with a built-in template name.
- `importIntoProject(templateId, project)` — clones the template as a new project `Palette` (new IDs), appends to `project.palettes`.
- `deleteUserTemplate(name)` — removes a user template. Built-in templates cannot be deleted.

### Palette Manager page (Module E)

- New route `/palettes` added to the Vue Router config.
- Two-panel layout: selector panel (left/top) + editor panel (right/bottom).
- Selector panel shows all project palettes and all templates (built-in + user); display-only swatch grids.
- Clicking any entry in the selector loads it into the editor panel. A built-in template loaded into the editor is read-only; user templates and project palettes are fully editable.
- Editor panel operations: rename, edit description, clone, delete (blocked with message if in use), promote to template, add color, edit color (inline RGBA + name), swap slots, generate spread.
- Spread generation: modal or inline form — pick two existing slot indices as endpoints, choose count and mode, preview the generated swatches, confirm to append (or insert into a range).
- The Palette Manager is navigated to via the sidebar link and the app tab bar; it does not share the sidebar tool/palette panel — it is a standalone context.

### Enhanced sidebar Palette Panel (Module F)

- Existing `PalettePanel.vue` gains:
  - A palette picker (dropdown or compact list) showing all project palettes by name; selecting one triggers the `reassignPalette` flow.
  - "Shared with N images" badge, visible when `findPaletteUsage` returns count > 1 for the active palette.
  - On color edit attempt when palette is shared: intercept the edit, show a dialog with "Clone & decouple" and "Edit shared palette" options.
  - "Manage palettes" link navigating to `/palettes`.

### Palette reassignment flow

- Triggered from the sidebar palette picker.
- If `paletteExceedsImage` returns a non-empty set, a dialog is shown with three options: "Remove unmapped", "Remap to index N" (with index selector), "Compress indices" (only offered if unique used index count is less than or equal to target palette size). Cancel aborts the reassignment.
- If the target palette is the same size or larger, reassignment is silent (raw swap).

### No palette undo

- Palette mutations (color edits, slot swaps, palette CRUD) do not participate in the per-image undo/redo history stack. This is intentional for this phase; the clone-to-decouple flow is the primary safety mechanism.

### Persistence

- Project palettes are stored in `project.palettes` in `IndexedDB` via the existing storage layer (no schema change beyond `description` field addition).
- Application-level user templates are stored in `localStorage`; built-in templates are hardcoded.

## Testing Decisions

Tests should verify external behavior only — given inputs, assert outputs. Implementation details (internal variable names, intermediate state) should not be asserted.

**Module B — Palette operations service:**
- `clonePalette`: result has distinct IDs from source; transparent slot has fixed id and values preserved; color count matches.
- `findPaletteUsage`: returns correct image subset for a given paletteId; returns empty for unknown id.
- `findColorUsage`: counts pixels correctly across multiple layers; zero for unused index.
- `swapPaletteColors`: slots are exchanged; all other slots unchanged; slot 0 swap is rejected.
- `buildRemapTable`: each strategy produces a correctly shaped 256-entry map; transparent (0 to 0) invariant holds in all strategies; compress strategy produces a contiguous range; remap-to-N strategy maps all out-of-range to N.
- `remapLayerIndices`: output pixel values match expected remap; index 0 always stays 0.
- `paletteExceedsImage`: returns correct out-of-range indices; returns empty when palette covers all used indices.

**Module C — Color generation:**
- `interpolateColors(a, b, 1, 'linear')`: returns one color at the midpoint.
- `interpolateColors(a, b, 0, *)`: returns empty array.
- Linear mode: R, G, B, A all interpolate independently.
- Hue mode: output colors lie on the HSL arc between a and b hues at fixed saturation/lightness.
- Saturation mode: hue and lightness held constant; saturation sweeps.
- Lightness mode: hue and saturation held constant; lightness sweeps.
- Round-trip: `hslToRgb(rgbToHsl(r, g, b))` returns original values within rounding tolerance.

Prior art for test style: use Vitest; no DOM or Vue required for B and C — pure `describe`/`it` with `expect`.

## Out of Scope

- **Palette undo/redo** — not implemented in this phase; deferred to a future stage when the full scope of palette mutation history is better understood.
- **Color slot reorder by shift** — only slot swaps are supported; insert-and-shift (with full pixel remap) is deferred.
- **Pixel remap on swap** — swapping two palette slots does not update pixel data in this phase; a future option may offer "swap pixel references too" as a non-undoable operation.
- **Palette export to external formats** — palette sharing between projects is done via the `.redit` project file; standalone palette file export is not in scope.
- **Color cycling** — definitions and operations for color cycling belong to a later stage (likely animation data); the palette model does not carry cycling data in this phase.
- **Advanced color space interpolation** — perceptual-space (oklch/lab) and multi-stop gradient generation are not in scope; linear, hue, saturation, and lightness modes cover the initial need.
- **Palette import from external formats** — GIMP `.gpl` and similar format import is listed as a nice-to-have; it is acknowledged but not committed to in this phase.
- **Color-use query UI** — identifying which sprites or layers use a given palette slot is a Phase 5 feature.

## Further Notes

- The index-0-transparent invariant is a non-negotiable architectural constraint. All palette mutation operations — including generation, import, and swap — must enforce it. Slot 0 is never offered as an editable or swappable entry in any UI.
- The "Compress indices" reassignment strategy has a precondition: the number of unique indices currently used in the image must be less than or equal to the size of the target palette. The UI should verify this before offering the option.
- Built-in palette templates should cover the most common retro targets: CGA (16 colors), EGA (64 colors), PICO-8 (16 colors), DB16/DB32 (Dawnbringer), and the ZX Spectrum palette. Additional templates can be added without any structural change.
- The Palette Manager page operates outside the image editing context intentionally — there is no live canvas or active layer in scope. This simplifies the editor and avoids the complexity of palette-edit-while-drawing interactions.
