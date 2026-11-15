---
name: CheckboxGroup
kind: hybrid
import: cs/svelte/checkbox-group
exports:
  - CheckboxGroup
  - CheckboxGroupSelectAll
  - CheckboxGroupProps
  - CheckboxGroupSelectAllProps
  - CheckboxGroupContext
  - getCheckboxGroupContext
  - setCheckboxGroupContext
  - hasCheckboxGroupContext
---

# CheckboxGroup

## Overview
Headless, intentionally unstyled form control group (`<CheckboxGroup />`) that coordinates multi-selection (`string[]`), `name`, `disabled`, and `invalid` state across child `<Checkbox value="..." />` items, paired with an optional `<CheckboxGroupSelectAll />` tri-state controller. It renders a bare `role="group"` `<div>` with no layout, spacing, or visual CSS—style it freely with UnoCSS `class="..."` utilities or custom CSS.

## API

### `CheckboxGroup` Props
Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div role="group" class={["cs-checkbox-group", className]}>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string[]` | No | `undefined` | `$bindable` array of selected item values (defaults internally to `[]`). Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: string[]) => void` | No | `undefined` | Fires with the next selected values array when an item or select-all changes. |
| `name` | `string` | No | `undefined` | Shared form field name propagated to child `<Checkbox value="..." />` items (unless overridden per item). |
| `disabled` | `boolean` | No | `false` | Disables the group (`aria-disabled="true"`, `data-disabled`) and all child `<Checkbox>` items, including `<CheckboxGroupSelectAll>`. |
| `invalid` | `boolean` | No | `false` | Sets `data-invalid` on the root `<div>` (not `aria-invalid`, which is invalid on `role="group"`) and propagates `invalid` via context so child `<Checkbox>` and `<CheckboxGroupSelectAll>` `<input>` elements receive `aria-invalid="true"` unless overridden per item. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

### `CheckboxGroupSelectAll` Props
Extends `Omit<CheckboxProps, "value" | "name" | "checked" | "onCheckedChange" | "indeterminate" | "onIndeterminateChange">`. Renders `<Checkbox class={["cs-checkbox-group-select-all", className]} />`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `CheckboxVariant` (`"soft" \| "elevated"`) | Yes | — | Visual surface variant forwarded to `<Checkbox>`. |
| `size` | `CheckboxSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | Yes | — | Size scale forwarded to `<Checkbox>`. |
| `disabled` | `boolean` | No | `undefined` | Disables the select-all checkbox (also disabled when the parent `CheckboxGroup` has `disabled={true}`). |
| `invalid` | `boolean` | No | `undefined` | Marks the select-all checkbox invalid (falls back to the parent `CheckboxGroup`'s `invalid` when omitted). |
| `ref` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the underlying `<input type="checkbox">`. |

### `data-*` & ARIA Attributes
- `role="group"` on the root `<div>` (provide `aria-label` or `aria-labelledby` via `...rest`).
- `aria-disabled="true"` and `data-disabled` (present when `disabled` is `true`).
- `data-invalid` on the root `<div>` when `invalid` is `true` (not `aria-invalid`, which is unsupported on `role="group"`; instead, child `<Checkbox>` and `<CheckboxGroupSelectAll>` `<input>` elements receive `aria-invalid="true"` via context).
- Classes: `.cs-checkbox-group` on `CheckboxGroup`, `.cs-checkbox-group-select-all` on `CheckboxGroupSelectAll`.

### CSS Custom Properties
None. `CheckboxGroup` and `CheckboxGroupSelectAll` introduce no `--cs-checkbox-group-*` variables and ship no `<style>` block.

### Architecture (`src/shared/control-group/`)
`CheckboxGroup` is backed by `createControlGroup` and `createControlGroupContext` from `src/shared/control-group/`:
- **Auto-registration:** Any `<Checkbox value="..." />` rendered inside `<CheckboxGroup>` automatically registers itself via `$effect` and unregisters on unmount.
- **Synced item props:** Registered items derive `checked` from `group.isSelected(value)`, `name` from `name ?? group.name`, `disabled` from `disabled || group.disabled`, and `invalid` from `invalid ?? group.invalid`.
- **Select-all isolation:** `<CheckboxGroupSelectAll>` renders `<Checkbox>` *without* a `value` prop, so it never registers as a group item and never inherits `group.name`. Instead, it reads `group.isAllSelected` / `group.isIndeterminate` and calls `group.toggleAll()` on change.

## Examples

### Basic (`bind:value` + `CheckboxGroupSelectAll`)
```svelte
<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";
    import { CheckboxGroup, CheckboxGroupSelectAll } from "cs/svelte/checkbox-group";

    let toppings = $state<string[]>(["cheese"]);
</script>

<CheckboxGroup bind:value={toppings} aria-label="Pizza toppings" class="flex flex-col gap-2">
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <CheckboxGroupSelectAll variant="soft" size="md" />
        <span class="font-medium">Select all</span>
    </label>

    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="cheese" />
        <span>Extra cheese</span>
    </label>

    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="mushrooms" />
        <span>Mushrooms</span>
    </label>

    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="olives" />
        <span>Olives</span>
    </label>
</CheckboxGroup>
```

### Controlled (`bind:value={get, set}` + `onValueChange`)
Use Svelte 5's function binding `bind:value={() => selected, () => {}}` alongside `onValueChange` for strict controlled mode. Passing one-way `value={selected}` without `bind:value` acts as an uncontrolled initial value in Svelte 5 `$bindable()`.

```svelte
<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";
    import { CheckboxGroup } from "cs/svelte/checkbox-group";

    let selected = $state<string[]>(["email"]);

    function handleValueChange(next: string[]) {
        // Enforce at least one notification channel
        if (next.length > 0) {
            selected = next;
        }
    }
</script>

<CheckboxGroup
    bind:value={() => selected, () => {}}
    onValueChange={handleValueChange}
    aria-label="Notification channels"
    class="flex flex-col gap-2"
>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="email" />
        <span>Email</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="sms" />
        <span>SMS</span>
    </label>
</CheckboxGroup>
```

### Shared `name`, `disabled`, and `invalid`
```svelte
<CheckboxGroup
    name="permissions"
    invalid
    aria-label="Permissions"
    class="flex flex-col gap-2"
>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="read" />
        <span>Read (inherits group invalid)</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-main select-none">
        <Checkbox variant="soft" size="md" value="write" invalid={false} />
        <span>Write (overrides invalid={false})</span>
    </label>
    <label class="flex items-center gap-2.5 text-sm text-weak select-none">
        <Checkbox variant="soft" size="md" value="admin" disabled />
        <span>Admin (item-level disabled)</span>
    </label>
</CheckboxGroup>
```

## Behavior & Quirks
- **Intentionally unstyled:** `.cs-checkbox-group` has no `display`, `flex`, `grid`, or `gap` rules. Apply layout classes directly on `<CheckboxGroup class="...">`.
- **No `variant` / `size` propagation:** `CheckboxGroup` does not forward `variant` or `size` to child `<Checkbox>` items; each `<Checkbox>` and `<CheckboxGroupSelectAll>` specifies its own `variant` and `size` so standalone type-safety remains strict.
- **Tri-state morph without flash:** `CheckboxGroupSelectAll` immediately syncs `event.currentTarget.checked` and `event.currentTarget.indeterminate` from `group` inside `onchange` before `Checkbox` reads them, preventing Chromium's native indeterminate click reset from causing a 1-frame flash and preserving the `160ms` `indeterminate <-> checked` SVG morph.
- **Disabled & unregistered values preserved:** `group.toggleAll()` only toggles registered *enabled* items. Pre-selected disabled items (and any unregistered values already in `value`) are preserved when toggling all.
- **Empty group:** When no items are registered (`hasRegisteredItems === false`), `isAllSelected` and `isIndeterminate` are both `false` and `toggleAll()` is a no-op.
- **Controlled rejection sync:** If a controlled `onValueChange` callback rejects an update, both `<Checkbox>` and `<CheckboxGroupSelectAll>` immediately resync the underlying `<input>` element's `.checked` / `.indeterminate` properties from `group` state.
