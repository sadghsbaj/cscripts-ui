# Switch Blueprint (`cs/svelte/switch`)

## 1. Overview & Scope

- **Purpose:** Binary on/off toggle control for immediate settings and preferences, rendered as a styled native `<input type="checkbox" role="switch" />`.
- **Kind:** `component`
- **Module Path:** `src/modules/switch/`
- **Package Entry:** `cs/svelte/switch` (sole public barrel: `src/modules/switch/index.ts`)

### Architectural Boundaries
- **Single-Element Native Control:** Renders a single void `<input type="checkbox" role="switch" class="cs-switch" />` with `appearance: none` and zero wrapper DOM.
- **No `<HitArea />`:** Per `.agents/rules/design-and-tokens.md`, void `<input>` elements cannot contain children and must not be wrapped in container DOM or expanded via `40px`–`48px` pseudo-element hit areas. Callers provide large click targets by pairing `Switch` with a wrapping `<label>` or clickable settings row.
- **Why `::after` Instead of `Checkbox`'s Sibling `<svg>` + Anchor Positioning:**
  - `Checkbox` requires a sibling `<svg>` positioned via CSS Anchor Positioning (`anchor-name` / `position-anchor`) only because animated SVG `<path>` vectors (`check`, `dash`, `morph`) cannot live inside CSS `::after`.
  - `Switch`'s thumb is a pure geometric pill with no vector path drawing, so `.cs-switch::after` renders the thumb directly inside the single `<input>` host. This eliminates sibling DOM, avoids anchor-scroll drift, and works cleanly across modern Chromium, WebKit, and Gecko on `appearance: none` `<input>` elements.
- **Future `SwitchGroup` Compatibility (Out of Scope):**
  - `SwitchGroup` is explicitly out of scope for this module.
  - However, `Switch`'s prop contract (`value`, `name`, `disabled`, `checked = $bindable()`, `onCheckedChange`, `onchange` ordering) mirrors `Checkbox` so a future `SwitchGroup` context can integrate without breaking single-control callers.

---

## 2. Public API

### Exports (`src/modules/switch/index.ts`)
- `Switch` (Svelte component)
- `SWITCH_SIZES = ["xs", "sm", "md", "lg", "xl"] as const`
- `type SwitchSize = (typeof SWITCH_SIZES)[number]`
- `interface SwitchProps`

### Props (`SwitchProps`)
`SwitchProps extends Omit<HTMLInputAttributes, "size" | "type" | "role">`

| Prop | Type | Required | Default | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `SwitchSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | Yes | — | No default value (explicit at every call site per `architecture-and-apis.md`). |
| `checked` | `boolean` (`$bindable()`) | No | `undefined` | Supports `bind:checked` and `bind:checked={get, set}`. |
| `onCheckedChange` | `(checked: boolean) => void` | No | `undefined` | Fires after a user change only when the resolved checked state changes. |
| `ref` | `HTMLInputElement \| null` (`$bindable(null)`) | No | `null` | Bound to the root `<input>` element. |
| `...rest` | `HTMLInputAttributes` | No | — | Forwarded to `<input>`; `type="checkbox"` and `role="switch"` are enforced *after* `{...rest}`. |

**Explicit Omissions (per `switch.design.md`):**
- No `variant` prop (`Switch` is `soft`-only so the white thumb never renders on a white track in Light Mode).
- No `indeterminate` or `onIndeterminateChange` (switches are strictly binary).
- No `invalid` prop (boolean validation errors belong on `Checkbox`).

### CSS Custom Properties (`--cs-switch-*`)
Scoped on `.cs-switch` inside `@layer components.primitive`:
- **Geometry:** `--cs-switch-height`, `--cs-switch-width`, `--cs-switch-pad`, `--cs-switch-radius`, `--cs-switch-thumb-width`, `--cs-switch-dir`
- **Track Surfaces & Shadows:** `--cs-switch-bg`, `--cs-switch-bg-hover`, `--cs-switch-bg-checked`, `--cs-switch-bg-checked-hover`, `--cs-switch-shadow`, `--cs-switch-shadow-hover`
- **Thumb:** `--cs-switch-thumb-bg`, `--cs-switch-thumb-shadow`, `--cs-switch-thumb-x`
- **Motion:** `--cs-switch-thumb-dur`, `--cs-switch-thumb-ease`

---

## 3. DOM, Semantics & Accessibility

- **Root Element:** `<input bind:this={ref} {...rest} type="checkbox" role="switch" ... />`
  - `type="checkbox"` and `role="switch"` are placed *after* `{...rest}` so consumers cannot accidentally override native switch semantics.
  - `class={["cs-switch", className]}`
- **Data Attributes:**
  - `data-size={size}` (`"xs" | "sm" | "md" | "lg" | "xl"`)
- **Controlled / Uncontrolled & Event Ordering (Parity with `Checkbox`):**
  - One-way binding `checked={Boolean(checked)}` paired with a single `onchange={handleChange}` handler.
  - In `handleChange`:
    1. Capture `prevChecked = Boolean(checked)`.
    2. Invoke `onchange?.(event)` first so consumer handlers can inspect or adjust `event.currentTarget.checked` before state synchronization.
    3. Read `nextChecked = event.currentTarget.checked` and assign `checked = nextChecked`.
    4. Invoke `onCheckedChange?.(nextChecked)` only if `nextChecked !== prevChecked`.
  - **Bindable Safety:** Never mutate `checked` during mount or `$effect`; only write `checked` inside `handleChange` on actual user interaction so `bind:checked={get, set}` never receives spurious writes.
- **Keyboard, ARIA & Global Foundation:**
  - Native `<input type="checkbox" role="switch">` provides Space-key toggling, form submission participation, and native switch accessibility semantics (`aria-checked` state exposed via native checkedness) without extra ARIA attributes.
  - `cursor: default` (consistent with all non-link interactive controls).
  - Focus ring (`:focus-visible`), disabled cursor/interaction (`disabled.css`), and `prefers-reduced-motion` are inherited from `src/css/foundation/`—never duplicated inside the module.

---

## 4. Visual & Motion Contract

Referencing `src/modules/switch/switch.design.md` as the source of truth:

- **Shape & Squircle:**
  - Pill track (`border-radius: calc(var(--cs-switch-height) / 2)` or `9999px`) and pill thumb (`border-radius: 9999px`), both with `corner-shape: var(--cs-squircle-soft)` (`superellipse(1.2)`).
- **Size Scale (`xs`–`xl`, calibrated between `Checkbox` `12–28px` and `Button` `28–44px`):**
  - `xs`: Track `14px × 26px`, Pad `2px`, Thumb `10px × 14px`
  - `sm`: Track `18px × 34px`, Pad `2px`, Thumb `14px × 20px`
  - `md`: Track `22px × 42px`, Pad `2.5px`, Thumb `17px × 24px`
  - `lg`: Track `26px × 48px`, Pad `3px`, Thumb `20px × 28px`
  - `xl`: Track `30px × 56px`, Pad `3px`, Thumb `24px × 34px`
- **Track, Checked & Disabled Surfaces (`soft`-only):**
  - `Switch` is `soft`-only (no `variant` prop) so it never renders white-on-white in Light Mode: `--cs-switch-bg: var(--cs-color-base-soft)` and `--cs-switch-bg-hover: var(--cs-color-base-soft-hover)`.
  - `:checked`: `--cs-color-accent-solid` (`--cs-color-accent-solid-hover` on hover) with `--cs-shadow-solid` (1px top-lit inset highlight + subtle drop shadow).
  - **Thumb (`::after`):** Pure white (`#fff`) in active states, no top-lit inset highlight, crisp drop shadow (`0 1px 3px rgb(0 0 0 / 0.18), 0 1px 1px rgb(0 0 0 / 0.08)`).
  - `:disabled`: Uses `--cs-color-disabled-*` tokens (`--cs-disabled-opacity: 1`), matching `Checkbox` (`--cs-color-disabled-bg`, `--cs-color-disabled-bg-strong` when checked), with a subtly dimmed thumb.
- **Motion & Tactile Physics (Pure CSS):**
  - **No Track `:active` Shrink:** Per `switch.design.md`, press anticipation lives on the `::after` thumb rather than shrinking the track host, so no `::before` press-jitter guard is needed.
  - **Press Anticipation (`:active:not(:disabled)`):**
    - Thumb stretches `+14%` (`calc(var(--cs-switch-thumb-width) * 1.14)`) along the travel axis via `width` (preserving pill corner geometry without border-radius distortion).
    - **Edge-Anchored Expansion Mechanics (GPU `translate` + `--cs-switch-dir`):** Pin `inset-inline-start: var(--cs-switch-pad)` permanently and drive horizontal travel via `translate: calc(var(--cs-switch-thumb-x, 0px) * var(--cs-switch-dir)) 0` (flipping sign with `--cs-switch-dir: -1` under `:dir(rtl)`). On `:checked:active`, `--cs-switch-thumb-x` is `calc(var(--cs-switch-width) - var(--cs-switch-pad) * 2 - var(--cs-switch-thumb-width) * 1.14)`.
    - **Timing Lockstep:** `.cs-switch` sets `--cs-switch-thumb-dur: var(--cs-dur-280)` and `--cs-switch-thumb-ease: var(--cs-spring-snappy)`, which `::after` uses for `translate`. On `:active:not(:disabled)`, `--cs-switch-thumb-dur` and `--cs-switch-thumb-ease` are overridden to `var(--cs-dur-press)` and `var(--cs-ease-press)` so `translate` and `width` move in exact lockstep during `:checked:active` (zero right-edge wobble).
  - **Toggle / Release (`:checked` transition):**
    - Thumb glides across the track while settling back to its resting `width`.
    - Timing: `var(--cs-dur-280)` with `var(--cs-spring-snappy)` for `translate`, and `var(--cs-dur-press)` + `var(--cs-ease-press)` for `width` / `background-color` / `box-shadow` / `opacity`.

---

## 5. Edge Cases & Constraints

- **Browser Support:** Modern Chromium-first (`corner-shape`, CSS Nesting, `linear()` springs, `:dir(rtl)`). `appearance: none` `<input type="checkbox">` supports `::after` across modern Chromium, WebKit, and Gecko.
- **Subpixel / Odd-Pixel Padding:** `md` uses `2.5px` padding (`22px` height, `17px` thumb height). Calculating thumb `top: 50%; translate: 0 -50%` (or `inset-block: var(--cs-switch-pad)`) avoids vertical rounding drift across DPI scales.
- **Mount-Flush Transitions:** Unlike `Checkbox`'s async indeterminate morph, `Switch` has no JS-driven animation; initial render state is already at rest.
- **Explicit Non-Goals:**
  - `SwitchGroup` component or context (deferred to a separate composite module).
  - Indeterminate / tri-state support.
  - Validation `invalid` state.
  - Internal label/icon slots inside `Switch` (pair with `<label>` externally).

### Open Questions for Review
1. **Thumb Travel Property (`inset-inline-start` vs `translate`):** Prefer Option A (`inset-inline-start` for automatic RTL with zero `:dir(rtl)` selector) or Option B (`translate` + `--cs-switch-dir` for compositor-only travel)?
2. **Toggle Spring Curve:** Use the shared `var(--cs-spring-snappy)` (~4% overshoot) from `motion.css` for consistency, or define a scoped `--cs-switch-spring` (~8–10% overshoot) for a stronger physical detent feel?
