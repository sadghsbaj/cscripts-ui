# CheckboxGroup — Blueprint

## 1. Overview & Scope
- **Kind:** `hybrid` (`CheckboxGroup` + `CheckboxGroupSelectAll` composite components backed by `src/shared/control-group/` reactive state and `Checkbox` integration)
- **Purpose:** Provide an unstyled, accessible form control group for multiple `<Checkbox>` items with shared `value` (`string[]`), `name`, `disabled`, and `invalid` propagation, plus an idiomatic `<CheckboxGroupSelectAll>` tri-state controller.
- **Boundaries:**
  - `src/modules/checkbox-group/` owns `CheckboxGroup.svelte`, `CheckboxGroupSelectAll.svelte`, `checkbox-group.context.ts`, `index.ts`, `CheckboxGroup.svelte.test.ts`, and `CheckboxGroup.preview.svelte`.
  - `src/modules/checkbox/` integrates optionally with `CheckboxGroup` via `checkbox-group.context.ts` while preserving 100% identical standalone behavior.
  - `src/shared/control-group/` remains the headless state engine (`createControlGroup`, `createControlGroupContext`); no changes to `shared/control-group` are required.

---

## 2. Public API

### Exports (`src/modules/checkbox-group/index.ts`)
- `CheckboxGroup` (`./CheckboxGroup.svelte`)
- `CheckboxGroupSelectAll` (`./CheckboxGroupSelectAll.svelte`)
- `getCheckboxGroupContext`, `setCheckboxGroupContext`, `hasCheckboxGroupContext` (re-exported from `./checkbox-group.context.ts`)
- Types: `CheckboxGroupProps`, `CheckboxGroupSelectAllProps`, `CheckboxGroupContext`

### Context Module (`src/modules/checkbox-group/checkbox-group.context.ts`)
- `CheckboxGroupContext`: alias/extension of `ControlGroupContext` (`value`, `name`, `disabled`, `invalid`, `hasRegisteredItems`, `isAllSelected`, `isIndeterminate`, `isSelected`, `setSelected`, `toggle`, `registerItem`, `toggleAll`, `setAllSelected`).
- Created via `createControlGroupContext<CheckboxGroupContext>()`.
- **Why a separate `checkbox-group.context.ts` file:** `CheckboxGroupSelectAll.svelte` imports `Checkbox` from `../checkbox/index.ts`, while `Checkbox.svelte` imports `getCheckboxGroupContext` / `hasCheckboxGroupContext`. Placing the context tuple in `checkbox-group.context.ts` (and re-exporting it from `checkbox-group/index.ts`) keeps the module graph a strict DAG and avoids circular barrel imports between `checkbox/index.ts` and `checkbox-group/index.ts`.

### `CheckboxGroupProps`
Extends `HTMLAttributes<HTMLDivElement>`:
- `ref?: HTMLDivElement | null` (`$bindable(null)`)
- `value?: string[]` (`$bindable([])`)
- `onValueChange?: (value: string[]) => void`
- `name?: string`
- `disabled?: boolean` (default `false`)
- `invalid?: boolean` (default `false`)

### Design Decision: No `variant` / `size` Props on `CheckboxGroup`
- `CheckboxProps` requires `variant` and `size` so standalone `<Checkbox>` usage is always type-safe.
- `CheckboxGroup` stays strictly state- and form-focused (matching `ToggleButtonGroup`, which does not provide default `variant`, `color`, or `size` to `ToggleButton`). Making `variant`/`size` optional on `CheckboxProps` would weaken standalone type-safety, and keeping them required on `Checkbox` means `CheckboxGroup` defaults would be redundant.

### `CheckboxGroupSelectAllProps`
Extends `Omit<CheckboxProps, "value" | "checked" | "onCheckedChange" | "indeterminate" | "onIndeterminateChange">`:
- `ref?: HTMLInputElement | null` (`$bindable(null)`)
- `variant: CheckboxVariant` (required)
- `size: CheckboxSize` (required)
- `disabled?: boolean`
- `invalid?: boolean`

### Select-All Design Decision (Comparison)
- **Option A — `<CheckboxGroupSelectAll>` sub-component (Chosen):**
  - Matches `cscripts-ui` compound conventions (`ToggleButtonGroupSeparator`, `ToggleButtonLabel`).
  - Completely avoids item-registration ambiguity: renders `<Checkbox>` without a `value` prop, so `<Checkbox>` never registers it as a group item and never inherits `group.name`.
  - Encapsulates Chromium's native `indeterminate` reset on click by calling `group.toggleAll()` and immediately syncing `event.currentTarget.checked = group.isAllSelected` and `event.currentTarget.indeterminate = group.isIndeterminate` inside `onchange` (before `Checkbox`'s `handleChange` reads them), preserving `Checkbox`'s `indeterminate <-> checked` SVG morph animation without a 1-frame flash.
- **Option B — `selectAll?: boolean` prop on `<Checkbox>` (Rejected):**
  - Pollutes standalone `CheckboxProps` with a group-only mode or forces a complex discriminated union onto every `<Checkbox>` call site.
- **Option C — Snippet context on `<CheckboxGroup>` (`children?: Snippet<[CheckboxGroupContext]>`) (Rejected):**
  - Forces render-prop boilerplate for common cases and pushes tri-state DOM synchronization onto consumers.

### `Checkbox` Integration (`src/modules/checkbox/Checkbox.svelte`)
- Reads optional context: `const group = hasCheckboxGroupContext() ? getCheckboxGroupContext() : undefined;`
- Item mode condition: `const isGroupItem = $derived(Boolean(group && value !== undefined));`
- When `isGroupItem` is `true`:
  - Registers via `$effect`: `group.registerItem({ value: () => String(value), disabled: () => Boolean(disabled) })`, returning the cleanup callback so dynamic mount/unmount and reactive `disabled` changes update `isAllSelected` / `isIndeterminate`.
  - Derives `checked` from `group.isSelected(String(value))` and `indeterminate` as `false`.
  - Resolves `name` as `name ?? group.name`.
  - On change: calls `onchange?.(event)`, commits `group.setSelected(String(value), event.currentTarget.checked)`, syncs `event.currentTarget.checked` to `group.isSelected(String(value))` (protecting controlled groups), and fires `onCheckedChange` if the committed state changed.
- When `group` is present (both items and `CheckboxGroupSelectAll`):
  - Derives `disabled` from `Boolean(disabled || group.disabled)`.
  - Derives `invalid` from `invalid ?? group.invalid`.
- When `group` is absent (or `value === undefined` without `CheckboxGroupSelectAll`):
  - Standalone `<Checkbox>` behaves 100% identically to its existing implementation (no DEV warning for missing `value` inside `CheckboxGroup`, since `<CheckboxGroupSelectAll>` legitimately renders `<Checkbox>` without `value`).

### CSS Variables
- None. `CheckboxGroup` and `CheckboxGroupSelectAll` introduce no `--cs-checkbox-group-*` custom properties.

---

## 3. DOM, Semantics & Accessibility
- **`CheckboxGroup.svelte`:**
  - Renders `<div bind:this={ref} role="group" {...rest} aria-disabled={disabled ? "true" : undefined} aria-invalid={invalid ? "true" : undefined} data-disabled={disabled ? "" : undefined} data-invalid={invalid ? "" : undefined} class={["cs-checkbox-group", className]}>`.
  - Consumers provide accessible labeling via `aria-label` or `aria-labelledby` through `...rest`.
- **`CheckboxGroupSelectAll.svelte`:**
  - Renders `<Checkbox>` with `class={["cs-checkbox-group-select-all", className]}`, `checked={group.isAllSelected}`, `indeterminate={group.isIndeterminate}`, `disabled={Boolean(disabled || group.disabled)}`, and `invalid={invalid ?? group.invalid}`.
  - Exposes native `<input type="checkbox">` semantics (`indeterminate` IDL property + `checked` state) and keyboard interaction (`Space`).
- **Keyboard & Focus:**
  - Native `<input type="checkbox">` tab order and `Space` toggle behavior are preserved with no custom roving tabindex.

---

## 4. Visual & Motion Contract
- **`CheckboxGroup.svelte` is strictly unstyled:**
  - No `<style>` block, no CSS file, and no layout, `display`, `flex`, or `gap` rules. Layout is entirely consumer-controlled (e.g. UnoCSS utilities or consumer CSS).
- **`CheckboxGroupSelectAll.svelte`:**
  - No `<style>` block; delegates all visual surface (`soft` / `elevated`), proportional `size` (`xs`–`xl`), and `indeterminate <-> checked` SVG path morphing (`160ms` quart-out) directly to `<Checkbox>`.

---

## 5. Edge Cases & Constraints
- **Controlled `value` rejection:** If a consumer uses controlled `value` + `onValueChange` and declines a change, syncing `event.currentTarget.checked` (and `.indeterminate` on `CheckboxGroupSelectAll`) from `group` state after `setSelected` / `toggleAll` prevents the native `<input>` from drifting out of sync.
- **Disabled / unregistered values:** Handled by `createControlGroup`: `toggleAll()` and `setAllSelected()` only affect registered enabled items and preserve any disabled or unregistered entries already present in `value`.
- **Empty group (`hasRegisteredItems === false`):** `isAllSelected` and `isIndeterminate` are both `false`; `toggleAll()` is a safe no-op.
- **Explicit non-goals:**
  - No built-in label/description/error-message wrapper components (left to consumer `<label>` / field composition).
  - No default `variant` / `size` context propagation to child `<Checkbox>` items.
  - No layout or orientation styling on `.cs-checkbox-group`.

---

## 6. Test & Preview Plan

### Unit / Component Tests (`src/modules/checkbox-group/CheckboxGroup.svelte.test.ts`)
- Root attributes: `role="group"`, `.cs-checkbox-group`, `...rest` / `class` forwarding, `aria-disabled` / `data-disabled`, `aria-invalid` / `data-invalid`.
- `$bindable` `value` and `onValueChange` updates when toggling items; controlled `value` rejecting updates keeps DOM `<input>.checked` synchronized.
- `name`, `disabled`, and `invalid` propagation from `CheckboxGroup` to items, including item-level `invalid={false}` override and per-item `disabled`.
- Dynamic item registration/unregistration and reactive `disabled` updates recalculating `isAllSelected` and `isIndeterminate`.
- `<CheckboxGroupSelectAll>` tri-state cycling (`unchecked -> checked`, `indeterminate -> checked`, `checked -> unchecked`), `data-morph` transition on `indeterminate <-> checked`, exclusion of disabled items, preservation of disabled/unregistered values in `value`, and non-inheritance of `group.name`.
- Standalone `<Checkbox>` coexistence (both with and without `value` outside `CheckboxGroup`).

### Playground Preview (`src/modules/checkbox-group/CheckboxGroup.preview.svelte`)
- Minimal preview using `PreviewHeader` and `PreviewSection` with simple UnoCSS stacking (`flex flex-col gap-*`, `flex items-center gap-*`) and `<label>` wrappers:
  1. Basic `CheckboxGroup` with `bind:value`, live selected values readout, and code block.
  2. `CheckboxGroupSelectAll` tri-state example (including a disabled item) and code block.
  3. `disabled` and `invalid` group states.
