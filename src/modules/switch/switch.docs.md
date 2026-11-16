---
name: Switch
kind: component
import: cs/svelte/switch
exports:
  - Switch
  - SWITCH_SIZES
  - SwitchSize
  - SwitchProps
---

# Switch

## Overview
Native `<input type="checkbox" role="switch">` toggle control for binary on/off settings, styled as a squircle-rounded `soft` track with a pure-CSS tactile pill thumb.

## API

### `Switch` Props
Extends `Omit<HTMLInputAttributes, "size" | "type" | "role">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `SwitchSize` | Yes | — | T-shirt size: `"xs"` (`14px × 26px`), `"sm"` (`18px × 34px`), `"md"` (`22px × 42px`), `"lg"` (`26px × 48px`), `"xl"` (`30px × 56px`). |
| `checked` | `boolean` | No | `undefined` | `$bindable` checked state. Supports `bind:checked` and `bind:checked={get, set}`. |
| `onCheckedChange` | `(checked: boolean) => void` | No | `undefined` | Fires with the next checked state after `onchange` only when the resolved value changes. |
| `ref` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the `<input>` element. |

### `data-*` Attributes
- `data-size={size}`

### CSS Custom Properties
Overridable on `.cs-switch`:

- `--cs-switch-bg` (default: `var(--cs-color-base-soft)`)
- `--cs-switch-bg-hover` (default: `var(--cs-color-base-soft-hover)`)
- `--cs-switch-bg-checked` (default: `var(--cs-color-accent-solid)`)
- `--cs-switch-bg-checked-hover` (default: `var(--cs-color-accent-solid-hover)`)
- `--cs-switch-shadow` (default: `none`; `var(--cs-shadow-solid)` when `:checked`)
- `--cs-switch-shadow-hover` (default: `none`; `var(--cs-switch-shadow)` when `:checked`)
- `--cs-switch-radius` (default: `calc(var(--cs-switch-height) / 2)`)
- `--cs-switch-height` (set per `data-size`)
- `--cs-switch-width` (set per `data-size`)
- `--cs-switch-pad` (set per `data-size`)
- `--cs-switch-thumb-width` (set per `data-size`)
- `--cs-switch-thumb-radius` (default: `max(0px, calc(var(--cs-switch-radius) - var(--cs-switch-pad)))`, concentric thumb corner radius)
- `--cs-switch-thumb-bg` (default: `#fff`; `light-dark(rgb(255 255 255 / 0.75), rgb(255 255 255 / 0.5))` when `:disabled`)
- `--cs-switch-thumb-shadow` (default: `0 1px 3px rgb(0 0 0 / 0.18), 0 1px 1px rgb(0 0 0 / 0.08)`)
- `--cs-switch-thumb-dur` (default: `var(--cs-dur-180)`)
- `--cs-switch-thumb-ease` (default: `var(--cs-ease-quart-out)`)
- `--cs-switch-thumb-x` (computed thumb travel distance)
- `--cs-switch-dir` (`1` in LTR, `-1` under `:dir(rtl)`)

## Examples

```svelte
<script lang="ts">
    import { Switch } from "cs/svelte/switch";

    let checked = $state(false);
</script>

<label class="inline-flex items-center gap-3 select-none">
    <Switch size="md" bind:checked />
    <span>Enable notifications</span>
</label>
```

```svelte
<!-- Disabled states -->
<Switch size="md" disabled />
<Switch size="md" checked disabled />
```

```svelte
<!-- Controlled getter/setter with change callback -->
<script lang="ts">
    import { Switch } from "cs/svelte/switch";

    let locked = $state(false);
    let enabled = $state(true);
</script>

<label class="inline-flex items-center gap-3 select-none">
    <Switch
        size="md"
        bind:checked={
            () => enabled,
            (next) => {
                if (!locked) enabled = next;
            }
        }
        onCheckedChange={(next) => console.log("checked:", next)}
    />
    <span>Auto-save</span>
</label>
```

## Behavior & Quirks
- **`$bindable()` pitfall (`checked={fn()}`):** Never pass a non-bound expression (e.g. `checked={isEnabled()}`) to `checked`. Because `checked` is declared with `$bindable()` and mutated internally on toggle, passing a non-bound expression passes `svelte-check` without warning but throws a Svelte 5 runtime error **even if `onCheckedChange` is also passed**. When controlling state via a getter/setter or external store, you MUST use `bind:checked={getter, setter}` (shown above) or `bind:checked={() => current, () => {}}` paired with `onCheckedChange`, or `bind:checked={state}` for local `$state`. `Switch` has no `defaultChecked` prop; for uncontrolled mode, omit `checked` (optionally pairing with `onCheckedChange`).
- **Single-node native `<input>`:** Renders a single void `<input type="checkbox" role="switch" class="cs-switch">` with `appearance: none` and zero wrapper DOM. `type="checkbox"` and `role="switch"` are applied after `{...rest}` so native switch semantics cannot be overridden.
- **No `<HitArea />` (use `<label>` or a clickable row):** Because `<input>` is a void element, `<HitArea />` cannot be passed as a child, and `Switch` intentionally avoids wrapper DOM or pseudo-element hit-target expansion. Wrap `<Switch>` and its label in a `<label>` (or associate via `for`/`id`) or place it inside a clickable settings row to provide a full hit target.
- **Thumb slide motion & RTL support:** The `::after` thumb stays calm at rest (no `:active` stretch or press anticipation) and slides cleanly on toggle via compositor `translate` in `var(--cs-dur-180)` with `var(--cs-ease-quart-out)` across mouse, touch, and keyboard (`Space`) inputs, while track `background-color` and `box-shadow` transition with `var(--cs-dur-press)` and `var(--cs-ease-press)`. Horizontal travel flips automatically under `:dir(rtl)` via `--cs-switch-dir: -1`.
- **Single `soft` surface:** `Switch` omits a `variant` prop and always renders on `--cs-color-base-soft` (unchecked) / `--cs-color-accent-solid` (checked) so the white `#fff` thumb always maintains crisp contrast in Light Mode. Disabled state uses `--cs-color-disabled-bg` (unchecked) and `--cs-color-disabled-bg-strong` (checked) with `--cs-disabled-opacity: 1` and a dimmed thumb.
- **`SwitchGroup` integration:** When rendered inside `<SwitchGroup>` with a `value` prop (coerced via `String(value)`), `<Switch>` automatically registers as a group item and derives `checked`, `name`, and `disabled` from group context (with item-level `name` and `disabled` overriding/combining as documented in `switch-group.docs.md`).
- **Controlled `onchange` & `bind:checked` ordering:** `onchange` runs before `checked` and `onCheckedChange` sync so handlers can inspect or adjust `event.currentTarget.checked`. Afterward, `event.currentTarget.checked` is resynced to `Boolean(checked)` so the native DOM state stays aligned if a controlled `bind:checked={get, set}` rejects the change.
