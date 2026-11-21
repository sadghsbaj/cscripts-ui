---
name: ContextMenu
kind: hybrid
import: cs/svelte/context-menu
exports:
    - ContextMenu
    - ContextMenuContent
    - ContextMenuHeader
    - ContextMenuFooter
    - ContextMenuGroup
    - ContextMenuGroupLabel
    - ContextMenuItem
    - ContextMenuCheckboxItem
    - ContextMenuRadioGroup
    - ContextMenuRadioItem
    - ContextMenuItemIcon
    - ContextMenuItemText
    - ContextMenuItemDescription
    - ContextMenuItemShortcut
    - ContextMenuSeparator
    - contextMenuTrigger
    - CONTEXT_MENU_SIZES
    - ContextMenuSize
    - ContextMenuTriggerOptions
    - ContextMenuIconComponentProps
    - ContextMenuProps
    - ContextMenuContentProps
    - ContextMenuHeaderProps
    - ContextMenuFooterProps
    - ContextMenuGroupProps
    - ContextMenuGroupLabelProps
    - ContextMenuItemProps
    - ContextMenuCheckboxItemProps
    - ContextMenuRadioGroupProps
    - ContextMenuRadioItemProps
    - ContextMenuItemIconProps
    - ContextMenuItemTextProps
    - ContextMenuItemDescriptionProps
    - ContextMenuItemShortcutProps
    - ContextMenuSeparatorProps
---

# ContextMenu

## Overview

Cursor-anchored action menu triggered by right-click (`contextmenu`) or `Shift+F10` / `ContextMenu` on any surface via the `contextMenuTrigger` attachment, rendered in a top-layer `Popover` (`ContextMenuContent`) anchored to a virtual `0px × 0px` viewport point. Built on `rovingFocus`, `ScrollArea`, `scrollFade`, and shared `listbox` styling, it supports 1:1 or N:1 shared triggers, action and link (`href`) items, checkbox and radio selection items, keyboard shortcuts (`ContextMenuItemShortcut`), pinned `header`/`footer` regions, inline custom widgets, and right-button drag-release activation.

## API

### `contextMenuTrigger(options?: ContextMenuTriggerOptions): Attachment<HTMLElement>`

Attaches to one or more trigger elements inside `<ContextMenu>` (cards, rows, canvases, or regions) to intercept `contextmenu` and `Shift+F10` / `ContextMenu` keydown events without altering left-click behavior or injecting `aria-haspopup`/`aria-expanded` attributes.

| Option    | Type                                       | Required | Default     | Description                                                                                             |
| :-------- | :----------------------------------------- | :------- | :---------- | :------------------------------------------------------------------------------------------------------ |
| `enabled` | `boolean \| (() => boolean)`               | No       | `true`      | Enables or disables this trigger attachment (combined with `!contextMenu.disabled`).                    |
| `onOpen`  | `(event: MouseEvent \| KeyboardEvent) => void` | No   | `undefined` | Fires when this trigger opens the menu (useful for identifying the clicked row/item in N:1 setups).    |

### `ContextMenu` Props

Headless context root (renders `children` with no wrapper DOM element).

| Prop           | Type                      | Required | Default     | Description                                                                                             |
| :------------- | :------------------------ | :------- | :---------- | :------------------------------------------------------------------------------------------------------ |
| `size`         | `ContextMenuSize`         | Yes      | —           | T-shirt scale matching `Dropdown`, `Select`, `Combobox`, and `Button`: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `open`         | `boolean`                 | No       | `false`     | `$bindable` popover open state. Supports `bind:open` and `bind:open={get, set}`.                        |
| `onOpenChange` | `(open: boolean) => void` | No       | `undefined` | Fires whenever the open state changes.                                                                  |
| `disabled`     | `boolean`                 | No       | `false`     | Disables trigger interception and all items, and closes the menu if open.                               |
| `id`           | `string`                  | No       | `undefined` | Optional ID base for virtual anchor / menu ARIA wiring (defaults to `$props.id()`, yielding `${id}-menu`). |
| `children`     | `Snippet`                 | No       | `undefined` | Trigger elements with `{@attach contextMenuTrigger()}` and `<ContextMenuContent>`.                      |

### `ContextMenuContent` Props

Extends `Omit<PopoverProps, "id" | "placement" | "width" | "offset">`. Renders a sibling `<span class="cs-context-menu-anchor" aria-hidden="true">` positioned at `(anchorX, anchorY)` followed by `<Popover role="menu" width="content">` wrapping `header?.()`, `<ScrollArea size="sm" direction="vertical" {scrollbar}>` with `<ScrollAreaContent class="cs-context-menu-list cs-listbox-list">`, and `footer?.()`.

| Prop         | Type                                | Required | Default               | Description                                                                                           |
| :----------- | :---------------------------------- | :------- | :-------------------- | :---------------------------------------------------------------------------------------------------- |
| `id`         | `string`                            | No       | `contextMenu.menuId`  | Optional ID override for the floating menu popover and `--anchor-${id}` pairing.                      |
| `placement`  | `PopoverPlacement`                  | No       | `"bottom-start"`      | Anchor placement relative to the virtual cursor point (`Popover` flips automatically near edges).     |
| `offset`     | `string`                            | No       | `"2px"`               | Gap between the virtual cursor point and `ContextMenuContent` (`--cs-popover-offset`).               |
| `maxHeight`  | `string`                            | No       | `"min(320px, 60dvh)"` | Maximum block size before internal `ScrollArea` scrolls (`--cs-context-menu-content-max-height`).     |
| `scrollbar`  | `ScrollAreaScrollbar`               | No       | `"hover"`             | Scrollbar visibility mode forwarded to `ScrollArea`: `"hover" \| "always" \| "never"`.                |
| `animate`    | `boolean`                           | No       | `true`                | Enables `Popover` directional spring + blur entrance/exit transitions.                                |
| `popover`    | `"" \| "auto" \| "manual" \| "hint"` | No      | `"auto"`              | Native HTML `popover` attribute inherited from `PopoverProps`.                                        |
| `aria-label` | `string`                            | No       | `"Context menu"` (EN) / `"Kontextmenü"` (DE) | Fallback accessible label when `aria-labelledby` is not provided.                             |
| `header`     | `Snippet`                           | No       | `undefined`           | Optional pinned header rendered above the scrollable list (outside `ScrollArea`).                     |
| `footer`     | `Snippet`                           | No       | `undefined`           | Optional pinned footer rendered below the scrollable list (outside `ScrollArea`).                     |
| `ref`        | `HTMLDivElement \| null`            | No       | `null`                | `$bindable` reference to the popover `<div>`.                                                         |
| `children`   | `Snippet`                           | No       | `undefined`           | `<ContextMenuItem>`, `<ContextMenuCheckboxItem>`, `<ContextMenuRadioGroup>`, `<ContextMenuGroup>`, etc. |

*(Note: `width` is fixed to `"content"` internally because `"anchor"` and `"min-anchor"` are not meaningful against a `0px × 0px` virtual point anchor.)*

### `ContextMenuItem` Props

Extends `Omit<HTMLAttributes<HTMLElement>, "children">` and `Pick<HTMLAnchorAttributes, "href" | "target" | "rel" | "download" | "hreflang" | "referrerpolicy">`. Renders `<a role="menuitem" tabindex={-1}>` when `href` is defined, or `<div role="menuitem" tabindex={-1}>` otherwise.

| Prop            | Type                                           | Required | Default     | Description                                                                                                             |
| :-------------- | :--------------------------------------------- | :------- | :---------- | :---------------------------------------------------------------------------------------------------------------------- |
| `icon`          | `Component<ContextMenuIconComponentProps>`     | No       | `undefined` | Shorthand leading icon component (alternative to `<ContextMenuItemIcon>`).                                              |
| `label`         | `string`                                       | No       | `undefined` | Explicit typeahead label override (falls back to `<ContextMenuItemText>` or `.cs-context-menu-item-content` text).      |
| `negative`      | `boolean`                                      | No       | `false`     | Marks the item as a destructive/negative action (`data-negative`).                                                      |
| `disabled`      | `boolean`                                      | No       | `false`     | Disables this item (`contextMenu.disabled \|\| disabled`), skipping it in hover, roving focus, typeahead, and select.   |
| `closeOnSelect` | `boolean`                                      | No       | `true`      | Closes the menu after `onSelect` unless `false` or `event.preventDefault()` is called.                                  |
| `onSelect`      | `(event: MouseEvent \| KeyboardEvent) => void` | No       | `undefined` | Fires when activated via click, right-button drag-release, `Enter`, or `Space`.                                         |
| `href`          | `string`                                       | No       | `undefined` | Renders the item as an `<a>` element (omitted from DOM when disabled).                                                  |
| `ref`           | `HTMLElement \| null`                          | No       | `null`      | `$bindable` reference to the `<div>` or `<a>` element.                                                                  |
| `children`      | `Snippet`                                      | No       | `undefined` | Plain text or compound subcomponents (`ContextMenuItemIcon`, `ContextMenuItemText`, `ContextMenuItemDescription`, `ContextMenuItemShortcut`). |

### `ContextMenuCheckboxItem` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="menuitemcheckbox" tabindex={-1}>` with a leading `<CheckboxMark>`.

| Prop              | Type                                           | Required | Default     | Description                                                                                    |
| :---------------- | :--------------------------------------------- | :------- | :---------- | :--------------------------------------------------------------------------------------------- |
| `checked`         | `boolean`                                      | No       | `false`     | `$bindable` checked state.                                                                     |
| `onCheckedChange` | `(checked: boolean) => void`                   | No       | `undefined` | Fires when `checked` toggles.                                                                  |
| `indeterminate`   | `boolean`                                      | No       | `false`     | Sets `aria-checked="mixed"` and renders the indeterminate mark when `true`.                    |
| `icon`            | `Component<ContextMenuIconComponentProps>`     | No       | `undefined` | Shorthand icon component rendered inside `.cs-context-menu-item-content` after the mark.       |
| `label`           | `string`                                       | No       | `undefined` | Explicit typeahead label override.                                                             |
| `disabled`        | `boolean`                                      | No       | `false`     | Disables this item (`contextMenu.disabled \|\| disabled`).                                     |
| `closeOnSelect`   | `boolean`                                      | No       | `false`     | Closes the menu after toggling when `true`.                                                    |
| `onSelect`        | `(event: MouseEvent \| KeyboardEvent) => void` | No       | `undefined` | Fires before toggling; calling `event.preventDefault()` cancels both toggling and closing.     |
| `ref`             | `HTMLDivElement \| null`                       | No       | `null`      | `$bindable` reference to the `<div>`.                                                          |
| `children`        | `Snippet`                                      | No       | `undefined` | Label text or item subcomponents.                                                              |

### `ContextMenuRadioGroup` & `ContextMenuRadioItem` Props

#### `ContextMenuRadioGroup` (`ContextMenuRadioGroupProps<T extends string = string>`)

Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div role="group" class="cs-context-menu-radio-group cs-listbox-group">`.

| Prop            | Type                     | Required | Default     | Description                                                    |
| :-------------- | :----------------------- | :------- | :---------- | :------------------------------------------------------------- |
| `value`         | `T \| undefined`         | No       | `undefined` | `$bindable` selected radio value.                              |
| `onValueChange` | `(value: T) => void`     | No       | `undefined` | Fires when a different radio item value is selected.           |
| `ref`           | `HTMLDivElement \| null` | No       | `null`      | `$bindable` reference to the `<div>`.                          |
| `children`      | `Snippet`                | No       | `undefined` | `<ContextMenuRadioItem>` and optional `<ContextMenuGroupLabel>`. |

#### `ContextMenuRadioItem` (`ContextMenuRadioItemProps<T extends string = string>`)

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="menuitemradio" tabindex={-1}>` with a leading radio dot indicator.

| Prop            | Type                                           | Required | Default     | Description                                                                                          |
| :-------------- | :--------------------------------------------- | :------- | :---------- | :--------------------------------------------------------------------------------------------------- |
| `value`         | `T`                                            | Yes      | —           | Radio option value emitted when selected (`data-value={value}`).                                     |
| `icon`          | `Component<ContextMenuIconComponentProps>`     | No       | `undefined` | Shorthand icon component rendered inside `.cs-context-menu-item-content` after the radio dot.        |
| `label`         | `string`                                       | No       | `undefined` | Explicit typeahead label override (falls back to `<ContextMenuItemText>`, content text, or `value`). |
| `disabled`      | `boolean`                                      | No       | `false`     | Disables this item (`contextMenu.disabled \|\| disabled`).                                           |
| `closeOnSelect` | `boolean`                                      | No       | `false`     | Closes the menu after selection when `true`.                                                         |
| `onSelect`      | `(event: MouseEvent \| KeyboardEvent) => void` | No       | `undefined` | Fires before selecting; calling `event.preventDefault()` cancels both selection and closing.         |
| `ref`           | `HTMLDivElement \| null`                       | No       | `null`      | `$bindable` reference to the `<div>`.                                                                |
| `children`      | `Snippet`                                      | No       | `undefined` | Label text or item subcomponents.                                                                    |

### Subcomponents (`ContextMenuHeader`, `ContextMenuFooter`, `ContextMenuGroup`, `ContextMenuGroupLabel`, `ContextMenuSeparator`, `ContextMenuItemIcon`, `ContextMenuItemText`, `ContextMenuItemDescription`, `ContextMenuItemShortcut`)

- **`ContextMenuHeader`** (`ContextMenuHeaderProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div class="cs-context-menu-header">` with non-shrinking layout and header padding.
- **`ContextMenuFooter`** (`ContextMenuFooterProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div class="cs-context-menu-footer">` with non-shrinking layout and footer padding.
- **`ContextMenuGroup`** (`ContextMenuGroupProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div role="group" aria-labelledby={labelId} class="cs-context-menu-group cs-listbox-group">`.
- **`ContextMenuGroupLabel`** (`ContextMenuGroupLabelProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Generates an `id` (`id ?? $props.id()`), registers it with the parent `ContextMenuGroup`, and renders `<div role="presentation" class="cs-context-menu-group-label cs-listbox-group-label">`.
- **`ContextMenuSeparator`** (`ContextMenuSeparatorProps` extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`, `ref = $bindable(null)`): Renders `<div role="separator" aria-orientation="horizontal" class="cs-context-menu-separator cs-listbox-separator">`.
- **`ContextMenuItemIcon`** (`ContextMenuItemIconProps` extending `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): Props `{ icon: Component<ContextMenuIconComponentProps>; color?: string; ...SVGAttributes }`. Renders `<Icon aria-hidden="true" {color} class="cs-context-menu-item-icon cs-listbox-item-icon" />`.
- **`ContextMenuItemText`** (`ContextMenuItemTextProps` extending `HTMLAttributes<HTMLSpanElement>`, `ref = $bindable(null)`): Renders `<span class="cs-context-menu-item-text cs-listbox-item-text">` and registers the primary label node for typeahead label extraction.
- **`ContextMenuItemDescription`** (`ContextMenuItemDescriptionProps` extending `HTMLAttributes<HTMLParagraphElement>`, `ref = $bindable(null)`): Renders `<p class="cs-context-menu-item-description cs-listbox-item-description">` below `ContextMenuItemText`, excluded from typeahead label extraction, and switches the row to line-1 optical alignment.
- **`ContextMenuItemShortcut`** (`ContextMenuItemShortcutProps` extending `HTMLAttributes<HTMLSpanElement>`, `ref = $bindable(null)`): Renders `<span aria-hidden="true" class="cs-context-menu-item-shortcut">` for trailing keyboard shortcut hints (such as `<Kbd>` or `<KbdGroup>`).

### Exported Constants & Types

- `CONTEXT_MENU_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` (`ContextMenuSize`)
- `ContextMenuTriggerOptions`, `ContextMenuIconComponentProps`
- `ContextMenuProps`, `ContextMenuContentProps`, `ContextMenuHeaderProps`, `ContextMenuFooterProps`, `ContextMenuGroupProps`, `ContextMenuGroupLabelProps`, `ContextMenuItemProps`, `ContextMenuCheckboxItemProps`, `ContextMenuRadioGroupProps<T>`, `ContextMenuRadioItemProps<T>`, `ContextMenuItemIconProps`, `ContextMenuItemTextProps`, `ContextMenuItemDescriptionProps`, `ContextMenuItemShortcutProps`, `ContextMenuSeparatorProps`

### `data-*` Attributes

- **On active trigger element (`contextMenuTrigger`):** `data-open` (set only on the most recently triggered element while `open` is `true`, enabling active-target styling in 1:1 or N:1 setups).
- **On `ContextMenuContent` (`.cs-context-menu-content.cs-listbox`):** `data-size={size}`, `data-arrow-nav` (while arrow/`Home`/`End`/typeahead navigation is active), `data-nav="keyboard"` (suppresses stale pointer `:hover` while keyboard navigation is active), `data-instant` (during a single-frame reposition when re-right-clicking while already open), plus `Popover`'s `data-placement`, `data-width`, and `data-animate`.
- **On `ContextMenuItem` (`.cs-context-menu-item.cs-listbox-item`):** `data-typeahead-label={resolvedLabel || undefined}`, `data-negative` (when `negative` is `true`), `data-disabled` (when disabled).
- **On `ContextMenuCheckboxItem` (`.cs-context-menu-item.cs-listbox-item`):** `data-typeahead-label={resolvedLabel || undefined}`, `data-checked` (when `checked` is `true`), `data-indeterminate` (when `indeterminate` is `true`), `data-disabled`.
- **On `ContextMenuRadioItem` (`.cs-context-menu-item.cs-listbox-item`):** `data-value={value}`, `data-typeahead-label={resolvedLabel || undefined}`, `data-checked` (when selected), `data-disabled`.

### CSS Custom Properties

#### ContextMenu Tokens (`.cs-context-menu-content.cs-listbox`)

| Variable                                   | Default                                                                   | Description                                                                                                 |
| :----------------------------------------- | :------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------- |
| `--cs-context-menu-content-min-width`      | `180px`                                                                   | Minimum inline size of the floating menu panel.                                                             |
| `--cs-context-menu-content-max-width`      | `320px`                                                                   | Maximum inline size forwarded to `--cs-listbox-content-max-width` (clamped to `calc(100vw - 32px)`).        |
| `--cs-context-menu-content-max-height`     | `min(320px, 60dvh)`                                                       | Maximum block size set by `maxHeight` alongside `--cs-listbox-content-max-height`.                          |
| `--cs-context-menu-header-px`              | `calc(var(--cs-listbox-content-padding) + var(--cs-listbox-item-px))`     | Horizontal padding for pinned `<ContextMenuHeader>`.                                                        |
| `--cs-context-menu-header-py`              | `8px`                                                                     | Vertical padding for `<ContextMenuHeader>`.                                                                 |
| `--cs-context-menu-footer-px`              | `calc(var(--cs-listbox-content-padding) + var(--cs-listbox-item-px))`     | Horizontal padding for pinned `<ContextMenuFooter>`.                                                        |
| `--cs-context-menu-footer-py`              | `8px`                                                                     | Vertical padding for `<ContextMenuFooter>`.                                                                 |
| `--cs-context-menu-shortcut-fg`            | `var(--cs-color-text-weaker)`                                             | Shortcut text color (`--cs-color-text-weak` on hover/focus/active; `--cs-color-disabled-fg` when disabled). |
| `--cs-context-menu-item-negative-fg`       | `var(--cs-color-negative-soft-fg)`                                        | Foreground and icon color on `negative` items during hover, focus, and active states.                       |
| `--cs-context-menu-item-negative-bg-hover` | `var(--cs-color-negative-soft)`                                           | Background on `negative` items during hover, `:focus-visible`, and keyboard active states.                  |
| `--cs-context-menu-item-negative-bg-active`| `var(--cs-color-negative-soft-hover)`                                     | Background on `negative` items during `:active`.                                                            |

`ContextMenuContent` also tunes `Popover`'s `--cs-popover-anim-*` tokens locally (`--cs-popover-anim-distance: 4px`, `--cs-popover-anim-scale-start: 0.92`, `--cs-popover-anim-scale-exit: 0.96`, `--cs-popover-anim-blur-start: 2.5px`, `--cs-popover-anim-blur-exit: 1.5px`, `--cs-popover-anim-dur-in: var(--cs-dur-enter-sm)`, `--cs-popover-anim-dur-out: var(--cs-dur-exit-sm)`).

#### Shared Listbox Tokens (`.cs-context-menu-content.cs-listbox`)

`ContextMenuContent` and its items inherit shared surface, geometry, and typography tokens from `listbox.css`:

| Variable                             | Default                                                                                                | Description                                                                             |
| :----------------------------------- | :----------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `--cs-listbox-content-bg`            | `var(--cs-color-elevated)`                                                                             | Floating panel background.                                                              |
| `--cs-listbox-content-shadow`        | `var(--cs-shadow-floating)`                                                                            | Floating panel shadow.                                                                  |
| `--cs-listbox-content-radius`        | `14px` (`xs`/`sm`), `18px` (`md`/`lg`), `20px` (`xl`)                                                  | Panel outer squircle radius.                                                            |
| `--cs-listbox-content-padding`       | `4px` (`xs`/`sm`), `6px` (`md`–`xl`)                                                                   | Padding inside `.cs-context-menu-list`.                                                 |
| `--cs-listbox-content-max-height`    | `min(320px, 60dvh)`                                                                                    | Maximum panel block size (clamped to `calc(100dvh - 32px)`).                            |
| `--cs-listbox-content-max-width`     | `var(--cs-context-menu-content-max-width, 320px)`                                                      | Maximum panel inline size (clamped to `calc(100vw - 32px)`).                            |
| `--cs-listbox-list-gap`              | `2px`                                                                                                  | Vertical gap between items inside `.cs-context-menu-list` and `.cs-context-menu-group`. |
| `--cs-listbox-item-radius`           | `max(var(--cs-radius-lg), calc(var(--cs-listbox-content-radius) - var(--cs-listbox-content-padding)))` | Concentric item radius (`10px` / `12px` / `14px`).                                      |
| `--cs-listbox-item-bg`               | `transparent`                                                                                          | Item background at rest.                                                                |
| `--cs-listbox-item-bg-hover`         | `var(--cs-color-base-soft)`                                                                            | Item background on pointer hover and `:focus-visible`.                                  |
| `--cs-listbox-item-bg-highlighted`   | `var(--cs-listbox-item-bg-hover)`                                                                      | Item background for keyboard active (`data-roving-active`) and `data-highlighted` rows. |
| `--cs-listbox-item-bg-active`        | `var(--cs-color-base-soft-hover)`                                                                      | Item background on `:active`.                                                           |
| `--cs-listbox-item-fg`               | `var(--cs-color-text-strong)`                                                                          | Item label foreground color.                                                            |
| `--cs-listbox-item-fg-hover`         | `var(--cs-color-text-strong)`                                                                          | Item label foreground color on hover/focus/active.                                      |
| `--cs-listbox-item-description-fg`   | `var(--cs-color-text-weak)`                                                                            | Secondary description foreground color.                                                 |
| `--cs-listbox-item-icon-fg`          | `var(--cs-color-text-weak)`                                                                            | Item leading icon color (`--cs-color-text-main` on hover/focus/active).                 |
| `--cs-listbox-item-indicator-fg`     | `var(--cs-color-accent-soft-fg)`                                                                       | Leading checkbox mark and radio dot color.                                              |
| `--cs-listbox-item-px`               | `8px` (`xs`/`sm`), `10px` (`md`), `12px` (`lg`/`xl`)                                                   | Item horizontal padding (`-2px` on start edge when icon or indicator present).          |
| `--cs-listbox-item-py`               | `5px` / `6px` / `7px` / `8px` / `9px`                                                                  | Item vertical padding across `xs`–`xl`.                                                 |
| `--cs-listbox-item-min-height`       | `28px` / `30px` / `34px` / `38px` / `42px`                                                             | Minimum item height across `xs`–`xl`.                                                   |
| `--cs-listbox-item-gap`              | `6px` (`xs`/`sm`), `8px` (`md`/`lg`), `10px` (`xl`)                                                    | Gap between item slots.                                                                 |
| `--cs-listbox-item-font-size`        | `--cs-text-xs` (`xs`/`sm`), `--cs-text-sm` (`md`/`lg`), `--cs-text-base` (`xl`)                        | Item primary text size.                                                                 |
| `--cs-listbox-item-title-lh`         | `18px` (`xs`/`sm`), `20px` (`md`/`lg`), `22px` (`xl`)                                                  | Title line-height used for line-1 icon/indicator alignment in multi-line items.         |
| `--cs-listbox-icon-size`             | `14px` (`xs`/`sm`), `16px` (`md`/`lg`), `18px` (`xl`)                                                  | Item leading icon and checkbox/radio indicator box size.                                |
| `--cs-listbox-group-gap`             | `6px` (`xs`/`sm`), `10px` (`md`–`xl`)                                                                  | Top margin between adjacent `<ContextMenuGroup>` blocks.                                |
| `--cs-listbox-group-label-fg`        | `var(--cs-color-text-weak)`                                                                            | Group label text color.                                                                 |
| `--cs-listbox-group-label-font-size` | `11px` (`xs`/`sm`), `var(--cs-text-xs)` (`md`–`xl`)                                                    | Group label font size.                                                                  |
| `--cs-listbox-separator-bg`          | `color-mix(in oklab, var(--cs-color-text-main) 10%, transparent)`                                      | Hairline separator color.                                                               |

## Examples

### Basic Actions & Keyboard Shortcuts

```svelte
<script lang="ts">
    import { Copy, Pencil, Trash2 } from "@lucide/svelte";
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuItem,
        ContextMenuItemIcon,
        ContextMenuItemShortcut,
        ContextMenuItemText,
        ContextMenuSeparator,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
</script>

<ContextMenu size="md">
    <div tabindex="0" class="file-card" {@attach contextMenuTrigger()}>
        Q4 Product Roadmap.fig
    </div>

    <ContextMenuContent>
        <ContextMenuItem onSelect={() => {}}>
            <ContextMenuItemIcon icon={Pencil} />
            <ContextMenuItemText>Rename</ContextMenuItemText>
            <ContextMenuItemShortcut>
                <Kbd variant="ghost" size="sm">F2</Kbd>
            </ContextMenuItemShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => {}}>
            <ContextMenuItemIcon icon={Copy} />
            <ContextMenuItemText>Duplicate</ContextMenuItemText>
            <ContextMenuItemShortcut>
                <KbdGroup variant="ghost" size="sm">
                    <Kbd symbol="ctrl" />
                    <KbdSeparator />
                    <Kbd>D</Kbd>
                </KbdGroup>
            </ContextMenuItemShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem negative onSelect={() => {}}>
            <ContextMenuItemIcon icon={Trash2} />
            <ContextMenuItemText>Delete</ContextMenuItemText>
        </ContextMenuItem>
    </ContextMenuContent>
</ContextMenu>
```

### N:1 Shared Menu Across Multiple Triggers

```svelte
<script lang="ts">
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuHeader,
        ContextMenuItem,
        ContextMenuSeparator,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";

    const files = ["Design Tokens.json", "Marketing Hero.png", "Release Notes.md"];
    let activeFile = $state(files[0]);
</script>

<ContextMenu size="md">
    {#each files as file (file)}
        <div
            tabindex="0"
            class="file-row"
            {@attach contextMenuTrigger({ onOpen: () => (activeFile = file) })}
        >
            {file}
        </div>
    {/each}

    <ContextMenuContent>
        {#snippet header()}
            <ContextMenuHeader>
                <div class="text-sm font-medium text-strong">{activeFile}</div>
            </ContextMenuHeader>
        {/snippet}

        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem negative>Delete</ContextMenuItem>
    </ContextMenuContent>
</ContextMenu>
```

### Checkbox & Radio Selection

```svelte
<script lang="ts">
    import {
        ContextMenu,
        ContextMenuCheckboxItem,
        ContextMenuContent,
        ContextMenuGroup,
        ContextMenuGroupLabel,
        ContextMenuRadioGroup,
        ContextMenuRadioItem,
        ContextMenuSeparator,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";

    let showGrid = $state(true);
    let showRulers = $state(false);
    let snapMode = $state("pixel");
</script>

<ContextMenu size="md">
    <div tabindex="0" class="canvas-surface" {@attach contextMenuTrigger()}>
        Canvas Viewport
    </div>

    <ContextMenuContent>
        <ContextMenuGroup>
            <ContextMenuGroupLabel>Overlays</ContextMenuGroupLabel>
            <ContextMenuCheckboxItem bind:checked={showGrid}>Grid</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem bind:checked={showRulers}>Rulers</ContextMenuCheckboxItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup bind:value={snapMode}>
            <ContextMenuGroupLabel>Snap to</ContextMenuGroupLabel>
            <ContextMenuRadioItem value="pixel">Pixel grid</ContextMenuRadioItem>
            <ContextMenuRadioItem value="objects">Objects</ContextMenuRadioItem>
            <ContextMenuRadioItem value="none">Off</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
    </ContextMenuContent>
</ContextMenu>
```

### Pinned `header`/`footer`, Descriptions, Links & Inline Widgets

```svelte
<script lang="ts">
    import { ExternalLink, Zap } from "@lucide/svelte";
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuFooter,
        ContextMenuHeader,
        ContextMenuItem,
        ContextMenuItemDescription,
        ContextMenuItemIcon,
        ContextMenuItemText,
        ContextMenuSeparator,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";
    import { Switch } from "cs/svelte/switch";

    let compactMode = $state(false);
</script>

<ContextMenu size="md">
    <div tabindex="0" class="workspace-card" {@attach contextMenuTrigger()}>
        Acme Studio
    </div>

    <ContextMenuContent maxHeight="240px">
        {#snippet header()}
            <ContextMenuHeader>
                <div class="text-sm font-medium text-strong">Acme Studio</div>
                <div class="text-xs text-weak">team@acme.dev</div>
            </ContextMenuHeader>
        {/snippet}

        <ContextMenuItem>
            <ContextMenuItemIcon icon={Zap} />
            <ContextMenuItemText>Quick Actions</ContextMenuItemText>
            <ContextMenuItemDescription>Run commands without leaving the canvas</ContextMenuItemDescription>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <div class="cs-context-menu-row">
            <label class="flex w-full items-center justify-between gap-3">
                <span>Compact mode</span>
                <Switch size="sm" bind:checked={compactMode} />
            </label>
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem href="https://example.com" target="_blank" rel="noopener">
            <ContextMenuItemIcon icon={ExternalLink} />
            <ContextMenuItemText>Documentation</ContextMenuItemText>
        </ContextMenuItem>

        {#snippet footer()}
            <ContextMenuFooter>
                <span class="text-xs text-weak">v1.0</span>
            </ContextMenuFooter>
        {/snippet}
    </ContextMenuContent>
</ContextMenu>
```

## Behavior & Quirks

- **Attachment-based trigger (`contextMenuTrigger`) & N:1 sharing:** `<ContextMenu>` renders no wrapper DOM element, and multiple triggers inside `<ContextMenu>` can share a single `<ContextMenuContent>`. Left-clicking (`button === 0`) is left completely untouched. Only the most recently triggered element receives `data-open` while `open` is `true`, and its `onOpen(event)` callback runs right before opening. When `enabled` is `false` (or `ContextMenu` `disabled` is `true`), `event.preventDefault()` is not called, allowing the browser's native context menu to appear.
- **Virtual `0px × 0px` cursor anchor & instant reposition:** `ContextMenuContent` renders a non-interactive fixed `.cs-context-menu-anchor` clamped to `[4px, innerWidth - 4px]` × `[4px, innerHeight - 4px]` (pointer opens use `(clientX, clientY)`; `Shift+F10` / `ContextMenu` opens use the optical center of the focused element inside the trigger, or the trigger itself). Right-clicking a new location while already open updates the coordinates and sets `data-instant` for one animation frame so the panel snaps without replaying exit/enter transitions.
- **Pointer vs. keyboard open & focus restoration:**
  - **Pointer open (`contextmenu`):** Focuses `.cs-context-menu-list` (`listRef`) instead of item 0 so the first item is never pre-highlighted on right-click, and does **not** restore focus to the trigger on close.
  - **Keyboard open (`Shift+F10` or `ContextMenu` key):** Captures the active element (or trigger) before opening, focuses the first enabled `.cs-context-menu-item` with `data-nav="keyboard"` and `data-arrow-nav`, and restores focus to the captured element on `Escape`, `Tab`, or item activation. Focusing an external `Node` (`focusout`) closes the menu without stealing focus (`restoreFocus: false`).
- **Right-button drag-release gating:** Opening via right-click starts drag tracking (`button === 2`, `pointerType === "mouse"`); releasing the right button over an enabled item activates it only if the pointer traveled at least `4px` from the press point, preventing accidental activation on stationary right-click release.
- **Keyboard navigation & `rovingFocus`:** `rovingFocus` (`orientation: "vertical"`, `loop: true`, `homeEnd: true`, `preventScroll: true`) manages `.cs-context-menu-item:not([data-disabled])` with printable-character typeahead (`data-typeahead-label || data-label || textContent`). Arrow/`Home`/`End`/typeahead navigation sets `data-arrow-nav` and `data-nav="keyboard"` to suppress `:focus-visible` outlines and stale pointer `:hover` until mouse `pointermove` (which moves focus onto `.cs-context-menu-list` so clearing `data-arrow-nav` does not flash `:focus-visible`) or `pointerdown`. `Tab` on a `.cs-context-menu-item` synchronously closes the menu and restores focus before browser `Tab` traversal leaves the top-layer popover.
- **Pinned `header`/`footer` snippets vs. `children`:** `ContextMenuContent` places `header?.()` above and `footer?.()` below `<ScrollArea>`, keeping them pinned outside the scrollport while `children` scroll inside `.cs-context-menu-list`. Placing `<ContextMenuHeader>` or `<ContextMenuFooter>` directly inside `children` makes them scroll with items and adjusts their `padding-inline` to `--cs-listbox-item-px`. Never nest another `<ScrollArea>` inside `<ContextMenuContent>`.
- **Custom widget coexistence (`.cs-context-menu-row`):** Use `.cs-context-menu-row` for non-menuitem controls (such as an inline `<Switch>`). `ContextMenuContent` attaches `guardCustomWidgetKeys` to `<ScrollAreaContent>` so `keydown` events inside interactive widgets outside `.cs-context-menu-item` call `event.stopImmediatePropagation()` before `rovingFocus` can hijack keys, and bypass `Tab` / `data-arrow-nav` handling in `ContextMenuContent`.
- **v1 scope:** Nested submenus (`ContextMenuSub*`) are intentionally omitted in v1, matching `Dropdown`.
