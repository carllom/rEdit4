# Fixed-Viewport Canvas Rendering

All canvas elements (image layers, checkerboard, grid, cursor) are sized to the editor panel
dimensions and never resized. A pixel-space `panOffset` controls which portion of the Image is
visible, replacing native scroll. Layer rendering uses the 9-argument `drawImage` to source-clip
the offscreen scratch canvas and scale only the visible region to the Viewport.

The alternative — sizing canvases to `imageWidth × zoom` — was rejected because at 512×512 × 32×
zoom each layer canvas reaches ~16,000×16,000 pixels (~4 GB), causing GPU allocation delays that
make the editor unusable on non-premium hardware. The fixed-viewport approach bounds canvas memory
to the editor area (~1,200×800) regardless of image size or zoom level.

## Consequences

- `panOffset: { x, y }` is in **pixel space** (float, zoom-independent). Screen ↔ pixel:
  `screenX = (pixelX − panOffset.x) × zoom` and `pixelX = screenX / zoom + panOffset.x`.
- Each Image stores its own `zoom` and `panOffset`. First open: zoom fits the image to the
  Viewport; subsequent opens restore saved state.
- Zoom-to-cursor: on scroll-wheel zoom, panOffset is adjusted to keep the pixel under the cursor
  fixed in screen space.
- Pan is soft-clamped so at least one image pixel remains visible. `Home` re-centers.
- The checkerboard and grid render only within image bounds; area outside is dark fill with an
  image-boundary outline.
