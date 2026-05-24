# NumericInput scrub gesture replaces range sliders

RGBA channel editors previously combined a `<input type="range">` slider with a `<input type="number">` field side by side. We replaced both with a single `NumericInput` component whose scrub gesture (click+drag to increment/decrement) makes the slider redundant. The slider was visually heavy for a compact sidebar panel; the scrub gesture carries the same affordance in less space. Native browser spinners are hidden via CSS — scrubbing and direct text entry are the only input modes. The component emits display-unit integers only; callers are responsible for any model-unit conversion (e.g. opacity 0–100 → 0.0–1.0).

## Considered options

- **Keep sliders alongside NumericInput.** Rejected: the slider and scrub gesture are redundant affordances for the same operation, and the slider consumes significant horizontal space in the sidebar.
- **Custom hover-revealed ▲▼ buttons.** Rejected: adds visual complexity without meaningful discoverability gain over scrubbing. Direct text entry remains available for precision edits.
