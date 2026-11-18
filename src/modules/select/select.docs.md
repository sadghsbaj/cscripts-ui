---
name: Select
kind: component
import: cs/svelte/select
exports:
    - Select
    - SelectTrigger
    - SelectValue
    - SelectContent
    - SelectGroup
    - SelectGroupLabel
    - SelectItem
    - SelectItemIcon
    - SelectItemText
    - SelectItemDescription
    - SelectSeparator
    - SELECT_VARIANTS
    - SELECT_SIZES
    - SelectVariant
    - SelectSize
    - SelectIconComponentProps
    - SelectSelectedItem
    - SelectProps
    - SelectTriggerProps
    - SelectValueProps
    - SelectContentProps
    - SelectGroupProps
    - SelectGroupLabelProps
    - SelectItemProps
    - SelectItemIconProps
    - SelectItemTextProps
    - SelectItemDescriptionProps
    - SelectSeparatorProps
---

# Select

## Overview

Single-choice dropdown picker composed of a `TextInput`-matched trigger button (`SelectTrigger` + `SelectValue`) and an anchor-positioned top-layer floating listbox (`SelectContent`), built on `Popover`, `rovingFocus`, `ScrollArea`, and `scrollFade`. Supports plain and rich option rows (icons, descriptions, trailing badges/shortcuts), semantic groups, closed- and open-menu typeahead, press-drag-release selection, and hidden `<input>` form submission.

## Usage Guidance

- **`variant` & `size` (required):** `Select` intentionally defines no defaults for `variant` (`"soft" | "elevated"`) or `size` (`"xs" | "sm" | "md" | "lg" | "xl"`)—choose both explicitly to match adjacent `TextInput` and `Button` controls.
- **Do not wrap items in `<ScrollArea>`:** `SelectContent` already embeds `ScrollArea` and `scrollFade` internally. Place `SelectItem`, `SelectGroup`, and `SelectSeparator` directly inside `<SelectContent>`.
- **`SelectContent` `width`:** Use `"min-anchor"` (default) so the menu is never narrower than `SelectTrigger` while expanding up to `--cs-select-content-max-width` (`360px`) for longer option labels; use `"anchor"` when strict trigger-width alignment is desired.
- **Trigger width stability:** Because `SelectValue` mirrors the selected option's label, give `SelectTrigger` an explicit width (e.g., `class="w-48"` or `class="w-full"`) if switching between short and long options should not resize surrounding layout.
- **Groups vs. separators:** Prefer `<SelectGroup>` with `<SelectGroupLabel>` for routine categorization and use `<SelectSeparator />` sparingly (e.g., to separate a distinct trailing option).
- **Trailing `Badge` / `Kbd` sizing:** Use `size="xs"` inside `xs`–`md` items (`size="sm"` inside `lg`/`xl`), and prefer `Kbd variant="soft"` or `"ghost"` over `"keycap"` inside menu rows.

## API

### `Select` Props

Generic over `T extends string = string`. Headless context root (renders `children` plus an optional `<input type="hidden">` when `name` is set).

| Prop            | Type                      | Required | Default     | Description                                                                                                      |
| :-------------- | :------------------------ | :------- | :---------- | :--------------------------------------------------------------------------------------------------------------- |
| `variant`       | `SelectVariant`           | Yes      | —           | Trigger surface treatment matching `TextInput`: `"soft" \| "elevated"`.                                          |
| `size`          | `SelectSize`              | Yes      | —           | T-shirt scale matching `TextInput` and `Button`: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`.                         |
| `value`         | `T \| undefined`          | No       | `undefined` | `$bindable` selected value. Supports `bind:value` and `bind:value={get, set}`.                                   |
| `onValueChange` | `(value: T) => void`      | No       | `undefined` | Fires when the user selects a new value (via click, drag-release, keyboard, or closed-trigger typeahead).        |
| `open`          | `boolean`                 | No       | `false`     | `$bindable` popover open state. Supports `bind:open` and `bind:open={get, set}`.                                 |
| `onOpenChange`  | `(open: boolean) => void` | No       | `undefined` | Fires whenever the open state changes.                                                                           |
| `disabled`      | `boolean`                 | No       | `false`     | Disables the trigger, closes the popover if open, prevents option selection, and disables the hidden `<input>`.  |
| `invalid`       | `boolean`                 | No       | `false`     | Applies the `2px` negative inset ring and `aria-invalid="true"` on `SelectTrigger`.                              |
| `required`      | `boolean`                 | No       | `false`     | Sets `aria-required="true"` on `SelectTrigger`.                                                                  |
| `name`          | `string`                  | No       | `undefined` | When truthy, renders `<input type="hidden" {name} value={value ?? ""} {disabled} />` for native form submission. |
| `id`            | `string`                  | No       | `undefined` | Optional explicit ID base for trigger/listbox ARIA wiring (falls back to `$props.id()`).                         |
| `children`      | `Snippet`                 | No       | `undefined` | Typically `<SelectTrigger>` and `<SelectContent>`.                                                               |

### `SelectTrigger` Props

Extends `Omit<HTMLButtonAttributes, "type" | "value">`. Renders `<button type="button" role="combobox" aria-haspopup="listbox">` with `popoverTrigger({ triggerOn: "pointerdown" })`.

| Prop            | Type                        | Required | Default           | Description                                                               |
| :-------------- | :-------------------------- | :------- | :---------------- | :------------------------------------------------------------------------ |
| `disabled`      | `boolean`                   | No       | `Select.disabled` | Overrides `Select`-level `disabled` state for the trigger when specified. |
| `invalid`       | `boolean`                   | No       | `Select.invalid`  | Overrides `Select`-level `invalid` state for the trigger when specified.  |
| `hideIndicator` | `boolean`                   | No       | `false`           | Hides the built-in trailing `ChevronDown` indicator.                      |
| `ref`           | `HTMLButtonElement \| null` | No       | `null`            | `$bindable` reference to the `<button>`.                                  |
| `children`      | `Snippet`                   | No       | `<SelectValue />` | Trigger content; defaults to `<SelectValue />` when omitted.              |

### `SelectValue` Props

Generic over `T extends string = string`. Extends `Omit<HTMLAttributes<HTMLSpanElement>, "children">`. Renders `<span class="cs-select-trigger-value">`.

| Prop          | Type                                            | Required | Default                                | Description                                                                                          |
| :------------ | :---------------------------------------------- | :------- | :------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `placeholder` | `string`                                        | No       | Localized `"Select…"` / `"Auswählen…"` | Placeholder text rendered when no value is selected.                                                 |
| `showIcon`    | `boolean`                                       | No       | `true`                                 | Mirrors the selected item's icon (and `iconColor` when set via `<SelectItemIcon>`) into the trigger. |
| `ref`         | `HTMLSpanElement \| null`                       | No       | `null`                                 | `$bindable` reference to the `<span>`.                                                               |
| `children`    | `Snippet<[SelectSelectedItem<T> \| undefined]>` | No       | `undefined`                            | Custom render snippet receiving the resolved selected item metadata (or `undefined`).                |

### `SelectContent` Props

Extends `Omit<PopoverProps, "id" | "placement" | "width" | "offset">`. Renders `<Popover role="listbox">` wrapping an internal `<ScrollArea size="sm" direction="vertical">` and `<ScrollAreaContent class="cs-select-list">` with `scrollFade` and `rovingFocus`.

| Prop        | Type                       | Required | Default               | Description                                                                                 |
| :---------- | :------------------------- | :------- | :-------------------- | :------------------------------------------------------------------------------------------ |
| `id`        | `string`                   | No       | `select.listboxId`    | Optional ID override for the floating listbox popover.                                      |
| `placement` | `PopoverPlacement`         | No       | `"bottom-start"`      | Anchor placement relative to `SelectTrigger`.                                               |
| `width`     | `PopoverWidth`             | No       | `"min-anchor"`        | Width strategy relative to `SelectTrigger`: `"min-anchor" \| "anchor" \| "content"`.        |
| `offset`    | `string`                   | No       | `"8px"`               | Gap between `SelectTrigger` and `SelectContent` (`--cs-popover-offset`).                    |
| `maxHeight` | `string`                   | No       | `"min(320px, 60dvh)"` | Maximum block size before internal `ScrollArea` scrolls (`--cs-select-content-max-height`). |
| `scrollbar` | `ScrollAreaScrollbar`      | No       | `"hover"`             | Scrollbar visibility mode forwarded to `ScrollArea`: `"hover" \| "always" \| "never"`.      |
| `animate`   | `boolean`                  | No       | `true`                | Enables `Popover` directional spring + blur entrance/exit transitions.                      |
| `popover`   | `"" \| "auto" \| "manual"` | No       | `"auto"`              | Native HTML `popover` attribute inherited from `PopoverProps`.                              |
| `ref`       | `HTMLDivElement \| null`   | No       | `null`                | `$bindable` reference to the popover `<div>`.                                               |
| `children`  | `Snippet`                  | No       | `undefined`           | `<SelectItem>`, `<SelectGroup>`, and `<SelectSeparator>` children.                          |

### `SelectItem` Props

Generic over `T extends string = string`. Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="option" tabindex={-1}>`.

| Prop            | Type                                  | Required | Default     | Description                                                                                                                                                                              |
| :-------------- | :------------------------------------ | :------- | :---------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`         | `T`                                   | Yes      | —           | Unique option value emitted on selection (`data-value={value}`).                                                                                                                         |
| `label`         | `string`                              | No       | `undefined` | Explicit canonical label used by `SelectValue` and typeahead search; falls back to `<SelectItemText>`, `.cs-select-item-content` text (excluding `<SelectItemDescription>`), or `value`. |
| `icon`          | `Component<SelectIconComponentProps>` | No       | `undefined` | Shorthand leading icon component (alternative to `<SelectItemIcon>`).                                                                                                                    |
| `disabled`      | `boolean`                             | No       | `false`     | Disables this option (`select.disabled \|\| disabled`), skipping it in hover, roving focus, typeahead, and selection.                                                                    |
| `hideIndicator` | `boolean`                             | No       | `false`     | Hides the built-in trailing `Check` indicator and collapses its grid column on this item.                                                                                                |
| `ref`           | `HTMLDivElement \| null`              | No       | `null`      | `$bindable` reference to the `<div>`.                                                                                                                                                    |
| `children`      | `Snippet`                             | No       | `undefined` | Plain text or compound subcomponents (`<SelectItemIcon>`, `<SelectItemText>`, `<SelectItemDescription>`, trailing `<Badge>` / `<Kbd>`).                                                  |

### Subcomponents (`SelectItemIcon`, `SelectItemText`, `SelectItemDescription`, `SelectGroup`, `SelectGroupLabel`, `SelectSeparator`)

- **`SelectItemIcon`** (`SelectItemIconProps` extending `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): Props `{ icon: Component<SelectIconComponentProps>; color?: string; ...SVGAttributes }`. Registers the icon and optional `color` for `SelectValue` mirroring and renders `<Icon aria-hidden="true" {color} class={["cs-select-item-icon", className]} />`.
- **`SelectItemText`** (`SelectItemTextProps` extending `HTMLAttributes<HTMLSpanElement>`, `ref = $bindable(null)`): Renders `<span class="cs-select-item-text">` and registers the primary label node for label extraction.
- **`SelectItemDescription`** (`SelectItemDescriptionProps` extending `HTMLAttributes<HTMLParagraphElement>`, `ref = $bindable(null)`): Renders `<p class="cs-select-item-description">` below `SelectItemText`, excluded from `SelectValue` / typeahead label extraction, and shifts the row to line-1 optical alignment.
- **`SelectGroup`** (`SelectGroupProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Renders `<div role="group" aria-labelledby={labelId} class="cs-select-group">` with spacing between adjacent groups.
- **`SelectGroupLabel`** (`SelectGroupLabelProps` extending `HTMLAttributes<HTMLDivElement>`, `ref = $bindable(null)`): Generates an `id` (`id ?? $props.id()`), registers it with the parent `SelectGroup`, and renders `<div role="presentation" class="cs-select-group-label">`.
- **`SelectSeparator`** (`SelectSeparatorProps` extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`, `ref = $bindable(null)`): Renders `<div role="separator" aria-orientation="horizontal" class="cs-select-separator">`.

### Exported Constants & Types

- `SELECT_VARIANTS = ["soft", "elevated"] as const` (`SelectVariant`)
- `SELECT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` (`SelectSize`)
- `SelectIconComponentProps`, `SelectSelectedItem<T>` (`{ value: T; label: string; icon?: Component<SelectIconComponentProps>; iconColor?: string }`)
- `SelectProps<T>`, `SelectTriggerProps`, `SelectValueProps<T>`, `SelectContentProps`, `SelectGroupProps`, `SelectGroupLabelProps`, `SelectItemProps<T>`, `SelectItemIconProps`, `SelectItemTextProps`, `SelectItemDescriptionProps`, `SelectSeparatorProps`

### `data-*` Attributes

- **On `SelectTrigger` (`.cs-select-trigger`):** `data-variant={variant}`, `data-size={size}`, `data-state="open" | "closed"`, `data-placeholder` (when no value is selected), `data-invalid`, `data-disabled`.
- **On `SelectValue` (`.cs-select-trigger-value`):** `data-placeholder` (when `resolvedItem === undefined`).
- **On `SelectContent` (`.cs-select-content`):** `data-size={size}`, `data-arrow-nav` (while arrow/`Home`/`End`/typeahead navigation is active), `data-nav="keyboard"` (suppresses stale pointer `:hover` while keyboard navigation is active), plus `Popover`'s `data-placement`, `data-width`, and `data-animate`.
- **On `SelectItem` (`.cs-select-item`):** `data-value={value}`, `data-label={resolvedLabel}`, `data-selected`, `data-disabled`, plus `data-roving-active` managed by `rovingFocus`.

### CSS Custom Properties

#### Trigger (`.cs-select-trigger`)

| Variable                             | Default                                                                                     | Description                                                                                                  |
| :----------------------------------- | :------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- |
| `--cs-select-trigger-bg`             | `--cs-color-base-soft` (`soft`) / `--cs-color-elevated` (`elevated`)                        | Trigger background at rest.                                                                                  |
| `--cs-select-trigger-bg-hover`       | `--cs-color-base-soft-hover` (`soft`) / `--cs-color-elevated-hover` (`elevated`)            | Trigger background on hover and open state.                                                                  |
| `--cs-select-trigger-fg`             | `var(--cs-color-text-strong)`                                                               | Trigger value foreground color.                                                                              |
| `--cs-select-trigger-placeholder-fg` | `var(--cs-color-text-weak)`                                                                 | Trigger foreground when `[data-placeholder]`.                                                                |
| `--cs-select-trigger-icon-fg`        | `var(--cs-color-text-weak)`                                                                 | Mirrored trigger icon color (`--cs-color-negative-soft-fg` when invalid).                                    |
| `--cs-select-trigger-indicator-fg`   | `var(--cs-color-text-weak)`                                                                 | Trailing chevron color (`--cs-color-text-strong` on hover/open, `--cs-color-negative-soft-fg` when invalid). |
| `--cs-select-trigger-shadow`         | `none` (`soft`) / `var(--cs-shadow-elevated)` (`elevated`)                                  | Trigger elevation shadow at rest and `:active`.                                                              |
| `--cs-select-trigger-shadow-hover`   | `var(--cs-select-trigger-shadow)` (`soft`) / `var(--cs-shadow-elevated-hover)` (`elevated`) | Trigger shadow on hover and open state.                                                                      |
| `--cs-select-trigger-ring-shadow`    | `inset 0 0 0 0px transparent`                                                               | Inset `::after` ring (`inset 0 0 0 2px var(--cs-color-negative-solid)` when `[data-invalid]`).               |
| `--cs-select-trigger-height`         | `28px` / `32px` / `36px` / `40px` / `44px`                                                  | Trigger height across `xs`–`xl`.                                                                             |
| `--cs-select-trigger-font-size`      | `--cs-text-xs` (`xs`/`sm`), `--cs-text-sm` (`md`/`lg`), `--cs-text-base` (`xl`)             | Trigger font size.                                                                                           |
| `--cs-select-trigger-radius`         | `9px` / `10px` / `12px` / `13px` / `14px`                                                   | Trigger squircle corner radius across `xs`–`xl`.                                                             |
| `--cs-select-trigger-px`             | `8px` / `10px` / `12px` / `14px` / `16px`                                                   | Horizontal padding (`-2px` on leading icon or trailing chevron edge).                                        |
| `--cs-select-trigger-gap`            | `6px` (`xs`/`sm`), `8px` (`md`/`lg`), `10px` (`xl`)                                         | Gap between icon, value, and chevron.                                                                        |
| `--cs-select-trigger-icon-size`      | `14px` (`xs`/`sm`), `16px` (`md`/`lg`), `18px` (`xl`)                                       | Leading icon and chevron size.                                                                               |

#### Floating Panel, Items, Groups & Separators (`.cs-select-content`)

| Variable                            | Default                                                                                              | Description                                                                           |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `--cs-select-content-bg`            | `var(--cs-color-elevated)`                                                                           | Floating panel background.                                                            |
| `--cs-select-content-shadow`        | `var(--cs-shadow-floating)`                                                                          | Floating panel shadow.                                                                |
| `--cs-select-content-radius`        | `14px` (`xs`/`sm`), `18px` (`md`/`lg`), `20px` (`xl`)                                                | Panel outer squircle radius.                                                          |
| `--cs-select-content-padding`       | `4px` (`xs`/`sm`), `6px` (`md`–`xl`)                                                                 | Padding inside `.cs-select-list`.                                                     |
| `--cs-select-content-max-height`    | `min(320px, 60dvh)`                                                                                  | Maximum panel block size (set by `maxHeight` prop; clamped to `calc(100dvh - 32px)`). |
| `--cs-select-content-max-width`     | `360px`                                                                                              | Maximum panel inline size (clamped to `calc(100vw - 32px)`).                          |
| `--cs-select-list-gap`              | `2px`                                                                                                | Vertical gap between items inside `.cs-select-list` and `.cs-select-group`.           |
| `--cs-select-item-radius`           | `max(var(--cs-radius-lg), calc(var(--cs-select-content-radius) - var(--cs-select-content-padding)))` | Concentric item radius (`10px` / `12px` / `14px`).                                    |
| `--cs-select-item-bg`               | `transparent`                                                                                        | Item background at rest.                                                              |
| `--cs-select-item-bg-hover`         | `var(--cs-color-base-soft)`                                                                          | Item background on hover, `:focus-visible`, and keyboard active row.                  |
| `--cs-select-item-bg-active`        | `var(--cs-color-base-soft-hover)`                                                                    | Item background on `:active`.                                                         |
| `--cs-select-item-fg`               | `var(--cs-color-text-strong)`                                                                        | Item label foreground color.                                                          |
| `--cs-select-item-fg-hover`         | `var(--cs-color-text-strong)`                                                                        | Item label foreground color on hover/focus/active.                                    |
| `--cs-select-item-description-fg`   | `var(--cs-color-text-weak)`                                                                          | Secondary description foreground color.                                               |
| `--cs-select-item-icon-fg`          | `var(--cs-color-text-weak)`                                                                          | Item leading icon color (`--cs-color-text-main` on hover/focus/active).               |
| `--cs-select-item-indicator-fg`     | `var(--cs-color-accent-soft-fg)`                                                                     | Trailing selected checkmark color.                                                    |
| `--cs-select-item-px`               | `8px` (`xs`/`sm`), `10px` (`md`), `12px` (`lg`/`xl`)                                                 | Item horizontal padding (`-2px` on start edge when icon present).                     |
| `--cs-select-item-py`               | `5px` / `6px` / `7px` / `8px` / `9px`                                                                | Item vertical padding across `xs`–`xl`.                                               |
| `--cs-select-item-min-height`       | `28px` / `30px` / `34px` / `38px` / `42px`                                                           | Minimum item height across `xs`–`xl`.                                                 |
| `--cs-select-item-gap`              | `6px` (`xs`/`sm`), `8px` (`md`/`lg`), `10px` (`xl`)                                                  | Gap between item slots.                                                               |
| `--cs-select-item-font-size`        | `--cs-text-xs` (`xs`/`sm`), `--cs-text-sm` (`md`/`lg`), `--cs-text-base` (`xl`)                      | Item primary text size.                                                               |
| `--cs-select-item-title-lh`         | `18px` (`xs`/`sm`), `20px` (`md`/`lg`), `22px` (`xl`)                                                | Title line-height used for line-1 icon/checkmark alignment in multi-line items.       |
| `--cs-select-icon-size`             | `14px` (`xs`/`sm`), `16px` (`md`/`lg`), `18px` (`xl`)                                                | Item leading icon size.                                                               |
| `--cs-select-check-size`            | `14px` (`xs`/`sm`), `16px` (`md`–`xl`)                                                               | Item trailing checkmark size.                                                         |
| `--cs-select-group-gap`             | `6px` (`xs`/`sm`), `10px` (`md`–`xl`)                                                                | Top margin between adjacent `<SelectGroup>` blocks.                                   |
| `--cs-select-group-label-fg`        | `var(--cs-color-text-weak)`                                                                          | Group label text color.                                                               |
| `--cs-select-group-label-font-size` | `11px` (`xs`/`sm`), `var(--cs-text-xs)` (`md`–`xl`)                                                  | Group label font size.                                                                |
| `--cs-select-separator-bg`          | `color-mix(in oklab, var(--cs-color-text-main) 10%, transparent)`                                    | Hairline separator color.                                                             |

## Examples

### Basic (`soft` & `elevated`)

```svelte
<script lang="ts">
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "cs/svelte/select";

    let role = $state("");
</script>

<Select variant="soft" size="md" bind:value={role}>
    <SelectTrigger class="w-48">
        <SelectValue placeholder="Select role…" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="designer">Designer</SelectItem>
        <SelectItem value="engineer">Engineer</SelectItem>
        <SelectItem value="product">Product</SelectItem>
    </SelectContent>
</Select>
```

### Rich Items (Icons, Descriptions & Trailing Slots)

```svelte
<script lang="ts">
    import { Compass, Layers, Sparkles, Zap } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Kbd } from "cs/svelte/kbd";
    import {
        Select,
        SelectContent,
        SelectItem,
        SelectItemDescription,
        SelectItemIcon,
        SelectItemText,
        SelectTrigger,
        SelectValue,
    } from "cs/svelte/select";

    let mode = $state("fast");
</script>

<Select variant="soft" size="md" bind:value={mode}>
    <SelectTrigger class="w-56">
        <SelectValue placeholder="Select mode…" />
    </SelectTrigger>
    <SelectContent>
        <!-- Shorthand `icon` prop -->
        <SelectItem value="fast" icon={Zap} label="Fast">
            <SelectItemText>Fast</SelectItemText>
            <SelectItemDescription>Quick replies for daily work</SelectItemDescription>
        </SelectItem>

        <!-- Compound `SelectItemIcon` (supports `color` and custom SVG attributes) -->
        <SelectItem value="balanced">
            <SelectItemIcon icon={Sparkles} color="var(--cs-color-accent-soft-fg)" />
            <SelectItemText>Balanced</SelectItemText>
            <SelectItemDescription>Everyday reasoning and writing</SelectItemDescription>
            <Badge variant="soft" color="accent" size="xs">
                <BadgeLabel>Default</BadgeLabel>
            </Badge>
        </SelectItem>

        <SelectItem value="deep">
            <SelectItemIcon icon={Compass} />
            <SelectItemText>Deep</SelectItemText>
            <SelectItemDescription>Thorough research and analysis</SelectItemDescription>
            <Kbd variant="soft" size="xs">3</Kbd>
        </SelectItem>

        <SelectItem value="workspace">
            <SelectItemIcon icon={Layers} />
            <SelectItemText>Workspace</SelectItemText>
        </SelectItem>
    </SelectContent>
</Select>
```

### Groups, Separators & Disabled Options

```svelte
<Select variant="soft" size="md" bind:value={status}>
    <SelectTrigger class="w-56">
        <SelectValue placeholder="Select status…" />
    </SelectTrigger>
    <SelectContent>
        <SelectGroup>
            <SelectGroupLabel>Active</SelectGroupLabel>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="in-review">In Review</SelectItem>
        </SelectGroup>
        <SelectGroup>
            <SelectGroupLabel>Closed</SelectGroupLabel>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="archived" disabled>Archived</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value="unassigned">Unassigned</SelectItem>
    </SelectContent>
</Select>
```

### Form Integration (`name`, `required`, `invalid`) & Custom `SelectValue`

```svelte
<script lang="ts">
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "cs/svelte/select";

    let region = $state("");
</script>

<form class="flex flex-col gap-2">
    <label for="region-select">Region</label>
    <Select variant="elevated" size="md" name="region" required invalid={!region} bind:value={region}>
        <SelectTrigger id="region-select" class="w-56">
            <SelectValue placeholder="Choose region…">
                {#snippet children(item)}
                    {#if item}
                        <span class="cs-select-trigger-value-label">{item.label} ({item.value})</span>
                    {:else}
                        <span class="cs-select-trigger-value-label">Choose region…</span>
                    {/if}
                {/snippet}
            </SelectValue>
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="us-east">US East</SelectItem>
            <SelectItem value="eu-west">EU West</SelectItem>
            <SelectItem value="ap-south">AP South</SelectItem>
        </SelectContent>
    </Select>
</form>
```

## Behavior & Quirks

- **Built-in `ScrollArea` and `scrollFade` inside `SelectContent`:** `SelectContent` owns the scrolling viewport internally—it wraps its children in `<ScrollArea size="sm" direction="vertical" {scrollbar}>` and `<ScrollAreaContent class="cs-select-list" {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}>`, capping height via `maxHeight` (default `"min(320px, 60dvh)"`, clamped to `calc(100dvh - 32px)`). Never nest another `<ScrollArea>` inside `<SelectContent>`: `Popover`'s `.cs-select-content:popover-open` overrides `overflow: hidden` with a flex column so `.cs-select-list` acts as the sole scrollport, allowing `scrollFade`'s `24px` top/bottom masks to sit flush with the panel bounds without masking the panel background or `--cs-shadow-floating`, and ensuring `scrollIntoView({ block: "nearest" })` + `scroll-padding-block` work cleanly during keyboard navigation.
- **Headless `<Select>` & `$bindable` pitfall:** `<Select>` renders no wrapper element—only `children` and, when `name` is truthy, `<input type="hidden" {name} value={value ?? ""} {disabled} />`. Apply layout, width, and margin classes directly to `<SelectTrigger>`. Never pass a non-bound expression (e.g. `value={getValue()}`) to `$bindable` `value` or `open`; use `bind:value` / `bind:value={get, set}` or `bind:open` / `bind:open={get, set}`.
- **`SelectTrigger` combobox semantics & overrides:** `SelectTrigger` always enforces `type="button"` (preventing accidental form submission) and `role="combobox"` with `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls`. `SelectTrigger`'s `disabled` and `invalid` props fall back to `Select`'s values via `disabled ?? select.disabled` and `invalid ?? select.invalid`, letting a trigger override the root state if needed.
- **`SelectValue` mirroring & label extraction:** When `value` matches a registered `SelectItem`, `SelectValue` reactively mirrors `label`, `icon`, and `iconColor` (when `showIcon` is `true`, the default). Label resolution checks: (1) explicit `label` prop on `SelectItem`, (2) `<SelectItemText>` `textContent`, (3) `.cs-select-item-content` text excluding `<SelectItemDescription>`, and (4) `value` itself. Pass `label` explicitly on `SelectItem` for complex rows or SSR-rendered initial values. When no item matches (`value === undefined` or `""`), `SelectValue` renders `placeholder` (localized `"Select…"` / `"Auswählen…"` by default); if a non-empty `value` is set before options mount, it falls back to `String(value)` until the item registers.
- **`SelectItem` icon patterns & line-1 optical alignment:** Pass `icon={Globe}` directly on `<SelectItem>` for standard monochrome icons (`color` defaults to `--cs-select-item-icon-fg`), or use `<SelectItemIcon icon={Globe} color="..." />` when you need custom icon color or SVG attributes/classes (note `SelectItem` has no `iconColor` prop; if both `icon` and `<SelectItemIcon>` are provided, `SelectItem`'s `icon` prop wins and `SelectItemIcon`'s `color` is not forwarded). When `<SelectItemDescription>` is present, `.cs-select-item-inner` switches to `align-items: start`, `<SelectItemText>` disables `text-trim` (`text-box: normal`) with `--cs-select-item-title-lh`, and the leading icon, trailing badge/kbd, and trailing checkmark align optically to line 1.
- **Sticky-free group headings & separators:** `SelectGroupLabel` links its generated (or custom) `id` to `SelectGroup`'s `aria-labelledby` and renders non-sticky Direction A group headers (`11px` at `xs`/`sm`, `var(--cs-text-xs)` at `md`–`xl`, `font-weight: 500`). Adjacent `<SelectGroup>` blocks separate via `--cs-select-group-gap` (`6px` at `xs`/`sm`, `10px` at `md`–`xl`).
- **Keyboard navigation & typeahead:**
    - **Closed trigger:** `ArrowDown`, `Enter`, or `Space` (when the typeahead buffer is empty) opens the popover and focuses the selected item (or the first enabled item). `ArrowUp` opens and focuses the selected item (or the last enabled item when nothing is selected). Typing printable characters while focused on the closed trigger immediately selects the next matching enabled item _without_ opening the menu, using a `500ms` rolling buffer (`Space` mid-buffer continues matching multi-word labels; repeated identical letters cycle matches).
    - **Open listbox:** `rovingFocus` (`orientation: "vertical"`, `loop: false`, `homeEnd: true`, `preventScroll: true`, `typeahead` with `500ms` timeout and multi-word `Space` support) moves real DOM focus between enabled `.cs-select-item` elements, scrolling active items into view (`scrollIntoView({ block: "nearest" })`) clear of the `24px` `scrollFade`. Initial keyboard open retains the inset `:focus-visible` outline (`outline-offset: -2px`), while arrow/`Home`/`End`/typeahead navigation sets `data-arrow-nav` and `data-nav="keyboard"` to suppress the outline and stale pointer `:hover` until mouse `pointermove`. `Enter` or `Space` (when not mid-typeahead) selects and restores focus to `SelectTrigger`; `Escape` dismisses; `Tab` closes and restores focus to `SelectTrigger` synchronously before focus advances.
- **Press-drag-release pointer UX:** Mouse `pointerdown` on `SelectTrigger` opens immediately (`popoverTrigger({ triggerOn: "pointerdown" })`) and starts drag tracking (`>= 4px` travel or `>= 180ms` hold); releasing `pointerup` over a `SelectItem` commits selection in a single gesture, while touch and keyboard activate on `click`.
- **Hidden `<input>` & `required` note:** Passing `name` renders `<input type="hidden" {name} value={value ?? ""} {disabled} />` for standard `<form>` submission; `required` applies `aria-required="true"` on `SelectTrigger` rather than native constraint validation on the hidden `<input>`.
