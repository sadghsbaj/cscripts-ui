# `TextArea` Design Specification

<meta>
  <module>text-area</module>
  <layer>components.primitive</layer>
  <status>proposed</status>
</meta>

## 1. Scope & Boundary

`TextArea` is a **pure, single-element `<textarea>` primitive** styled to match [TextInput](../text-input/TextInput.svelte) 1:1 in surface treatment, elevation, focus physics, invalid feedback, and disabled states.

- **In scope:** Native `<textarea>` styling, `soft` / `elevated` surface variants, T-shirt sizing (`sm` / `md` / `lg`), `invalid` / `disabled` / `readonly` states, `resize` behavior, and scrollbar/corner clearance.
- **Explicitly out of scope:** Chatbox shells, external toolbars, footers, character counters, send buttons, or WYSIWYG/rich-text editing. Any multi-part composer belongs in a separate composite module built around `TextArea`.

---

## 2. Structural & Visual Parity with `TextInput`

### 2.1 Single-Element Architecture (No Wrapper `<div>`)

Unlike `TextInput`—which wraps `<input>` in a `<div>` shell to host `TextInputIcon` and `TextInputAction`—`TextArea` renders **directly as `<textarea class="cs-text-area">`**.

Because `<textarea>` is a replaced-like form element, `::before` and `::after` pseudo-elements do not render reliably across browsers. Therefore, `TextArea` cannot use `TextInput`'s `&::after` overlay for its inset focus/invalid ring. Instead, it composites the ring and elevation shadow in a single `box-shadow` stack:

```css
box-shadow: var(--cs-text-area-ring-shadow), var(--cs-text-area-shadow);
```

- The **ring shadow** (`--cs-text-area-ring-shadow`) is listed first so the `2px` inset frame paints *above* the dark-mode top-lit highlight (`--cs-shadow-elevated`).
- Inactive shadows use `0 0 #0000` (rather than `none`) so comma-separated `box-shadow` composition and transitions remain valid across all states.

### 2.2 Surface Variants & Shared Tokens

| Token / Property | `soft` | `elevated` |
| :--- | :--- | :--- |
| `--cs-text-area-bg` | `var(--cs-color-base-soft)` | `var(--cs-color-elevated)` |
| `--cs-text-area-bg-hover` | `var(--cs-color-base-soft-hover)` | `var(--cs-color-elevated-hover)` |
| `--cs-text-area-shadow` | `0 0 #0000` | `var(--cs-shadow-elevated)` |
| `--cs-text-area-shadow-hover` | `0 0 #0000` | `var(--cs-shadow-elevated-hover)` |
| `--cs-text-area-fg` | `var(--cs-color-text-strong)` | `var(--cs-color-text-strong)` |
| `--cs-text-area-placeholder-fg` | `var(--cs-color-text-weak)` | `var(--cs-color-text-weak)` |
| `--cs-text-area-caret` | `var(--cs-color-accent-solid)` | `var(--cs-color-accent-solid)` |
| `corner-shape` | `var(--cs-squircle-soft)` | `var(--cs-squircle-soft)` |

### 2.3 Focus, Invalid, and Disabled States

- **Focus (`:focus-visible:not(:disabled)` / `:focus:not(:disabled)`):**
  - Suppresses the global `outline` from `focus.css` (`outline: none`) and renders the `2px` inset accent frame matching `TextInput`:
    `--cs-text-area-ring-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);`
  - Uses `--cs-dur-120` + `--cs-ease-quart-out` for `box-shadow` ring transitions, and `--cs-dur-effect` + `--cs-ease-effect` for `background-color` / `color`.
- **Invalid (`[data-invalid]:not(:disabled)`):**
  - **Frame + Shadow:** Renders both the `2px` solid negative inset frame (`--cs-text-area-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid)`) and the surface elevation shadow (`--cs-text-area-shadow`, i.e., `--cs-shadow-elevated` on `elevated`), plus `--cs-text-area-caret: var(--cs-color-negative-solid)`.
  - Preserves `aria-invalid="true"` for assistive technology.
- **Disabled (`:disabled` / `[data-disabled]`):**
  - Sets `--cs-disabled-opacity: 1` (preventing global opacity dimming), `--cs-text-area-fg: var(--cs-color-disabled-fg)`, `--cs-text-area-placeholder-fg: var(--cs-color-disabled-fg)`, `--cs-text-area-ring-shadow: inset 0 0 0 0px transparent`, `resize: none`, and `cursor: default`.
  - `soft` disabled: `--cs-text-area-bg: var(--cs-color-disabled-bg)`, shadow `0 0 #0000`.
  - `elevated` disabled: `--cs-text-area-bg: var(--cs-color-disabled-bg-elevated)`, shadow `0 0 0 1px var(--cs-color-disabled-border)`.

---

## 3. Icons in `TextArea` — Design Decision

**Decision: Do NOT include inline icons (`TextAreaIcon`) or inline actions (`TextAreaAction`) in `TextArea`.**

### Rationale
1. **Vertical Alignment Ambiguity:** In a single-line `TextInput`, `align-items: center` aligns the icon to the single text baseline. In a multi-line `<textarea>`, `center` alignment breaks visually as soon as content wraps to 2+ lines, while `top` alignment looks unanchored when the user scrolls down.
2. **Column Width & Corner Collision:** A leading icon column wastes horizontal measure across *every* wrapped line, while trailing icons collide with the vertical scrollbar and bottom-right resize handle.
3. **Architecture & Resize Integrity:** Supporting inline icons/actions would force a `<div>` wrapper shell around `<textarea>`. Resizing the inner `<textarea>` independently of the outer `<div>` shell creates mismatched borders/scrollbars or requires complex JS/CSS containment.

Keep `TextArea` as a pure `<textarea>`. If a composite form field or chat input needs icons or action buttons, compose them externally around `TextArea`.

---

## 4. Sizing, Typography & `rows`

`TextArea` adopts the **`sm` | `md` | `lg`** T-shirt scale (defaulting to `md` if optional, or matching `TextInput`'s explicit `size` prop). `xs` (`28px`) and `xl` (`44px`) are intentionally omitted for v1 because multi-line controls rarely benefit from ultra-compact `28px` single-line geometry; `sm`–`lg` align 1:1 with `TextInput`'s `font-size`, `border-radius`, and `padding-inline`.

| `size` | `font-size` | `line-height` | `padding-inline` | `padding-block` | `radius` | `min-height` (2-line floor) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sm` | `var(--cs-text-xs)` (`12px`) | `var(--cs-leading-normal)` (`1.5` / `18px`) | `10px` | `7px` | `10px` | `50px` (`14px + 2 * 18px`) |
| `md` | `var(--cs-text-sm)` (`14px`) | `var(--cs-leading-normal)` (`1.5` / `21px`) | `12px` | `8px` | `12px` | `58px` (`16px + 2 * 21px`) |
| `lg` | `var(--cs-text-sm)` (`14px`) | `var(--cs-leading-normal)` (`1.5` / `21px`) | `14px` | `10px` | `13px` | `62px` (`20px + 2 * 21px`) |

- **Optical calibration:** At `sm`, `18px + 2 * 7px = 32px` (exact 1-line match to `TextInput sm`). At `md`, `21px + 2 * 8px = 37px` (calibrated to `TextInput md` at `36px`).
- **Initial height (`rows`):** Native `rows` (recommended default `rows={3}`) sets the initial height naturally without hardcoding a fixed `height`.
- **`min-height`:** Uses `calc(var(--cs-text-area-padding-block) * 2 + 2lh)` as a resize floor so dragging the resize handle upward never collapses the control below two legible lines.

---

## 5. Resize Handle & Scrollbar Integration

**Decision: Keep the native browser resize handle; do not custom-style `::-webkit-resizer` or build a JS drag handle.**

### Browser & CSS Facts
- `::-webkit-resizer` is non-standard and Blink/WebKit-only; Firefox provides no pseudo-element to style or hide the native resize triangle.
- Custom corner triangles overlaid on `<textarea>` either block native pointer hit-testing or diverge visually from OS/browser scrollbar chrome.

### Clean Integration Strategy
1. **`resize` prop:** Expose `resize?: "none" | "vertical" | "horizontal" | "both"` with default `"vertical"` (matching `src/css/foundation/reset.css` and preventing horizontal layout overflow).
2. **Corner & Scrollbar Clearance:** `src/css/foundation/scroll.css` already styles native scrollbars globally (`--cs-scrollbar-size: 8px`, transparent track, pill thumb). Combining `overflow: auto` with `padding-inline: 10px–14px` and `padding-block: 7px–10px` keeps text lines clear of both the squircle corner (`corner-shape: var(--cs-squircle-soft)`) and the bottom-right resizer.
3. **`scrollbar-gutter: auto` (default):** Do *not* force `scrollbar-gutter: stable`. Reserving a permanent `8px` right gutter on short 2–3 line textareas creates visible horizontal asymmetry when no scrollbar is present.

---

## 6. Auto-Resizing (`field-sizing: content`)

**Decision: Defer auto-resizing from `TextArea` v1 core.**

### Evaluation
- **Browser Support:** `field-sizing: content` currently has `low` baseline status (Chrome 123+, Edge 123+, Safari 26.2+, Firefox 152+). Older Safari (`< 26.2`) and Firefox (`< 152`) ignore it and fall back to fixed `rows` height.
- **UX & Layout Impact:** Auto-growing textareas shift surrounding form layouts on every line wrap and require `max-height` constraints plus coordination with `resize` (`resize: none` when auto-sizing).
- **Recommended Path:**
  - **v1:** Keep `TextArea` predictable with `rows` + manual `resize="vertical"`.
  - **Future:** If cross-browser auto-resizing is needed (e.g., for a chat composer), implement it as a **standalone reusable attachment** (e.g., `auto-resize.attach.ts`) or opt-in `field-sizing: content` modifier with explicit `max-height`, rather than baking `scrollHeight` measurement JS into `TextArea`.
