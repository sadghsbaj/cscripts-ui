---
name: Chip
kind: component
import: cs/svelte/chip
exports:
    - Chip
    - ChipGroup
    - ChipTrigger
    - ChipIcon
    - ChipLabel
    - ChipRemove
    - CHIP_VARIANTS
    - CHIP_SIZES
    - CHIP_TRIGGER_ELEMENTS
    - ChipVariant
    - ChipSize
    - ChipTriggerElement
    - ChipProps
    - ChipGroupSelectionProps
    - ChipGroupProps
    - ChipTriggerStateProps
    - ChipTriggerProps
    - ChipLabelProps
    - ChipIconComponentProps
    - ChipIconProps
    - ChipRemoveProps
---

# Chip

## Overview

Compact, pill-shaped compound primitive (`<Chip />`) for discrete tags, applied filters, selected multi-select or recipient tokens, and compact actions/links, paired with `<ChipGroup />` for wrapping layout, prop inheritance, and optional single/multi selection. Calibrated one step shorter (`20px`–`36px`) than `Button` and `TextInput` (`28px`–`44px`) so chips nest cleanly inside input wells and filter bars.

## Usage Guidance

- **Do not overuse:** Do NOT wrap every arbitrary metadata string, table cell, attribute, or info snippet in a chip pill. Excessive chip pills quickly make a UI noisy, fragmented, and restless—use plain typography and visual hierarchy for routine attributes.
- **Use selectively:** Reserve `Chip` for items with discrete, bounded token semantics: applied filter pills, multi-select or recipient tokens, compact suggestion/filter toggles, and explicit dismissible tags.
- **Boundary vs. sibling primitives:**
    - **Plain typography:** Routine object attributes, dates, table cells, and passive descriptions.
    - **`Badge` (`cs/svelte/badge`):** Strictly non-interactive (`<span>`, `18px`–`32px`) for passive status indicators (`dot`), live counts (`tabular-nums`), and semantic status colors (`positive`, `caution`, `negative`).
    - **`Button` / `ToggleButton` (`cs/svelte/button`, `cs/svelte/toggle-button`):** Full-height (`28px`–`44px`, `font-weight: 600`) primary/secondary actions, `solid` CTAs, and toolbar toggles.
    - **`Chip` (`cs/svelte/chip`):** `20px`–`36px` (`font-weight: 500`), calm `soft` / `elevated` / `accent` surfaces plus targeted `invalid` state—no `solid` CTA weight and no multi-color status matrix.
- **Variants & Surface Pairing:**
    - **`soft`:** Default workhorse on `elevated` cards, modals, `elevated` inputs, and calm `canvas` tag lists.
    - **`elevated`:** Raised surface (`--cs-color-elevated` + `--cs-shadow-elevated`) for `canvas` filter bars and `sunken` wells.
    - **`accent`:** Pre-highlighted tags or active applied filters (e.g., `Status: Open ×`).
    - **`soft` composite input wells:** Override `--cs-chip-bg`, `--cs-chip-bg-hover`, and `--cs-chip-shadow` on the host well so nested chips stay crisp in both light and dark modes (see [Host-Override Contract](#host-override-contract-for-soft-input-wells)).

## Uniform Compound Compositions

`<Chip />` **always** renders `<span class="cs-chip">`—it never morphs into `<button>` or `<a>`. All four compositions share one predictable markup model:

1. **Static:** `<Chip><ChipIcon /><ChipLabel /></Chip>` — Non-interactive `<span>` (`transition: none`, zero hover/active states).
2. **Removable:** `<Chip><ChipLabel /><ChipRemove /></Chip>` — Non-interactive pill body with a trailing `<button type="button" class="cs-chip-remove">`.
3. **Interactive (Full-Pill Trigger):** `<Chip><ChipTrigger>...</ChipTrigger></Chip>` — Toggle (`bind:pressed` or `value` inside `ChipGroup`), action (`onclick`), or link (`href` / `as="a"`). `<Chip>` collapses its own padding/background/shadow and delegates the full pill surface, focus ring, and squash physics to `<ChipTrigger />`.
4. **Split (Interactive + Removable):** `<Chip><ChipTrigger>...</ChipTrigger><ChipRemove /></Chip>` — `<Chip>` owns the unified outer pill surface and pressed `.cs-chip-fill`, while `<ChipTrigger />` and `<ChipRemove />` remain sibling interactive elements with isolated hover, press, and focus states (`data-split`).

## API

### `Chip` Props

Extends `Omit<HTMLAttributes<HTMLSpanElement>, "size">` and always renders `<span class="cs-chip">`.

| Prop       | Type                      | Required   | Default     | Description                                                                                                                      |
| :--------- | :------------------------ | :--------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `variant`  | `ChipVariant`             | Standalone | Inherited   | Surface style: `"soft" \| "elevated" \| "accent"`. Required outside `<ChipGroup />`.                                             |
| `size`     | `ChipSize`                | Standalone | Inherited   | T-shirt size (`20px`–`36px`): `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. Required outside `<ChipGroup />`.                          |
| `disabled` | `boolean`                 | No         | `false`     | Disables the chip and any child `<ChipTrigger />` / `<ChipRemove />` (also inherits `disabled` from `<ChipGroup />`).            |
| `invalid`  | `boolean`                 | No         | `false`     | Marks malformed input tokens (e.g. invalid email recipient) with `negative` soft fill and a `1.5px` inset ring (`data-invalid`). |
| `iconOnly` | `boolean`                 | No         | `false`     | Locks square `1:1` proportions (`aspect-ratio: 1; padding-inline: 0`) for icon-only chips.                                       |
| `children` | `Snippet`                 | No         | `undefined` | Compound children (`<ChipIcon />`, `<ChipLabel />`, `<ChipTrigger />`, `<ChipRemove />`).                                        |
| `ref`      | `HTMLSpanElement \| null` | No         | `null`      | `$bindable` reference to the root `<span>` element.                                                                              |

### `ChipGroup` Props

Co-located wrapping group container (`<div role="group" class="cs-chip-group">`) providing size-calibrated `gap`, shared `variant` / `size` / `disabled` inheritance, and optional single- or multi-select state.

| Prop            | Type                                                    | Required | Default     | Description                                                                                                                      |
| :-------------- | :------------------------------------------------------ | :------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `variant`       | `ChipVariant`                                           | No       | `undefined` | Shared variant inherited by child `<Chip />` items unless overridden per chip.                                                   |
| `size`          | `ChipSize`                                              | No       | `undefined` | Shared size inherited by child `<Chip />` items unless overridden per chip. Also calibrates `--cs-chip-group-gap` (`4px`–`8px`). |
| `disabled`      | `boolean`                                               | No       | `false`     | Sets `aria-disabled="true"` on the group and disables all child `<Chip />`, `<ChipTrigger />`, and `<ChipRemove />` items.       |
| `wrap`          | `boolean`                                               | No       | `true`      | Enables `flex-wrap: wrap` via `data-wrap` (`nowrap` when `false`).                                                               |
| `multiple`      | `boolean`                                               | No       | `false`     | Selection mode: `false` (single `string \| undefined`) or `true` (multi `string[]`).                                             |
| `value`         | `string \| undefined` (single) or `string[]` (multiple) | No       | `undefined` | `$bindable` selected item value(s) matched against child `<ChipTrigger value="..." />`.                                          |
| `onValueChange` | `(value: ...) => void`                                  | No       | `undefined` | Fires with the next selection after a user toggles a child `<ChipTrigger value="..." />`.                                        |
| `children`      | `Snippet`                                               | No       | `undefined` | Child `<Chip />` items.                                                                                                          |
| `ref`           | `HTMLDivElement \| null`                                | No       | `null`      | `$bindable` reference to the root `<div>` element.                                                                               |

### `ChipTrigger` Props

Interactive body region inside `<Chip />`. Renders `<button type="button">` by default, or `<a>` when `as="a"` or `href` is provided (`as === "a" || href !== undefined`).

| Prop              | Type                                             | Required               | Default                                | Description                                                                                                                                                      |
| :---------------- | :----------------------------------------------- | :--------------------- | :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`              | `ChipTriggerElement`                             | No                     | `"button"` (or `"a"` if `href` is set) | Element tag: `"button" \| "a"`.                                                                                                                                  |
| `href`            | `string`                                         | When `as="a"`          | `undefined`                            | Navigation target for link chips (`value`, `pressed`, and `onPressedChange` become `never`).                                                                     |
| `value`           | `string`                                         | Inside selection group | `undefined`                            | Item identifier inside `<ChipGroup />`. Forbidden standalone or on `<a>` links (`pressed`/`onPressedChange` become `never`).                                     |
| `pressed`         | `boolean`                                        | Standalone toggle      | `undefined`                            | `$bindable` pressed state for standalone toggle chips. Passing a boolean enables `aria-pressed`; omitting `pressed` (and `value`) renders a plain action button. |
| `onPressedChange` | `(pressed: boolean) => void`                     | No                     | `undefined`                            | Fires with the next pressed state after a user toggle (standalone only).                                                                                         |
| `disabled`        | `boolean`                                        | No                     | `false`                                | Per-trigger disabled override (combined with parent `<Chip />` / `<ChipGroup />` `disabled`).                                                                    |
| `children`        | `Snippet`                                        | No                     | `undefined`                            | Trigger contents (typically `<ChipIcon />` and `<ChipLabel />`).                                                                                                 |
| `ref`             | `HTMLButtonElement \| HTMLAnchorElement \| null` | No                     | `null`                                 | `$bindable` reference to the `<button>` or `<a>` element.                                                                                                        |

### `ChipIcon`, `ChipLabel` & `ChipRemove`

- **`ChipIcon`:** Extends `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">` with `{ icon: Component<ChipIconComponentProps>; color?: string; strokeWidth?: number | string }`. Renders `<Icon {...rest} {strokeWidth} aria-hidden="true" class={["cs-chip-icon", className]} />` with default `strokeWidth = 2.25`, `flex-shrink: 0`, and `pointer-events: none`.
- **`ChipLabel`:** Extends `HTMLAttributes<HTMLSpanElement>`. Renders `<span class="cs-chip-label">` with `ref = $bindable(null)` and `...rest`, applying `text-box: trim-both cap alphabetic`, `white-space: nowrap`, `min-inline-size: 0`, `overflow-x: clip`, `overflow-y: visible`, and `text-overflow: ellipsis`.
- **`ChipRemove`:** Extends `Omit<HTMLButtonAttributes, "type">`. Props: `disabled?: boolean` (`false`), `children?: Snippet` (optional custom glyph replacing the default Lucide `<X strokeWidth={2.5} aria-hidden="true" class="cs-chip-remove-icon" />`), and `ref = $bindable(null)`. Always enforces `type="button"` after `{...rest}`.

### Constants & Exported Types

- `CHIP_VARIANTS = ["soft", "elevated", "accent"] as const` (`ChipVariant`)
- `CHIP_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` (`ChipSize`)
- `CHIP_TRIGGER_ELEMENTS = ["button", "a"] as const` (`ChipTriggerElement`)
- Prop/helper types: `ChipProps`, `ChipGroupSelectionProps`, `ChipGroupProps`, `ChipTriggerStateProps`, `ChipTriggerProps`, `ChipLabelProps`, `ChipIconComponentProps`, `ChipIconProps`, `ChipRemoveProps`

### `data-*` Attributes

- **`.cs-chip-group` (`<div role="group">`):** `aria-disabled="true"` (when disabled), `data-variant={variant}`, `data-size={size}`, `data-wrap` (when `wrap` is true), `data-disabled` (when disabled).
- **`.cs-chip` (`<span>`):** `data-variant={resolvedVariant}`, `data-size={resolvedSize}`, `data-invalid`, `data-icon-only`, `data-interactive` (when a `<ChipTrigger />` is mounted inside), `data-split` (when both `<ChipTrigger />` and `<ChipRemove />` are mounted), `data-pressed` (when toggleable trigger is pressed), `data-disabled` (when disabled on `Chip` or `ChipGroup`).
- **`.cs-chip-trigger` (`<button>` or `<a>`):** `aria-pressed="true" | "false"` (when `<button>` with `value !== undefined || pressed !== undefined`), `data-disabled` (when disabled directly or via `Chip` / `ChipGroup`).
- **`.cs-chip-remove` (`<button type="button">`):** `data-disabled` (when disabled directly or via `Chip` / `ChipGroup`).

### Size Scale (`xs`–`xl`)

Each size is `8px` shorter than the corresponding `TextInput` / `Button` (`28px`–`44px`) so `<Chip size={s}>` fits inside a matching input well with `4px`–`5px` vertical padding.

| `size` | `--cs-chip-height` | `--cs-chip-font-size`   | `--cs-chip-icon-size` | `--cs-chip-px` | `--cs-chip-gap` | `--cs-chip-remove-size` | `--cs-chip-remove-inset` | `--cs-chip-remove-icon-size` | `--cs-chip-group-gap` |
| :----- | :----------------- | :---------------------- | :-------------------- | :------------- | :-------------- | :---------------------- | :----------------------- | :--------------------------- | :-------------------- |
| `xs`   | `20px`             | `11px`                  | `12px`                | `7px`          | `4px`           | `14px`                  | `3px`                    | `10px`                       | `4px`                 |
| `sm`   | `24px`             | `--cs-text-xs` (`12px`) | `14px`                | `8px`          | `4px`           | `18px`                  | `3px`                    | `12px`                       | `6px`                 |
| `md`   | `28px`             | `13px`                  | `15px`                | `10px`         | `5px`           | `20px`                  | `4px`                    | `13px`                       | `6px`                 |
| `lg`   | `32px`             | `--cs-text-sm` (`14px`) | `16px`                | `12px`         | `6px`           | `24px`                  | `4px`                    | `16px`                       | `8px`                 |
| `xl`   | `36px`             | `--cs-text-sm` (`14px`) | `16px`                | `14px`         | `6px`           | `26px`                  | `5px`                    | `17px`                       | `8px`                 |

### CSS Custom Properties (`--cs-chip-*`)

| Variable                                                                                    | Description                                                                                                                                  |
| :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `--cs-chip-height` / `--cs-chip-px` / `--cs-chip-gap`                                       | Pill block size, text-side inline padding, and internal flex gap.                                                                            |
| `--cs-chip-font-size` / `--cs-chip-icon-size`                                               | Label font size and `<ChipIcon />` dimensions.                                                                                               |
| `--cs-chip-radius` / `--cs-chip-max-width`                                                  | Pill corner radius (defaults to `calc(var(--cs-chip-height) / 2)`) and max inline size (`100%`).                                             |
| `--cs-chip-bg` / `--cs-chip-bg-hover`                                                       | Host-override surface background at rest and hover (falls back to `--cs-chip-surface-bg` / `--cs-chip-surface-bg-hover`).                    |
| `--cs-chip-fg` / `--cs-chip-fg-hover`                                                       | Foreground text and icon color at rest and hover.                                                                                            |
| `--cs-chip-shadow` / `--cs-chip-shadow-hover` / `--cs-chip-shadow-active`                   | Host-override shadow hooks (fall back to `--cs-chip-surface-shadow*`).                                                                       |
| `--cs-chip-ring-shadow`                                                                     | Inset ring shadow hook (defaults to `0 0 #0000`; set to `1.5px` negative ring on `[data-invalid]`).                                          |
| `--cs-chip-bg-pressed` / `--cs-chip-bg-pressed-hover` / `--cs-chip-fg-pressed`              | Pressed `.cs-chip-fill` background (`--cs-color-accent-soft` / `--cs-color-accent-soft-hover`) and foreground (`--cs-color-accent-soft-fg`). |
| `--cs-chip-shadow-pressed`                                                                  | Pressed fill shadow (`0 0 #0000`, or `1px` translucent inset accent rim on `elevated`).                                                      |
| `--cs-chip-trigger-bg-hover`                                                                | Hover wash over `<ChipTrigger />` in `data-split` mode (`color-mix(in oklch, currentColor 8%, transparent)`).                                |
| `--cs-chip-remove-size` / `--cs-chip-remove-inset` / `--cs-chip-remove-icon-size`           | Concentric `<ChipRemove />` disc size, trailing inset, and `X` glyph dimensions.                                                             |
| `--cs-chip-remove-fg` / `--cs-chip-remove-fg-hover` / `--cs-chip-remove-bg-hover`           | `<ChipRemove />` icon color at rest/hover and circular hover disc fill.                                                                      |
| `--cs-chip-group-gap`                                                                       | Flex gap on `.cs-chip-group` (`4px` at `xs`, `6px` at `sm`/`md`, `8px` at `lg`/`xl`).                                                        |
| `--cs-chip-squash-active` / `--cs-chip-focus-scale-active` / `--cs-chip-transition-pressed` | Pointer squash scale (`--cs-squash-subtle`), keyboard `:focus-visible:active` scale (`0.97`), and `.cs-chip-fill` enter/exit transition.     |

## Examples

### All 4 Compositions

```svelte
<script lang="ts">
    import { Filter, Sparkles, Tag } from "@lucide/svelte";
    import { Chip, ChipIcon, ChipLabel, ChipRemove, ChipTrigger } from "cs/svelte/chip";

    let active = $state(false);
    let splitPressed = $state(true);
</script>

<!-- 1. Static -->
<Chip variant="soft" size="md">
    <ChipIcon icon={Tag} />
    <ChipLabel>TypeScript</ChipLabel>
</Chip>

<!-- 2. Removable -->
<Chip variant="soft" size="md">
    <ChipLabel>Alice</ChipLabel>
    <ChipRemove aria-label="Remove Alice" onclick={() => removeTag("alice")} />
</Chip>

<!-- 3. Interactive (toggle, action, link) -->
<Chip variant="soft" size="md">
    <ChipTrigger bind:pressed={active}>
        <ChipLabel>Open</ChipLabel>
    </ChipTrigger>
</Chip>

<Chip variant="elevated" size="md">
    <ChipTrigger onclick={runAction}>
        <ChipIcon icon={Sparkles} />
        <ChipLabel>Summarize</ChipLabel>
    </ChipTrigger>
</Chip>

<Chip variant="soft" size="md">
    <ChipTrigger href="/tags/svelte">
        <ChipLabel>#svelte</ChipLabel>
    </ChipTrigger>
</Chip>

<!-- 4. Split (Interactive + Removable) -->
<Chip variant="soft" size="md">
    <ChipTrigger bind:pressed={splitPressed}>
        <ChipIcon icon={Filter} />
        <ChipLabel>Status: Open</ChipLabel>
    </ChipTrigger>
    <ChipRemove aria-label="Clear status filter" onclick={clearFilter} />
</Chip>
```

### `ChipGroup` Selection & Inheritance

```svelte
<script lang="ts">
    import { Chip, ChipGroup, ChipLabel, ChipTrigger } from "cs/svelte/chip";

    let status = $state<string | undefined>("open");
    let tags = $state<string[]>(["frontend", "design"]);
</script>

<!-- Single-select (clicking active item deselects to undefined) -->
<ChipGroup variant="elevated" size="md" bind:value={status}>
    <Chip>
        <ChipTrigger value="open"><ChipLabel>Open</ChipLabel></ChipTrigger>
    </Chip>
    <Chip>
        <ChipTrigger value="closed"><ChipLabel>Closed</ChipLabel></ChipTrigger>
    </Chip>
</ChipGroup>

<!-- Multi-select -->
<ChipGroup variant="soft" size="sm" multiple bind:value={tags}>
    <Chip>
        <ChipTrigger value="frontend"><ChipLabel>Frontend</ChipLabel></ChipTrigger>
    </Chip>
    <Chip>
        <ChipTrigger value="design"><ChipLabel>Design</ChipLabel></ChipTrigger>
    </Chip>
    <Chip>
        <ChipTrigger value="backend"><ChipLabel>Backend</ChipLabel></ChipTrigger>
    </Chip>
</ChipGroup>
```

### Host-Override Contract for `soft` Input Wells

Inside a `soft` composite input well (`--cs-color-base-soft`), standard `soft` chips double-stack `base-soft` muddily in dark mode while `elevated` chips (`zinc-900`) look recessed. Override `--cs-chip-bg`, `--cs-chip-bg-hover`, and `--cs-chip-shadow` on the host well so nested chips render as crisp translucent capsules (`[data-invalid]` on `<Chip invalid />` still takes precedence automatically):

```css
.my-soft-input-well {
    --cs-chip-bg: light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 14%, transparent));
    --cs-chip-bg-hover: light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 19%, transparent));
    --cs-chip-shadow: light-dark(var(--cs-shadow-xs), inset 0 1px 0 0 rgb(255 255 255 / 0.08));
}
```

## Behavior & Quirks

- **Runtime validation guards (`$effect.pre`):**
    - `<Chip>` throws ``<Chip> requires both `variant` and `size` (directly or via an enclosing <ChipGroup>).`` if either prop is omitted both directly and on an enclosing `<ChipGroup />`.
    - `<ChipTrigger value="...">` outside `<ChipGroup />` throws ``<ChipTrigger> with a `value` prop must be used inside a <ChipGroup>.``
    - `<ChipTrigger>` rendered as `<a>` with `value` or `pressed` throws ``<ChipTrigger> rendered as an <a> link cannot use `value` or `pressed`.``
    - `<ChipRemove>` nested inside `<ChipTrigger />` throws `<ChipRemove> must be a sibling of <ChipTrigger> inside <Chip>, not nested inside <ChipTrigger>.`
- **`$bindable()` & `pressed` toggle detection:** Never pass a plain non-bound expression (e.g. `pressed={isOpen()}` or `value={getSelected()}`) to `ChipTrigger` `pressed` or `ChipGroup` `value`—use `bind:*={state}`, Svelte 5 function bindings `bind:*={getter, setter}`, or omit the prop. Omitting `pressed` (leaving it `undefined`) on a standalone `<ChipTrigger>` renders an action button without `aria-pressed`; passing `bind:pressed={boolState}` enables toggle behavior and `aria-pressed`. Calling `event.preventDefault()` inside `ChipTrigger`'s `onclick` suppresses automatic `pressed` / `ChipGroup` toggling.
- **Localized `ChipRemove` `aria-label` & `type="button"`:** When neither `aria-label` nor `aria-labelledby` is supplied on `<ChipRemove />`, it defaults to `t({ de: "Entfernen", en: "Remove" })` (compile-time `--cs-lang` via `src/shared/lang.internal.ts`). Supply explicit labels (e.g. `aria-label="Remove TypeScript"`) in lists of tagged items. Both `<ChipTrigger>` (when `<button>`) and `<ChipRemove>` enforce `type="button"` after `{...rest}` so chips inside `<form>` never trigger submits.
- **Disabled semantics (`<a>` links & colorless tokens):** Disabled `<ChipTrigger as="a">` omits `href`, sets `role="link"`, `aria-disabled="true"`, `tabindex={-1}`, `data-disabled=""`, and calls `event.preventDefault()` on click. Disabled chips opt out of global opacity fade (`--cs-disabled-opacity: 1`) and use `--cs-color-disabled-*` tokens (including `--cs-color-disabled-bg-active` / `--cs-color-disabled-fg-active` when pressed + disabled, and `0 0 0 1px var(--cs-color-disabled-border)` on `elevated`).
- **Bounded asymmetric `ChipRemove` hit zone:** `.cs-chip-remove` uses an internal `::after` hit layer (`inset-block: calc(var(--cs-chip-remove-inset) * -1); inset-inline-start: 0; inset-inline-end: calc(var(--cs-chip-remove-inset) * -1);`) instead of an oversized `<HitArea />`. This expands targeting to the full chip height and outer trailing cap while maintaining **zero** leftward overlap into `ChipLabel`/`ChipTrigger` and **zero** vertical bleed into neighboring wrapped rows.
- **Horizontal truncation without focus-ring clipping:** `.cs-chip` never applies `overflow: hidden` or `overflow: clip`, keeping `:focus-visible` outlines and hit zones unclipped. `<ChipLabel />` handles `min-inline-size: 0; overflow-x: clip; overflow-y: visible; text-overflow: ellipsis; white-space: nowrap; text-box: trim-both cap alphabetic;` while `<ChipIcon />` and `<ChipRemove />` stay `flex-shrink: 0`.
- **Optical edge padding & concentricity:** When not `iconOnly`, a leading `<ChipIcon />` tightens start padding by `2px` (`max(4px, calc(var(--cs-chip-px) - 2px))`), and a trailing `<ChipRemove />` sets end padding to `--cs-chip-remove-inset` (`3px`–`5px`), maintaining exact `R_remove = R_outer - inset` squircle concentricity across `xs`–`xl`.
- **Unopinionated composition for `Combobox` / `TagList` containers:** `Chip` imposes no fixed list/grid role. Parent widgets can pass semantic roles (`role="listitem"`, `role="option"`), roving `tabindex`, `onkeydown`, or `{@attach ...}` via `{...rest}` on `<Chip>` or `<ChipTrigger>`, and pass `tabindex={-1}` on `<ChipRemove>` when container-level `Backspace`/`Delete` handling keeps inline remove buttons out of the `Tab` order.
