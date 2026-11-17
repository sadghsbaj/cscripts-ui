# `autoResize` Attachment Blueprint

<meta>
  <module>auto-resize</module>
  <kind>attachment</kind>
  <layer>attachments</layer>
  <status>proposed</status>
</meta>

---

## 1. Overview & Scope

`autoResize` is a lightweight, zero-wrapper, CSS-driven Svelte 5 attachment (`kind: attachment`) that dynamically sizes editable form controls (`<textarea>` and `<input>`) to fit their content using native CSS `field-sizing: content`.

Following the same declarative pattern as `scrollFade` and `fadeMask`, `autoResize` delegates layout, line-wrapping, and content measurement entirely to the browser's native layout engine while providing a clean, typed API for row bounds (`minRows`, `maxRows`), dimension bounds (`minHeight`, `maxHeight`, `minWidth`, `maxWidth`), and seamless integration with `<TextArea />` and `<TextInputField />`.

### In Scope
- Pure `field-sizing: content` sizing engine with **zero JavaScript event listeners, zero `ResizeObserver` instances, and zero `scrollHeight` layout thrashing**.
- Attaches directly to `<textarea>` or `<input>` elements and forwards cleanly through `<TextArea {...rest} />` and `<TextInputField {...rest} />`.
- Row-based vertical bounds (`minRows`, `maxRows`) translated into exact `1lh` + box-padding CSS calculations.
- Explicit CSS length / pixel bounds (`minHeight`, `maxHeight`, `minWidth`, `maxWidth`).
- Automatic `resize: none` enforcement while active so manual drag-resizing cannot inject conflicting inline `height` styles.
- Reactive `enabled?: boolean | (() => boolean)` support via `resolveGetter`.

### Explicit Non-Goals (Out of Scope)
- **No legacy `scrollHeight` JS fallback engine:** Modern browsers support `field-sizing: content` natively (`code-style.md` targets modern Chromium-first and encourages modern platform CSS features). Omitting JS measurement eliminates `input` listeners, `value` setter hooks, `ResizeObserver` loops, and scroll-position jumps.
- **No wrapper DOM or hidden clone nodes:** All styling and variables apply directly to the target form element.
- **No height transition animations:** Animating `height` on keystrokes causes caret lag; native `field-sizing: content` updates instantaneously during layout.
- **No testing plan in this blueprint:** Testing is deferred to a later phase.

---

## 2. Why `field-sizing: content` + Thin Attachment Is the Ideal Architecture

### 2.1 What `field-sizing: content` Solves Natively (Zero JS)
By relying on native `field-sizing: content`, the browser's C++ layout engine handles every dynamic sizing trigger automatically:
1. **User Typing & Pasting:** Expands and shrinks on every character without resetting `style.height = "auto"` or forcing synchronous reflows.
2. **Programmatic `bind:value` Updates:** When an application clears a chat composer (`message = ""`), streams AI tokens, or resets a form, the element resizes immediately in the same layout pass—no `value` prop or DOM event listener is needed on the attachment.
3. **Container Width Reflow:** When a sidebar opens or the viewport resizes, re-wrapped text lines adjust the element's height automatically during layout without a `ResizeObserver`.
4. **Placeholders & Font Loading:** Multi-line placeholders and web font metrics (`1lh`) are accounted for natively.

### 2.2 What the Attachment Adds Around `field-sizing: content`
A raw `field-sizing: content` CSS declaration alone has three ergonomics gaps that the `autoResize` attachment solves cleanly:

1. **Preserving `rows` & Supporting `minRows`:**
   - By CSS specification, `field-sizing: content` causes `<textarea rows="3">` to ignore its HTML `rows` attribute and collapse to a single line when empty (or to 2 lines on `<TextArea>` due to its default `2lh` `min-height` floor).
   - `autoResize` reads `options.minRows ?? (node instanceof HTMLTextAreaElement ? node.rows : undefined)` and exposes it as `--cs-auto-resize-min-rows`, allowing CSS to compute `min-height` using `1lh` + vertical padding.
2. **Line-Count Ceiling (`maxRows`):**
   - Product UIs almost always cap multi-line inputs by line count (`maxRows: 6` or `maxRows: 8`) rather than raw pixels, because pixel heights differ across `sm`, `md`, and `lg` control sizes.
   - `autoResize` sets `--cs-auto-resize-max-rows`, which CSS combines with `1lh` and the control's vertical padding to cap `max-height` and switch cleanly to internal scrolling (`overflow-y: auto`).
3. **Coordinating with `<TextArea>` (`resize: none` & 1-Row Composers):**
   - `<TextArea>` defaults to `resize="vertical"` (`data-resize="vertical"`) and `min-height: calc(var(--cs-text-area-padding-block) * 2 + 2lh)`.
   - When `autoResize` is attached, it sets `data-auto-resize=""` and `.cs-auto-resize`, disabling the manual drag handle (`resize: none`) and allowing `<TextArea rows={1} {@attach autoResize({ maxRows: 6 })} />` to start at a true single-line height (`36px` at `md`, matching `<TextInput size="md" />` and `<Button size="md" />`).

---

## 3. Use Cases & Component Integration

### 3.1 Primary Use Cases

1. **Chat & Prompt Composers (`1` to `N` Rows):**
   ```svelte
   <TextArea
       variant="elevated"
       size="md"
       rows={1}
       bind:value={prompt}
       placeholder="Ask anything..."
       {@attach autoResize({ maxRows: 8 })}
   />
   ```
   Starts as a single-line bar (`rows={1}`), grows up to 8 lines as the user types, scrolls internally beyond 8 lines, and snaps back to 1 line when `prompt = ""` is set on submit.

2. **Bounded Comment & Description Fields (`3` to `N` Rows):**
   ```svelte
   <TextArea
       variant="soft"
       size="md"
       rows={3}
       bind:value={comment}
       {@attach autoResize({ maxRows: 10 })}
   />
   ```
   Infers `minRows = 3` from `rows={3}` automatically, grows up to 10 lines, and prevents long comments from pushing form actions off-screen.

3. **Unbounded Document Notes (`minRows` Only, No Ceiling):**
   ```svelte
   <TextArea
       variant="soft"
       size="lg"
       rows={4}
       bind:value={notes}
       {@attach autoResize()}
   />
   ```
   Starts at 4 rows and grows indefinitely with the document content without nested scrollbars.

4. **Inline Auto-Width Inputs (`<TextInputField />` / `<input>`):**
   ```svelte
   <TextInput variant="soft" size="sm" class="w-auto">
       <TextInputIcon icon={Tag} />
       <TextInputField
           bind:value={tagName}
           placeholder="Tag..."
           {@attach autoResize({ minWidth: "60px", maxWidth: "240px" })}
       />
   </TextInput>
   ```
   When attached to `<TextInputField />` inside an inline `<TextInput class="w-auto">`, the input field hugs its text/placeholder width between `60px` and `240px`.

---

## 4. Public API & Configuration

Following `.agents/rules/architecture-and-apis.md` and `.agents/rules/naming.md`:
- Single uniform options object: `autoResize(options?: AutoResizeOptions): Attachment<HTMLElement>`.
- All options are optional so `{@attach autoResize()}` works with zero arguments.

### 4.1 Exports (`src/modules/auto-resize/index.ts`)

```ts
export {
    autoResize,
    type AutoResizeOptions,
} from "./auto-resize.attach.ts";
```

*(Note: Because no `$effect` or JS measurement state is needed, the attachment can live in a plain `auto-resize.attach.ts` file, just like `scroll-fade.attach.ts` and `fade-mask.attach.ts`!)*

### 4.2 `AutoResizeOptions` Interface

```ts
export interface AutoResizeOptions {
    /**
     * Whether auto-resizing is enabled.
     * @default true
     */
    enabled?: boolean | (() => boolean);

    /**
     * Minimum number of visible text lines for `<textarea>` elements.
     * When omitted, defaults to the `<textarea>`'s explicit `rows` attribute (e.g. `rows={3}`),
     * or leaves the element's base `min-height` untouched if no `rows` attribute is set.
     */
    minRows?: number;

    /**
     * Maximum number of visible text lines for `<textarea>` elements before vertical scrolling activates.
     * When omitted, the element grows without a line-count ceiling (unless `maxHeight` is set).
     */
    maxRows?: number;

    /**
     * Explicit minimum height (`px` number or CSS length string, e.g. `80`, `"5rem"`).
     * Overrides `minRows` when both are provided.
     */
    minHeight?: number | string;

    /**
     * Explicit maximum height (`px` number or CSS length string, e.g. `320`, `"40dvh"`).
     * Overrides `maxRows` when both are provided.
     */
    maxHeight?: number | string;

    /**
     * Explicit minimum width (`px` number or CSS length string, e.g. `64`, `"6ch"`).
     * Primarily used when auto-resizing `<input>` / `<TextInputField>` elements horizontally.
     */
    minWidth?: number | string;

    /**
     * Explicit maximum width (`px` number or CSS length string, e.g. `280`, `"100%"`).
     * Primarily used when auto-resizing `<input>` / `<TextInputField>` elements horizontally.
     */
    maxWidth?: number | string;
}
```

### 4.3 Option Resolution Rules
1. **CSS Length Formatting (`formatCssLength`):**
   - Numbers (e.g. `minHeight: 120`, `maxWidth: 240`) are formatted as `${value}px`.
   - Strings (e.g. `"40dvh"`, `"12ch"`, `"100%"`) are passed through as-is.
2. **`minRows` Resolution on `<textarea>`:**
   - `const resolvedMinRows = options?.minRows ?? (node instanceof HTMLTextAreaElement && node.hasAttribute("rows") ? node.rows : undefined);`
   - If `resolvedMinRows` is a positive number (`>= 1`) and `minHeight` is not set, `--cs-auto-resize-min-rows` is set to `String(resolvedMinRows)`.
3. **`maxRows` Resolution on `<textarea>`:**
   - If `options?.maxRows` is a positive number (`>= 1`) and `maxHeight` is not set, `--cs-auto-resize-max-rows` is set to `String(options.maxRows)`.
4. **Explicit `minHeight` / `maxHeight` / `minWidth` / `maxWidth`:**
   - Set `--cs-auto-resize-min-height`, `--cs-auto-resize-max-height`, `--cs-auto-resize-min-width`, `--cs-auto-resize-max-width` on the element's inline style when provided.

---

## 5. CSS & DOM Contract

### 5.1 DOM Attributes (`naming.md` Compliant)

| Attribute | Element | Value | Purpose |
| :--- | :--- | :--- | :--- |
| `class="... cs-auto-resize"` | Attached `<textarea>` or `<input>` | Class token | Activates `@layer attachments` auto-resize rules. |
| `data-auto-resize` | Attached `<textarea>` or `<input>` | `""` (boolean presence) | Presence marker for component coordination and inspection. |

### 5.2 How `1lh` + Padding Math Works Across `<TextArea>` and Native `<textarea>`

Because `<textarea>` uses `box-sizing: border-box` (`reset.css`), an $N$-row height equals:
$$\text{Height}(N) = \text{Vertical Box Chrome (padding + border)} + N \times \text{1lh}$$

- On `<TextArea>`, vertical padding is defined by `calc(var(--cs-text-area-padding-block) * 2)` (with `border: none`).
- What if `autoResize` is attached to a raw `<textarea>` that doesn't have `--cs-text-area-padding-block`?
  - In `autoResize`, if `node` does not have `.cs-text-area` (or always as a fallback variable), we can either rely on `--cs-text-area-padding-block` or read `paddingTop + paddingBottom + borderTopWidth + borderBottomWidth` once from `getComputedStyle(node)` into `--cs-auto-resize-block-padding` if needed—or even simpler in CSS:
    ```css
    --cs-auto-resize-padding-block: var(--cs-text-area-padding-block, 0px);
    ```
    And if we want raw `<textarea style="padding: 8px">` to also compute exact `minRows`/`maxRows`, reading `getComputedStyle(node)` once on attach to set `--cs-auto-resize-chrome-block` (fallback when `--cs-text-area-padding-block` is not used) is a 3-line helper, or we use `calc(var(--cs-text-area-padding-block, 0px) * 2 + var(--cs-auto-resize-min-rows) * 1lh)`.

### 5.3 Coordinating `@layer attachments` and `@layer components.primitive`

In `src/css/index.css`, the cascade layer order is:
```css
@layer foundation, attachments, components.primitive, components.composite;
```
Because `components.primitive` is ordered *after* `attachments`, normal declarations inside `TextArea.svelte` (`@layer components.primitive`) have higher cascade priority than `@layer attachments`. Specifically, `TextArea.svelte` currently defines:
- `min-height: calc(var(--cs-text-area-padding-block) * 2 + 2lh);`
- `&[data-resize="vertical"] { resize: vertical; }`

To make `autoResize` and `TextArea` work together seamlessly without `!important` hacks:
1. **In `auto-resize.attach.css` (`@layer attachments`):**
   ```css
   @layer attachments {
       .cs-auto-resize {
           field-sizing: content;
           resize: none;
           min-height: var(
               --cs-auto-resize-min-height,
               calc(var(--cs-text-area-padding-block, 0px) * 2 + var(--cs-auto-resize-min-rows) * 1lh)
           );
           max-height: var(
               --cs-auto-resize-max-height,
               calc(var(--cs-text-area-padding-block, 0px) * 2 + var(--cs-auto-resize-max-rows) * 1lh)
           );
           min-width: var(--cs-auto-resize-min-width);
           max-width: var(--cs-auto-resize-max-width);
       }
   }
   ```
   *(Note: In CSS, when a custom property like `--cs-auto-resize-max-rows` is not set on the element, `var(--cs-auto-resize-max-height, calc(... + var(--cs-auto-resize-max-rows) * 1lh))` becomes invalid at computed-value time (IACVT) and smoothly falls back to `max-height: none`! Same for `min-width`, `max-width`, and `min-height`!)*
2. **In `TextArea.svelte` (`@layer components.primitive`):**
   We add a tiny, zero-coupling `[data-auto-resize]` hook on `.cs-text-area`:
   ```css
   &[data-auto-resize] {
       resize: none;
       min-height: var(
           --cs-auto-resize-min-height,
           calc(var(--cs-text-area-padding-block) * 2 + var(--cs-auto-resize-min-rows, 2) * 1lh)
       );
       max-height: var(
           --cs-auto-resize-max-height,
           calc(var(--cs-text-area-padding-block) * 2 + var(--cs-auto-resize-max-rows) * 1lh)
       );
   }
   ```
   And in `TextInputField.svelte` (`@layer components.primitive`), `.cs-text-input-field` sets `flex: 1; min-width: 0;`. When `[data-auto-resize]` is present on `.cs-text-input-field`:
   ```css
   &[data-auto-resize] {
       flex: 0 1 auto;
       width: auto;
   }
   ```
   This allows `<TextInputField {@attach autoResize(...)} />` inside `<TextInput class="w-auto">` to shrink-wrap its content instead of stretching with `flex: 1`!

### 5.4 Clean Teardown
When the attachment cleanup function runs (on unmount or when `enabled` flips to `false`):
- Removes `"cs-auto-resize"` from `node.classList`.
- Deletes `node.dataset.autoResize`.
- Removes `--cs-auto-resize-min-rows`, `--cs-auto-resize-max-rows`, `--cs-auto-resize-min-height`, `--cs-auto-resize-max-height`, `--cs-auto-resize-min-width`, and `--cs-auto-resize-max-width` from `node.style`.

---

## 6. Planned File Structure (`src/modules/auto-resize/`)

- `src/modules/auto-resize/index.ts` — Barrel exporting `autoResize` and `AutoResizeOptions`.
- `src/modules/auto-resize/auto-resize.attach.ts` — Lightweight (~60 lines) attachment setting `.cs-auto-resize`, `data-auto-resize`, and `--cs-auto-resize-*` CSS custom properties.
- `src/modules/auto-resize/auto-resize.attach.css` — `@layer attachments` stylesheet applying `field-sizing: content`, `resize: none`, and `1lh` / custom-property min/max bounds.
- `src/modules/auto-resize/auto-resize.blueprint.md` — This architecture blueprint.
- `src/modules/auto-resize/auto-resize.docs.md` — Documentation and usage examples.
- `src/modules/auto-resize/AutoResize.preview.svelte` — Interactive playground preview demonstrating:
  1. **Chat / Prompt Composer:** `<TextArea rows={1} {@attach autoResize({ maxRows: 6 })} />` alongside a Send `<Button>` with `1:1` height alignment and Enter-to-reset.
  2. **Bounded Comment Field:** `<TextArea rows={3} {@attach autoResize({ maxRows: 8 })} />`.
  3. **Unbounded Notes:** `<TextArea rows={3} {@attach autoResize()} />`.
  4. **Inline Auto-Width `TextInput`:** `<TextInputField {@attach autoResize({ minWidth: "80px", maxWidth: "260px" })} />`.
  5. **Reactive `enabled` Toggle:** Live switch toggling `autoResize({ enabled: () => isEnabled })`.
