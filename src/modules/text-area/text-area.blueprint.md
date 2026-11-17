# `TextArea` Architecture Blueprint

<meta>
  <module>text-area</module>
  <kind>component</kind>
  <layer>components.primitive</layer>
  <design_spec>./text-area.design.md</design_spec>
  <status>proposed</status>
</meta>

---

## 1. Overview & Scope

`TextArea` is a **pure, single-element `<textarea>` primitive** (`kind: component`) styled to match `TextInput` 1:1 in surface treatment, elevation, focus physics, invalid feedback, and disabled states.

### In Scope
- Native `<textarea class="cs-text-area">` rendering with zero wrapper elements.
- `soft` and `elevated` surface variants.
- `sm`, `md`, and `lg` T-shirt size scale.
- Explicit `resize` control (`"none" | "vertical" | "horizontal" | "both"`, default `"vertical"`).
- Bindable `value` and `ref`, `onValueChange` callback, and full `HTMLTextareaAttributes` forwarding.
- Native `invalid`, `disabled`, and `readonly` states.

### Explicit Non-Goals (Out of Scope)
- **No composite shell or external controls:** No chatbox frame, toolbars, footers, character counters, or send buttons. Composite inputs belong in separate higher-level modules that compose `TextArea`.
- **No WYSIWYG / rich-text editing:** Strictly plain-text native `<textarea>`.
- **No inline icons (`TextAreaIcon`) or inline actions (`TextAreaAction`):**
  1. *Vertical alignment ambiguity:* Center alignment breaks on 2+ wrapped lines, while top alignment looks unanchored when scrolling.
  2. *Measure & corner collision:* A leading icon column wastes horizontal space on every wrapped line, and trailing controls collide with the vertical scrollbar and bottom-right native resize handle.
  3. *Resize integrity:* Hosting inline icons/actions would require a `<div>` wrapper shell around `<textarea>`, breaking native `<textarea>` resize behavior or causing mismatched borders/scrollbars.
- **No built-in auto-resizing in v1:** Deferred to a standalone, composable attachment (see [Section 5](#5-auto-resizing-strategy)).

---

## 2. Public API & Parity with `TextInput`

All public exports live in `src/modules/text-area/index.ts`.

### Exports

```ts
export { default as TextArea } from "./TextArea.svelte";

export const TEXT_AREA_VARIANTS = ["soft", "elevated"] as const;
export const TEXT_AREA_SIZES = ["sm", "md", "lg"] as const;
export const TEXT_AREA_RESIZES = ["none", "vertical", "horizontal", "both"] as const;

export type TextAreaVariant = (typeof TEXT_AREA_VARIANTS)[number];
export type TextAreaSize = (typeof TEXT_AREA_SIZES)[number];
export type TextAreaResize = (typeof TEXT_AREA_RESIZES)[number];
```

### `TextAreaProps`

```ts
export interface TextAreaProps extends Omit<HTMLTextareaAttributes, "children" | "value"> {
    variant: TextAreaVariant;
    size: TextAreaSize;
    resize?: TextAreaResize;
    rows?: number;
    cols?: number;
    value?: string;
    onValueChange?: (value: string) => void;
    invalid?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    ref?: HTMLTextAreaElement | null;
}
```

| Prop | Type | Default | Bindable | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `TextAreaVariant` | *(required)* | No | `"soft" \| "elevated"`. No default per architecture rules. |
| `size` | `TextAreaSize` | *(required)* | No | `"sm" \| "md" \| "lg"`. No default per architecture rules. |
| `resize` | `TextAreaResize` | `"vertical"` | No | Maps to CSS `resize` via `data-resize`. |
| `rows` | `number` | `3` | No | Native HTML `rows` attribute for initial height. |
| `cols` | `number` | `undefined` | No | Optional native HTML `cols`; when omitted, element fills container width (`width: 100%`). |
| `value` | `string` | `""` | `$bindable` | Two-way bound textarea value (`bind:value`). |
| `onValueChange` | `(value: string) => void` | `undefined` | No | Invoked on `input` after `oninput?.(event)` with `event.currentTarget.value`. |
| `invalid` | `boolean` | `undefined` | No | Sets `data-invalid` and `aria-invalid="true"`. |
| `disabled` | `boolean` | `undefined` | No | Sets native `disabled` and `data-disabled`. |
| `readonly` | `boolean` | `undefined` | No | Sets native `readonly` and `data-readonly`. |
| `ref` | `HTMLTextAreaElement \| null` | `null` | `$bindable` | Bound directly to the root `<textarea>`. |
| `class` | `ClassValue` | `undefined` | No | Merged via `class={["cs-text-area", className]}`. |
| `...rest` | `HTMLTextareaAttributes` | — | — | Forwards `placeholder`, `maxlength`, `minlength`, `wrap`, `autocomplete`, `spellcheck`, `name`, `id`, `required`, `{@attach ...}`, event handlers, etc. |

### Parity Comparison with `TextInput`

| Aspect | `TextInput` | `TextArea` | Rationale |
| :--- | :--- | :--- | :--- |
| **Structure** | Compound (`TextInput` shell `<div>` + `TextInputField` + `TextInputIcon` + `TextInputAction` + context) | Single-element (`TextArea` `<textarea>`) | Avoids wrapper shell; preserves native resize and keeps focus/invalid ring self-contained. |
| **Variants** | `"soft" \| "elevated"` | `"soft" \| "elevated"` | 1:1 visual parity. |
| **Sizes** | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"sm" \| "md" \| "lg"` | Multi-line controls do not benefit from `28px` (`xs`) or `44px` (`xl`) single-line heights; `sm`–`lg` match `TextInput` typography, padding-inline, and radius 1:1. |
| **Value & Events** | `value = $bindable("")`, `onValueChange` on `TextInputField` | `value = $bindable("")`, `onValueChange` on `TextArea` | Identical reactive value contract. |
| **State Flags** | `invalid`, `disabled`, `readonly` | `invalid`, `disabled`, `readonly` | Identical state flags and semantics. |
| **Omitted** | `type`, `TextInputIcon`, `TextInputAction`, context | — | `type` is `<input>`-only; icons/actions conflict with multi-line wrapping, scrollbar, and resizer. |
| **Added** | — | `resize`, `rows`, `cols` | Multi-line-specific dimension and resize controls. |

### CSS Custom Properties (`--cs-text-area-*`)

| Variable | Purpose | Default / Variant Mapping |
| :--- | :--- | :--- |
| `--cs-text-area-bg` | Surface background | `soft`: `--cs-color-base-soft` / `elevated`: `--cs-color-elevated` |
| `--cs-text-area-bg-hover` | Hover background | `soft`: `--cs-color-base-soft-hover` / `elevated`: `--cs-color-elevated-hover` |
| `--cs-text-area-fg` | Text color | `var(--cs-color-text-strong)` (`--cs-color-disabled-fg` when disabled) |
| `--cs-text-area-placeholder-fg` | Placeholder text color | `var(--cs-color-text-weak)` (`--cs-color-disabled-fg` when disabled) |
| `--cs-text-area-caret` | Text caret color | `var(--cs-color-accent-solid)` (`--cs-color-negative-solid` when invalid) |
| `--cs-text-area-shadow` | Elevation shadow | `soft`: `0 0 #0000` / `elevated`: `var(--cs-shadow-elevated)` |
| `--cs-text-area-shadow-hover` | Hover elevation shadow | `soft`: `0 0 #0000` / `elevated`: `var(--cs-shadow-elevated-hover)` |
| `--cs-text-area-ring-shadow` | Inset focus/invalid ring | `inset 0 0 0 0px transparent` (active: `2px` accent or negative solid) |
| `--cs-text-area-ring-shadow-hover` | Hover ring shadow | Tracks `--cs-text-area-ring-shadow` |
| `--cs-text-area-font-size` | Typography size | `sm`: `--cs-text-xs` / `md`, `lg`: `--cs-text-sm` |
| `--cs-text-area-line-height` | Line height | `var(--cs-leading-normal)` (`1.5`) |
| `--cs-text-area-padding-inline` | Horizontal padding | `sm`: `10px` / `md`: `12px` / `lg`: `14px` |
| `--cs-text-area-padding-block` | Vertical padding | `sm`: `7px` / `md`: `8px` / `lg`: `10px` |
| `--cs-text-area-radius` | Corner radius | `sm`: `10px` / `md`: `12px` / `lg`: `13px` |

---

## 3. Sizing & Resizing

`TextArea` separates four distinct sizing concerns so they never conflict:

1. **T-Shirt `size` (`sm` | `md` | `lg`):**
   Controls visual scale only (`font-size`, `line-height`, `padding-inline`, `padding-block`, `border-radius`, and the 2-line `min-height` floor).
2. **Intrinsic HTML Dimensions (`rows` & `cols`):**
   - `rows` (default `3`) lets the browser compute initial height from `3` text lines plus vertical padding without hardcoding a fixed CSS `height`.
   - `cols` is optional (`undefined` by default). When omitted, CSS applies `width: 100%` (with `min-width: 0`) so `TextArea` fills its container cleanly. When `cols` is explicitly provided (`&:not([cols]) { width: 100%; }`), native `cols` width is respected.
3. **`resize` Prop (`"none" | "vertical" | "horizontal" | "both"`, default `"vertical"`):**
   Maps directly via `[data-resize="..."]` to CSS `resize`. Defaulting to `"vertical"` matches `reset.css` and prevents accidental horizontal layout overflow. When `disabled` is active, CSS forces `resize: none`.
4. **Minimum Height Floor (`min-height`):**
   `min-height: calc(var(--cs-text-area-padding-block) * 2 + 2lh)` ensures dragging the resize handle upward never collapses the control below two legible lines (`50px` at `sm`, `58px` at `md`, `62px` at `lg`).

### Native Resize Handle & Scrollbars
- **Native resizer only:** Keep the native browser resize handle. Do not custom-style `::-webkit-resizer` (non-standard, unsupported in Firefox) and do not overlay a JS drag handle.
- **Scrollbars:** Rely on global `scroll.css` styling with `overflow: auto` and `scrollbar-gutter: auto` (default). Do not force `scrollbar-gutter: stable`, which would create a permanent `8px` right-side asymmetry on short 2–3 line textareas without scrollbars.

---

## 4. DOM, Semantics & Accessibility

### Root Element & Attributes

```svelte
<textarea
    bind:this={ref}
    {...rest}
    bind:value
    {rows}
    {cols}
    class={["cs-text-area", className]}
    disabled={disabled}
    readonly={readonly}
    aria-invalid={invalid ? "true" : undefined}
    data-variant={variant}
    data-size={size}
    data-resize={resize}
    data-invalid={invalid ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    data-readonly={readonly ? "" : undefined}
    oninput={handleInput}
></textarea>
```

### Accessibility Contract
- **Validation (`invalid`):** Sets `aria-invalid="true"` when `invalid` is truthy, omitted otherwise.
- **Labeling:** Supports standard `<label for={id}>` association via `id` passed through `{...rest}`, or `aria-label` / `aria-labelledby`.
- **`disabled` vs `readonly`:**
  - `disabled`: Native `disabled` removes the element from tab order, blocks form submission, sets `cursor: default`, and disables resizing (`resize: none`).
  - `readonly`: Native `readonly` keeps the element focusable, text-selectable, and submittable while preventing edits (`cursor: text`).
- **Keyboard:** Native `<textarea>` behavior is preserved without interception (`Enter` inserts a newline, `Tab` moves focus, arrow keys navigate text).

---

## 5. Auto-Resizing Strategy

- **v1 Decision:** **No built-in auto-resizing.**
  - CSS `field-sizing: content` currently has `low` baseline support (unsupported in Safari `< 26.2` and Firefox `< 152`).
  - Baking `scrollHeight` measurement JS into `TextArea` adds layout-shift side effects and couples `resize` / `max-height` policy into a low-level primitive.
- **Future Composability Path:**
  When auto-resizing is needed (e.g., for a chat composer), implement it as an **independent attachment module** such as `src/modules/auto-resize/auto-resize.attach.ts`:
  - Exports `autoResize(options?: AutoResizeOptions): Attachment<HTMLTextAreaElement>` following the single-options-object + `enabled` rule.
  - Can use `field-sizing: content` when supported with a `scrollHeight` measurement fallback, coordinating `maxRows` / `maxHeight` and `resize: none`.
  - Composes cleanly onto `TextArea` via `{@attach autoResize({ maxRows: 8 })}` (forwarded via `{...rest}`) or `bind:ref`, requiring **zero changes** to `TextArea`.

---

## 6. Visual & Motion Contract

All styles live inside `@layer components.primitive` on `.cs-text-area`.

- **Single `box-shadow` Stack:** Because `<textarea>` does not reliably render `::before`/`::after` pseudo-elements across browsers, `TextArea` composites its inset ring and elevation shadow in one declaration:
  ```css
  box-shadow: var(--cs-text-area-ring-shadow), var(--cs-text-area-shadow);
  ```
  - `--cs-text-area-ring-shadow` is listed first so the `2px` inset ring paints *above* `--cs-shadow-elevated`.
  - Inactive shadows use `0 0 #0000` (not `none`) so comma-separated `box-shadow` transitions remain valid across all states.
- **Squircle & Base Reset:** `appearance: none`, `border: none`, `outline: none`, `corner-shape: var(--cs-squircle-soft)`, `font-family: inherit`, `color: var(--cs-text-area-fg)`, `caret-color: var(--cs-text-area-caret)`.
- **Focus (`:focus-visible:not(:disabled)` / `:focus:not(:disabled)`):** Suppresses global `focus.css` outline (`outline: none`) and sets `--cs-text-area-ring-shadow: inset 0 0 0 2px var(--cs-color-accent-solid)`.
- **Invalid (`[data-invalid]:not(:disabled)`):** Sets `--cs-text-area-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid)` and `--cs-text-area-caret: var(--cs-color-negative-solid)` while preserving `--cs-text-area-shadow` (Frame + Shadow).
- **Disabled (`:disabled` / `[data-disabled]`):** Sets `--cs-disabled-opacity: 1`, disabled `fg`/`placeholder-fg`, clears ring shadow, sets `resize: none` and `cursor: default`, and applies `0 0 0 1px var(--cs-color-disabled-border)` on `elevated`.
- **Motion:**
  - `box-shadow`: `var(--cs-dur-120) var(--cs-ease-quart-out)`
  - `background-color`, `color`: `var(--cs-dur-effect) var(--cs-ease-effect)`

---

## 7. File Structure & Test Checklist

### Module Files (`src/modules/text-area/`)
- `index.ts` — Barrel exports (`TextArea`, option arrays, TypeScript types).
- `TextArea.svelte` — Single-element `<textarea>` component and scoped `@layer components.primitive` styles.
- `text-area.design.md` — Visual & interaction design specification.
- `text-area.blueprint.md` — This architecture blueprint.
- `text-area.docs.md` — Public documentation and usage examples.
- `TextArea.preview.svelte` — Interactive playground preview.
- `TextArea.svelte.test.ts` — Component unit tests.

### Implementation Test Checklist
- [ ] **Rendering & Attributes:** Renders a single `<textarea class="cs-text-area">` with no wrapper `<div>`; sets `data-variant`, `data-size`, `data-resize` (default `"vertical"`), and `rows` (default `3`).
- [ ] **Optional `cols` & Rest Props:** Omits `cols` by default; forwards `cols`, `placeholder`, `maxlength`, `wrap`, `id`, and custom `class` onto `<textarea>`.
- [ ] **Value Binding & Callback:** `bind:value` updates bidirectionally; typing triggers `onValueChange(value)` and forwards native `oninput`.
- [ ] **`ref` Binding:** `bind:ref` resolves to the underlying `HTMLTextAreaElement`.
- [ ] **States:**
  - `invalid` sets `data-invalid=""` and `aria-invalid="true"`; omitted when falsy.
  - `disabled` sets native `disabled` and `data-disabled=""`.
  - `readonly` sets native `readonly` and `data-readonly=""`.
- [ ] **Attachment Forwarding:** `{@attach ...}` passed through `{...rest}` attaches directly to the `<textarea>` element.
- [ ] **Quality Gates:** `bun run typecheck`, `bun run lint`, and Vitest suite pass cleanly.
