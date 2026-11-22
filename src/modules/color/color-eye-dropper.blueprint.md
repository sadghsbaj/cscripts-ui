# `ColorEyeDropper` Blueprint

## 1. Overview & Scope

- **Kind:** `component` (composite built on `Button` and `ButtonIcon` from `../button/index.ts`, with `<HitArea />` from `../hit-area/index.ts` for compact `iconOnly` targets)
- **Purpose:** Screen color sampling button powered by the Chromium `EyeDropper` API. Integrates automatically with `ColorPickerContext` when nested inside `ColorPicker`, and also works standalone via `onPick` and/or `bind:value`.
- **Boundaries & Files:**
  - **Component:** `src/modules/color/ColorEyeDropper.svelte`
  - **Public exports & types:** `src/modules/color/index.ts` (`ColorEyeDropper`, `ColorEyeDropperProps`, `COLOR_EYE_DROPPER_VARIANTS`, `COLOR_EYE_DROPPER_SIZES`, `ColorEyeDropperVariant`, `ColorEyeDropperSize`)
  - **Shared module helpers:** `isEyeDropperSupported()` in `src/modules/color/color.utils.ts`; `getColorPickerContext()` / `hasColorPickerContext()` in `src/modules/color/color.context.ts`
- **Explicit Non-Goals:**
  - Implementing a canvas/screen-capture polyfill for Firefox or Safari (OS-level pixel sampling outside the browser viewport is not possible without native `EyeDropper`).
  - Supporting `as="a"` or `as="label"` polymorphism (`ColorEyeDropper` is strictly an interactive `<button type="button">`).
  - Sampling alpha/transparency (the W3C `EyeDropper` API only returns opaque 6-digit `sRGBHex` strings).

---

## 2. Public API

### Exports (`src/modules/color/index.ts`)

- `ColorEyeDropper` (default export from `./ColorEyeDropper.svelte`)
- `COLOR_EYE_DROPPER_VARIANTS = ["primary", "secondary", "tertiary", "ghost", "elevated"] as const` & `ColorEyeDropperVariant`
- `COLOR_EYE_DROPPER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` & `ColorEyeDropperSize`
- `ColorEyeDropperProps`

### `ColorEyeDropperProps`

Extends `Omit<HTMLButtonAttributes, "type" | "color" | "size" | "value">` (forwarded to `Button`):

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` (`$bindable(null)`) | `null` | Bound to the underlying `Button` `<button>` element. |
| `variant` | `ColorEyeDropperVariant` (`"primary" \| "secondary" \| "tertiary" \| "ghost" \| "elevated"`) | **required** | Visual style forwarded 1:1 to `Button`. No default. |
| `size` | `ColorEyeDropperSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | **required** | T-shirt scale forwarded 1:1 to `Button` (`28px`–`44px` height). No default. |
| `value` | `string \| undefined` (`$bindable(undefined)`) | `undefined` | Optional bindable CSS color string for standalone usage; updated to `result.sRGBHex` on pick. |
| `onPick` | `(color: string) => void` | `undefined` | Fires with the picked `sRGBHex` string when sampling succeeds. |
| `onError` | `(error: unknown) => void` | `undefined` | Optional handler for non-abort `EyeDropper.open()` failures (e.g. insecure context or lost user activation). |
| `unsupportedBehavior` | `"hide" \| "disable"` | `"hide"` | `"hide"` renders nothing when `EyeDropper` is unavailable; `"disable"` renders a disabled button with a localized hint. |
| `disabled` | `boolean` | `false` | Disables the button. Also inherits `pickerCtx?.disabled` and `pickerCtx?.readonly`. |
| `label` | `string \| undefined` | `undefined` | Accessible name (`aria-label`). Falls back to `rest["aria-label"]`, `rest["aria-labelledby"]`, or localized `"Pick color from screen"` / `"Farbe aus Bildschirm wählen"`. |
| `children` | `Snippet \| undefined` | `undefined` | Optional custom button content (e.g. `<ButtonIcon>` + `<ButtonLabel>`). Defaults to `iconOnly` with `<ButtonIcon icon={Pipette} />`. |

### Pick Result Propagation

On successful `EyeDropper.open()` resolution with `result.sRGBHex`:
1. Update `value = result.sRGBHex` (supporting standalone `bind:value`).
2. If `pickerCtx` is present, call `pickerCtx.setString(result.sRGBHex, { commit: true })`.
3. Invoke `onPick?.(result.sRGBHex)`.

### CSS Variables

- Inherits all `--cs-button-*` and `--cs-button-control-*` variables from `Button` (`--cs-button-bg`, `--cs-button-fg`, `--cs-button-height`, `--cs-button-shadow`, etc.).
- No module-specific CSS custom properties are required by default; `.cs-color-eye-dropper[data-picking]` can be styled cleanly via semantic tokens.

---

## 3. DOM, Semantics & Accessibility

### Composition Structure

```svelte
{#if shouldRender}
    <Button
        bind:ref
        {variant}
        {size}
        iconOnly={!children}
        disabled={effectiveDisabled}
        aria-disabled={isUnsupportedDisabled ? "true" : undefined}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        title={resolvedTitle}
        data-picking={picking ? "" : undefined}
        data-unsupported={supported === false ? "" : undefined}
        onclick={handleClick}
        {...rest}
        class={["cs-color-eye-dropper", className]}
    >
        {#if children}
            {@render children()}
        {:else}
            <ButtonIcon icon={Pipette} />
            {#if needsHitArea}
                <HitArea size="md" />
            {/if}
        {/if}
    </Button>
{/if}
```

> **Note on `Button` composition:** `Button` does not accept an `icon` prop; it composes `<ButtonIcon icon={Pipette} />` as a child and sets `iconOnly={!children}` so square proportions and `50%` icon sizing apply automatically in default icon-only mode.

### Native HTML & `data-*` Selectors

- **Element:** Native `<button type="button">` rendered by `Button` (`type="button"` is enforced after `{...rest}` so it never submits an enclosing `<form>`).
- **Selectors:**
  - `.cs-color-eye-dropper`
  - `[data-variant]`, `[data-size]`, `[data-icon-only]` (forwarded by `Button`)
  - `[data-picking]`: Present while the native `EyeDropper` dialog is open.
  - `[data-unsupported]`: Present when `unsupportedBehavior="disable"` and `EyeDropper` is unavailable.

### SSR-Safe Capability Detection & Hydration

- `let supported = $state<boolean | null>(null);`
- Check `isEyeDropperSupported()` **inside `$effect` on mount**, never at top-level or directly in the template:
  - During SSR and initial client hydration, `supported` is `null` (treated as not yet supported):
    - `unsupportedBehavior === "hide"` renders nothing on SSR and initial hydration, then mounts the button on Chromium clients without a hydration mismatch, and stays absent on Firefox/Safari.
    - `unsupportedBehavior === "disable"` renders the disabled button on SSR and initial hydration, then enables it on Chromium clients once `$effect` resolves `supported = true`.
- **Localized Unsupported Hint:** When `unsupportedBehavior === "disable"` and `supported !== true`, apply `t({ de: "Pipette wird in diesem Browser nicht unterstützt", en: "EyeDropper is not supported in this browser" })` to `title` (unless `rest.title` is provided) and expose `aria-disabled="true"` alongside `disabled`.

### `EyeDropper.open({ signal })` Lifecycle & `AbortController`

1. **Guard:** Return early if `effectiveDisabled`, `picking`, or `!isEyeDropperSupported()`.
2. **Start:** Create `const controller = new AbortController()`, store it in a non-reactive local reference, and set `picking = true`.
3. **Sample:** `const result = await new EyeDropper().open({ signal: controller.signal });`
4. **Error Handling:**
   - If `error instanceof DOMException && error.name === "AbortError"`, ignore silently (user pressed `Esc` or component aborted).
   - For any other error (e.g. `NotAllowedError` from missing user gesture or insecure context), invoke `onError?.(error)` without throwing an unhandled rejection.
5. **Cleanup (`finally` + `$effect`):**
   - Always reset `picking = false` and clear the active controller in `finally`.
   - In `$effect`, return a cleanup function that calls `activeController?.abort()` on unmount.
   - If `effectiveDisabled` becomes `true` while `picking` is active, immediately call `activeController?.abort()`.

### `ColorPickerContext` & Readonly/Disabled

- `effectiveDisabled = Boolean(disabled || pickerCtx?.disabled || pickerCtx?.readonly || (unsupportedBehavior === "disable" && supported !== true))`
- When `pickerCtx?.readonly` is `true`, `ColorEyeDropper` is disabled because picking a screen color mutates the active picker value.

---

## 4. Visual & Motion Contract

- **1:1 Parity with `Button`, `ColorInput`, and `ColorFormatSelect`:**
  - Heights (`28 / 32 / 36 / 40 / 44px` for `xs..xl`), `aspect-ratio: 1` (in `iconOnly` mode), squircle `corner-shape: var(--cs-squircle-soft)`, surface variants (`primary`, `secondary`, `tertiary`, `ghost`, `elevated`), `--cs-shadow-solid` / `--cs-shadow-solid-active`, focus-visible ring, and squash-and-stretch press physics are inherited directly from `Button` and `button-control.css`.
- **Hit Area:**
  - Compact `iconOnly` sizes `xs` (`28×28 = 784px²`), `sm` (`32×32 = 1024px²`), `md` (`36×36 = 1296px²`), and `lg` (`40×40 = 1600px²`) are below `1936px²` and render `<HitArea size="md" />` inside `Button`. `xl` (`44×44 = 1936px²`) meets the threshold natively.
  - When custom `children` are provided (`iconOnly` is `false`), `<HitArea />` is omitted unless the consumer supplies it.
- **Picking State (`[data-picking]`):**
  - While the native eye-dropper cursor is active, `[data-picking]` keeps clear visual feedback (e.g. subtle accent foreground/surface emphasis on non-primary variants) using semantic `--cs-color-accent-soft*` tokens and `--cs-dur-effect` / `--cs-ease-effect` transitions.

---

## 5. Edge Cases & Constraints

- **TypeScript `EyeDropper` Typing:** `window.EyeDropper` is not included in all TypeScript `lib.dom.d.ts` configurations. Define a narrow local/internal `EyeDropperConstructor` interface (`open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }>`) without `any` or `!` non-null assertions.
- **User Gesture & Secure Context:** `EyeDropper.open()` requires a secure context (`https://` or `localhost`) and transient user activation (direct click/keyboard activation). Do not invoke it programmatically from effects.
- **Event Handler Forwarding:** If the consumer passes `onclick` via `{...rest}`, ensure `handleClick` invokes `rest.onclick?.(event)` (or compose before calling `open()` so `event.defaultPrevented` can cancel if needed, while preserving transient user activation).
- **Reduced Motion:** Handled globally by foundation CSS and `Button`.
