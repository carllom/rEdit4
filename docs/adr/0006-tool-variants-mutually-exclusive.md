# ADR-0006: Tool variants are mutually exclusive per-tool modes

**Status:** Accepted

## Context

Drawing tools in rEdit need named variants — e.g. Draw has Dot/Connected/Pixel-perfect/Bezier,
Rectangle has Filled/Outline. Two data models were considered:

1. **Mutually exclusive modes** — one active variant per tool, stored as a single string in
   `toolVariants: Record<Tool, string>` in `usePaintStore`.
2. **Orthogonal toggles** — variants as independent boolean flags that can be combined,
   stored as a flag set per tool.

## Decision

Mutually exclusive modes (option 1).

## Rationale

Draw variants form a quality progression: Dot → Connected → Pixel-perfect → Bezier, where each
higher mode implies the previous. Independent combination of these produces nonsensical states
(e.g. Dot + Pixel-perfect). The same is true for Rectangle (Filled and Outline are opposites)
and Fill/Erase (Flood/Replace and Normal/Clear are opposites).

Single-string storage keeps the model uniform across all tools and trivially serialisable.
The sidebar sub-row renders identically as radio buttons for every tool — no tool-specific toggle
logic needed.

## Consequences

If a future tool genuinely requires orthogonal independent flags, `toolVariants` would need to
change from `Record<Tool, string>` to a union type, or that tool would require a separate store
field. This is an acceptable cost given no current tool needs it.
