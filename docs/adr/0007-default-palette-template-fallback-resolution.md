# ADR-0007: Default Palette Template fallback resolved at settings read time

**Status:** Accepted

## Context

The Default Palette Template setting stores a template ID in `localStorage`. User-defined
templates can be deleted, leaving a dangling reference. The question was: where should the
fallback to CGA be applied — at the call site (when `newProject()` is invoked), or at
settings read time (inside `settingsStore`)?

## Decision

`settingsStore` exposes a computed getter `resolvedDefaultPaletteId` that cross-references
`paletteTemplateStore`. If the stored ID matches no existing template, it returns
`'builtin-cga'`. The raw stored ID is preserved unchanged — resolution is read-only.

## Reasons

- **No broken UI state.** `PaletteSelect` always receives a valid palette to display.
  Resolving at the call site would require every consumer to independently handle the
  missing-template case.
- **Single source of truth for the fallback.** The fallback logic lives in one place.
  Resolving at each call site risks divergent behaviour if there are multiple entry points
  to project creation in the future.
- **Raw value is preserved.** If a deleted user template is later restored with the same ID,
  the setting reconnects automatically without user action.

## Trade-offs

- `settingsStore` gains a dependency on `paletteTemplateStore`. This is a cross-store
  coupling that would not exist if resolution happened at the call site.
- The stored value and the resolved value can differ silently, which could surprise
  a developer reading `settings.defaultPaletteTemplateId` and wondering why it doesn't
  match what the UI shows.
