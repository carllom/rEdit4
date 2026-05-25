# ADR-0005: Flash Card Preview as the primary image preview mechanism

**Status:** Accepted

## Context

The image editor works at high zoom (8×–32×). A way to see the full composited Image at a
realistic display scale (1×–4×) is needed so the artist can judge the work as it will actually
look, without breaking editing flow.

ARCHITECTURE.md previously specified an "Image preview" panel in the lower sidebar. That
placement was rejected on UX grounds: it requires eye travel away from the canvas, and the
sidebar is already narrow.

## Decision

The primary preview mechanism is a **Flash Card Preview**: hold the Backquote key
(`e.code === 'Backquote'`) to show the full composited Image centered over the editor with a
dimmed scrim; release to dismiss. Tool and mouse actions are suppressed while active.
Scroll wheel and +/− adjust the Preview Zoom while the overlay is visible.

A **Picture-in-Picture (PiP)** persistent overlay is explicitly deferred to a later phase
(see Deferred Design Decisions in ARCHITECTURE.md).

## Reasons

- **Zero screen real estate cost.** The overlay is ephemeral — it exists only while the key
  is held. No panel sizing, no sidebar crowding.
- **Works for all image sizes.** A 512×512 image at 1× is trivially displayable centered in
  the viewport. A persistent PiP for large images would either require fractional zoom
  (blurry, un-pixel-art) or a panel large enough to occlude the canvas.
- **Field of view.** Centered on the canvas, the Flash Card is literally where the artist's
  attention is — not in a sidebar at the edge of peripheral vision.
- **Natural interaction model.** Hold to look, release to continue. Analogous to the existing
  Space+drag pan gesture: a transient mode, not a persistent state change.
- **PiP deferred deliberately.** PiP's scope will be clearer after Phase 3 (Animation + Onion
  Skinning) is designed. Locking its implementation now risks rework. The Flash Card covers
  the immediate need without prejudicing that design.

## Considered options

- **Sidebar panel (rejected):** Far from editing focus; sidebar too narrow for useful preview
  of medium/large images.
- **PiP overlay (deferred):** Good for small sprites as an ambient reference; complex for
  large images; scope unclear until animation is designed.
- **Flash Card (chosen):** Handles all image sizes, zero layout cost, stays in field of view.

## Key design constraints

- Trigger key matched by physical position (`e.code`), not character (`e.key`), so it works
  on all keyboard layouts including Nordic/Swedish where the top-left key produces `§`.
- Preview Zoom is per-image session state only — not persisted to localStorage or IndexedDB.
- Preview Background (checkerboard vs. solid color) is an Application Setting (Editor
  category), persisted in localStorage alongside other user preferences.
- Onion skins are never shown in the Flash Card — the preview represents intended output,
  not editing aids.
