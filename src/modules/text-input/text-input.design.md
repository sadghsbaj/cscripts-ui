# TextInput Design Specification (v2 — Post-v1 Critique)

## 1. Visual Role & Scope

`TextInput` is the foundational single-line text entry primitive in `cscripts-ui`. It provides the tactile surface, sizing, optical spacing, state hierarchy, and inline slot geometry that higher-level controls (`Combobox`, search fields, password inputs) build upon.

Out of scope for this base primitive:
- Multi-line `<textarea>` sizing/resizing.
- Outer form wrappers (`<label>`, helper/description text, error messages).

---

## 2. Critique & Required Revisions from v1 Implementation

The v1 implementation ([TextInput.svelte](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/text-input/TextInput.svelte), [TextInputAction.svelte](file:///home/colin/Main/01_programming/01_projects/01_current_projects/cscripts-ui/src/modules/text-input/TextInputAction.svelte)) nailed the proportions, padding, icon spacing, and disabled states, with five visual/motion updates for v2:

1. **Shell corners are too tight/boxy:** `--cs-squircle-smooth` (`superellipse(1.6)`) with `7–12px` radii pulls the curve too close to a sharp rectangle compared to `Checkbox`, `Switch`, and `Button` (which all use `--cs-squircle-soft`).
   - **Fix:** Switch `TextInput` to `corner-shape: var(--cs-squircle-soft)` (`superellipse(1.2)`) and increase radii slightly to `9 / 10 / 12 / 13 / 14px` (~30–33% of height, keeping it clearly softer without becoming a `50%` pill).
2. **`TextInputAction` hover surface looks too square:** `calc(var(--cs-text-input-radius) - var(--cs-text-input-action-inset))` (`6px` on `md`) with `smooth` makes the inline button read like a tiny square rather than an icon-only micro-button.
   - **Fix:** Give `.cs-text-input-action` a full circular pill radius (`border-radius: calc(var(--cs-text-input-action-size) / 2)`) with `corner-shape: var(--cs-squircle-soft)`, matching `Button[data-icon-only]`.
3. **`TextInputAction` `:active` scales the icon and `<HitArea />`:** Putting `scale: 0.92` directly on `.cs-text-input-action:active` shrinks the SVG glyph itself (which looks jittery) and shrinks `<HitArea />`.
   - **Fix:** Decouple the interactive hover/press surface into `.cs-text-input-action::before` (`isolation: isolate`, `z-index: -1`, `border-radius: inherit`, `corner-shape: inherit`), matching `.cs-button-control::before`. Only `::before` squashes on `:active`; the icon remains rock-steady.
4. **Stateful icon components (`CopyIcon`, `PasteIcon`) inside `TextInputAction`:** Ensure `TextInputAction` keeps `overflow: visible` (so `CopyIcon`'s `Sparkle` burst is not clipped) and lets child icon components size naturally via `calc(1em + 2px)` (which already resolves to `14 / 14 / 16 / 16 / 18px` from inherited `font-size`, matching `--cs-text-input-icon-size`).
5. **Dark-mode `invalid` muddiness on `soft`:** Using `--cs-color-negative-soft` (`24%` `negative-500` in `base-950`) on a wide input makes it look heavy/sunken in Dark Mode and washes out the `28%` `1px` inset ring.
   - **Fix (Ring-First):** Keep the neutral `soft` / `elevated` surface in `invalid` state (no red background fill) and communicate validation errors through a crisp `light-dark()`-balanced `1px` inset ring (`2px` on `:focus-within`), plus `--cs-color-negative-soft-fg` icon and `--cs-color-negative-solid` caret.

---

## 3. Structural Architecture (Shell + Native `<input>`)

- **Outer shell (`.cs-text-input`):** A `div` flexbox container (`display: inline-flex; align-items: center; position: relative;`) owning the surface (`bg`, `shadow`, `radius`, `corner-shape`, `height`, `padding-inline`, `gap`), state tokens, and focus ring `::after` layer. Using `div` avoids nested-`<label>` conflicts when consumers wrap `TextInput` in an external `<label>`.
- **Native field (`.cs-text-input-field`):** A bare `<input>` (`flex: 1; min-width: 0; height: 100%; appearance: none; background: transparent; border: none; outline: none;`).
- **Subparts:**
  - `.cs-text-input-icon` — decorative leading/trailing icon (`flex-shrink: 0; pointer-events: none;`).
  - `.cs-text-input-action` — interactive inline icon-only button (`type="button"`), with `<HitArea size="sm" />`.

---

## 4. Sizes & Optical Proportions

Heights and font sizes match `Button` (`xs`–`xl`) 1:1 so `TextInput` and `Button` align to the exact pixel in inline toolbars and form rows.

| Size | Height | Font Size | Radius (`--cs-squircle-soft`) | `padding-inline` | `gap` | Icon Size (`calc(1em + 2px)`) | Action Size | Action Inset |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` | `28px` | `var(--cs-text-xs)` (`12px`) | `9px` | `8px` | `6px` | `14px` | `20px` | `4px` |
| `sm` | `32px` | `var(--cs-text-xs)` (`12px`) | `10px` | `10px` | `6px` | `14px` | `24px` | `4px` |
| `md` | `36px` | `var(--cs-text-sm)` (`14px`) | `12px` | `12px` | `8px` | `16px` | `28px` | `4px` |
| `lg` | `40px` | `var(--cs-text-sm)` (`14px`) | `13px` | `14px` | `8px` | `16px` | `30px` | `5px` |
| `xl` | `44px` | `var(--cs-text-base)` (`16px`) | `14px` | `16px` | `10px` | `18px` | `32px` | `6px` |

### Optical Edge Compensation (Icons & Actions)
- **Leading/trailing icon:** Reduce edge padding by `2px` (`:has(> .cs-text-input-icon:first-child)` / `:last-child`) to compensate for standard `24×24` SVG viewBox padding.
- **Leading/trailing visible action:** Set edge padding to `--cs-text-input-action-inset` (`4px`–`6px`) via `:nth-child(1 of :not([data-visible="false"]))` / `:nth-last-child(1 of :not([data-visible="false"]))` so circular actions sit evenly from top, bottom, and side edges.

---

## 5. Surface Variants & States

### Variants (`data-variant`)
- **`soft` (default, borderless):**
  - `--cs-text-input-bg: var(--cs-color-base-soft)`
  - `--cs-text-input-bg-hover: var(--cs-color-base-soft-hover)`
  - `--cs-text-input-shadow: none`
- **`elevated`:**
  - `--cs-text-input-bg: var(--cs-color-elevated)`
  - `--cs-text-input-bg-hover: var(--cs-color-elevated-hover)`
  - `--cs-text-input-shadow: var(--cs-shadow-elevated)`
  - `--cs-text-input-shadow-hover: var(--cs-shadow-elevated-hover)`

### Typography & Cursor
- **Input text:** `--cs-color-text-strong`, `caret-color: var(--cs-color-accent-solid)`.
- **Placeholder:** `--cs-color-text-weak`.
- **Icons:** `--cs-color-text-weak`.
- **Cursor:** `cursor: text` on shell/field; `cursor: default` on inline actions.

### Focus Ring (Animated `2px` Inset Border, No Offset)
- Suppress global `:focus-visible` outline on `.cs-text-input-field`.
- `.cs-text-input::after` (`position: absolute; inset: 0; border-radius: inherit; corner-shape: inherit; pointer-events: none; z-index: 1;`) transitions `box-shadow` from `inset 0 0 0 0px transparent` to `inset 0 0 0 2px var(--cs-color-accent-solid)` on `:focus-within` (`var(--cs-dur-120) var(--cs-ease-quart-out)`).
- No `:active` scale on `.cs-text-input` so the text caret never shifts under the pointer.

### Invalid State (`data-invalid` / `aria-invalid="true"`) — Ring-First
- **Neutral surface preserved:** Both `soft` and `elevated` keep their normal neutral background (`--cs-color-base-soft` / `--cs-color-elevated` and their hover states) instead of tinting the entire wide input with `--cs-color-negative-soft`. This prevents the heavy/sunken red-brown look in Dark Mode and preserves surface hierarchy on `elevated` cards.
- **Crisp `1px` resting ring (`::after`):** Balanced per color scheme so the hairline stays sharp in both Light and Dark Mode:
  - Resting: `inset 0 0 0 1px light-dark(color-mix(in oklab, var(--cs-color-negative-solid) 45%, transparent), color-mix(in oklab, var(--cs-color-negative-400) 55%, transparent))`
  - Hover: `inset 0 0 0 1px light-dark(color-mix(in oklab, var(--cs-color-negative-solid) 60%, transparent), color-mix(in oklab, var(--cs-color-negative-400) 70%, transparent))`
- **`:focus-within` + `invalid`:** Ring thickens to `inset 0 0 0 2px var(--cs-color-negative-solid)`.
- **Foreground & Caret:** Entered text stays `--cs-color-text-strong`; decorative `.cs-text-input-icon` shifts to `--cs-color-negative-soft-fg`, and `caret-color` shifts to `--cs-color-negative-solid`.

### Disabled State (`data-disabled`)
- `--cs-disabled-opacity: 1`.
- `soft`: `--cs-color-disabled-bg`, `shadow: none`.
- `elevated`: `--cs-color-disabled-bg-elevated`, `shadow: 0 0 0 1px var(--cs-color-disabled-border)`.
- Text, placeholder, and icons use `--cs-color-disabled-fg`.

---

## 6. Inline Actions (`TextInputAction`) & `::before` Press Surface

- **Geometry & Shape:** `width` & `height: var(--cs-text-input-action-size)`, `border-radius: calc(var(--cs-text-input-action-size) / 2)`, `corner-shape: var(--cs-squircle-soft)`, `isolation: isolate`, `overflow: visible` (preserves `CopyIcon` sparkle bursts).
- **Decoupled `::before` surface:**
  - `content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit; corner-shape: inherit; background-color: transparent;`
  - Resting `scale: 1`, `transition: background-color var(--cs-dur-effect) var(--cs-ease-effect), scale var(--cs-dur-squash) var(--cs-ease-squash)`.
  - Hover (`@media (hover: hover)`): `::before { background-color: var(--cs-color-base-soft); }`, button `color: var(--cs-color-text-strong)`.
  - Active (`:active:not(:disabled)`): `::before { background-color: var(--cs-color-base-soft-hover); scale: var(--cs-squash-default); transition: background-color var(--cs-dur-press) var(--cs-ease-press), scale var(--cs-dur-press) var(--cs-ease-press); }` — icon stays unscaled.
- **Conditional reveal (`visible` / `data-visible="false"`):**
  - Fade + subtle scale on `.cs-text-input-action` (`opacity: 0; scale: 0.85;` -> `opacity: 1; scale: 1;`) with `var(--cs-dur-120) var(--cs-ease-quart-out)` and `display var(--cs-dur-120) allow-discrete` (`@starting-style`).
- **Focus:** `outline: 2px solid var(--cs-color-accent-solid); outline-offset: 0;` on `:focus-visible`.
- **CopyIcon / PasteIcon integration:**
  - `TextInputAction` accepts stateful icon components via `children` (e.g. `<CopyIcon {copied} />`). Because `TextInputAction` inherits `font-size` from `.cs-text-input`, `CopyIcon`'s `calc(1em + 2px)` sizing automatically matches `--cs-text-input-icon-size` (`14–18px`). Avoid forcing `width`/`height` overrides on non-SVG wrapper spans like `.cs-copy-icon` unless matching `--cs-text-input-icon-size`.
