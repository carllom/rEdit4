# rEdit4 Design System v1.0

**Read this before writing or modifying any UI code in `src/**/*.vue`.**

Rules are imperative. Examples are copy-paste-ready. Anti-patterns are called out explicitly.

---

## 0 · TL;DR

1. **All tokens are CSS custom properties prefixed `--rd-*`**, defined once in
   `src/styles/tokens.css` and imported globally via `src/main.ts`.
2. **Never write a raw hex color, a literal pixel value, or `rgba(...)`** in a
   `.vue` file. Use a token. If a token doesn't exist for your case, see §7.
3. **One accent (`--rd-color-accent`)**. Don't introduce a second.
4. **Active state = a 2 px accent rule** on the left of rows / bottom of tabs /
   left of inline messages. Focus = accent replaces the border. Hover = step up
   the surface ramp.
5. **The artwork wins.** Chrome stays calm; never compete with the canvas.

---

## 1 · File layout

```
src/
  styles/
    tokens.css          ← THE SOURCE OF TRUTH. Edit here to change a token.
  main.ts               ← imports tokens.css. Don't add another global stylesheet.
  App.vue               ← global resets only (box-sizing, number-input cleanup,
                          form-control font inheritance). No design tokens.
  components/**/*.vue   ← scoped <style> blocks. Use tokens, never literals.
  views/**/*.vue        ← scoped <style> blocks. Use tokens, never literals.
```

Document references:
- `docs/design-system.md` (this file) — agent reference
- `Design System.html` — human-facing visual reference at repo root
- `tokens.css` at repo root — standalone copy shipped with the docs (mirror of
  `src/styles/tokens.css`)

---

## 2 · Token reference

### 2.1 Color

| Token | Value | Use for |
|---|---|---|
| `--rd-color-bg` | `#1a1a1a` | Page background, canvas viewport |
| `--rd-color-surface-1` | `#252526` | Headers, sidebars, tab strips, sticky chrome |
| `--rd-color-surface-2` | `#2d2d2d` | Hover background, active row background, dialog body |
| `--rd-color-surface-3` | `#3a3a3a` | Input fills, kbd/badge fills, selected entry highlight |
| `--rd-color-border` | `#3c3c3c` | All 1 px rules, input borders |
| `--rd-color-text` | `#cccccc` | Primary body text |
| `--rd-color-text-muted` | `#888888` | Labels, descriptions, secondary text, resting icon color |
| `--rd-color-text-strong` | `#ffffff` | Dialog titles ONLY. Don't use for body text. |
| `--rd-color-accent` | `#4fc3f7` | Active state, focus state, primary action fill |
| `--rd-color-accent-hover` | `#81d4fa` | Hover variant of accent surfaces |
| `--rd-color-accent-fg` | `#0a1620` | Text on a solid-accent surface (primary buttons) |
| `--rd-color-accent-soft` | `rgba(79,195,247,0.12)` | Badge / info-message background |
| `--rd-color-accent-soft-border` | `rgba(79,195,247,0.30)` | Pair with `accent-soft` |
| `--rd-color-danger` | `#f44747` | Destructive primary buttons, danger icon hover, error message rule |
| `--rd-color-danger-fg` | `#ffffff` | Text on a solid-danger surface |
| `--rd-color-danger-soft` | `rgba(244,71,71,0.10)` | Error-message background |
| `--rd-color-danger-soft-border` | `rgba(244,71,71,0.35)` | Error-message border |
| `--rd-color-success` | `#81c784` | Success-message rule + text |
| `--rd-color-success-soft` | `rgba(129,199,132,0.10)` | Success-message background |
| `--rd-color-warning` | `#ffb74d` | Warning-message rule + text |
| `--rd-color-warning-soft` | `rgba(255,183,77,0.10)` | Warning-message background |
| `--rd-color-checker-light` | `#555555` | Lighter cell of transparency checker pattern |
| `--rd-color-checker-dark` | `#333333` | Darker cell + fallback bg of checker |
| `--rd-color-overlay` | `rgba(0,0,0,0.55)` | Modal scrim. **Standard dialog overlay only.** |

### 2.2 Typography

| Token | Value | Use for |
|---|---|---|
| `--rd-font-sans` | IBM Plex Sans → system fallback | All UI text |
| `--rd-font-mono` | IBM Plex Mono → system fallback | Hex values, kbd, numeric inputs, code |
| `--rd-text-9` | `9px` | Micro pill badges only |
| `--rd-text-10` | `10px` | Eyebrow labels, kbd hints, descriptions |
| `--rd-text-11` | `11px` | Secondary copy, compact controls |
| `--rd-text-12` | `12px` | **Default body — most common** |
| `--rd-text-13` | `13px` | Emphasised inline, app title, palette name |
| `--rd-text-14` | `14px` | Dialog titles, page-panel titles |
| `--rd-text-16` | `16px` | Reserved: empty-state, hero only |
| `--rd-weight-regular` | `400` | Default |
| `--rd-weight-medium` | `500` | Entry names in lists |
| `--rd-weight-semibold` | `600` | Dialog titles, primary buttons, panel titles |
| `--rd-weight-bold` | `700` | rEdit wordmark ONLY |
| `--rd-tracking-wide` | `0.06em` | All uppercase eyebrow labels |
| `--rd-tracking-brand` | `0.08em` | rEdit wordmark ONLY |
| `--rd-leading-tight` | `1.2` | Headings |
| `--rd-leading-normal` | `1.4` | Body default |
| `--rd-leading-relaxed` | `1.5` | Dialog message body, long-form descriptions |

### 2.3 Spacing

| Token | Value | Common use |
|---|---|---|
| `--rd-space-1` | `2px` | Inter-tab gap, micro internal gap |
| `--rd-space-2` | `4px` | Form-field internal gap |
| `--rd-space-3` | `6px` | Inline icon gap, compact panel padding |
| `--rd-space-4` | `8px` | Toolbar gap, button-row gap |
| `--rd-space-5` | `10px` | Sidebar item horizontal padding |
| `--rd-space-6` | `12px` | Default dialog section gap |
| `--rd-space-7` | `16px` | Settings page padding |
| `--rd-space-8` | `20px` | Dialog top/bottom padding |
| `--rd-space-9` | `24px` | Dialog left/right padding, settings inner gap |
| `--rd-space-10` | `28px` | Settings page outer padding |

### 2.4 Borders & radii

| Token | Value | Use for |
|---|---|---|
| `--rd-border-w` | `1px` | All resting borders |
| `--rd-border-w-active` | `2px` | Active-row left edge, active-tab bottom edge, drop-line, inline-message left edge |
| `--rd-radius-1` | `2px` | Buttons, inputs, selects, kbd, badges, palette-list rows |
| `--rd-radius-2` | `3px` | Color preview chips, variant buttons, color picker swatch |
| `--rd-radius-3` | `6px` | Dialogs |

### 2.5 Layout

| Token | Value | Use for |
|---|---|---|
| `--rd-sidebar-w` | `240px` | Default left/right rail (tools, layers) |
| `--rd-sidebar-w-narrow` | `160px` | Settings nav |
| `--rd-sidebar-w-wide` | `280px` | Palettes selector |
| `--rd-header-h` | `34px` | Top app header |
| `--rd-toolbar-h` | `28px` | Image toolbar / tab strip |
| `--rd-hit-sm` | `18px` | Compact icon-only buttons (header + / x) |
| `--rd-hit-md` | `22px` | Default icon button (settings cog) |
| `--rd-hit-lg` | `26px` | Variant/segmented button |

### 2.6 Motion & elevation

| Token | Value | Use for |
|---|---|---|
| `--rd-duration-fast` | `80ms` | Color/border transitions inside controls |
| `--rd-duration-normal` | `160ms` | Overlay fade, toast slide-in |
| `--rd-easing-standard` | `cubic-bezier(0.2,0,0,1)` | Every transition |
| `--rd-shadow-dialog` | `0 8px 24px rgba(0,0,0,0.45)` | Dialogs |
| `--rd-shadow-toast` | `0 4px 16px rgba(0,0,0,0.40)` | Toasts |

### 2.7 Z-index

| Token | Value | Use for |
|---|---|---|
| `--rd-z-sticky` | `10` | Sticky section headers, flash-card preview |
| `--rd-z-dropdown` | `100` | (reserved for future dropdowns) |
| `--rd-z-overlay` | `1000` | Modal dialogs |
| `--rd-z-toast` | `1100` | Toast stack |

---

## 3 · Hard rules

### ✅ Always

- Use a token from §2. If no token fits, **stop and add one to `tokens.css`** —
  do not inline the value.
- Use `var(--rd-border-w-active)` for any 2 px active rule. Never re-type `2px`
  for that purpose.
- Use `font-family: inherit` on every form control (already applied globally;
  don't override).
- Use `--rd-color-accent-fg` for text on a solid-accent surface.
- Use `--rd-color-danger-fg` for text on a solid-danger surface.
- Replace the border with `--rd-color-accent` on `:focus` (don't add a second
  outline).
- Place the modal scrim's overlay at `var(--rd-z-overlay)`.

### 🚫 Never

- Write a raw hex (`#fff`, `#000`, `#1e1e1e`, etc.) in a `.vue` file.
- Write a raw `rgba(...)` for a color that has a token (modal overlay, accent
  soft, danger soft, success soft).
- Write a literal pixel value for spacing, border-width, radius, or font-size
  that maps to a token in §2.
- Introduce a second accent color. The accent is `--rd-color-accent`, full stop.
- Use `--rd-color-text-strong` (white) for body text. It's for dialog titles.
- Use icon color to convey meaning. Color = state (muted at rest, text on hover,
  accent when active, danger on a danger hover). For meaning, use a `<Badge>`-like element.
- Add new global CSS. All component CSS is scoped (`<style scoped>`).
- Hand-roll a new modal-overlay color. The only intentional darker scrim is the
  flash-card preview (0.75) — that's a one-off documented inline in
  `CanvasEditor.vue`.

---

## 4 · Component recipes

Copy these as starting points. They use only canonical tokens.

### 4.1 Button (canonical)

```vue
<button class="btn">Cancel</button>
<button class="btn primary">Create</button>
<button class="btn danger">Delete</button>

<style scoped>
.btn {
  padding: 5px 12px;
  font-family: inherit;
  font-size: var(--rd-text-12);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  cursor: pointer;
}
.btn:hover { background: var(--rd-color-surface-2); border-color: var(--rd-color-text-muted); }
.btn:focus-visible { outline: none; border-color: var(--rd-color-accent); }
.btn[disabled] { opacity: 0.4; cursor: not-allowed; }

.btn.primary {
  background: var(--rd-color-accent);
  border-color: var(--rd-color-accent);
  color: var(--rd-color-accent-fg);
  font-weight: var(--rd-weight-semibold);
}
.btn.primary:hover {
  background: var(--rd-color-accent-hover);
  border-color: var(--rd-color-accent-hover);
}

.btn.danger {
  background: var(--rd-color-danger);
  border-color: var(--rd-color-danger);
  color: var(--rd-color-danger-fg);
  font-weight: var(--rd-weight-semibold);
}
.btn.danger:hover { opacity: 0.85; }
</style>
```

Smaller sizes:
- Compact: `padding: 3px 8px; font-size: var(--rd-text-11);`
- Tiny:    `padding: 2px 6px; font-size: var(--rd-text-10);`

### 4.2 Text / number input

```vue
<input class="input" type="text" />

<style scoped>
.input {
  font-family: inherit;
  font-size: var(--rd-text-12);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  padding: 4px 8px;
  outline: none;
}
.input:focus { border-color: var(--rd-color-accent); }
.input::placeholder { color: var(--rd-color-text-muted); }
</style>
```

For numeric inputs that should support scrub-to-adjust, use the existing
`NumericInput.vue` — don't reinvent it.

### 4.3 Section label (eyebrow)

The most-used pattern in the app. Use it above any panel section.

```vue
<div class="section-label">Tools</div>

<style scoped>
.section-label {
  font-size: var(--rd-text-10);
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
  color: var(--rd-color-text-muted);
  padding: var(--rd-space-2) var(--rd-space-5) var(--rd-space-1);
}
</style>
```

### 4.4 Active row (tools, layers, palette entries)

```vue
<button class="row" :class="{ active: isActive }">…</button>

<style scoped>
.row {
  display: flex;
  align-items: center;
  padding: 5px var(--rd-space-5);
  background: none;
  border: none;
  border-left: var(--rd-border-w-active) solid transparent;
  font-family: inherit;
  font-size: var(--rd-text-12);
  color: var(--rd-color-text);
  cursor: pointer;
}
.row:hover { background: var(--rd-color-surface-2); }
.row.active {
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
  color: var(--rd-color-accent);
}
</style>
```

### 4.5 Tab (top app nav style)

```vue
<button class="tab" :class="{ active }">Image</button>

<style scoped>
.tab {
  background: none;
  border: none;
  border-bottom: var(--rd-border-w-active) solid transparent;
  color: var(--rd-color-text-muted);
  font-family: inherit;
  font-size: var(--rd-text-11);
  padding: 5px 10px 4px;
  cursor: pointer;
}
.tab:hover { color: var(--rd-color-text); }
.tab.active { color: var(--rd-color-text); border-bottom-color: var(--rd-color-accent); }
</style>
```

### 4.6 Dialog

```vue
<Teleport to="body">
  <div v-if="open" class="overlay" @click.self="$emit('cancel')">
    <div class="dialog" role="dialog" aria-modal="true">
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-message">{{ message }}</div>
      <div class="actions">
        <button class="btn" @click="$emit('cancel')">Cancel</button>
        <button class="btn primary" @click="$emit('confirm')">OK</button>
      </div>
    </div>
  </div>
</Teleport>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: var(--rd-color-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: var(--rd-z-overlay);
}
.dialog {
  background: var(--rd-color-surface-2);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-3);
  box-shadow: var(--rd-shadow-dialog);
  padding: var(--rd-space-8) var(--rd-space-9);
  width: 280px;
  display: flex; flex-direction: column;
  gap: var(--rd-space-6);
}
.dialog-title {
  font-size: var(--rd-text-14);
  font-weight: var(--rd-weight-semibold);
  color: var(--rd-color-text-strong);
}
.dialog-message {
  font-size: var(--rd-text-12);
  color: var(--rd-color-text-muted);
  line-height: var(--rd-leading-relaxed);
}
.actions {
  display: flex; justify-content: flex-end;
  gap: var(--rd-space-4); margin-top: var(--rd-space-2);
}
</style>
```

**Two action layouts:**
- **Row** (default): cancel left, primary right. Two clear choices.
- **Column** (`.actions { flex-direction: column; align-items: stretch }`):
  three+ actions, or when the safest path needs to be most prominent. Recommended
  action is `primary` at top; cancel is a ghost at the bottom.

### 4.7 Inline message

```vue
<div class="msg msg--error">In use by "Hero idle"</div>

<style scoped>
.msg {
  font-size: var(--rd-text-11);
  padding: var(--rd-space-2) var(--rd-space-4);
  border-radius: var(--rd-radius-1);
  border-left: var(--rd-border-w-active) solid var(--rd-color-text-muted);
  background: var(--rd-color-surface-3);
}
.msg--error   { border-left-color: var(--rd-color-danger);  background: var(--rd-color-danger-soft);  color: var(--rd-color-danger); }
.msg--success { border-left-color: var(--rd-color-success); background: var(--rd-color-success-soft); color: var(--rd-color-success); }
.msg--warning { border-left-color: var(--rd-color-warning); background: var(--rd-color-warning-soft); color: var(--rd-color-warning); }
.msg--accent  { border-left-color: var(--rd-color-accent);  background: var(--rd-color-accent-soft);  color: var(--rd-color-accent); }
</style>
```

### 4.8 Badge

```vue
<span class="badge">built-in</span>
<span class="badge badge--accent">user template</span>

<style scoped>
.badge {
  font-size: var(--rd-text-9);
  padding: 2px 6px;
  border-radius: var(--rd-radius-1);
  border: var(--rd-border-w) solid var(--rd-color-border);
  background: var(--rd-color-surface-3);
  color: var(--rd-color-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
}
.badge--accent  { background: var(--rd-color-accent-soft);  border-color: var(--rd-color-accent-soft-border);  color: var(--rd-color-accent); }
.badge--success { background: var(--rd-color-success-soft); border-color: var(--rd-color-success-soft-border); color: var(--rd-color-success); }
.badge--warning { background: var(--rd-color-warning-soft); border-color: var(--rd-color-warning-soft-border); color: var(--rd-color-warning); }
.badge--danger  { background: var(--rd-color-danger-soft);  border-color: var(--rd-color-danger-soft-border);  color: var(--rd-color-danger); }
</style>
```

### 4.9 Kbd (keyboard hint)

```vue
<kbd class="kbd">⌘Z</kbd>

<style scoped>
.kbd {
  display: inline-block;
  font-family: var(--rd-font-mono);
  font-size: var(--rd-text-10);
  background: var(--rd-color-surface-3);
  color: var(--rd-color-text);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  padding: 0 5px;
  line-height: 1.5;
}
</style>
```

### 4.10 Transparency checker (for swatches / color previews)

```css
.checker {
  background-image:
    linear-gradient(45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(-45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--rd-color-checker-light) 75%),
    linear-gradient(-45deg, transparent 75%, var(--rd-color-checker-light) 75%);
  background-size: 6px 6px;       /* 8px for the color-preview chip */
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: var(--rd-color-checker-dark);
}
```

---

## 5 · Decision tree: "I need to build …"

- **A clickable thing that triggers an action** → §4.1 Button. Default for
  "cancel-or-secondary", `.primary` for the recommended action, `.danger` for
  destructive primary.
- **A clickable thing in a sidebar that toggles an active state** → §4.4 Active
  row.
- **A tab strip** → §4.5 Tab.
- **A label above a panel section** → §4.3 Section label.
- **A modal** → §4.6 Dialog. Use the existing `ConfirmDialog.vue` if it's a
  simple confirm.
- **A status string inside a panel** → §4.7 Inline message.
- **A non-blocking confirmation that something happened off-screen** → Toast
  component (see `Design System.html` for visual spec; not yet built).
- **An indicator of what a thing is** (built-in, read-only, shared) → §4.8 Badge.
- **A keyboard shortcut hint** → §4.9 Kbd.
- **A pixel cell, swatch, or color-preview chip** → use the checker recipe in
  §4.10 + set a solid color on top.
- **A numeric input** → use the existing `<NumericInput v-model />` component.
  It hides the native spinner and adds click-and-drag scrubbing.
- **A new accent color** → DON'T. There is one accent.
- **A second-tier "info" color** → use `--rd-color-accent-soft` +
  `--rd-color-accent-soft-border`.

---

## 6 · Anti-patterns (common mistakes)

| ❌ Don't | ✅ Do |
|---|---|
| `color: #fff` on a primary button | `color: var(--rd-color-accent-fg)` |
| `color: #000` on a primary button | `color: var(--rd-color-accent-fg)` |
| `border-radius: 3px` on a button | `border-radius: var(--rd-radius-1)` (= 2 px) |
| `border-radius: 4px` anywhere | Pick the closest of `--rd-radius-1/2/3`. Don't invent a 4 px radius. |
| `letter-spacing: 0.05em` / `0.08em` on a generic label | `var(--rd-tracking-wide)` (0.06 em). 0.08 em is brand-only. |
| `font-family: monospace` | `var(--rd-font-mono)` |
| `background: rgba(79,195,247,0.12)` | `var(--rd-color-accent-soft)` |
| Adding a new info-color (purple, teal, etc.) | Use `accent-soft` or a `--rd-color-accent-*` token — never a new hue |
| Outline-based focus ring | Replace the existing border with `--rd-color-accent` |
| `transition: opacity 0.1s linear` | `transition: opacity var(--rd-duration-fast) var(--rd-easing-standard)` |
| `width: 240px` for a sidebar | `var(--rd-sidebar-w)` (or `-narrow` / `-wide`) |
| Using `text-strong` (white) for body copy | Keep body on `--rd-color-text`. White is for dialog titles. |

---

## 7 · Adding new tokens

When you genuinely need a value that doesn't exist:

1. **Check first** that none of §2 fits. The scale is intentionally small —
   most new needs reduce to an existing token.
2. **Add the token in `src/styles/tokens.css`**, in the matching section.
3. **Follow the naming convention:**
   - Color: `--rd-color-<role>` (e.g. `--rd-color-info`)
   - Soft pair: `--rd-color-<role>-soft` + `--rd-color-<role>-soft-border`
   - Spacing extension: `--rd-space-<n+1>` (continue the scale)
   - Layout dimension: `--rd-<thing>-w` / `-h`
4. **Update this doc's §2 table** in the same commit.
5. **Mirror to `tokens.css` at repo root** (it's a copy shipped with the docs).

If you find yourself wanting to add more than one token in a single PR, stop —
it likely means the design is asking for a new pattern, which should be
discussed before tokens are minted.

---

## 8 · Migration map (legacy → current)

If you find any of these in older code, update them:

| Old (pre-v1.0) | New |
|---|---|
| `--color-bg` | `--rd-color-bg` |
| `--color-surface` | `--rd-color-surface-1` |
| `--color-surface-2` | `--rd-color-surface-2` |
| `--color-surface-3` | `--rd-color-surface-3` |
| `--color-border` | `--rd-color-border` |
| `--color-text` | `--rd-color-text` |
| `--color-text-muted` | `--rd-color-text-muted` |
| `--color-accent` | `--rd-color-accent` |
| `--color-accent-hover` | `--rd-color-accent-hover` |
| `--color-danger` | `--rd-color-danger` |
| `--sidebar-width` | `--rd-sidebar-w` |
| `--header-height` | `--rd-header-h` |
| `#1e1e1e` (page bg) | `var(--rd-color-bg)` (which is `#1a1a1a`) |
| `#81c784` (inline) | `var(--rd-color-success)` |
| `#555` / `#333` (checker) | `var(--rd-color-checker-light)` / `-dark` |

Grep targets to verify a clean migration:

```
grep -rn --color- src/ # should return nothing
grep -rn '#[0-9a-fA-F]\{3,6\}' src/*.vue src/**/*.vue # inspect every hit
grep -rn 'rgba(' src/ # should only appear in *.ts canvas code
```

---

## 9 · Quick sanity checklist before a UI commit

- [ ] No raw hex codes in `*.vue` (canvas-drawing `.ts` files are exempt).
- [ ] No raw `rgba(...)` in `*.vue`.
- [ ] No raw pixel value that maps to a token.
- [ ] Active state uses `border-(left|bottom): var(--rd-border-w-active) solid var(--rd-color-accent)`.
- [ ] Focus replaces an existing border with `--rd-color-accent`; no extra outline.
- [ ] Form controls don't override `font-family` (they inherit from `App.vue`).
- [ ] If a new token was added, §2 of this doc and `tokens.css` at repo root were updated too.

---

*End of agent reference. For visual examples + live token swatches, open
`Design System.html` in a browser.*
