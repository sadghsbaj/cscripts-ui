---
name: Dropdown
kind: hybrid
import: cs/svelte/dropdown
exports:
    - Dropdown
    - DropdownContent
    - DropdownHeader
    - DropdownFooter
    - DropdownGroup
    - DropdownGroupLabel
    - DropdownItem
    - DropdownCheckboxItem
    - DropdownRadioGroup
    - DropdownRadioItem
    - DropdownItemIcon
    - DropdownItemText
    - DropdownItemDescription
    - DropdownItemShortcut
    - DropdownSeparator
    - dropdownTrigger
    - DROPDOWN_SIZES
    - DropdownSize
    - DropdownTriggerOn
    - DropdownTriggerOptions
    - DropdownIconComponentProps
    - DropdownProps
    - DropdownContentProps
    - DropdownHeaderProps
    - DropdownFooterProps
    - DropdownGroupProps
    - DropdownGroupLabelProps
    - DropdownItemProps
    - DropdownCheckboxItemProps
    - DropdownRadioGroupProps
    - DropdownRadioItemProps
    - DropdownItemIconProps
    - DropdownItemTextProps
    - DropdownItemDescriptionProps
    - DropdownItemShortcutProps
    - DropdownSeparatorProps
---

# Dropdown

## Overview

Composable action and command menu attached to any trigger element via the `dropdownTrigger` attachment and rendered in an anchor-positioned top-layer `Popover` (`DropdownContent`). Built on `rovingFocus`, `ScrollArea`, `scrollFade`, and shared `listbox` styling, it supports action items, link items (`href`), checkbox and radio selection items, keyboard shortcuts (`DropdownItemShortcut`), pinned `header`/`footer` regions, inline custom widgets, and press-drag-release activation.

## API

### `dropdownTrigger(options?: DropdownTriggerOptions): Attachment<HTMLElement>`

Attaches to any trigger element inside `<Dropdown>` (such as `<Button>` or a native `<button>`) to wire `popoverTrigger`, `aria-haspopup="menu"`, `aria-controls`, `aria-expanded`, `data-open`, and keyboard/pointer open handling.

| Option      | Type                         | Required | Default         | Description                                                                                                                                      |
| :---------- | :--------------------------- | :------- | :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `triggerOn` | `DropdownTriggerOn`          | No       | `"pointerdown"` | `"pointerdown"` opens immediately on mouse down with press-drag-release support (touch/keyboard activate on `click`); `"click"` opens on `click`. |
| `enabled`   | `boolean \| (() => boolean)` | No       | `true`          | Enables or disables the trigger attachment (combined with `!dropdown.disabled`).                                                                 |

### `Dropdown` Props

Headless context root (renders `children` with no wrapper DOM element).

| Prop           | Type                      | Required | Default     | Description                                                                                             |
| :------------- | :------------------------ | :------- | :---------- | :------------------------------------------------------------------------------------------------------ |
| `size`         | `DropdownSize`            | Yes      | —           | T-shirt scale matching `Select`, `Combobox`, and `Button`: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`.      |
| `open`         | `boolean`                 | No       | `false`     | `$bindable` popover open state. Supports `bind:open` and `bind:open={get, set}`.                        |
| `onOpenChange` | `(open: boolean) => void` | No       | `undefined` | Fires whenever the open state changes.                                                                  |
| `disabled`     | `boolean`                 | No       | `false`     | Disables trigger opening and all items, and closes the menu if open.                                    |
| `id`           | `string`                  | No       | `undefined` | Optional ID base for trigger/menu ARIA wiring (defaults to `$props.id()`, yielding `${id}-menu`).       |
| `children`     | `Snippet`                 | No       | `undefined` | Typically a trigger element with `{@attach dropdownTrigger()}` and `<DropdownContent>`.                 |

### `DropdownContent` Props

Extends `Omit<PopoverProps, "id" | "placement" | "width" | "offset">`. Renders `<Popover role="menu" aria-labelledby={dropdown.triggerId}>` wrapping `header?.()`, `<ScrollArea size="sm" direction="vertical" {scrollbar}>` with `<ScrollAreaContent class="cs-dropdown-list cs-listbox-list">`, and `footer?.()`.

| Prop        | Type                                | Required | Default               | Description                                                                                      |
| :---------- | :---------------------------------- | :------- | :-------------------- | :----------------------------------------------------------------------------------------------- |
| `id`        | `string`                            | No       | `dropdown.menuId`     | Optional ID override for the floating menu popover.                                              |
| `placement` | `PopoverPlacement`                  | No       | `"bottom-start"`      | Anchor placement relative to the trigger.                                                        |
| `width`     | `PopoverWidth`                      | No       | `"content"`           | Width strategy relative to the trigger: `"content" \| "anchor" \| "min-anchor"`.                 |
| `offset`    | `string`                            | No       | `"8px"`               | Gap between the trigger and `DropdownContent` (`--cs-popover-offset`).                           |
| `maxHeight` | `string`                            | No       | `"min(320px, 60dvh)"` | Maximum block size before internal `ScrollArea` scrolls (`--cs-dropdown-content-max-height`).    |
| `scrollbar` | `ScrollAreaScrollbar`               | No       | `"hover"`             | Scrollbar visibility mode forwarded to `ScrollArea`: `"hover" \| "always" \| "never"`.           |
| `animate`   | `boolean`                           | No       | `true`                | Enables `Popover` directional spring + blur entrance/exit transitions.                           |
| `popover`   | `"" \| "auto" \| "manual" \| "hint"` | No      | `"auto"`              | Native HTML `popover` attribute inherited from `PopoverProps`.                                   |
| `header`    | `Snippet`                           | No       | `undefined`           | Optional pinned header rendered above the scrollable list (outside `ScrollArea`).                |
| `footer`    | `Snippet`                           | No       | `undefined`           | Optional pinned footer rendered below the scrollable list (outside `ScrollArea`).                |
| `ref`       | `HTMLDivElement \| null`            | No       | `null`                | `$bindable` reference to the popover `<div>`.                                                    |
| `children`  | `Snippet`                           | No       | `undefined`           | `<DropdownItem>`, `<DropdownCheckboxItem>`, `<DropdownRadioGroup>`, `<DropdownGroup>`, etc.      |

### `DropdownItem` Props

Extends `Omit<HTMLAttributes<HTMLElement>, "children">` and `Pick<HTMLAnchorAttributes, "href" | "target" | "rel" | "download" | "hreflang" | "referrerpolicy">`. Renders `<a role="menuitem" tabindex={-1}>` when `href` is defined, or `<div role="menuitem" tabindex={-1}>` otherwise.

| Prop            | Type                                    | Required | Default     | Description                                                                                                          |
| :-------------- | :-------------------------------------- | :------- | :---------- | :------------------------------------------------------------------------------------------------------------------- |
| `icon`          | `Component<DropdownIconComponentProps>` | No       | `undefined` | Shorthand leading icon component (alternative to `<DropdownItemIcon>`).                                              |
| `label`         | `string`                                | No       | `undefined` | Explicit typeahead label override (falls back to `<DropdownItemText>` or `.cs-dropdown-item-content` text).          |
| `negative`      | `boolean`                               | No       | `false`     | Marks the item as a destructive/negative action (`data-negative`).                                                   |
| `disabled`      | `boolean`                               | No       | `false`     | Disables this item (`dropdown.disabled \|\| disabled`), skipping it in hover, roving focus, typeahead, and select.   |
| `closeOnSelect` | `boolean`                               | No       | `true`      | Closes the menu after `onSelect` unless `false` or `event.preventDefault()` is called.                               |
| `onSelect`      | `(event: MouseEvent \| KeyboardEvent) => void` | No | `undefined` | Fires when activated via click, drag-release, `Enter`, or `Space`.                                                  |
| `href`          | `string`                                | No       | `undefined` | Renders the item as an `<a>` element (omitted from DOM when disabled).                                               |
| `ref`           | `HTMLElement \| null`                   | No       | `null`      | `$bindable` reference to the `<div>` or `<a>` element.                                                               |
| `children`      | `Snippet`                               | No       | `undefined` | Plain text or compound subcomponents (`DropdownItemIcon`, `DropdownItemText`, `DropdownItemDescription`, `DropdownItemShortcut`). |

### `DropdownCheckboxItem` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="menuitemcheckbox" tabindex={-1}>` with a leading `<CheckboxMark>`.

| Prop              | Type                                           | Required | Default     | Description                                                                                       |
| :---------------- | :--------------------------------------------- | :------- | :---------- | :------------------------------------------------------------------------------------------------ |
| `checked`         | `boolean`                                      | No       | `false`     | `$bindable` checked state.                                                                        |
| `onCheckedChange` | `(checked: boolean) => void`                   | No       | `undefined` | Fires when `checked` toggles.                                                                     |
| `indeterminate`   | `boolean`                                      | No       | `false`     | Sets `aria-checked="mixed"` and renders the indeterminate mark when `true`.                       |
| `icon`            | `Component<DropdownIconComponentProps>`        | No       | `undefined` | Shorthand icon component rendered inside `.cs-dropdown-item-content` after the checkbox mark.     |
| `label`           | `string`                                       | No       | `undefined` | Explicit typeahead label override.                                                                |
| `disabled`        | `boolean`                                      | No       | `false`     | Disables this item (`dropdown.disabled \|\| disabled`).                                           |
| `closeOnSelect`   | `boolean`                                      | No       | `false`     | Closes the menu after toggling when `true`.                                                       |
| `onSelect`        | `(event: MouseEvent \| KeyboardEvent) => void` | No       | `undefined` | Fires before toggling; calling `event.preventDefault()` cancels both toggling and closing.        |
| `ref`             | `HTMLDivElement \| null`                       | No       | `null`      | `$bindable` reference to the `<div>`.                                                             |
| `children`        | `Snippet`                                      | No       | `undefined` | Label text or item subcomponents.                                                                 |

### `DropdownRadioGroup` & `DropdownRadioItem` Props

#### `DropdownRadioGroup` (`DropdownRadioGroupProps<T extends string = string>`)

Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div role="group" class="cs-dropdown-radio-group cs-listbox-group">`.

| Prop            | Type                 | Required | Default     | Description                                                   |
| :-------------- | :------------------- | :------- | :---------- | :------------------------------------------------------------ |
| `value`         | `T \| undefined`     | No       | `undefined` | `$bindable` selected radio value.                             |
| `onValueChange` | `(value: T) => void` | No       | `undefined` | Fires when a different radio item value is selected.          |
| `ref`           | `HTMLDivElement \| null` | No   | `null`      | `$bindable` reference to the `<div>`.                         |
| `children`      | `Snippet`            | No       | `undefined` | `<DropdownRadioItem>` and optional `<DropdownGroupLabel>`.    |

#### `DropdownRadioItem` (`DropdownRadioItemProps<T extends string = string>`)

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="menuitemradio" tabindex={-1}>` with a leading radio dot indicator.

| Prop            | Type                                           | Required | Default     | Description                                                                                       |
| :-------------- | :--------------------------------------------- | :------- | :---------- | :------------------------------------------------------------------------------------------------ |
| `value`         | `T`                                            | Yes      | —           | Radio option value emitted when selected (`data-value={value}`).                                  |
| `icon`          | `Component<DropdownIconComponentProps>`        | No       | `undefined` | Shorthand icon component rendered inside `.cs-dropdown-item-content` after the radio dot.         |
| `label`         | `string`                                       | No       | `undefined` | Explicit typeahead label override (falls back to `<DropdownItemText>`, content text, or `value`). |
| `disabled`      | `boolean`                                      | No       | `false`     | Disables this item (`dropdown.disabled \|\| disabled`).                                           |
| `closeOnSelect` | `boolean`                                      | No       | `false`     | Closes the menu after selection when `true`.                                                      |
| `onSelect`      | `(event: MouseEvent \| KeyboardEvent) => void` | No       | `undefined` | Fires before selecting; calling `event.preventDefault()` cancels both selection and closing.      |
| `ref`           | `HTMLDivElement \| null`                       | No       | `null`      | `$bindable` reference to the `<div>`.                                                             |
| `children`      | `Snippet`                                      | No       | `undefined` | Label text or item subcomponents.                                                                 |

### Subcomponents (`DropdownHeader`, `DropdownFooter`, `DropdownGroup`, `DropdownGroupLabel`, `DropdownSeparator`, `DropdownItemIcon`, `DropdownItemText`, `DropdownItemDescription`, `DropdownItemShortcut`)

- **`DropdownHeader`** (`DropdownHeaderProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div class="cs-dropdown-header">` with non-shrinking layout and header padding.
- **`DropdownFooter`** (`DropdownFooterProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div class="cs-dropdown-footer">` with non-shrinking layout and footer padding.
- **`DropdownGroup`** (`DropdownGroupProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div role="group" aria-labelledby={labelId} class="cs-dropdown-group cs-listbox-group">`.
- **`DropdownGroupLabel`** (`DropdownGroupLabelProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Generates an `id` (`id ?? $props.id()`), registers it with the parent `DropdownGroup`, and renders `<div role="presentation" class="cs-dropdown-group-label cs-listbox-group-label">`.
- **`DropdownSeparator`** (`DropdownSeparatorProps` extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`, `ref = $bindable(null)`): Renders `<div role="separator" aria-orientation="horizontal" class="cs-dropdown-separator cs-listbox-separator">`.
- **`DropdownItemIcon`** (`DropdownItemIconProps` extending `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): Props `{ icon: Component<DropdownIconComponentProps>; color?: string; ...SVGAttributes }`. Renders `<Icon aria-hidden="true" {color} class="cs-dropdown-item-icon cs-listbox-item-icon" />`.
- **`DropdownItemText`** (`DropdownItemTextProps` extending `HTMLAttributes<HTMLSpanElement>`, `ref = $bindable(null)`): Renders `<span class="cs-dropdown-item-text cs-listbox-item-text">` and registers the primary label node for typeahead label extraction.
- **`DropdownItemDescription`** (`DropdownItemDescriptionProps` extending `HTMLAttributes<HTMLParagraphElement>`, `ref = $bindable(null)`): Renders `<p class="cs-dropdown-item-description cs-listbox-item-description">` below `DropdownItemText`, excluded from typeahead label extraction, and switches the row to line-1 optical alignment.
- **`DropdownItemShortcut`** (`DropdownItemShortcutProps` extending `HTMLAttributes<HTMLSpanElement>`, `ref = $bindable(null)`): Renders `<span aria-hidden="true" class="cs-dropdown-item-shortcut">` for trailing keyboard shortcut hints (such as `<Kbd>` or `<KbdGroup>`).

### Exported Constants & Types

- `DROPDOWN_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` (`DropdownSize`)
- `DropdownTriggerOn` (`"pointerdown" | "click"`), `DropdownTriggerOptions`, `DropdownIconComponentProps`
- `DropdownProps`, `DropdownContentProps`, `DropdownHeaderProps`, `DropdownFooterProps`, `DropdownGroupProps`, `DropdownGroupLabelProps`, `DropdownItemProps`, `DropdownCheckboxItemProps`, `DropdownRadioGroupProps<T>`, `DropdownRadioItemProps<T>`, `DropdownItemIconProps`, `DropdownItemTextProps`, `DropdownItemDescriptionProps`, `DropdownItemShortcutProps`, `DropdownSeparatorProps`

### `data-*` Attributes

- **On trigger element (`dropdownTrigger`):** `data-open` (present when open), alongside `aria-haspopup="menu"`, `aria-expanded="true" | "false"`, and `aria-controls={menuId}`.
- **On `DropdownContent` (`.cs-dropdown-content.cs-listbox`):** `data-size={size}`, `data-arrow-nav` (while arrow/`Home`/`End`/typeahead navigation is active), `data-nav="keyboard"` (suppresses stale pointer `:hover` while keyboard navigation is active), plus `Popover`'s `data-placement`, `data-width`, and `data-animate`.
- **On `DropdownItem` (`.cs-dropdown-item.cs-listbox-item`):** `data-typeahead-label={resolvedLabel || undefined}`, `data-negative` (when `negative` is `true`), `data-disabled` (when disabled).
- **On `DropdownCheckboxItem` (`.cs-dropdown-item.cs-listbox-item`):** `data-typeahead-label={resolvedLabel || undefined}`, `data-checked` (when `checked` is `true`), `data-indeterminate` (when `indeterminate` is `true`), `data-disabled`.
- **On `DropdownRadioItem` (`.cs-dropdown-item.cs-listbox-item`):** `data-value={value}`, `data-typeahead-label={resolvedLabel || undefined}`, `data-checked` (when selected), `data-disabled`.

### CSS Custom Properties

#### Dropdown Tokens (`.cs-dropdown-content.cs-listbox`)

| Variable                           | Default                                                                   | Description                                                                                         |
| :--------------------------------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------- |
| `--cs-dropdown-content-min-width`  | `180px`                                                                   | Minimum inline size of the floating menu panel.                                                     |
| `--cs-dropdown-content-max-width`  | `320px`                                                                   | Maximum inline size forwarded to `--cs-listbox-content-max-width` (clamped to `calc(100vw - 32px)`). |
| `--cs-dropdown-content-max-height` | `min(320px, 60dvh)`                                                       | Maximum block size set by `maxHeight` alongside `--cs-listbox-content-max-height`.                  |
| `--cs-dropdown-header-px`          | `calc(var(--cs-listbox-content-padding) + var(--cs-listbox-item-px))`     | Horizontal padding for pinned `<DropdownHeader>`.                                                   |
| `--cs-dropdown-header-py`          | `8px`                                                                     | Vertical padding for `<DropdownHeader>`.                                                            |
| `--cs-dropdown-footer-px`          | `calc(var(--cs-listbox-content-padding) + var(--cs-listbox-item-px))`     | Horizontal padding for pinned `<DropdownFooter>`.                                                   |
| `--cs-dropdown-footer-py`          | `8px`                                                                     | Vertical padding for `<DropdownFooter>`.                                                            |
| `--cs-dropdown-shortcut-fg`        | `var(--cs-color-text-weaker)`                                             | Shortcut text color (`--cs-color-text-weak` on hover/focus/active; `--cs-color-disabled-fg` when disabled). |
| `--cs-dropdown-item-negative-fg`   | `var(--cs-color-negative-soft-fg)`                                        | Foreground and icon color on `negative` items during hover, focus, and active states.               |
| `--cs-dropdown-item-negative-bg-hover`  | `var(--cs-color-negative-soft)`                                      | Background on `negative` items during hover, `:focus-visible`, and keyboard active states.          |
| `--cs-dropdown-item-negative-bg-active` | `var(--cs-color-negative-soft-hover)`                                | Background on `negative` items during `:active`.                                                    |

#### Shared Listbox Tokens (`.cs-dropdown-content.cs-listbox`)

`DropdownContent` and its items inherit shared surface, geometry, and typography tokens from `listbox.css`:

| Variable                            | Default                                                                                                | Description                                                                   |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| `--cs-listbox-content-bg`           | `var(--cs-color-elevated)`                                                                             | Floating panel background.                                                    |
| `--cs-listbox-content-shadow`       | `var(--cs-shadow-floating)`                                                                            | Floating panel shadow.                                                        |
| `--cs-listbox-content-radius`       | `14px` (`xs`/`sm`), `18px` (`md`/`lg`), `20px` (`xl`)                                                  | Panel outer squircle radius.                                                  |
| `--cs-listbox-content-padding`      | `4px` (`xs`/`sm`), `6px` (`md`–`xl`)                                                                   | Padding inside `.cs-dropdown-list`.                                           |
| `--cs-listbox-content-max-height`   | `min(320px, 60dvh)`                                                                                    | Maximum panel block size (clamped to `calc(100dvh - 32px)`).                  |
| `--cs-listbox-content-max-width`    | `var(--cs-dropdown-content-max-width, 320px)`                                                          | Maximum panel inline size (clamped to `calc(100vw - 32px)`).                  |
| `--cs-listbox-list-gap`             | `2px`                                                                                                  | Vertical gap between items inside `.cs-dropdown-list` and `.cs-dropdown-group`. |
| `--cs-listbox-item-radius`          | `max(var(--cs-radius-lg), calc(var(--cs-listbox-content-radius) - var(--cs-listbox-content-padding)))` | Concentric item radius (`10px` / `12px` / `14px`).                            |
| `--cs-listbox-item-bg`              | `transparent`                                                                                          | Item background at rest.                                                      |
| `--cs-listbox-item-bg-hover`        | `var(--cs-color-base-soft)`                                                                            | Item background on pointer hover and `:focus-visible`.                        |
| `--cs-listbox-item-bg-highlighted`  | `var(--cs-listbox-item-bg-hover)`                                                                      | Item background for keyboard active (`data-roving-active`) and `data-highlighted` rows. |
| `--cs-listbox-item-bg-active`       | `var(--cs-color-base-soft-hover)`                                                                      | Item background on `:active`.                                                 |
| `--cs-listbox-item-fg`              | `var(--cs-color-text-strong)`                                                                          | Item label foreground color.                                                  |
| `--cs-listbox-item-fg-hover`        | `var(--cs-color-text-strong)`                                                                          | Item label foreground color on hover/focus/active.                            |
| `--cs-listbox-item-description-fg`  | `var(--cs-color-text-weak)`                                                                            | Secondary description foreground color.                                       |
| `--cs-listbox-item-icon-fg`         | `var(--cs-color-text-weak)`                                                                            | Item leading icon color (`--cs-color-text-main` on hover/focus/active).       |
| `--cs-listbox-item-indicator-fg`    | `var(--cs-color-accent-soft-fg)`                                                                       | Leading checkbox mark and radio dot color.                                    |
| `--cs-listbox-item-px`              | `8px` (`xs`/`sm`), `10px` (`md`), `12px` (`lg`/`xl`)                                                   | Item horizontal padding (`-2px` on start edge when icon or indicator present). |
| `--cs-listbox-item-py`              | `5px` / `6px` / `7px` / `8px` / `9px`                                                                  | Item vertical padding across `xs`–`xl`.                                       |
| `--cs-listbox-item-min-height`      | `28px` / `30px` / `34px` / `38px` / `42px`                                                             | Minimum item height across `xs`–`xl`.                                         |
| `--cs-listbox-item-gap`             | `6px` (`xs`/`sm`), `8px` (`md`/`lg`), `10px` (`xl`)                                                    | Gap between item slots.                                                       |
| `--cs-listbox-item-font-size`       | `--cs-text-xs` (`xs`/`sm`), `--cs-text-sm` (`md`/`lg`), `--cs-text-base` (`xl`)                        | Item primary text size.                                                       |
| `--cs-listbox-item-title-lh`        | `18px` (`xs`/`sm`), `20px` (`md`/`lg`), `22px` (`xl`)                                                  | Title line-height used for line-1 icon/indicator alignment in multi-line items. |
| `--cs-listbox-icon-size`            | `14px` (`xs`/`sm`), `16px` (`md`/`lg`), `18px` (`xl`)                                                  | Item leading icon and checkbox/radio indicator box size.                      |
| `--cs-listbox-group-gap`            | `6px` (`xs`/`sm`), `10px` (`md`–`xl`)                                                                  | Top margin between adjacent `<DropdownGroup>` blocks.                         |
| `--cs-listbox-group-label-fg`       | `var(--cs-color-text-weak)`                                                                            | Group label text color.                                                       |
| `--cs-listbox-group-label-font-size`| `11px` (`xs`/`sm`), `var(--cs-text-xs)` (`md`–`xl`)                                                    | Group label font size.                                                        |
| `--cs-listbox-separator-bg`         | `color-mix(in oklab, var(--cs-color-text-main) 10%, transparent)`                                      | Hairline separator color.                                                     |

## Examples

### Basic Actions & Keyboard Shortcuts

```svelte
<script lang="ts">
    import { ChevronDown, Copy, Pencil, Trash2 } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        Dropdown,
        DropdownContent,
        DropdownItem,
        DropdownItemIcon,
        DropdownItemShortcut,
        DropdownItemText,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
</script>

<Dropdown size="md">
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
        <ButtonLabel>Actions</ButtonLabel>
        <ButtonIcon icon={ChevronDown} />
    </Button>

    <DropdownContent>
        <DropdownItem onSelect={() => {}}>
            <DropdownItemIcon icon={Pencil} />
            <DropdownItemText>Rename</DropdownItemText>
            <DropdownItemShortcut>
                <Kbd variant="ghost" size="sm">F2</Kbd>
            </DropdownItemShortcut>
        </DropdownItem>
        <DropdownItem onSelect={() => {}}>
            <DropdownItemIcon icon={Copy} />
            <DropdownItemText>Duplicate</DropdownItemText>
            <DropdownItemShortcut>
                <KbdGroup variant="ghost" size="sm">
                    <Kbd symbol="ctrl" />
                    <KbdSeparator />
                    <Kbd>D</Kbd>
                </KbdGroup>
            </DropdownItemShortcut>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem negative onSelect={() => {}}>
            <DropdownItemIcon icon={Trash2} />
            <DropdownItemText>Delete</DropdownItemText>
        </DropdownItem>
    </DropdownContent>
</Dropdown>
```

### Checkbox & Radio Selection

```svelte
<script lang="ts">
    import { ChevronDown } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        Dropdown,
        DropdownCheckboxItem,
        DropdownContent,
        DropdownGroup,
        DropdownGroupLabel,
        DropdownRadioGroup,
        DropdownRadioItem,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";

    let showToolbar = $state(true);
    let showSidebar = $state(false);
    let sortBy = $state("updated");
</script>

<Dropdown size="md">
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
        <ButtonLabel>View</ButtonLabel>
        <ButtonIcon icon={ChevronDown} />
    </Button>

    <DropdownContent>
        <DropdownGroup>
            <DropdownGroupLabel>Panels</DropdownGroupLabel>
            <DropdownCheckboxItem bind:checked={showToolbar}>Toolbar</DropdownCheckboxItem>
            <DropdownCheckboxItem bind:checked={showSidebar}>Sidebar</DropdownCheckboxItem>
        </DropdownGroup>
        <DropdownSeparator />
        <DropdownRadioGroup bind:value={sortBy}>
            <DropdownGroupLabel>Sort by</DropdownGroupLabel>
            <DropdownRadioItem value="name">Name</DropdownRadioItem>
            <DropdownRadioItem value="updated">Last updated</DropdownRadioItem>
            <DropdownRadioItem value="size">Size</DropdownRadioItem>
        </DropdownRadioGroup>
    </DropdownContent>
</Dropdown>
```

### Pinned `header`/`footer`, Descriptions, Links & Inline Widgets

```svelte
<script lang="ts">
    import { ChevronDown, ExternalLink, Zap } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        Dropdown,
        DropdownContent,
        DropdownFooter,
        DropdownHeader,
        DropdownItem,
        DropdownItemDescription,
        DropdownItemIcon,
        DropdownItemText,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";
    import { Switch } from "cs/svelte/switch";

    let compactMode = $state(false);
</script>

<Dropdown size="md">
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
        <ButtonLabel>Workspace</ButtonLabel>
        <ButtonIcon icon={ChevronDown} />
    </Button>

    <DropdownContent maxHeight="240px">
        {#snippet header()}
            <DropdownHeader>
                <div class="text-sm font-medium text-strong">Acme Studio</div>
                <div class="text-xs text-weak">team@acme.dev</div>
            </DropdownHeader>
        {/snippet}

        <DropdownItem>
            <DropdownItemIcon icon={Zap} />
            <DropdownItemText>Quick Actions</DropdownItemText>
            <DropdownItemDescription>Run commands without leaving the page</DropdownItemDescription>
        </DropdownItem>
        <DropdownSeparator />
        <div class="cs-dropdown-row">
            <label class="flex w-full items-center justify-between gap-3">
                <span>Compact mode</span>
                <Switch size="sm" bind:checked={compactMode} />
            </label>
        </div>
        <DropdownSeparator />
        <DropdownItem href="https://example.com" target="_blank" rel="noopener">
            <DropdownItemIcon icon={ExternalLink} />
            <DropdownItemText>Documentation</DropdownItemText>
        </DropdownItem>

        {#snippet footer()}
            <DropdownFooter>
                <span class="text-xs text-weak">v1.0</span>
            </DropdownFooter>
        {/snippet}
    </DropdownContent>
</Dropdown>
```

### Inline Confirm Delete (`TextMorph` + `closeOnSelect` + `onOpenChange`)

```svelte
<script lang="ts">
    import { ChevronDown, Copy, Pencil, Trash2 } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        Dropdown,
        DropdownContent,
        DropdownItem,
        DropdownItemIcon,
        DropdownItemText,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";
    import { TextMorph } from "cs/svelte/text-morph";

    let confirmDelete = $state(false);
</script>

<Dropdown
    size="md"
    onOpenChange={(open) => {
        if (!open) confirmDelete = false;
    }}
>
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
        <ButtonLabel>Project</ButtonLabel>
        <ButtonIcon icon={ChevronDown} />
    </Button>

    <DropdownContent>
        <DropdownItem>
            <DropdownItemIcon icon={Pencil} />
            <DropdownItemText>Rename</DropdownItemText>
        </DropdownItem>
        <DropdownItem>
            <DropdownItemIcon icon={Copy} />
            <DropdownItemText>Duplicate</DropdownItemText>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
            negative
            closeOnSelect={confirmDelete}
            onSelect={(event) => {
                if (!confirmDelete) {
                    event.preventDefault();
                    confirmDelete = true;
                    return;
                }
                // Perform destructive action here
            }}
        >
            <DropdownItemIcon icon={Trash2} />
            <DropdownItemText>
                <TextMorph text={confirmDelete ? "Confirm delete?" : "Delete"} />
            </DropdownItemText>
        </DropdownItem>
    </DropdownContent>
</Dropdown>
```

## Behavior & Quirks

- **Attachment-based trigger (`dropdownTrigger`) & headless `<Dropdown>`:** `<Dropdown>` renders no wrapper element, and there is no `<DropdownTrigger>` wrapper component—attach `{@attach dropdownTrigger()}` directly to any `<Button>`, `<button>`, or `HTMLElement` inside `<Dropdown>`. If the trigger element already has an `id`, `Dropdown` adopts it for `aria-labelledby` on `DropdownContent`; otherwise it assigns `${id ?? generatedId}-trigger` (and `${id ?? generatedId}-menu` for the menu). Never pass a non-bound expression to `$bindable` `open`; use `bind:open` or `bind:open={get, set}`.
- **Press-drag-release (`triggerOn: "pointerdown"` vs. `"click"`):**
  - `"pointerdown"` (default): Mouse `pointerdown` opens immediately and starts drag tracking (`>= 4px` travel or `>= 180ms` hold); releasing `pointerup` over any enabled item activates it (or clicks the `<a>` element for `href` items) in a single gesture. Touch and keyboard still activate on `click` / `keydown`.
  - `"click"`: Opens on standard `click` release without press-drag-release tracking.
- **Pinned `header`/`footer` snippets vs. `children`:** `DropdownContent` places `header?.()` above and `footer?.()` below `<ScrollArea>`, keeping them pinned outside the scrollport while `children` scroll inside `.cs-dropdown-list`. If you place `<DropdownHeader>` or `<DropdownFooter>` directly inside `children` instead of the `header`/`footer` snippets, they scroll with the items and `dropdown.css` adjusts their `padding-inline` to `--cs-listbox-item-px` to align with item text. Never nest another `<ScrollArea>` inside `<DropdownContent>`.
- **Keyboard navigation & `rovingFocus`:**
  - **Trigger:** When closed, `ArrowDown`, `Enter`, and `Space` open the menu and focus the first enabled item; `ArrowUp` opens and focuses the last enabled item. When open, `Escape` closes the menu and restores focus to the trigger.
  - **Open menu:** `rovingFocus` (`orientation: "vertical"`, `loop: true`, `homeEnd: true`, `preventScroll: true`) manages focus across `.cs-dropdown-item:not([data-disabled])` with printable-character typeahead (`data-typeahead-label || data-label || textContent`). Arrow/`Home`/`End`/typeahead navigation sets `data-arrow-nav` and `data-nav="keyboard"` to suppress `:focus-visible` outlines and stale pointer `:hover` until mouse `pointermove` (which moves focus onto `.cs-dropdown-list` so clearing `data-arrow-nav` does not flash `:focus-visible`) or `pointerdown`.
  - **Activation & focus:** `Enter` and `Space` (when not mid-typeahead) activate the focused item (`Enter` on `href` items lets the native `<a>` click fire once without duplicating `onSelect`). `Tab` on a `.cs-dropdown-item` synchronously closes the menu and focuses `triggerRef` before browser `Tab` traversal leaves the top-layer popover. Focusing an external `Node` (`focusout`) closes the menu without stealing focus back (`restoreFocus: false`).
- **Custom widget coexistence (`.cs-dropdown-row`):** Use `.cs-dropdown-row` for non-menuitem controls (such as an inline `<Switch>`). `DropdownContent` attaches `guardCustomWidgetKeys` to `<ScrollAreaContent>` so `keydown` events originating inside interactive widgets outside `.cs-dropdown-item` (`input`, `textarea`, `select`, `[contenteditable]`, `button`, `a[href]`, `summary`, `[role="switch"]`, `[role="slider"]`, `[role="spinbutton"]`, `[role="checkbox"]`, `[role="radio"]`, `[role="textbox"]`, `[role="combobox"]`, `[role="listbox"]`) call `event.stopImmediatePropagation()` before `rovingFocus` can hijack arrow/typeahead keys, and bypass `Tab` / `data-arrow-nav` handling in `DropdownContent`.
