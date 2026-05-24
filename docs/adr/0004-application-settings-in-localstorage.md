# ADR-0001: Application Settings stored in localStorage, separate from project data

**Status:** Accepted

## Context

rEdit stores project data (images, layers, palettes) in IndexedDB via the `idb` library.
When adding application-level settings (preferences that survive loading a new project),
the question arose: reuse IndexedDB, or use a different storage layer?

## Decision

Application Settings are stored in `localStorage` as a single JSON blob under `redit:settings`,
entirely separate from the IndexedDB project store.

## Reasons

- **Settings are small and synchronous.** Settings are a flat object of numbers and booleans.
  `localStorage` reads synchronously before any `onMounted`, so settings are available
  before the app renders. IndexedDB is async; reading settings would require awaiting
  startup before applying preferences.

- **Conceptual separation.** Project data belongs to a project; settings belong to the user/browser.
  Mixing them in one IndexedDB database conflates two different lifecycles.

- **Simplicity.** A single `localStorage.getItem` / `setItem` pair requires no schema versioning,
  no object stores, and no migrations for the common case of adding a new setting key
  (handled by merging with defaults on load).

## Trade-offs

- `localStorage` has a ~5 MB limit and is synchronous (blocking). Neither is a concern for
  a flat preferences object, but would rule it out for large or binary data.
- Settings are not stored alongside project backups or `.redit` exports — intentionally,
  since they are per-user preferences, not per-project data.
