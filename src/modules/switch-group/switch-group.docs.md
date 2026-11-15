---
name: SwitchGroup
kind: hybrid
import: cs/svelte/switch-group
exports:
  - SwitchGroup
  - SwitchGroupSelectAll
  - SwitchGroupProps
  - SwitchGroupSelectAllProps
  - SwitchGroupContext
  - getSwitchGroupContext
  - setSwitchGroupContext
  - hasSwitchGroupContext
---

# SwitchGroup

## Overview
Headless, intentionally unstyled form control group (`<SwitchGroup />`) that coordinates multi-selection (`string[]`), `name`, and `disabled` state across child `<Switch value="..." />` items, paired with an optional `<SwitchGroupSelectAll />` binary master switch. It renders a bare `role="group"` `<div>` with no layout, spacing, or visual CSS—style it freely with UnoCSS `class="..."` utilities or custom CSS.

## API

### `SwitchGroup` Props
Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div role="group" class={["cs-switch-group", className]}>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string[]` | No | `undefined` | `$bindable` array of selected item values (defaults internally to `[]`). Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: string[]) => void` | No | `undefined` | Fires with the next selected values array when an item or select-all changes. |
| `name` | `string` | No | `undefined` | Shared form field name propagated to child `<Switch value="..." />` items (unless overridden per item). |
| `disabled` | `boolean` | No | `false` | Disables the group (`aria-disabled="true"`, `data-disabled`) and all child `<Switch>` items, including `<SwitchGroupSelectAll>`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

### `SwitchGroupSelectAll` Props
Extends `Omit<SwitchProps, "value" | "name" | "checked" | "onCheckedChange">`. Renders `<Switch class={["cs-switch-group-select-all", className]} />`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `SwitchSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | Yes | — | Size scale forwarded to `<Switch>`. |
| `disabled` | `boolean` | No | `undefined` | Disables the master switch (also disabled when the parent `SwitchGroup` has `disabled={true}`). |
| `ref` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the underlying `<input type="checkbox" role="switch">`. |

### Context Helpers
- `SwitchGroupContext`: Alias of `ControlGroupContext` (`src/shared/control-group/`), exposing `value`, `name`, `disabled`, `hasRegisteredItems`, `isAllSelected`, `isSelected(value)`, `setSelected(value, selected)`, `toggle(value)`, `registerItem(item)`, `toggleAll()`, and `setAllSelected(selected)`.
- `getSwitchGroupContext()`: Retrieves the active `SwitchGroupContext` (throws if called outside a `SwitchGroup`).
- `hasSwitchGroupContext()`: Returns `true` when called inside a `SwitchGroup`.
- `setSwitchGroupContext(ctx)`: Provides a `SwitchGroupContext` to descendant components.

### `data-*` & ARIA Attributes
- `role="group"` on the root `<div>` (provide `aria-label` or `aria-labelledby` via `...rest`).
- `aria-disabled="true"` and `data-disabled` (present when `disabled` is `true`).
- Classes: `.cs-switch-group` on `SwitchGroup`, `.cs-switch-group-select-all` on `SwitchGroupSelectAll`.

### CSS Custom Properties
None. `SwitchGroup` and `SwitchGroupSelectAll` introduce no `--cs-switch-group-*` variables and ship no `<style>` block.

### Architecture (`src/shared/control-group/`)
`SwitchGroup` is backed by `createControlGroup` and `createControlGroupContext` from `src/shared/control-group/`:
- **Auto-registration:** Any `<Switch value="..." />` rendered inside `<SwitchGroup>` automatically registers itself via `$effect` (coercing `value` via `String(value)`) and unregisters on unmount.
- **Synced item props:** Registered items derive `checked` from `group.isSelected(String(value))`, `name` from `name ?? group.name`, and `disabled` from `Boolean(disabled || group.disabled)`.
- **Select-all isolation:** `<SwitchGroupSelectAll>` renders `<Switch>` *without* a `value` prop, so it never registers as a group item and never inherits `group.name`. Instead, it binds `checked` to `group.isAllSelected` and calls `group.toggleAll()` on change.

## Examples

### Basic (`bind:value` + `SwitchGroupSelectAll`)
```svelte
<script lang="ts">
    import { Switch } from "cs/svelte/switch";
    import { SwitchGroup, SwitchGroupSelectAll } from "cs/svelte/switch-group";

    let channels = $state<string[]>(["email"]);
</script>

<SwitchGroup bind:value={channels} aria-label="Notification channels" class="flex flex-col gap-2.5">
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <SwitchGroupSelectAll size="md" />
        <span class="font-medium">All notifications</span>
    </label>

    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="email" />
        <span>Email</span>
    </label>

    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="push" />
        <span>Push</span>
    </label>

    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="sms" />
        <span>SMS</span>
    </label>
</SwitchGroup>
```

### Controlled (`bind:value={get, set}` + `onValueChange`)
Use Svelte 5's function binding `bind:value={() => selected, () => {}}` alongside `onValueChange` for strict controlled mode. Passing one-way `value={selected}` without `bind:value` acts as an uncontrolled initial value in Svelte 5 `$bindable()`.

```svelte
<script lang="ts">
    import { Switch } from "cs/svelte/switch";
    import { SwitchGroup } from "cs/svelte/switch-group";

    let selected = $state<string[]>(["email"]);

    function handleValueChange(next: string[]) {
        // Enforce at least one notification channel
        if (next.length > 0) {
            selected = next;
        }
    }
</script>

<SwitchGroup
    bind:value={() => selected, () => {}}
    onValueChange={handleValueChange}
    aria-label="Notification channels"
    class="flex flex-col gap-2.5"
>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="email" />
        <span>Email</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-main select-none">
        <Switch size="md" value="sms" />
        <span>SMS</span>
    </label>
</SwitchGroup>
```

### Shared `name` and `disabled`
```svelte
<SwitchGroup
    name="features"
    disabled
    value={["security"]}
    aria-label="Features"
    class="flex flex-col gap-2.5"
>
    <label class="flex items-center gap-3 text-sm text-weak select-none">
        <SwitchGroupSelectAll size="md" />
        <span class="font-medium">Enable all</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-weak select-none">
        <Switch size="md" value="security" />
        <span>Security alerts</span>
    </label>
    <label class="flex items-center gap-3 text-sm text-weak select-none">
        <Switch size="md" value="analytics" />
        <span>Analytics</span>
    </label>
</SwitchGroup>
```

## Behavior & Quirks
- **Intentionally unstyled:** `.cs-switch-group` has no `display`, `flex`, `grid`, or `gap` rules. Apply layout classes directly on `<SwitchGroup class="...">`.
- **Binary `SwitchGroupSelectAll` (no `indeterminate`):** Unlike `CheckboxGroupSelectAll`, `SwitchGroupSelectAll` has no `indeterminate` state because `role="switch"` only supports binary `checked` (`true` or `false`). It is `checked` when all enabled registered items are selected, and `false` when none or only some are selected; toggling it on when partially selected enables all remaining enabled items.
- **No `size` propagation:** `SwitchGroup` does not forward `size` to child `<Switch>` items; each `<Switch>` and `<SwitchGroupSelectAll>` requires its own `size` prop so standalone type-safety remains strict.
- **`name` & `disabled` propagation:** Item `name` resolves as `name ?? group.name` and `disabled` resolves as `Boolean(disabled || group.disabled)`. `<SwitchGroupSelectAll>` inherits `group.disabled` but never inherits `group.name`.
- **Value coercion via `String(value)`:** When a `<Switch>` inside `<SwitchGroup>` has a `value` prop (`value !== undefined`), it coerces `value` with `String(value)` when registering and matching against `group.value` (`string[]`). A `<Switch>` without `value` inside `<SwitchGroup>` does not register as a group item.
- **Disabled & unregistered values preserved:** `group.toggleAll()` only toggles registered *enabled* items. Pre-selected disabled items (and any unregistered values already in `value`) are preserved when toggling all.
- **Empty group:** When no items are registered (`hasRegisteredItems === false`), `isAllSelected` is `false` and `toggleAll()` is a no-op.
- **Controlled rejection sync:** If a controlled `onValueChange` callback or `bind:value={get, set}` rejects an update, both `<Switch>` and `<SwitchGroupSelectAll>` immediately resync the underlying `<input>` element's `.checked` property from `group` state so the native DOM never drifts out of sync.
