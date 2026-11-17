---
name: TextArea
kind: component
import: cs/svelte/text-area
exports:
  - TextArea
  - TEXT_AREA_VARIANTS
  - TEXT_AREA_SIZES
  - TEXT_AREA_RESIZES
  - TextAreaVariant
  - TextAreaSize
  - TextAreaResize
  - TextAreaProps
---

# TextArea

## Overview
Pure, single-element `<textarea>` primitive (`<textarea class="cs-text-area">`) featuring `soft` and `elevated` surfaces, `sm`–`lg` sizes, configurable `resize`, and ring-first focus/invalid styling matching `TextInput` 1:1.

`<TextArea />` intentionally renders no built-in `<label>`, description, or error text—pair `id={...}` with an external `<label for={...}>` and external validation/helper messaging. It is strictly a plain-text `<textarea>` primitive, not a chatbox composer (no built-in toolbars, footers, character counters, send buttons, or auto-resizing), not a WYSIWYG/rich-text editor, and includes no inline icons or inline actions.

## API

### `TextArea` Props
Extends `Omit<HTMLTextareaAttributes, "children" | "value">`. Renders `<textarea class="cs-text-area">` directly with no wrapper `<div>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `TextAreaVariant` | Yes | — | Surface style: `"soft" \| "elevated"`. |
| `size` | `TextAreaSize` | Yes | — | T-shirt size: `"sm" \| "md" \| "lg"`. |
| `resize` | `TextAreaResize` | No | `"vertical"` | CSS `resize` behavior via `data-resize`: `"none" \| "vertical" \| "horizontal" \| "both"`. Forced to `none` when `disabled`. |
| `rows` | `number` | No | `3` | Native HTML `rows` attribute for initial height. |
| `cols` | `number` | No | `undefined` | Optional native HTML `cols` attribute. When omitted, CSS applies `width: 100%` (with `min-width: 0`). |
| `value` | `string` | No | `""` | `$bindable` textarea value. Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: string) => void` | No | `undefined` | Fires with `event.currentTarget.value` on every `input` event (after `oninput?.(event)`). |
| `invalid` | `boolean` | No | `undefined` | Applies `data-invalid` negative ring/caret styling and sets `aria-invalid="true"`. |
| `disabled` | `boolean` | No | `undefined` | Sets native `disabled` and `data-disabled`; removes from tab order, blocks form submission, sets `cursor: default`, and forces `resize: none`. |
| `readonly` | `boolean` | No | `undefined` | Sets native `readonly` and `data-readonly`; keeps element focusable, text-selectable, and submittable while preventing edits (`cursor: text`). |
| `ref` | `HTMLTextAreaElement \| null` | No | `null` | `$bindable` reference to the `<textarea>` element. |
| `class` | `ClassValue` | No | `undefined` | Additional class names merged via `class={["cs-text-area", className]}`. |

All remaining `HTMLTextareaAttributes` (`id`, `name`, `placeholder`, `maxlength`, `minlength`, `wrap`, `autocomplete`, `spellcheck`, `required`, `{@attach ...}`, event handlers, etc.) are forwarded directly to `<textarea>`.

### Exported Constants & Types
- `TEXT_AREA_VARIANTS`: `readonly ["soft", "elevated"]` (`TextAreaVariant`)
- `TEXT_AREA_SIZES`: `readonly ["sm", "md", "lg"]` (`TextAreaSize`)
- `TEXT_AREA_RESIZES`: `readonly ["none", "vertical", "horizontal", "both"]` (`TextAreaResize`)
- `TextAreaProps`

### `data-*` Attributes
- Root (`.cs-text-area`): `data-variant={variant}`, `data-size={size}`, `data-resize={resize}`, `data-invalid` (when `invalid`), `data-disabled` (when `disabled`), `data-readonly` (when `readonly`).

### CSS Custom Properties
Overridable on `.cs-text-area`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-text-area-bg` | `var(--cs-color-base-soft)` (`soft`) / `var(--cs-color-elevated)` (`elevated`) | Background color (`--cs-color-disabled-bg` / `--cs-color-disabled-bg-elevated` when disabled). |
| `--cs-text-area-bg-hover` | `var(--cs-color-base-soft-hover)` (`soft`) / `var(--cs-color-elevated-hover)` (`elevated`) | Hover background color. |
| `--cs-text-area-fg` | `var(--cs-color-text-strong)` | Text color (`var(--cs-color-disabled-fg)` when disabled). |
| `--cs-text-area-placeholder-fg` | `var(--cs-color-text-weak)` | Placeholder text color (`var(--cs-color-disabled-fg)` when disabled). |
| `--cs-text-area-caret` | `var(--cs-color-accent-solid)` | Caret color (`var(--cs-color-negative-solid)` when `[data-invalid]:not(:disabled)`). |
| `--cs-text-area-shadow` | `0 0 #0000` (`soft`) / `var(--cs-shadow-elevated)` (`elevated`) | Elevation box-shadow (`0 0 0 1px var(--cs-color-disabled-border)` for disabled `elevated`). |
| `--cs-text-area-shadow-hover` | `0 0 #0000` (`soft`) / `var(--cs-shadow-elevated-hover)` (`elevated`) | Hover elevation box-shadow. |
| `--cs-text-area-ring-shadow` | `inset 0 0 0 0px transparent` | Inset ring shadow (`inset 0 0 0 2px var(--cs-color-accent-solid)` on focus; `inset 0 0 0 2px var(--cs-color-negative-solid)` on `[data-invalid]:not(:disabled)`). |
| `--cs-text-area-ring-shadow-hover` | `var(--cs-text-area-ring-shadow)` | Hover inset ring shadow (tracks active focus/invalid ring). |
| `--cs-text-area-font-size` | `var(--cs-text-xs)` (`sm`), `var(--cs-text-sm)` (`md`, `lg`) | Font size per `data-size`. |
| `--cs-text-area-line-height` | `var(--cs-leading-normal)` | Line height (`1.5`). |
| `--cs-text-area-padding-inline` | `10px` (`sm`) / `12px` (`md`) / `14px` (`lg`) | Horizontal padding per `data-size`. |
| `--cs-text-area-padding-block` | `7px` (`sm`) / `8px` (`md`) / `10px` (`lg`) | Vertical padding per `data-size`. |
| `--cs-text-area-radius` | `10px` (`sm`) / `12px` (`md`) / `13px` (`lg`) | Border radius per `data-size` with `corner-shape: var(--cs-squircle-soft)`. |

## Examples

### Basic (`soft` & `elevated`)
```svelte
<script lang="ts">
    import { TextArea } from "cs/svelte/text-area";

    let notes = $state("");
</script>

<TextArea variant="soft" size="md" bind:value={notes} placeholder="Write a note..." />

<TextArea variant="elevated" size="md" bind:value={notes} placeholder="Elevated note..." />
```

### Sizes, `rows` & `resize`
```svelte
<script lang="ts">
    import { TextArea } from "cs/svelte/text-area";

    let summary = $state("");
</script>

<TextArea variant="soft" size="sm" rows={2} resize="none" bind:value={summary} placeholder="Compact fixed-height note" />

<TextArea variant="soft" size="lg" rows={5} resize="both" bind:value={summary} placeholder="Large resizable description" />
```

### States (`invalid`, `disabled`, `readonly`)
```svelte
<script lang="ts">
    import { TextArea } from "cs/svelte/text-area";

    let bio = $state("Too short");
    let terms = "Read-only license terms that can still be focused and copied.";
</script>

<TextArea variant="soft" size="md" invalid bind:value={bio} />

<TextArea variant="soft" size="md" disabled value="Disabled textarea" />

<TextArea variant="soft" size="md" readonly value={terms} />
```

### External `<label>` Pairing & Validation Message
```svelte
<script lang="ts">
    import { TextArea } from "cs/svelte/text-area";

    const fieldId = $props.id();
    const errorId = $props.id();
    let message = $state("");
    const isTooShort = $derived(message.length > 0 && message.trim().length < 10);
</script>

<div class="flex flex-col gap-1.5">
    <label for={fieldId} class="text-sm font-medium">Feedback</label>
    <TextArea
        id={fieldId}
        variant="soft"
        size="md"
        bind:value={message}
        invalid={isTooShort}
        aria-describedby={isTooShort ? errorId : undefined}
        placeholder="Tell us what happened..."
    />
    {#if isTooShort}
        <p id={errorId} class="text-xs text-negative-fg">
            Please enter at least 10 characters.
        </p>
    {/if}
</div>
```

## Behavior & Quirks
- **`$bindable()` pitfalls (`value={fn()}`, `ref={fn()}`):** Never pass a non-bound expression (e.g. `value={getNotes()}`) to `<TextArea />`. Because `value` and `ref` are declared with `$bindable`, passing a plain expression passes `svelte-check` without warning but throws a Svelte 5 runtime error when mutated—even if `onValueChange` is also provided. Use `bind:value={state}` for local `$state`, `bind:value={getter, setter}` for derived/store state, or omit `value` for uncontrolled mode (optionally pairing with `onValueChange`).
- **Single-Element `box-shadow` Ring Composition:** Because `<textarea>` does not reliably render `::before`/`::after` pseudo-elements across browsers, `TextArea` composites its inset ring and elevation shadow in a single declaration (`box-shadow: var(--cs-text-area-ring-shadow), var(--cs-text-area-shadow)`). Listing `--cs-text-area-ring-shadow` first ensures the `2px` inset ring paints above `--cs-shadow-elevated`. Inactive shadows use `0 0 #0000` (not `none`) so comma-separated `box-shadow` transitions remain valid across states.
- **Sizing, `cols`, & `min-height` Floor:** When `cols` is omitted (`&:not([cols])`), CSS applies `width: 100%` with `min-width: 0`. `min-height: calc(var(--cs-text-area-padding-block) * 2 + 2lh)` prevents dragging the native resize handle upward from collapsing the control below two legible lines (`50px` at `sm`, `58px` at `md`, `62px` at `lg`).
- **Accessibility (`<label for>`, `aria-invalid`, `disabled` vs `readonly`):**
  - Pair `id` with `<label for={id}>` (or provide `aria-label` / `aria-labelledby`).
  - `invalid` sets `aria-invalid="true"` when truthy and is omitted otherwise.
  - `disabled` removes the `<textarea>` from tab order, excludes it from form submission, sets `cursor: default`, and forces `resize: none`.
  - `readonly` keeps the `<textarea>` focusable, text-selectable, and submittable while preventing edits (`cursor: text`).
- **No Inline Icons, Actions, or Auto-Resizing:** `TextArea` intentionally omits inline icons/actions (which conflict with multi-line line wrapping, scrollbars, and the bottom-right resize handle) and built-in auto-resizing. Compose external controls around `<TextArea />`, and attach auto-resizing behavior externally via `{@attach ...}` or `bind:ref` when needed.
