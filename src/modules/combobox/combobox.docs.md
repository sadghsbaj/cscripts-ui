---
name: Combobox
kind: component
import: cs/svelte/combobox
exports:
    - Combobox
    - ComboboxControl
    - ComboboxInput
    - ComboboxIcon
    - ComboboxClear
    - ComboboxTrigger
    - ComboboxContent
    - ComboboxEmpty
    - ComboboxGroup
    - ComboboxGroupLabel
    - ComboboxItem
    - ComboboxItemIcon
    - ComboboxItemText
    - ComboboxItemDescription
    - ComboboxSeparator
    - COMBOBOX_VARIANTS
    - COMBOBOX_SIZES
    - ComboboxVariant
    - ComboboxSize
    - ComboboxIconComponentProps
    - ComboboxFilterFn
    - ComboboxProps
    - ComboboxControlProps
    - ComboboxInputProps
    - ComboboxIconProps
    - ComboboxClearProps
    - ComboboxTriggerProps
    - ComboboxContentProps
    - ComboboxEmptyProps
    - ComboboxGroupProps
    - ComboboxGroupLabelProps
    - ComboboxItemProps
    - ComboboxItemIconProps
    - ComboboxItemTextProps
    - ComboboxItemDescriptionProps
    - ComboboxSeparatorProps
---

# Combobox

## Overview

Searchable single-choice input and floating listbox composed of a `TextInput`-matched shell (`ComboboxControl`, `ComboboxInput`, `ComboboxIcon`, `ComboboxClear`, `ComboboxTrigger`) and an anchor-positioned top-layer popover (`ComboboxContent`) built on `Popover`, `ScrollArea`, and `scrollFade`. Implements the ARIA 1.2 combobox pattern (DOM focus remains on `<ComboboxInput>` while `aria-activedescendant` tracks the highlighted option), with built-in filtering, `keywords` matching, `allowCustomValue`, press-drag-release selection, and hidden `<input>` form submission.

## API

### `Combobox` Props

Generic over `T extends string = string`. Headless context root (renders `children` plus an optional `<input type="hidden">` when `name` is set).

| Prop                 | Type                               | Required | Default     | Description                                                                                                          |
| :------------------- | :--------------------------------- | :------- | :---------- | :------------------------------------------------------------------------------------------------------------------- |
| `variant`            | `ComboboxVariant`                  | Yes      | —           | Control surface treatment matching `TextInput` and `Select`: `"soft" \| "elevated"`.                                 |
| `size`               | `ComboboxSize`                     | Yes      | —           | T-shirt scale matching `TextInput`, `Select`, and `Button`: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`.                  |
| `value`              | `T \| undefined`                   | No       | `undefined` | `$bindable` selected value. Supports `bind:value` and `bind:value={get, set}`.                                       |
| `onValueChange`      | `(value: T \| undefined) => void`  | No       | `undefined` | Fires when `value` changes (selection, clearing input, `ComboboxClear`, or custom value commit).                     |
| `inputValue`         | `string`                           | No       | `""`        | `$bindable` text inside `ComboboxInput`. Syncs to the selected item's label when not actively filtering.             |
| `onInputValueChange` | `(inputValue: string) => void`     | No       | `undefined` | Fires whenever `inputValue` changes from user input, selection, clear, or blur revert.                               |
| `open`               | `boolean`                          | No       | `false`     | `$bindable` popover open state. Supports `bind:open` and `bind:open={get, set}`.                                     |
| `onOpenChange`       | `(open: boolean) => void`          | No       | `undefined` | Fires whenever the open state changes.                                                                               |
| `filter`             | `boolean \| ComboboxFilterFn<T>`   | No       | `true`      | `true` uses built-in normalized substring matching on `label` and `keywords`; `false` disables filtering; or pass a custom `(label, query, value) => boolean` predicate. |
| `allowCustomValue`   | `boolean`                          | No       | `false`     | When `true`, keeps typed text on `blur` / `Enter` and commits non-empty text as `value` instead of reverting to the last selected label. |
| `openOnFocus`        | `boolean`                          | No       | `false`     | Opens the listbox automatically when `ComboboxInput` receives focus (without filtering).                             |
| `disabled`           | `boolean`                          | No       | `false`     | Disables the control, input, clear button, trigger, items, and hidden `<input>`, and closes the popover if open.     |
| `readonly`           | `boolean`                          | No       | `false`     | Sets `readonly` on `ComboboxInput`, hides `ComboboxClear`, prevents opening/selecting, and closes the popover if open. |
| `invalid`            | `boolean`                          | No       | `false`     | Applies the `2px` negative inset ring on `ComboboxControl` and `aria-invalid="true"` on `ComboboxInput`.             |
| `required`           | `boolean`                          | No       | `false`     | Sets `aria-required="true"` on `ComboboxInput`.                                                                      |
| `name`               | `string`                           | No       | `undefined` | When truthy, renders `<input type="hidden" {name} value={value ?? ""} {disabled} />` for native form submission.     |
| `id`                 | `string`                           | No       | `undefined` | Optional explicit ID base for control/input/listbox ARIA wiring (falls back to `$props.id()`).                       |
| `children`           | `Snippet`                          | No       | `undefined` | Typically `<ComboboxControl>` and `<ComboboxContent>`.                                                               |

### `ComboboxControl` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders the `.cs-combobox-control` shell `<div>` with `popoverTrigger({ triggerOn: "manual" })` and delegates shell `mousedown` clicks to focus `ComboboxInput`.

| Prop       | Type                    | Required | Default             | Description                                                                |
| :--------- | :---------------------- | :------- | :------------------ | :------------------------------------------------------------------------- |
| `disabled` | `boolean`               | No       | `combobox.disabled` | Local disabled override for the shell when specified.                      |
| `readonly` | `boolean`               | No       | `combobox.readonly` | Local readonly override for the shell when specified.                      |
| `invalid`  | `boolean`               | No       | `combobox.invalid`  | Local invalid override for the shell when specified.                       |
| `ref`      | `HTMLDivElement \| null` | No      | `null`              | `$bindable` reference to the shell `<div>`.                                |
| `children` | `Snippet`               | No       | `undefined`         | Compound slot content (`<ComboboxIcon>`, `<ComboboxInput>`, `<ComboboxClear>`, `<ComboboxTrigger>`). |

### `ComboboxInput` Props

Extends `Omit<HTMLInputAttributes, "size" | "children" | "value">`. Renders `<input type="text" role="combobox">` with ARIA 1.2 attributes (`aria-expanded`, `aria-controls`, `aria-autocomplete`, `aria-activedescendant`, `aria-invalid`, `aria-required`).

| Prop           | Type                              | Required | Default             | Description                                                         |
| :------------- | :-------------------------------- | :------- | :------------------ | :------------------------------------------------------------------ |
| `autocomplete` | `HTMLInputAttributes["autocomplete"]` | No   | `"off"`             | Native `autocomplete` attribute forwarded to the `<input>`.         |
| `disabled`     | `boolean`                         | No       | `combobox.disabled` | Local disabled override for the `<input>` when specified.           |
| `readonly`     | `boolean`                         | No       | `combobox.readonly` | Local readonly override for the `<input>` when specified.           |
| `invalid`      | `boolean`                         | No       | `combobox.invalid`  | Local invalid override for `aria-invalid` when specified.           |
| `ref`          | `HTMLInputElement \| null`        | No       | `null`              | `$bindable` reference to the `<input>`.                             |

### `ComboboxIcon` Props

Extends `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`. Renders `<Icon {...rest} {color} aria-hidden="true" class={["cs-combobox-icon", className]} />` with `pointer-events: none` and `flex-shrink: 0`.

| Prop    | Type                                    | Required | Default     | Description                                       |
| :------ | :-------------------------------------- | :------- | :---------- | :------------------------------------------------ |
| `icon`  | `Component<ComboboxIconComponentProps>` | Yes      | —           | Decorative icon component (`aria-hidden="true"`). |
| `color` | `string`                                | No       | `undefined` | Optional color forwarded to the icon component.   |

### `ComboboxClear` Props

Extends `Omit<HTMLButtonAttributes, "type">`. Renders `<button type="button" tabindex={-1} class={["cs-combobox-clear", "cs-combobox-action", className]}>` with an embedded `<HitArea size="sm" />`. Automatically reveals when `inputValue !== ""` and neither disabled nor readonly, and keeps focus on `ComboboxInput` on press.

| Prop       | Type                                    | Required | Default             | Description                                                                        |
| :--------- | :-------------------------------------- | :------- | :------------------ | :--------------------------------------------------------------------------------- |
| `icon`     | `Component<ComboboxIconComponentProps>` | No       | `X` (`@lucide/svelte`) | Clear button icon component.                                                    |
| `disabled` | `boolean`                               | No       | `combobox.disabled` | Local disabled override for the clear button when specified.                       |
| `ref`      | `HTMLButtonElement \| null`             | No       | `null`              | `$bindable` reference to the `<button>`.                                           |

Default `aria-label`: localized `"Clear input"` / `"Eingabe löschen"`.

### `ComboboxTrigger` Props

Extends `Omit<HTMLButtonAttributes, "type">`. Renders `<button type="button" tabindex={-1} popovertarget={combobox.listboxId} aria-expanded aria-controls class={["cs-combobox-trigger", "cs-combobox-action", className]}>` with `<HitArea size="sm" />`. Keeps focus on `ComboboxInput` when pressed.

| Prop       | Type                        | Required | Default                  | Description                                                  |
| :--------- | :-------------------------- | :------- | :----------------------- | :----------------------------------------------------------- |
| `disabled` | `boolean`                   | No       | `combobox.disabled`      | Local disabled override for the trigger button when specified. |
| `ref`      | `HTMLButtonElement \| null` | No       | `null`                   | `$bindable` reference to the `<button>`.                     |
| `children` | `Snippet`                   | No       | `<ChevronDown />`        | Custom trigger icon/content; defaults to rotating `ChevronDown`. |

Default `aria-label`: localized `"Toggle options"` / `"Optionen umschalten"`.

### `ComboboxContent` Props

Extends `Omit<PopoverProps, "id" | "placement" | "width" | "offset">`. Renders `<Popover role="listbox" aria-labelledby={combobox.inputId}>` wrapping `<ScrollArea size="sm" direction="vertical" {scrollbar}>` and `<ScrollAreaContent tabindex={-1} class="cs-combobox-list cs-listbox-list">` with `scrollFade`.

| Prop        | Type                       | Required | Default               | Description                                                                                    |
| :---------- | :------------------------- | :------- | :-------------------- | :--------------------------------------------------------------------------------------------- |
| `id`        | `string`                   | No       | `combobox.listboxId`  | Optional ID override for the floating listbox popover.                                         |
| `placement` | `PopoverPlacement`         | No       | `"bottom-start"`      | Anchor placement relative to `ComboboxControl`.                                                |
| `width`     | `PopoverWidth`             | No       | `"min-anchor"`        | Width strategy relative to `ComboboxControl`: `"min-anchor" \| "anchor" \| "content"`.         |
| `offset`    | `string`                   | No       | `"8px"`               | Gap between `ComboboxControl` and `ComboboxContent` (`--cs-popover-offset`).                   |
| `maxHeight` | `string`                   | No       | `"min(320px, 60dvh)"` | Maximum block size before internal `ScrollArea` scrolls (`--cs-listbox-content-max-height`).   |
| `scrollbar` | `ScrollAreaScrollbar`      | No       | `"hover"`             | Scrollbar visibility mode forwarded to `ScrollArea`: `"hover" \| "always" \| "never"`.         |
| `animate`   | `boolean`                  | No       | `true`                | Enables `Popover` directional spring + blur entrance/exit transitions.                         |
| `popover`   | `"" \| "auto" \| "manual"` | No       | `"auto"`              | Native HTML `popover` attribute inherited from `PopoverProps`.                                 |
| `ref`       | `HTMLDivElement \| null`   | No       | `null`                | `$bindable` reference to the popover `<div>`.                                                  |
| `children`  | `Snippet`                  | No       | `undefined`           | `<ComboboxEmpty>`, `<ComboboxItem>`, `<ComboboxGroup>`, and `<ComboboxSeparator>` children.    |

### `ComboboxItem` Props

Generic over `T extends string = string`. Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="option" tabindex={-1}>`.

| Prop            | Type                                    | Required | Default     | Description                                                                                                                                                                             |
| :-------------- | :-------------------------------------- | :------- | :---------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`         | `T`                                     | Yes      | —           | Unique option value emitted on selection (`data-value={value}`).                                                                                                                        |
| `label`         | `string`                                | No       | `undefined` | Explicit canonical label synced to `ComboboxInput` and used by default filtering; falls back to `<ComboboxItemText>`, `.cs-combobox-item-content` text (excluding `<ComboboxItemDescription>`), or `value`. |
| `keywords`      | `string[]`                              | No       | `undefined` | Additional search terms checked by the built-in filter when `label` does not match.                                                                                                     |
| `icon`          | `Component<ComboboxIconComponentProps>` | No       | `undefined` | Shorthand leading icon component (alternative to `<ComboboxItemIcon>`).                                                                                                                 |
| `disabled`      | `boolean`                               | No       | `false`     | Disables this option (`combobox.disabled \|\| disabled`), skipping it in hover, highlight navigation, and selection.                                                                    |
| `hideIndicator` | `boolean`                               | No       | `false`     | Hides the built-in trailing `Check` indicator and collapses its grid column on this item.                                                                                               |
| `ref`           | `HTMLDivElement \| null`                | No       | `null`      | `$bindable` reference to the `<div>`.                                                                                                                                                   |
| `children`      | `Snippet`                               | No       | `undefined` | Plain text or compound subcomponents (`<ComboboxItemIcon>`, `<ComboboxItemText>`, `<ComboboxItemDescription>`, trailing `<Badge>` / `<Kbd>`).                                             |

### Subcomponents (`ComboboxEmpty`, `ComboboxGroup`, `ComboboxGroupLabel`, `ComboboxItemIcon`, `ComboboxItemText`, `ComboboxItemDescription`, `ComboboxSeparator`)

- **`ComboboxEmpty`** (`ComboboxEmptyProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div class="cs-combobox-empty cs-listbox-empty">` only when `visibleItemCount === 0`. Defaults to localized `"No results."` / `"Keine Ergebnisse."` when `children` is omitted.
- **`ComboboxGroup`** (`ComboboxGroupProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div role="group" aria-labelledby={labelId} class="cs-combobox-group cs-listbox-group">`. Automatically hides when all child items are filtered out.
- **`ComboboxGroupLabel`** (`ComboboxGroupLabelProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Generates an `id` (`id ?? $props.id()`), registers it with the parent `ComboboxGroup`, and renders `<div role="presentation" class="cs-combobox-group-label cs-listbox-group-label">`.
- **`ComboboxItemIcon`** (`ComboboxItemIconProps` extending `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): Props `{ icon: Component<ComboboxIconComponentProps>; color?: string; ...SVGAttributes }`. Renders `<Icon aria-hidden="true" {color} class={["cs-combobox-item-icon", "cs-listbox-item-icon", className]} />`.
- **`ComboboxItemText`** (`ComboboxItemTextProps` extending `HTMLAttributes<HTMLSpanElement>`, `ref = $bindable(null)`): Renders `<span class="cs-combobox-item-text cs-listbox-item-text">` and registers the primary label node for label extraction.
- **`ComboboxItemDescription`** (`ComboboxItemDescriptionProps` extending `HTMLAttributes<HTMLParagraphElement>`, `ref = $bindable(null)`): Renders `<p class="cs-combobox-item-description cs-listbox-item-description">` below `ComboboxItemText`, excluded from label extraction, and shifts the row to line-1 optical alignment.
- **`ComboboxSeparator`** (`ComboboxSeparatorProps` extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`, `ref = $bindable(null)`): Renders `<div role="separator" aria-orientation="horizontal" class="cs-combobox-separator cs-listbox-separator">`.

### Exported Constants & Types

- `COMBOBOX_VARIANTS = ["soft", "elevated"] as const` (`ComboboxVariant`)
- `COMBOBOX_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` (`ComboboxSize`)
- `ComboboxIconComponentProps`, `ComboboxFilterFn<T>` (`(label: string, query: string, value: T) => boolean`)
- `ComboboxProps<T>`, `ComboboxControlProps`, `ComboboxInputProps`, `ComboboxIconProps`, `ComboboxClearProps`, `ComboboxTriggerProps`, `ComboboxContentProps`, `ComboboxEmptyProps`, `ComboboxGroupProps`, `ComboboxGroupLabelProps`, `ComboboxItemProps<T>`, `ComboboxItemIconProps`, `ComboboxItemTextProps`, `ComboboxItemDescriptionProps`, `ComboboxSeparatorProps`

### `data-*` Attributes

- **On `ComboboxControl` (`.cs-combobox-control`):** `data-variant={variant}`, `data-size={size}`, `data-state="open" | "closed"`, `data-open` (when open), `data-disabled`, `data-readonly`, `data-invalid`.
- **On `ComboboxClear` (`.cs-combobox-clear`):** `data-visible={visible ? "" : "false"}`.
- **On `ComboboxTrigger` (`.cs-combobox-trigger`):** `data-open` (when open), `data-state="open" | "closed"`.
- **On `ComboboxContent` (`.cs-combobox-content.cs-listbox`):** `data-size={size}`, `data-nav="keyboard"` (suppresses stale pointer `:hover` while keyboard highlight navigation is active), plus `Popover`'s `data-placement`, `data-width`, and `data-animate`.
- **On `ComboboxItem` (`.cs-combobox-item.cs-listbox-item`):** `data-value={value}`, `data-label={resolvedLabel}`, `data-selected`, `data-highlighted`, `data-disabled`, `data-hidden` (paired with `hidden={!isVisible}`).

### CSS Custom Properties

#### Control Shell (`.cs-combobox-control`)

| Variable                         | Default                                                                                | Description                                                                                            |
| :------------------------------- | :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `--cs-combobox-bg`               | `--cs-color-base-soft` (`soft`) / `--cs-color-elevated` (`elevated`)                   | Control background at rest (`--cs-color-disabled-bg` when disabled).                                   |
| `--cs-combobox-bg-hover`         | `--cs-color-base-soft-hover` (`soft`) / `--cs-color-elevated-hover` (`elevated`)       | Control background on hover and `[data-open]`.                                                         |
| `--cs-combobox-fg`               | `var(--cs-color-text-strong)`                                                          | Input text foreground color.                                                                           |
| `--cs-combobox-placeholder-fg`   | `var(--cs-color-text-weak)`                                                            | Input `::placeholder` color.                                                                           |
| `--cs-combobox-caret`            | `var(--cs-color-accent-solid)`                                                         | Input caret color (`--cs-color-negative-solid` when invalid).                                          |
| `--cs-combobox-icon-fg`          | `var(--cs-color-text-weak)`                                                            | `ComboboxIcon` color (`--cs-color-negative-soft-fg` when invalid).                                     |
| `--cs-combobox-indicator-fg`     | `var(--cs-color-text-weak)`                                                            | `ComboboxClear` and `ComboboxTrigger` foreground color (`--cs-color-negative-soft-fg` when invalid).  |
| `--cs-combobox-shadow`           | `none` (`soft`) / `var(--cs-shadow-elevated)` (`elevated`)                             | Control elevation shadow at rest.                                                                      |
| `--cs-combobox-shadow-hover`     | `var(--cs-combobox-shadow)` (`soft`) / `var(--cs-shadow-elevated-hover)` (`elevated`)  | Control shadow on hover and `[data-open]`.                                                             |
| `--cs-combobox-ring-shadow`      | `inset 0 0 0 0px transparent`                                                          | Inset `::after` ring (`2px` `--cs-color-accent-solid` on `:focus-within`; `--cs-color-negative-solid` when invalid). |
| `--cs-combobox-ring-shadow-hover` | `var(--cs-combobox-ring-shadow)`                                                      | Inset `::after` ring on hover.                                                                         |
| `--cs-combobox-height`           | `28px` / `32px` / `36px` / `40px` / `44px`                                             | Control height across `xs`–`xl`.                                                                       |
| `--cs-combobox-font-size`        | `--cs-text-xs` (`xs`/`sm`), `--cs-text-sm` (`md`/`lg`), `--cs-text-base` (`xl`)        | Input font size.                                                                                       |
| `--cs-combobox-radius`           | `9px` / `10px` / `12px` / `13px` / `14px`                                              | Control squircle corner radius across `xs`–`xl`.                                                       |
| `--cs-combobox-px`               | `8px` / `10px` / `12px` / `14px` / `16px`                                              | Horizontal padding (`-2px` on `ComboboxIcon` edge).                                                    |
| `--cs-combobox-gap`              | `6px` (`xs`/`sm`), `8px` (`md`/`lg`), `10px` (`xl`)                                    | Gap between icon, input, clear, and trigger slots.                                                     |
| `--cs-combobox-icon-size`        | `14px` (`xs`/`sm`), `16px` (`md`/`lg`), `18px` (`xl`)                                  | `ComboboxIcon`, `ComboboxClear`, and `ComboboxTrigger` icon size.                                      |
| `--cs-combobox-action-size`      | `20px` / `24px` / `28px` / `30px` / `32px`                                             | `ComboboxClear` and `ComboboxTrigger` button size across `xs`–`xl`.                                    |
| `--cs-combobox-action-inset`     | `4px` (`xs`–`md`), `5px` (`lg`), `6px` (`xl`)                                          | Concentric edge padding when a visible action sits at an outer edge.                                   |

#### Floating Panel, Items, Groups & Empty State (`.cs-combobox-content.cs-listbox`)

| Variable                            | Default                                                                                                | Description                                                                           |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `--cs-listbox-content-bg`           | `var(--cs-color-elevated)`                                                                             | Floating panel background.                                                            |
| `--cs-listbox-content-shadow`       | `var(--cs-shadow-floating)`                                                                            | Floating panel shadow.                                                                |
| `--cs-listbox-content-radius`       | `14px` (`xs`/`sm`), `18px` (`md`/`lg`), `20px` (`xl`)                                                  | Panel outer squircle radius.                                                          |
| `--cs-listbox-content-padding`      | `4px` (`xs`/`sm`), `6px` (`md`–`xl`)                                                                   | Padding inside `.cs-combobox-list`.                                                   |
| `--cs-listbox-content-max-height`   | `min(320px, 60dvh)`                                                                                    | Maximum panel block size (set by `maxHeight` prop; clamped to `calc(100dvh - 32px)`). |
| `--cs-listbox-content-max-width`    | `360px`                                                                                                | Maximum panel inline size (clamped to `calc(100vw - 32px)`).                          |
| `--cs-listbox-list-gap`             | `2px`                                                                                                  | Vertical gap between items inside `.cs-combobox-list` and `.cs-combobox-group`.       |
| `--cs-listbox-item-radius`          | `max(var(--cs-radius-lg), calc(var(--cs-listbox-content-radius) - var(--cs-listbox-content-padding)))` | Concentric item radius (`10px` / `12px` / `14px`).                                    |
| `--cs-listbox-item-bg`              | `transparent`                                                                                          | Item background at rest.                                                              |
| `--cs-listbox-item-bg-hover`        | `var(--cs-color-base-soft)`                                                                            | Item background on pointer hover.                                                     |
| `--cs-listbox-item-bg-highlighted`  | `var(--cs-listbox-item-bg-hover)`                                                                      | Item background when `[data-highlighted]` or active keyboard row.                     |
| `--cs-listbox-item-bg-active`       | `var(--cs-color-base-soft-hover)`                                                                      | Item background on `:active`.                                                         |
| `--cs-listbox-item-fg`              | `var(--cs-color-text-strong)`                                                                          | Item label foreground color.                                                          |
| `--cs-listbox-item-fg-hover`        | `var(--cs-color-text-strong)`                                                                          | Item label foreground color on hover/highlight/active.                                |
| `--cs-listbox-item-description-fg`  | `var(--cs-color-text-weak)`                                                                            | Secondary description foreground color.                                               |
| `--cs-listbox-item-icon-fg`         | `var(--cs-color-text-weak)`                                                                            | Item leading icon color (`--cs-color-text-main` on hover/highlight/active).           |
| `--cs-listbox-item-indicator-fg`    | `var(--cs-color-accent-soft-fg)`                                                                       | Trailing selected checkmark color.                                                    |
| `--cs-listbox-item-px`              | `8px` (`xs`/`sm`), `10px` (`md`), `12px` (`lg`/`xl`)                                                   | Item horizontal padding (`-2px` on start edge when icon present).                     |
| `--cs-listbox-item-py`              | `5px` / `6px` / `7px` / `8px` / `9px`                                                                  | Item vertical padding across `xs`–`xl`.                                               |
| `--cs-listbox-item-min-height`      | `28px` / `30px` / `34px` / `38px` / `42px`                                                             | Minimum item height across `xs`–`xl`.                                                 |
| `--cs-listbox-item-gap`             | `6px` (`xs`/`sm`), `8px` (`md`/`lg`), `10px` (`xl`)                                                    | Gap between item slots.                                                               |
| `--cs-listbox-item-font-size`       | `--cs-text-xs` (`xs`/`sm`), `--cs-text-sm` (`md`/`lg`), `--cs-text-base` (`xl`)                        | Item primary text size.                                                               |
| `--cs-listbox-item-title-lh`        | `18px` (`xs`/`sm`), `20px` (`md`/`lg`), `22px` (`xl`)                                                  | Title line-height used for line-1 icon/checkmark alignment in multi-line items.       |
| `--cs-listbox-icon-size`            | `14px` (`xs`/`sm`), `16px` (`md`/`lg`), `18px` (`xl`)                                                  | Item leading icon size.                                                               |
| `--cs-listbox-check-size`           | `14px` (`xs`/`sm`), `16px` (`md`–`xl`)                                                                 | Item trailing checkmark size.                                                         |
| `--cs-listbox-group-gap`            | `6px` (`xs`/`sm`), `10px` (`md`–`xl`)                                                                  | Top margin between adjacent `<ComboboxGroup>` blocks.                                 |
| `--cs-listbox-group-label-fg`       | `var(--cs-color-text-weak)`                                                                            | Group label text color.                                                               |
| `--cs-listbox-group-label-font-size` | `11px` (`xs`/`sm`), `var(--cs-text-xs)` (`md`–`xl`)                                                   | Group label font size.                                                                |
| `--cs-listbox-separator-bg`         | `color-mix(in oklab, var(--cs-color-text-main) 10%, transparent)`                                      | Hairline separator color.                                                             |
| `--cs-listbox-empty-fg`             | `var(--cs-color-text-weak)`                                                                            | Empty state text color.                                                               |

## Examples

### Basic (`soft` with Icon, Clear & Empty State)

```svelte
<script lang="ts">
    import { Search } from "@lucide/svelte";
    import {
        Combobox,
        ComboboxClear,
        ComboboxContent,
        ComboboxControl,
        ComboboxEmpty,
        ComboboxIcon,
        ComboboxInput,
        ComboboxItem,
        ComboboxTrigger,
    } from "cs/svelte/combobox";

    let value = $state<string | undefined>("svelte");
</script>

<Combobox variant="soft" size="md" bind:value>
    <ComboboxControl class="w-60">
        <ComboboxIcon icon={Search} />
        <ComboboxInput placeholder="Search framework…" />
        <ComboboxClear />
        <ComboboxTrigger />
    </ComboboxControl>
    <ComboboxContent>
        <ComboboxEmpty>No matching framework.</ComboboxEmpty>
        <ComboboxItem value="svelte" label="SvelteKit" keywords={["svelte", "kit"]}>SvelteKit</ComboboxItem>
        <ComboboxItem value="astro" label="Astro">Astro</ComboboxItem>
        <ComboboxItem value="next" label="Next.js" keywords={["react", "vercel"]}>Next.js</ComboboxItem>
    </ComboboxContent>
</Combobox>
```

### Rich Items, Groups & Separators

```svelte
<script lang="ts">
    import { Compass, Layers, Sparkles, Zap } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Kbd } from "cs/svelte/kbd";
    import {
        Combobox,
        ComboboxClear,
        ComboboxContent,
        ComboboxControl,
        ComboboxEmpty,
        ComboboxGroup,
        ComboboxGroupLabel,
        ComboboxInput,
        ComboboxItem,
        ComboboxItemDescription,
        ComboboxItemIcon,
        ComboboxItemText,
        ComboboxSeparator,
        ComboboxTrigger,
    } from "cs/svelte/combobox";

    let mode = $state<string | undefined>("fast");
</script>

<Combobox variant="elevated" size="md" bind:value={mode}>
    <ComboboxControl class="w-64">
        <ComboboxInput placeholder="Select mode…" />
        <ComboboxClear />
        <ComboboxTrigger />
    </ComboboxControl>
    <ComboboxContent>
        <ComboboxEmpty />
        <ComboboxGroup>
            <ComboboxGroupLabel>Modes</ComboboxGroupLabel>
            <ComboboxItem value="fast" icon={Zap} label="Fast">
                <ComboboxItemText>Fast</ComboboxItemText>
                <ComboboxItemDescription>Quick replies for daily work</ComboboxItemDescription>
            </ComboboxItem>
            <ComboboxItem value="balanced">
                <ComboboxItemIcon icon={Sparkles} color="var(--cs-color-accent-soft-fg)" />
                <ComboboxItemText>Balanced</ComboboxItemText>
                <ComboboxItemDescription>Everyday reasoning and writing</ComboboxItemDescription>
                <Badge variant="soft" color="accent" size="xs">
                    <BadgeLabel>Default</BadgeLabel>
                </Badge>
            </ComboboxItem>
            <ComboboxItem value="deep">
                <ComboboxItemIcon icon={Compass} />
                <ComboboxItemText>Deep</ComboboxItemText>
                <ComboboxItemDescription>Thorough research and analysis</ComboboxItemDescription>
                <Kbd variant="soft" size="xs">3</Kbd>
            </ComboboxItem>
        </ComboboxGroup>
        <ComboboxSeparator />
        <ComboboxItem value="workspace">
            <ComboboxItemIcon icon={Layers} />
            <ComboboxItemText>Workspace</ComboboxItemText>
        </ComboboxItem>
    </ComboboxContent>
</Combobox>
```

### Custom Values & Controlled State (`allowCustomValue`, `bind:inputValue`, `bind:open`)

```svelte
<script lang="ts">
    import {
        Combobox,
        ComboboxClear,
        ComboboxContent,
        ComboboxControl,
        ComboboxInput,
        ComboboxItem,
        ComboboxTrigger,
    } from "cs/svelte/combobox";

    let tag = $state<string | undefined>("design-systems");
    let inputValue = $state("design-systems");
    let open = $state(false);
</script>

<Combobox variant="soft" size="md" allowCustomValue openOnFocus bind:value={tag} bind:inputValue bind:open>
    <ComboboxControl class="w-60">
        <ComboboxInput placeholder="Enter or pick a tag…" />
        <ComboboxClear />
        <ComboboxTrigger />
    </ComboboxControl>
    <ComboboxContent>
        <ComboboxItem value="design-systems">Design Systems</ComboboxItem>
        <ComboboxItem value="accessibility">Accessibility</ComboboxItem>
        <ComboboxItem value="svelte">Svelte</ComboboxItem>
    </ComboboxContent>
</Combobox>
```

### Custom Filter & External `<label>`

```svelte
<script lang="ts">
    import {
        Combobox,
        ComboboxContent,
        ComboboxControl,
        ComboboxEmpty,
        ComboboxInput,
        ComboboxItem,
        ComboboxTrigger,
    } from "cs/svelte/combobox";

    const inputId = $props.id();
    let country = $state<string | undefined>();

    function startsWithFilter(label: string, query: string): boolean {
        return label.toLowerCase().startsWith(query.trim().toLowerCase());
    }
</script>

<div class="flex flex-col gap-1.5">
    <label for={inputId} class="text-sm font-medium">Country</label>
    <Combobox variant="soft" size="md" name="country" required invalid={!country} filter={startsWithFilter} bind:value={country}>
        <ComboboxControl class="w-56">
            <ComboboxInput id={inputId} placeholder="Type country…" />
            <ComboboxTrigger />
        </ComboboxControl>
        <ComboboxContent>
            <ComboboxEmpty />
            <ComboboxItem value="de">Germany</ComboboxItem>
            <ComboboxItem value="fr">France</ComboboxItem>
            <ComboboxItem value="jp">Japan</ComboboxItem>
        </ComboboxContent>
    </Combobox>
</div>
```

## Behavior & Quirks

- **ARIA 1.2 combobox contract:** DOM focus stays on `<ComboboxInput>` (`role="combobox"`, `aria-expanded`, `aria-controls={listboxId}`, `aria-autocomplete="list" | "none"` when `filter={false}`, `aria-activedescendant={highlightedItemId}` while open). `ComboboxTrigger` and `ComboboxClear` use `tabindex={-1}` and `event.preventDefault()` on `pointerdown`, and `ComboboxContent` / `ComboboxItem` prevent `pointerdown` focus theft so the input never blurs during menu interaction. `ComboboxContent` sets `role="listbox"` and `aria-labelledby={inputId}`.
- **Filtering (`isFiltering`, `filter`, `keywords`):** Opening via `ComboboxTrigger`, `ArrowDown`, `ArrowUp`, or `openOnFocus` sets `isFiltering = false` so all options remain visible for browsing even when an option is already selected. Typing in `ComboboxInput` sets `isFiltering = true` and opens the popover (`openFocus: "first"`). The default filter trims and collapses whitespace, lowercases both `query` and candidate strings, and matches against the item's resolved `label` or any entry in `keywords`. Hidden items receive both `hidden` and `data-hidden`; `<ComboboxGroup>` automatically collapses via CSS `:has()` when all of its items are hidden, and `<ComboboxEmpty>` renders when `visibleItemCount === 0`.
- **Keyboard navigation:**
  - `ArrowDown`: Opens closed menu (`filter: false`, highlights selected item or first enabled visible item) or moves highlight down (clamped, non-looping) and scrolls into view (`scrollIntoView({ block: "nearest" })`).
  - `ArrowUp`: Opens closed menu (`filter: false`, highlights selected item or last enabled visible item) or moves highlight up (clamped, non-looping).
  - `Enter` (when open and not IME-composing): Selects `highlightedValue` if present; otherwise, if `allowCustomValue` is `true`, commits `inputValue` and closes.
  - `Escape`: When open, closes the popover (with `stopPropagation()`) and, unless `allowCustomValue` is `true`, reverts `inputValue` to the selected label (or `""`). When closed and `allowCustomValue` is `false`, reverts edited `inputValue` back to the committed label.
  - `Tab`: Closes the open popover and runs blur reconciliation before focus moves on.
- **`allowCustomValue` vs. strict selection:** When `allowCustomValue` is `false` (default), blurring `ComboboxInput` reverts `inputValue` to the selected item's `label` (or `""` if `value` is `undefined`). Clearing the input text to `""` immediately emits `value = undefined` (`onValueChange(undefined)`). When `allowCustomValue` is `true`, non-empty `inputValue` is committed as `value` (`inputValue as T`) on `Enter` (with no highlighted option) or blur.
- **Headless `<Combobox>` & `$bindable` pitfall:** `<Combobox>` renders no wrapper element—apply width and layout classes to `<ComboboxControl>`. Never pass a non-bound expression (e.g. `value={getValue()}`) to `$bindable` `value`, `inputValue`, or `open`; use `bind:value` / `bind:value={get, set}` (and likewise for `inputValue` / `open`).
- **Built-in `ScrollArea` and `scrollFade`:** `ComboboxContent` embeds `ScrollArea` and `scrollFade` internally—never nest another `<ScrollArea>` inside `<ComboboxContent>`.
- **Press-drag-release pointer UX:** Mouse `pointerdown` on `ComboboxTrigger` opens the listbox immediately and tracks drag distance (`>= 4px`) or hold duration (`>= 180ms`); releasing `pointerup` over a `ComboboxItem` selects it in a single gesture, while standard clicks and touch interactions select on `click`.
- **Hidden `<input>` & `required` note:** Passing `name` renders `<input type="hidden" {name} value={value ?? ""} {disabled} />` for `<form>` submission; `required` sets `aria-required="true"` on `ComboboxInput` rather than native constraint validation on the hidden `<input>`.
