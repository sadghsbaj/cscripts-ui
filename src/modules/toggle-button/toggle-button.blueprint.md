# Blueprint: `<ToggleButton>` & `<ToggleButtonGroup>`

**Kind:** `component` (compound primitives sharing a typed Svelte 5 context)
**Scope:** Svelte 5 state ergonomics (`$bindable()` + change callbacks), discriminated-union TypeScript API, group `disabled` propagation, web-native semantics, and dev-mode guardrails. Existing visual styling, CSS tokens, `--cs-toggle-button-*` hooks, squircle/spring-physics animations, and `ToggleButtonGroupSeparator` mechanics remain **unchanged**.

---

## 1. Usage / DX Examples

### Standalone `<ToggleButton>`

```svelte
<!-- Uncontrolled -->
<ToggleButton variant="soft" color="accent" size="md">
    <ToggleButtonLabel>Pin</ToggleButtonLabel>
</ToggleButton>

<!-- Two-way $state binding -->
<ToggleButton variant="soft" color="accent" size="md" bind:pressed={isPinned}>
    <ToggleButtonLabel>Pin</ToggleButtonLabel>
</ToggleButton>

<!-- Svelte 5 getter/setter function binding (stores, external state, validation) -->
<ToggleButton
    variant="ghost"
    color="positive"
    size="sm"
    bind:pressed={() => store.pinned, (next) => store.setPinned(next)}
>
    <ToggleButtonLabel>Pin</ToggleButtonLabel>
</ToggleButton>

<!-- Change callback (fires with the next boolean state) -->
<ToggleButton variant="soft" color="accent" size="md" onPressedChange={(next) => savePin(next)}>
    <ToggleButtonLabel>Pin</ToggleButtonLabel>
</ToggleButton>
```

### Grouped `<ToggleButtonGroup>`

```svelte
<!-- Fixed single selection (segmented control; allowDeselect defaults to false) -->
<ToggleButtonGroup type="single" bind:value={align}>
    <ToggleButton value="left" variant="soft" color="accent" size="md">
        <ToggleButtonLabel>Left</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButton value="center" variant="soft" color="accent" size="md">
        <ToggleButtonLabel>Center</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>

<!-- Multiple selection with group-level disabled & function binding -->
<ToggleButtonGroup
    type="multiple"
    disabled={isReadOnly}
    bind:value={() => filters.tags, (next) => filters.setTags(next)}
>
    <ToggleButton value="bold" variant="ghost" color="accent" size="sm">
        <ToggleButtonLabel>Bold</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButton value="italic" variant="ghost" color="accent" size="sm">
        <ToggleButtonLabel>Italic</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>
```

---

## 2. Public TypeScript API

### `src/modules/toggle-button/index.ts`

```ts
export type ToggleButtonStateProps =
    | {
          /** Item identifier inside `<ToggleButtonGroup>`. Forbidden standalone. */
          value: string;
          pressed?: never;
          onPressedChange?: never;
      }
    | {
          value?: never;
          /** Bindable pressed state (standalone only). Supports `bind:pressed` and `bind:pressed={get, set}`. */
          pressed?: boolean;
          /** Fires with the next pressed state after a user toggle (standalone only). */
          onPressedChange?: (pressed: boolean) => void;
      };

export type ToggleButtonProps = Omit<HTMLButtonAttributes, "color" | "size" | "value"> &
    ToggleButtonStateProps & {
        ref?: HTMLButtonElement | null;
        variant: ToggleButtonVariant;
        color: ToggleButtonColor;
        size: ToggleButtonSize;
        iconOnly?: boolean;
        onclick?: MouseEventHandler<HTMLButtonElement>;
    };
```

### `src/modules/toggle-button-group/index.ts`

```ts
export const TOGGLE_BUTTON_GROUP_TYPES = ["single", "multiple"] as const;
export type ToggleButtonGroupType = (typeof TOGGLE_BUTTON_GROUP_TYPES)[number];

export const TOGGLE_BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ToggleButtonGroupOrientation = (typeof TOGGLE_BUTTON_GROUP_ORIENTATIONS)[number];

export type ToggleButtonGroupSingleProps =
    | {
          type: "single";
          value?: string;
          allowDeselect?: false;
          onValueChange?: (value: string) => void;
      }
    | {
          type: "single";
          value?: string | undefined;
          allowDeselect: true;
          onValueChange?: (value: string | undefined) => void;
      };

export type ToggleButtonGroupMultipleProps = {
    type: "multiple";
    value?: string[];
    allowDeselect?: never;
    onValueChange?: (value: string[]) => void;
};

export type ToggleButtonGroupTypeProps =
    | ToggleButtonGroupSingleProps
    | ToggleButtonGroupMultipleProps;

export type ToggleButtonGroupProps = HTMLAttributes<HTMLDivElement> &
    ToggleButtonGroupTypeProps & {
        ref?: HTMLDivElement | null;
        orientation?: ToggleButtonGroupOrientation;
        /** Disables the group and all child `<ToggleButton>` items. */
        disabled?: boolean;
    };
```

---

## 3. Internal State & Context Contract

- **No `defaultPressed` / `defaultValue` bloat:** `$bindable(false)` on `ToggleButton` (`pressed`) and `$bindable()` on `ToggleButtonGroup` (`value`) handle uncontrolled, two-way `bind:`, and Svelte 5 function bindings (`bind:pressed={get, set}` / `bind:value={get, set}`) uniformly.
- **Typed context (`ToggleButtonGroupContext`):**

```ts
export interface ToggleButtonGroupContext {
    readonly type: ToggleButtonGroupType;
    readonly orientation: ToggleButtonGroupOrientation;
    readonly disabled: boolean;
    isSelected(itemValue: string): boolean;
    toggle(itemValue: string): void;
}
```

- `ToggleButtonGroup` exposes `type`, `orientation`, and `disabled` via object getters (`get disabled() { return Boolean(disabled); }`) so children read live reactive state without stale closures.
- `ToggleButton` derives:
  - `isDisabled = $derived(Boolean(disabled || group?.disabled))`
  - `isPressed = $derived(group ? (value !== undefined ? group.isSelected(value) : false) : Boolean(pressed))`
- **Update & callback order:**
  1. `onclick?.(event)` runs first; if `event.defaultPrevented`, abort without mutating state or firing change callbacks.
  2. In standalone mode, compute `next = !pressed`, assign `pressed = next`, then call `onPressedChange?.(next)`.
  3. In group mode (`type="single"`): if `value === itemValue` and `!allowDeselect`, return early (no-op—do not reassign `value` or fire `onValueChange`). Otherwise assign `value = next` and call `onValueChange?.(next)`.
  4. In group mode (`type="multiple"`): treat omitted `value` (`undefined`) as `[]`, toggle `itemValue` immutably, assign `value = next`, and call `onValueChange?.(next)`.

---

## 4. Semantics, A11y & Guardrails

- **Web-native elements & attributes:**
  - `<ToggleButton>`: `<button bind:this={ref} {...rest} type="button">` (`type="button"` enforced after `{...rest}`), `aria-pressed={isPressed}`, `disabled={isDisabled || undefined}`, plus `data-variant`, `data-color`, `data-size`, `data-icon-only`.
  - `<ToggleButtonGroup>`: `<div bind:this={ref} role="group" {...rest}>`, `aria-disabled={disabled ? "true" : undefined}`, `data-type`, `data-orientation`, `data-fixed-selection={type === "single" && !allowDeselect ? "" : undefined}`, `data-disabled={disabled ? "" : undefined}`.
- **Navigation:** Native `Tab` focus traversal across non-disabled `<button>` elements—no roving `tabindex` or arrow-key interception.
- **Dev-mode guardrails (`import.meta.env.DEV`):**
  - Inside `<ToggleButtonGroup>`, warn if `value === undefined` (and never fall back to local `pressed`).
  - Outside `<ToggleButtonGroup>`, warn if `value !== undefined`.
- **ESLint parity (follow-up):** Add `toggle-button-group/require-item-value` (require `value`, forbid `pressed`/`onPressedChange` inside groups) and `toggle-button/no-orphan-value` (forbid `value` standalone).
