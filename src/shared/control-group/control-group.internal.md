# Control Group — Internal Engineering Notes

> **Naming note:** `src/shared/control-group/` is an internal foundation module (not a public component), and `playground/PreviewView.svelte` only globs `src/modules/**/*.docs.md` and `src/work/**/*.docs.md`. Keep these notes in `control-group.internal.md`.

## Purpose & Scope

`src/shared/control-group/` provides a headless, reactive state and context foundation for multi-select form-control groups (`CheckboxGroup`, future `SwitchGroup`, etc.) with shared `name`, `disabled`, `invalid`, and optional aggregate "select all" / tri-state support.

- **Why `ToggleButtonGroup` remains separate:** `ToggleButtonGroup` (`src/modules/toggle-button-group/`) models toolbar/button-group semantics (`type: "single" | "multiple"`, `allowDeselect`, `orientation`, roving/button-group styling via `button-control-group.css`) rather than multi-select form-control groups with `name`, `invalid`, item registration, and tri-state aggregate selection.

## Public API

Exported from [`src/shared/control-group/index.ts`](./index.ts):

### Functions

- **`createControlGroup(options: ControlGroupOptions): ControlGroupContext`** — Creates a reactive group state container backed by `$derived` and `SvelteMap`.
- **`createControlGroupContext<TContext extends ControlGroupContext = ControlGroupContext>()`** — Calls Svelte's `createContext<TContext>()` and returns a typed `[get, set, has]` context tuple.

### Types

- **`ControlGroupOptions`**
  - `value: () => readonly string[] | undefined` — Getter returning the currently selected values.
  - `setValue?: (next: string[]) => void` — Optional setter for `$bindable` state updates.
  - `onValueChange?: (next: string[]) => void` — Optional callback invoked after committed value changes.
  - `name?: () => string | undefined` — Optional getter for the shared form field `name`.
  - `disabled?: () => boolean | undefined` — Optional getter for group-level disabled state.
  - `invalid?: () => boolean | undefined` — Optional getter for group-level invalid state.
- **`ControlGroupItemOptions`**
  - `value: () => string` — Getter returning the item's value within the group.
  - `disabled?: () => boolean | undefined` — Optional getter for item-level disabled state.
- **`ControlGroupContext`**
  - `readonly value: readonly string[]` — Normalized array of selected values (`[]` if `options.value()` is not an array).
  - `readonly name: string | undefined`
  - `readonly disabled: boolean`
  - `readonly invalid: boolean`
  - `readonly hasRegisteredItems: boolean`
  - `readonly isAllSelected: boolean`
  - `readonly isIndeterminate: boolean`
  - `isSelected(itemValue: string): boolean`
  - `setSelected(itemValue: string, next: boolean): void`
  - `toggle(itemValue: string): void`
  - `registerItem(options: ControlGroupItemOptions): () => void`
  - `toggleAll(): void`
  - `setAllSelected(next: boolean): void`

## Core Behavioral Invariants

- **Controlled vs `$bindable` via `setValue`:** `commit(nextValue)` calls `options.setValue?.(nextValue)` followed by `options.onValueChange?.(nextValue)`. Passing `setValue: (next) => (value = next)` supports `$bindable` props; omitting `setValue` leaves the group controlled by `options.value()` and `onValueChange`.
- **Array immutability & deduplication:** `value` never mutates the input array in place. `setSelected` and `setAllSelected` always commit a fresh `string[]`. Adding an item via `setSelected(itemValue, true)` deduplicates existing entries before appending `itemValue`.
- **Idempotent `onValueChange`:** `setSelected` returns early if `isSelected(itemValue) === next`. `setAllSelected` returns early if no enabled registered item's selection state changes. No-ops never call `setValue` or `onValueChange`.
- **`disabled` guard:** When `disabled` (`Boolean(options.disabled?.())`) is `true`, `setSelected`, `toggle`, `setAllSelected`, and `toggleAll` return immediately without committing.
- **Item registry & tri-state rules:** `registerItem` tracks items in a `SvelteMap<symbol, ControlGroupItemOptions>` and returns an unregister cleanup callback. `enabledValues` collects `item.value()` for registered items where `!item.disabled?.()`.
  - `isAllSelected` requires `enabledValues.length > 0` and every enabled item's value to be present in `value`.
  - `isIndeterminate` is `!isAllSelected` while at least one enabled item's value is present in `value`.
  - `setAllSelected(next)` is a no-op when `enabledValues.length === 0`. Selecting all appends only missing `enabledValues`; deselecting all removes only `enabledValues`. Disabled items' values and unregistered values in `value` are preserved untouched.
- **Per-module `createContext` scoping:** Each consumer module calls `createControlGroupContext()` at module scope so `CheckboxGroup`, `SwitchGroup`, etc. get distinct Svelte context keys and never collide when nested, while nested groups of the same module shadow via standard Svelte context lookup.

## Minimal Usage Example

```ts
// checkbox-group.context.ts (module-scoped context)
import { createControlGroupContext, type ControlGroupContext } from "../../shared/control-group/index.ts";

export interface CheckboxGroupContext extends ControlGroupContext {
    readonly size?: "sm" | "md" | "lg";
}

export const [getCheckboxGroupContext, setCheckboxGroupContext, hasCheckboxGroupContext] =
    createControlGroupContext<CheckboxGroupContext>();
```

```svelte
<!-- CheckboxGroup.svelte -->
<script lang="ts">
    import { createControlGroup } from "../../shared/control-group/index.ts";
    import { setCheckboxGroupContext } from "./checkbox-group.context.ts";

    let {
        value = $bindable<string[]>([]),
        onValueChange,
        name,
        disabled = false,
        invalid = false,
        size = "md",
        children,
    } = $props();

    const group = createControlGroup({
        value: () => value,
        setValue: (next) => (value = next),
        onValueChange: (next) => onValueChange?.(next),
        name: () => name,
        disabled: () => disabled,
        invalid: () => invalid,
    });

    setCheckboxGroupContext({
        get value() { return group.value; },
        get name() { return group.name; },
        get disabled() { return group.disabled; },
        get invalid() { return group.invalid; },
        get hasRegisteredItems() { return group.hasRegisteredItems; },
        get isAllSelected() { return group.isAllSelected; },
        get isIndeterminate() { return group.isIndeterminate; },
        isSelected: group.isSelected,
        setSelected: group.setSelected,
        toggle: group.toggle,
        registerItem: group.registerItem,
        toggleAll: group.toggleAll,
        setAllSelected: group.setAllSelected,
        get size() { return size; },
    });
</script>

<div role="group">
    {@render children?.()}
</div>
```
