# SwitchGroup — Blueprint

## 1. Overview & Scope
- **Kind:** `hybrid` (`SwitchGroup` composite component — plus optional `SwitchGroupSelectAll` master switch — backed by `src/shared/control-group/` reactive state and `Switch` integration)
- **Purpose:** Provide an unstyled, accessible form control group for multiple `<Switch>` items with shared `value` (`string[]` / `T[]`), `name`, and `disabled` propagation.
- **Boundaries:**
  - `src/modules/switch-group/` owns `SwitchGroup.svelte`, `switch-group.context.ts`, `index.ts`, `SwitchGroup.svelte.test.ts`, `SwitchGroup.preview.svelte`, `switch-group.docs.md`, and (if included) `SwitchGroupSelectAll.svelte`.
  - `src/modules/switch/` (`Switch.svelte`, `index.ts`) integrates optionally with `SwitchGroup` via `switch-group.context.ts` while preserving 100% identical standalone behavior.
  - `src/shared/control-group/` remains the headless state engine (`createControlGroup`, `createControlGroupContext`); no changes to `shared/control-group` are required.

---

## 2. Public API

### Exports (`src/modules/switch-group/index.ts`)
- `SwitchGroup` (`./SwitchGroup.svelte`)
- `SwitchGroupSelectAll` (`./SwitchGroupSelectAll.svelte`) — *pending decision; see [SwitchGroupSelectAll Trade-Off](#switchgroupselectall-trade-off) & [Open Questions](#6-open-questions)*
- `getSwitchGroupContext`, `setSwitchGroupContext`, `hasSwitchGroupContext` (re-exported from `./switch-group.context.ts`)
- Types: `SwitchGroupProps`, `SwitchGroupContext` (and `SwitchGroupSelectAllProps` if included)

### Context Module (`src/modules/switch-group/switch-group.context.ts`)
- `SwitchGroupContext`: alias of `ControlGroupContext` (`value`, `name`, `disabled`, `invalid`, `hasRegisteredItems`, `isAllSelected`, `isIndeterminate`, `isSelected`, `setSelected`, `toggle`, `registerItem`, `toggleAll`, `setAllSelected`).
- Created via `createControlGroupContext<SwitchGroupContext>()`.
- **Why a separate `switch-group.context.ts` file:** `Switch.svelte` imports `getSwitchGroupContext` / `hasSwitchGroupContext`, while `SwitchGroupSelectAll.svelte` (and previews/tests) import `Switch` from `../switch/index.ts`. Placing the context tuple in `switch-group.context.ts` and re-exporting it from `switch-group/index.ts` keeps the module graph a strict DAG and avoids circular barrel imports between `switch/index.ts` and `switch-group/index.ts`.

### `SwitchGroupProps<T extends string = string>`
Extends `HTMLAttributes<HTMLDivElement>`:
- `ref?: HTMLDivElement | null` (`$bindable(null)`)
- `value?: T[]` (`$bindable([])`) — Bindable array of selected item values. Supports `bind:value` and `bind:value={get, set}`.
- `onValueChange?: (value: T[]) => void` — Fires with the next selected values array when an item (or master switch) changes.
- `name?: string` — Shared form field name propagated to child `<Switch>` items.
- `disabled?: boolean` (default `false`) — Disables the group and all child `<Switch>` items.

> **Difference from `CheckboxGroupProps`:** `SwitchGroupProps` omits `invalid` because `Switch` is a binary settings toggle without an `invalid` prop or `[aria-invalid="true"]` visual state. `createControlGroup` receives no `invalid` getter (defaulting `group.invalid` to `false`).

### Design Decision: No `variant` or `size` Props on `SwitchGroup`
- `Switch` intentionally has no `variant` prop (single `soft` surface).
- `SwitchProps` requires `size: SwitchSize` (`"xs" | "sm" | "md" | "lg" | "xl"`) so standalone `<Switch>` usage is always type-safe.
- Matching `CheckboxGroup` and `ToggleButtonGroup`, `SwitchGroup` stays strictly state- and form-focused and does **not** accept or propagate `size`. Making `size` optional on `SwitchProps` would weaken standalone type-safety, and keeping it required on `Switch` makes a group-level `size` default redundant. *(Flagged in [Open Questions](#6-open-questions) in case `size` inheritance is preferred.)*

### `Switch` Integration (`src/modules/switch/Switch.svelte` & `src/modules/switch/index.ts`)
- `SwitchProps` continues to extend `Omit<HTMLInputAttributes, "size" | "type" | "role">`, inheriting `value` from `HTMLInputAttributes` (coerced with `String(value)` when `value !== undefined`, matching `Checkbox`).
- Reads optional context: `const group = hasSwitchGroupContext() ? getSwitchGroupContext() : undefined;`
- Item mode condition: `const isGroupItem = $derived(Boolean(group && value !== undefined));`
- When `isGroupItem` is `true`:
  - Registers via `$effect`: `group.registerItem({ value: () => String(value), disabled: () => Boolean(disabled) })`, returning the cleanup callback so dynamic mount/unmount and reactive `disabled` changes update `isAllSelected`.
  - Derives `checked` from `group.isSelected(String(value))`.
  - Resolves `name` as `name ?? group.name`.
  - Resolves `disabled` as `Boolean(disabled || group.disabled)`.
  - On change (`handleChange`):
    1. Captures `prevChecked = resolvedChecked`.
    2. Calls `onchange?.(event)`.
    3. Commits `group.setSelected(String(value), event.currentTarget.checked)`.
    4. Reads `committedChecked = group.isSelected(String(value))`.
    5. Syncs `event.currentTarget.checked = committedChecked` (protecting controlled `bind:value={get, set}` groups).
    6. Fires `onCheckedChange?.(committedChecked)` if `committedChecked !== prevChecked`.
    7. Returns early without mutating standalone `checked`.
- When `group` is present without `value` (e.g. `SwitchGroupSelectAll`):
  - Resolves `disabled` as `Boolean(disabled || group.disabled)` and does **not** register as a group item or inherit `group.name`.
- When `group` is absent:
  - Standalone `<Switch>` behaves 100% identically to its current implementation.

### `SwitchGroupSelectAll` Trade-Off
Unlike `Checkbox`, `Switch` intentionally has **no `indeterminate` state** (`role="switch"` only supports binary `checked` = `true` | `false`; `aria-checked="mixed"` is invalid for `role="switch"`).

- **Option A — Include `<SwitchGroupSelectAll>` as a binary master switch (Recommended for parity & settings UX):**
  - Renders `<Switch>` without `value` (so it never registers as a group item and never inherits `group.name`).
  - `SwitchGroupSelectAllProps` extends `Omit<SwitchProps, "value" | "name" | "checked" | "onCheckedChange">` with `ref?: HTMLInputElement | null` and `size: SwitchSize` (required).
  - `checked` binds to `group ? group.isAllSelected : false` (all enabled items on → `true`; none or partial → `false`).
  - `onchange` calls `group.toggleAll()` and immediately syncs `event.currentTarget.checked = group.isAllSelected` (before `Switch`'s `handleChange` reads it, keeping controlled groups synchronized).
  - Matches standard OS/settings master-switch behavior (toggling ON when partial enables all remaining items; toggling OFF when all are on disables all items).
- **Option B — Defer / Omit `SwitchGroupSelectAll`:**
  - Avoids any potential ambiguity from a partial selection appearing visually identical to "all off" (`checked={false}`).
  - Consumers needing a master switch compose one manually using `getSwitchGroupContext()` or `SwitchGroup` `value`.

### CSS Variables
- None. `SwitchGroup` (and `SwitchGroupSelectAll`, if included) introduce no `--cs-switch-group-*` custom properties.

---

## 3. DOM, Semantics & Accessibility
- **`SwitchGroup.svelte`:**
  - Renders `<div bind:this={ref} role="group" {...rest} aria-disabled={disabled ? "true" : undefined} data-disabled={disabled ? "" : undefined} class={["cs-switch-group", className]}>`.
  - Consumers provide accessible labeling via `aria-label` or `aria-labelledby` through `...rest`.
- **`Switch.svelte` (group item):**
  - Preserves `<input type="checkbox" role="switch" class="cs-switch">` with `type="checkbox"` and `role="switch"` applied after `{...rest}`.
  - Exposes native switch semantics (`checked`, `disabled`, `name`, `value`).
- **`SwitchGroupSelectAll.svelte` (if included):**
  - Renders `<Switch>` with `class={["cs-switch-group-select-all", className]}`, `checked={group ? group.isAllSelected : false}`, and `disabled={Boolean(disabled || group?.disabled)}`.
- **Keyboard & Focus:**
  - Native `<input type="checkbox" role="switch">` tab order and `Space` toggle behavior are preserved with no custom roving tabindex.

---

## 4. Visual & Motion Contract
- **`SwitchGroup.svelte` is strictly unstyled:**
  - No `<style>` block, no CSS file, and no layout, `display`, `flex`, or `gap` rules. Layout is entirely consumer-controlled (e.g. UnoCSS utilities or consumer CSS).
- **`Switch` / `SwitchGroupSelectAll`:**
  - Delegates all visual surface (`soft` track + `#fff` thumb), `--cs-shadow-solid` / `--cs-squircle-soft` styling, proportional `size` (`xs`–`xl`), and pure-CSS press anticipation / `180ms` quart-out thumb travel directly to `<Switch>`.

---

## 5. Edge Cases & Constraints
- **Controlled `value` rejection:** If a consumer uses controlled `bind:value={get, set}` or `value` + `onValueChange` and declines a change, syncing `event.currentTarget.checked` from `group` state after `setSelected` / `toggleAll` prevents the native `<input>` from drifting out of sync.
- **Disabled / unregistered values:** Handled by `createControlGroup`: `toggleAll()` and `setAllSelected()` only affect registered enabled items and preserve any disabled or unregistered entries already present in `value`.
- **Empty group (`hasRegisteredItems === false`):** `isAllSelected` is `false`; `toggleAll()` is a safe no-op.
- **Standalone `<Switch>` without `value`:** Inside `SwitchGroup` without `value`, a `<Switch>` does not register as an item (no DEV warning, allowing `SwitchGroupSelectAll` or custom controls to coexist cleanly).
- **Explicit non-goals:**
  - No `indeterminate` state on `Switch` or `SwitchGroupSelectAll`.
  - No `invalid` prop or error-state styling on `SwitchGroup` / `Switch`.
  - No built-in label/description/row wrapper components (left to consumer `<label>` / settings row composition).
  - No layout or orientation styling on `.cs-switch-group`.

---

## 6. Open Questions
1. **`SwitchGroupSelectAll` inclusion:** Should `SwitchGroupSelectAll` be included as a binary master switch (`checked === group.isAllSelected`, no `indeterminate`) for parity with `CheckboxGroupSelectAll` (Option A), or deferred/omitted from `SwitchGroup` (Option B)?
2. **`size` inheritance:** Should `SwitchGroup` stay strictly state-focused with `size` required on each `<Switch>` (matching `CheckboxGroup`), or should `SwitchGroup` accept an optional `size?: SwitchSize` and make `SwitchProps.size` optional when inside a group?
