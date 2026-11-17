# NumberStepper — Architecture & Module Blueprint

## 1. Overview & Scope

- **Module:** `src/modules/number-stepper/` (`cs/svelte/number-stepper`)
- **Kind:** `component` (compound component suite)
- **Exports:** `NumberStepper`, `NumberStepperDecrement`, `NumberStepperIncrement`, `NumberStepperInput`, `NumberStepperValue`, context helpers (`getNumberStepperContext`, `setNumberStepperContext`, `hasNumberStepperContext`), option constants, and TypeScript types.
- **Purpose:** Provide a compact, tactile numeric stepper in three cohesive modes—editable center well (`NumberStepperInput`), clickable/morphable readout (`NumberStepperValue`), and icon-only pair (`Decrement` + `Increment`)—across horizontal and vertical orientations.

### Boundaries & Non-Goals

- **In Scope:** Compound stepper primitives, bounded/stepped numeric state (`value = $bindable()`), automatic boundary & whole-control disabling, `invalid` state, `middleClick` reset integration, keyboard/ARIA `spinbutton` & `group` semantics, vertical mode enforcement (runtime + ESLint), and `--cs-number-stepper-*` styling hooks.
- **Out of Scope:**
  - Bundling or hard-importing `@number-flow/svelte` / `cs/svelte/number-morph` (handled via opt-in composition in `NumberStepperValue`).
  - Toolbar layout wrappers (preset segmented controls, external Reset text buttons, or tooltips—those compose around `NumberStepper` at the app/pattern level).
  - Non-numeric / arbitrary string stepping or slider/scrubber drag-to-scrub gestures.

---

## 2. Public API

### File Layout (`src/modules/number-stepper/`)

- `index.ts` — Sole public barrel (components, context helpers, `NUMBER_STEPPER_*` constants, TypeScript types).
- `number-stepper.context.ts` — Typed Svelte 5 `createContext()` helper (`NumberStepperContext`).
- `NumberStepper.svelte` — Root container, numeric state/clamping/reset logic, context provider, and shared track/separator CSS.
- `NumberStepperDecrement.svelte` — Decrement `<button type="button">` subpart.
- `NumberStepperIncrement.svelte` — Increment `<button type="button">` subpart.
- `NumberStepperInput.svelte` — Editable center-well `<label>` + `<input>` subpart (horizontal only).
- `NumberStepperValue.svelte` — Read-only / click-to-reset readout subpart (horizontal only).
- `number-stepper.docs.md` — Module documentation (including `NumberMorph` composition example).
- `NumberStepper.preview.svelte` — Interactive playground preview.
- `NumberStepper.svelte.test.ts` — Vitest + `happy-dom` unit tests.

### Required Visual & Layout Props (No Defaults)

All three props on `NumberStepper` are **required** with no default values, forcing explicit choices at every call site:

```ts
export const NUMBER_STEPPER_VARIANTS = ["soft", "elevated"] as const;
export const NUMBER_STEPPER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const NUMBER_STEPPER_ORIENTATIONS = ["horizontal", "vertical"] as const;

export type NumberStepperVariant = (typeof NUMBER_STEPPER_VARIANTS)[number];
export type NumberStepperSize = (typeof NUMBER_STEPPER_SIZES)[number];
export type NumberStepperOrientation = (typeof NUMBER_STEPPER_ORIENTATIONS)[number];
```

### Component Props

#### `NumberStepper`
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `NumberStepperVariant` (`"soft" \| "elevated"`) | Yes | — | Track surface treatment. |
| `size` | `NumberStepperSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | Yes | — | T-shirt height/scale (`28px`–`44px`). |
| `orientation` | `NumberStepperOrientation` (`"horizontal" \| "vertical"`) | Yes | — | Layout axis; `"vertical"` restricts children to icon-only buttons. |
| `value` | `number` (`$bindable()`) | No | `0` | Current numeric value (required for stateful steppers; optional for pure icon-only action pairs). |
| `min` | `number` | No | `undefined` | Lower clamp bound; disables `NumberStepperDecrement` when `value <= min`. |
| `max` | `number` | No | `undefined` | Upper clamp bound; disables `NumberStepperIncrement` when `value >= max`. |
| `step` | `number` | No | `1` | Step increment/decrement delta (decimal precision normalized). |
| `defaultValue` | `number` | No | `undefined` | Reset target for middle-click (and normal click on `NumberStepperValue`). |
| `onValueChange` | `(value: number) => void` | No | `undefined` | Fired when user interaction changes `value` to a different clamped number. |
| `disabled` | `boolean` | No | `false` | Disables the entire stepper and all subparts. |
| `invalid` | `boolean` | No | `false` | Marks the stepper invalid (negative ring on `NumberStepperInput`, `aria-invalid`). |
| `ref` | `HTMLDivElement \| null` (`$bindable()`) | No | `null` | Root `<div>` element reference. |
| `children` | `Snippet` | No | `undefined` | Compound subparts. |

#### `NumberStepperDecrement` & `NumberStepperIncrement`
Extend `Omit<HTMLButtonAttributes, "type">`:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `icon` | `Component<NumberStepperIconComponentProps>` | No | `Minus` / `Plus` | Optional icon component override (e.g. `ZoomOut`, `ChevronLeft`). |
| `disabled` | `boolean` | No | `false` | Per-button disabled override (combined with root `disabled` and `min`/`max` boundary). |
| `ref` | `HTMLButtonElement \| null` (`$bindable()`) | No | `null` | Button element reference. |
| `children` | `Snippet` | No | `undefined` | Optional custom icon content (takes precedence over default `Minus`/`Plus` when provided). |

#### `NumberStepperInput` (Horizontal Only)
Extends `Omit<HTMLInputAttributes, "size" | "value" | "children" | "type">`:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prefix` | `string` | No | `undefined` | Static unit/symbol before the `<input>` (e.g. `"$"`). |
| `suffix` | `string` | No | `undefined` | Static unit/symbol after the `<input>` (e.g. `"%"`, `"px"`). |
| `disabled` | `boolean` | No | `false` | Per-input disabled override (combined with root `disabled`). |
| `readonly` | `boolean` | No | `false` | Makes the `<input>` read-only while keeping stepper buttons active. |
| `ref` | `HTMLInputElement \| null` (`$bindable()`) | No | `null` | Reference to the underlying `<input>`. |

#### `NumberStepperValue` (Horizontal Only)
Extends `HTMLAttributes<HTMLElement>` (renders `<button type="button">` when `defaultValue !== undefined`, otherwise `<span>`):

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prefix` | `string` | No | `undefined` | Static prefix for default plain-text rendering. |
| `suffix` | `string` | No | `undefined` | Static suffix for default plain-text rendering. |
| `format` | `Intl.NumberFormatOptions` | No | `undefined` | Optional `Intl.NumberFormat` options for default plain-text rendering. |
| `locales` | `Intl.LocalesArgument` | No | `undefined` | Locale(s) for `Intl.NumberFormat`. |
| `ref` | `HTMLElement \| null` (`$bindable()`) | No | `null` | Reference to the rendered `<button>` or `<span>`. |
| `children` | `Snippet` | No | `undefined` | Optional custom content (e.g. `<NumberMorph />`). |

### Context (`number-stepper.context.ts`)

Shared via `createContext<NumberStepperContext>()`:
- Readonly getters: `value`, `min`, `max`, `step`, `defaultValue`, `variant`, `size`, `orientation`, `disabled`, `invalid`, `canDecrement`, `canIncrement`.
- Actions: `decrement()`, `increment()`, `stepBy(delta: number)`, `commitValue(next: number)`, `reset()`.

### CSS Custom Properties (`--cs-number-stepper-*`)

- `--cs-number-stepper-height` (`28px`–`44px` by `size`)
- `--cs-number-stepper-bg`, `--cs-number-stepper-bg-hover`
- `--cs-number-stepper-fg`, `--cs-number-stepper-fg-strong`
- `--cs-number-stepper-shadow`
- `--cs-number-stepper-radius` (`calc(var(--cs-number-stepper-height) / 2)`)
- `--cs-number-stepper-sep-color`
- `--cs-number-stepper-well-bg`, `--cs-number-stepper-well-bg-hover`, `--cs-number-stepper-well-shadow`
- `--cs-number-stepper-ring-shadow`
- `--cs-number-stepper-icon-size`, `--cs-number-stepper-value-min-width`

---

## 3. Architectural Decisions

### Three Modes & Vertical Constraint

1. **Horizontal + Editable Input:** `Decrement` + `NumberStepperInput` + `Increment`
   - Center well sits inside the outer track with inverted surface contrast (`soft` outer -> `elevated` inner well; `elevated` outer -> `soft` inner well), styled optically like `TextInput` (`2px` `accent-solid` focus-within ring, `negative-solid` invalid ring).
   - No hairline separators are rendered when `NumberStepperInput` is present (CSS `:has(.cs-number-stepper-input-shell)`).
2. **Horizontal + Read-Only / Morphing Value:** `Decrement` + `NumberStepperValue` + `Increment`
   - Flat pill track with CSS-only hairline separators (`::before`) between adjacent segments that fade to `opacity: 0` on `:hover`, `:active`, or `:focus-visible`.
   - Clicking or middle-clicking `NumberStepperValue` resets `value` to `defaultValue` when `defaultValue !== undefined`.
3. **Icon-Only (Horizontal or Vertical):** `Decrement` + `Increment` (no middle element)
   - Flat track with a single hairline separator between the two buttons.
   - In `orientation="vertical"`, `NumberStepperIncrement` is placed on top and `NumberStepperDecrement` on bottom.
4. **Enforcing the Vertical Constraint (`orientation="vertical"` forbids middle value/input):**
   - **Runtime Context Guard:** `NumberStepperValue` and `NumberStepperInput` read `ctx.orientation` and throw a descriptive `Error` if `ctx.orientation === "vertical"`.
   - **Dedicated ESLint Rule (`src/eslint/rules/number-stepper.ts`):** Static AST check (`number-stepper/no-middle-in-vertical`) inspects `<NumberStepper orientation="vertical">` and reports an error if `<NumberStepperValue>` or `<NumberStepperInput>` appears as a descendant. (The rule can also validate `NumberStepper` structure—e.g. discouraging raw Lucide icons directly inside `NumberStepper` outside `Decrement`/`Increment`.)

### `NumberMorph` Integration Analysis

`cs/svelte/number-morph` wraps `@number-flow/svelte`, which is an **optional** `peerDependency` of `cs`. Per `.agents/rules/architecture-and-apis.md`, modules must also avoid cross-module internal coupling.

- **Option A — Direct internal import in `NumberStepperValue` (and/or focus-swap in `NumberStepperInput`):**
  - *Pros:* Automatic digit morphing on `<NumberStepperValue />` with zero extra markup.
  - *Cons:*
    1. **Breaks `@number-flow/svelte` optionality:** Importing `cs/svelte/number-stepper` for *any* mode (even icon-only or `NumberStepperInput`) would pull `@number-flow/svelte` into the module graph and fail to build in apps that did not install `@number-flow/svelte`.
    2. **Cross-module coupling:** Hard-couples `number-stepper` to `number-morph`.
    3. **Input focus-swap hazards:** Swapping `<input>` for `<NumberMorph>` on blur and back on focus causes click-to-caret-position loss, selection glitches (`select()` on focus), screen-reader role thrashing (`spinbutton` ↔ `img`), and width jitter between Shadow DOM and `<input>`.
- **Option B — Decoupled Composition (`children` snippet in `NumberStepperValue`) [RECOMMENDED]:**
  - `<NumberStepperValue />` renders a crisp `tabular-nums` plain-text value by default (zero dependency on `@number-flow/svelte`).
  - Consumers who want digit-rolling morphs compose `<NumberMorph>` directly inside `<NumberStepperValue>`:
    ```svelte
    <NumberStepper variant="soft" size="md" orientation="horizontal" defaultValue={100} bind:value={zoom}>
        <NumberStepperDecrement />
        <NumberStepperValue>
            <NumberMorph value={zoom} suffix="%" willChange />
        </NumberStepperValue>
        <NumberStepperIncrement />
    </NumberStepper>
    ```
  - `NumberStepperValue` wraps its content in `.cs-number-stepper-value-text` (`tabular-nums`, `:active` press scale `0.93`), so `<NumberMorph>` inherits typography, color, and tactile press physics seamlessly.
  - *Cons:* Slightly more verbose when morphing is desired; no automatic morph on `NumberStepperInput` blur (which is also cleaner for input ergonomics).

### Numeric, Precision & Reset Semantics

- **Stepping & Clamping:**
  - `stepBy(delta)` computes `next = value + delta`, normalizes floating-point drift to `max(decimals(step), decimals(min ?? 0))`, clamps to `[min, max]`, updates `value`, and fires `onValueChange?.(clamped)` only if `clamped !== value`.
  - `NumberStepperDecrement` calls `stepBy(-step)`; `NumberStepperIncrement` calls `stepBy(+step)`.
- **Input Commit (`NumberStepperInput`):**
  - `onfocus`: calls `e.currentTarget.select()` for rapid numeric replacement.
  - While typing: keeps raw draft string un-clamped so users can type intermediate numbers (e.g. clearing digits or typing `-`).
  - On `onchange`, `onblur`, or `Enter`: parses numeric input, snaps/clamps to `[min, max]`, reverts display to `String(value)` if empty/NaN, and commits via `commitValue()`.
  - On `Escape`: discards uncommitted draft and restores `String(value)`.
- **Reset (`defaultValue` + `middle-click`):**
  - `middleClick` attachment (`src/modules/middle-click/`) is attached to `NumberStepperValue` and `NumberStepperInput` when `defaultValue !== undefined` and not `disabled`.
  - On `NumberStepperValue` (non-input mode), primary `click` also resets `value` to `defaultValue` (matching `NumberStepperLab.svelte`).
  - On `NumberStepperInput`, primary `click` focuses/edits the `<input>`, while middle-click resets `value` to `defaultValue` without stealing focus.

---

## 4. DOM, Semantics & Accessibility

- **Root (`NumberStepper`):**
  - `<div role="group" class={["cs-number-stepper", className]} data-variant={variant} data-size={size} data-orientation={orientation} data-disabled={disabled ? "" : undefined} data-invalid={invalid ? "" : undefined} aria-disabled={disabled ? "true" : undefined}>`
- **Buttons (`NumberStepperDecrement` / `NumberStepperIncrement`):**
  - `<button type="button">` with built-in localized default `aria-label` via `t({ de, en })` (e.g., `Decrease` / `Increase`), overridable via `{...rest}`.
  - Automatically sets `disabled={ctx.disabled || localDisabled || atBoundary}`.
- **Editable Input (`NumberStepperInput`):**
  - `<label class="cs-number-stepper-input-shell">` wrapping `<input type="text" inputmode={hasDecimalStep ? "decimal" : "numeric"} role="spinbutton" aria-valuenow={ctx.value} aria-valuemin={ctx.min} aria-valuemax={ctx.max} aria-invalid={ctx.invalid ? "true" : undefined} />` plus optional affix `<span>` (`aria-hidden="true"`).
  - Keyboard on `<input>`: `ArrowUp` (`+step`), `ArrowDown` (`-step`), `Home` (`min` if finite), `End` (`max` if finite), `Enter` (commit & blur), `Escape` (revert).
- **Read-Only Value (`NumberStepperValue`):**
  - Renders `<button type="button" aria-label={...}>` when `defaultValue !== undefined` (supporting `Enter`/`Space` reset and `ArrowUp`/`ArrowRight`/`ArrowDown`/`ArrowLeft` stepping), or `<span role="status" aria-live="polite">` (or plain `<span>`) when `defaultValue === undefined`.

---

## 5. Visual & Motion Contract

- **Surface & Shape:**
  - `variant="soft"`: `--cs-color-base-soft` track, `--cs-color-base-soft-hover` button hover, `--cs-shadow: none`.
  - `variant="elevated"`: `--cs-color-elevated` track with `--cs-shadow-elevated`; hover uses `light-dark(...)` calibrated tint.
  - Pill geometry: `border-radius: calc(var(--cs-number-stepper-height) / 2)` with `corner-shape: var(--cs-squircle-soft)`.
  - Center well (`NumberStepperInput`): `padding: 4px` inset pill (`border-radius: calc((height - 8px) / 2)`), `cursor: text`, `tabular-nums`, `caret-color: var(--cs-color-accent-solid)`.
- **Size Scale (`xs`..`xl`, 1:1 with `Button` & `TextInput`):**
  - `xs`: `28px` (`--cs-text-xs`, icon `14px`, value min-w `42px`)
  - `sm`: `32px` (`--cs-text-xs`, icon `14px`, value min-w `46px`)
  - `md`: `36px` (`--cs-text-sm`, icon `16px`, value min-w `52px`)
  - `lg`: `40px` (`--cs-text-sm`, icon `17px`, value min-w `58px`)
  - `xl`: `44px` (`--cs-text-base`, icon `18px`, value min-w `64px`)
- **Disabled States:**
  - Whole stepper `data-disabled`: uses semantic colorless `--cs-color-disabled-*` tokens (`--cs-disabled-opacity: 1`).
  - Single boundary-disabled button (`value <= min` or `value >= max`): dims icon/fg to `--cs-color-disabled-fg` and suppresses hover/press feedback while keeping the track intact.
- **Motion:**
  - Button icon press: `scale: 0.88` (`--cs-dur-press` / `--cs-ease-press`), release with `--cs-dur-effect` / `--cs-ease-effect`.
  - `NumberStepperValue` press: `scale: 0.93` (`--cs-dur-press` / `--cs-ease-press`), release with `--cs-dur-squash` / `--cs-ease-squash`.
  - Hairline separator hover/focus fade: `--cs-dur-effect` / `--cs-ease-effect`.
  - Input well focus/invalid ring: `--cs-dur-120` / `--cs-ease-quart-out`.

---

## 6. Edge Cases & Constraints

- **HitArea Tight-Layout Exception:** Individual stepper segments (`28px`–`44px`, `784px²`–`1936px²`) sit flush edge-to-edge inside a shared pill. `<HitArea />` is intentionally omitted on segments to prevent overlapping hitboxes from stealing clicks from adjacent segments/well.
- **Modern Chromium-First:** Uses CSS `:has()`, CSS Nesting, `light-dark()`, `color-mix(in oklab, ...)`, and `corner-shape: var(--cs-squircle-soft)`.
- **Icon-Only Action Pairs:** When `NumberStepper` is used purely as a stateless icon pair (e.g. prev/next chevrons), `value` can be omitted and `onclick` handlers attached directly to `NumberStepperDecrement` / `NumberStepperIncrement` (with `min`/`max` omitted so buttons stay enabled).

---

## 7. Open Questions for User

1. **`NumberMorph` Integration:** Confirm **Option B** (compose `<NumberMorph>` inside `<NumberStepperValue>` to preserve `@number-flow/svelte` optionality and avoid cross-module coupling) vs. Option A (built-in import).
2. **Prop Name for Reset Target:** Confirm `defaultValue?: number` (standard HTML/UI convention) vs. `resetValue?: number`.
3. **Repeat-on-Hold:** Should `Decrement`/`Increment` fire single-step on `click` only (matching `NumberStepperLab.svelte`), or also support an opt-in `repeat?: boolean` prop for press-and-hold auto-stepping?
4. **Tab Order in Input Mode:** When `NumberStepperInput` is present, should `Decrement` and `Increment` stay in the normal `Tab` order (default `<button>`) or use `tabindex="-1"` (WAI-ARIA spinbutton convention, relying on `ArrowUp`/`ArrowDown` on the input)?
5. **Input Width Sizing:** Should `NumberStepperInput` auto-size or default to a compact `min-width` (`3ch`–`4ch` / `--cs-number-stepper-well-min-width`) with CSS override support for wider numbers (e.g. `10000` vs `16px`)?
