---
name: Avatar
kind: component
import: cs/svelte/avatar
exports:
    - Avatar
    - AvatarGroup
    - AVATAR_VARIANTS
    - AVATAR_SIZES
    - AVATAR_COLORS
    - AVATAR_PATTERNS
    - AVATAR_STATUSES
    - AvatarVariant
    - AvatarSize
    - AvatarColor
    - AvatarPattern
    - AvatarStatus
    - AvatarRef
    - AvatarCommonProps
    - AvatarProps
    - AvatarGroupProps
---

# Avatar

## Overview

Photo-free typographic and geometric identity stamp (`<Avatar />`) representing a user, entity, or workspace with deterministic OKLCH color, extracted initials, diagonal stripe texture, and optional presence status. Pairs with `<AvatarGroup />` for overlapping or spaced stacks with `max` `+N` overflow truncation and shared `variant`, `size`, and `disabled` inheritance.

## API

### `Avatar` Props

Polymorphic element selection is driven by `href` and `onclick`:

- **`href` provided:** Renders `<a class="cs-avatar">` (`Omit<HTMLAnchorAttributes, "color" | "size" | "href">`).
- **`onclick` provided (without `href`):** Renders `<button type="button" class="cs-avatar">` (`Omit<HTMLButtonAttributes, "color" | "size" | "type">`).
- **Neither `href` nor `onclick`:** Renders `<span class="cs-avatar">` (`Omit<HTMLAttributes<HTMLSpanElement>, "color" | "size">`).

| Prop       | Type                  | Required   | Default      | Description                                                                                                       |
| :--------- | :-------------------- | :--------- | :----------- | :---------------------------------------------------------------------------------------------------------------- |
| `variant`  | `AvatarVariant`       | Standalone | Inherited    | Surface treatment: `"soft" \| "solid"`. Required outside `<AvatarGroup />`.                                       |
| `size`     | `AvatarSize`          | Standalone | Inherited    | T-shirt scale (`20px`–`56px`): `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. Required outside `<AvatarGroup />`.        |
| `name`     | `string`              | No         | `undefined`  | Full name used for initials extraction, `auto` hue seeding, and default `aria-label`.                             |
| `initials` | `string`              | No         | `undefined`  | Explicit initials override (trimmed, uppercased, capped to 1 char at `xs`, 2 chars at `sm`–`xl`).                 |
| `seed`     | `string`              | No         | `undefined`  | Deterministic hash seed overriding `name` when `color="auto"`.                                                    |
| `color`    | `AvatarColor`         | No         | `"auto"`     | Palette: `"auto" \| "base" \| "accent" \| "positive" \| "caution" \| "negative"`.                                 |
| `pattern`  | `AvatarPattern`       | No         | `"diagonal"` | Surface texture overlay: `"diagonal" \| "none"`.                                                                  |
| `status`   | `AvatarStatus`        | No         | `undefined`  | Presence indicator dot with a `2px` cutout ring: `"online" \| "busy" \| "away" \| "offline"`.                     |
| `disabled` | `boolean`             | No         | `false`      | Disables interactive avatars (combined with enclosing `<AvatarGroup disabled>`).                                  |
| `href`     | `string`              | No         | `undefined`  | Navigation target; renders the root as `<a>`.                                                                     |
| `onclick`  | `MouseEventHandler`   | No         | `undefined`  | Click handler; renders the root as `<button type="button">` when `href` is omitted.                               |
| `children` | `Snippet`             | No         | `undefined`  | Custom inner content (e.g., an icon) replacing extracted initials and the fallback glyph.                         |
| `ref`      | `AvatarRef \| null`   | No         | `null`       | `$bindable` reference to the root `<span>`, `<button>`, or `<a>` element.                                         |

### `AvatarGroup` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "color">` and renders `<div role="group" class="cs-avatar-group">`.

| Prop       | Type                    | Required | Default     | Description                                                                                  |
| :--------- | :---------------------- | :------- | :---------- | :------------------------------------------------------------------------------------------- |
| `variant`  | `AvatarVariant`         | Yes      | —           | Shared surface treatment inherited by child `<Avatar />` items and the `+N` overflow badge.  |
| `size`     | `AvatarSize`            | Yes      | —           | Shared T-shirt scale inherited by child `<Avatar />` items and the `+N` overflow badge.      |
| `max`      | `number`                | No       | `undefined` | Maximum visible avatars before collapsing excess items into a `+N` overflow squircle.        |
| `overlap`  | `boolean`               | No       | `true`      | Negative inline-start overlap with cutout ring (`true`) vs. spaced row (`false`).            |
| `disabled` | `boolean`               | No       | `false`     | Sets `aria-disabled="true"` on the group and disables all child `<Avatar />` items.          |
| `children` | `Snippet`               | No       | `undefined` | Slotted `<Avatar />` items.                                                                  |
| `ref`      | `HTMLDivElement \| null` | No      | `null`      | `$bindable` reference to the root `<div>` element.                                           |

### Constants & Exported Types

- `AVATAR_VARIANTS = ["soft", "solid"] as const` (`AvatarVariant`)
- `AVATAR_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` (`AvatarSize`)
- `AVATAR_COLORS = ["auto", "base", "accent", "positive", "caution", "negative"] as const` (`AvatarColor`)
- `AVATAR_PATTERNS = ["diagonal", "none"] as const` (`AvatarPattern`)
- `AVATAR_STATUSES = ["online", "busy", "away", "offline"] as const` (`AvatarStatus`)
- Exported types: `AvatarRef`, `AvatarCommonProps`, `AvatarProps`, `AvatarGroupProps`

### `data-*` Attributes

- **`.cs-avatar`:** `data-variant={resolvedVariant}`, `data-size={resolvedSize}`, `data-color={resolvedColor}`, `data-pattern={pattern}`, `data-status={status}`, `data-interactive` (when `href` or `onclick` is provided), `data-disabled` (when disabled directly or via `<AvatarGroup />`), `data-overflow-hidden` (when collapsed by `AvatarGroup` `max`).
- **`.cs-avatar-group`:** `data-variant={variant}`, `data-size={size}`, `data-overlap` (when `overlap` is `true`), `data-disabled` (when `disabled` is `true`).

### Size Scale (`xs`–`xl`)

| `size` | `--cs-avatar-size` | `--cs-avatar-font-size` | `--cs-avatar-status-size` | `--cs-avatar-squircle` | `--cs-avatar-group-overlap` | `--cs-avatar-group-gap` |
| :----- | :----------------- | :---------------------- | :------------------------ | :--------------------- | :-------------------------- | :---------------------- |
| `xs`   | `20px`             | `9px`                   | `6px`                     | `--cs-squircle-soft`   | `-6px`                      | `4px`                   |
| `sm`   | `24px`             | `10px`                  | `7px`                     | `--cs-squircle-soft`   | `-7px`                      | `5px`                   |
| `md`   | `32px`             | `12px`                  | `8px`                     | `--cs-squircle-smooth` | `-8px`                      | `6px`                   |
| `lg`   | `40px`             | `14px`                  | `10px`                    | `--cs-squircle-smooth` | `-10px`                     | `8px`                   |
| `xl`   | `56px`             | `18px`                  | `12px`                    | `--cs-squircle-smooth` | `-14px`                     | `10px`                  |

### CSS Custom Properties (`--cs-avatar-*`, `--cs-avatar-group-*`)

| Variable                     | Description                                                                                      |
| :--------------------------- | :----------------------------------------------------------------------------------------------- |
| `--cs-avatar-size`           | Width and height of the squircle (`20px`–`56px`).                                                |
| `--cs-avatar-radius`         | Corner radius (`42%`).                                                                           |
| `--cs-avatar-squircle`       | Superellipse `corner-shape` (`--cs-squircle-soft` for `xs`/`sm`, `--cs-squircle-smooth` for `md`–`xl`). |
| `--cs-avatar-font-size`      | Initials font size (`9px`–`18px`).                                                               |
| `--cs-avatar-bg`             | Surface background fill.                                                                         |
| `--cs-avatar-bg-hover`       | Hover surface fill when `data-interactive` is present.                                           |
| `--cs-avatar-fg`             | Initials or fallback icon foreground color.                                                      |
| `--cs-avatar-shadow`         | Surface shadow (`--cs-shadow-solid` for interactive `solid`, `none` otherwise).                  |
| `--cs-avatar-shadow-active`  | Active press shadow (`--cs-shadow-solid-active` for interactive `solid`).                        |
| `--cs-avatar-hue`            | Deterministic OKLCH hue (`0`–`360`) set inline when `color="auto"` has a `seed` or `name`.       |
| `--cs-avatar-ring-color`     | Cutout ring and opaque surface backing color (defaults to `var(--cs-color-canvas)`).             |
| `--cs-avatar-ring-width`     | Cutout ring thickness (`2px`).                                                                   |
| `--cs-avatar-pattern-color`  | Stripe tint color (defaults to `currentColor`).                                                  |
| `--cs-avatar-pattern-opacity` | Opacity of the diagonal stripe layer (`0.16` for `soft`, `0.1` for `solid`).                    |
| `--cs-avatar-status-size`    | Diameter of `.cs-avatar-status` (`6px`–`12px`).                                                  |
| `--cs-avatar-status-bg`      | Semantic fill of `.cs-avatar-status` (`positive`, `negative`, `caution`, or `text-weaker`).      |
| `--cs-avatar-group-overlap`  | Negative inline-start margin between overlapping avatars in `<AvatarGroup />`.                   |
| `--cs-avatar-group-gap`      | Positive gap between avatars in `<AvatarGroup overlap={false} />`.                               |

## Examples

```svelte
<script lang="ts">
    import { Sparkles } from "@lucide/svelte";
    import { Avatar, AvatarGroup } from "cs/svelte/avatar";
</script>

<!-- Deterministic auto color + initials -->
<Avatar variant="soft" size="md" name="Ada Lovelace" />

<!-- Solid with presence status and explicit semantic color -->
<Avatar variant="solid" size="md" name="Marcus Chen" color="accent" status="online" />

<!-- Flat surface without diagonal stripe texture -->
<Avatar variant="soft" size="lg" name="Sora Takahashi" pattern="none" />

<!-- Custom icon content -->
<Avatar variant="soft" size="md" aria-label="Workspace bot">
    <Sparkles size={16} />
</Avatar>

<!-- Interactive button and link avatars -->
<Avatar variant="solid" size="md" name="Ada Lovelace" onclick={() => {}} />
<Avatar variant="soft" size="md" name="Elena Rostova" href="#profile" />

<!-- Overlapping group with +N overflow -->
<AvatarGroup variant="soft" size="md" max={3}>
    <Avatar name="Ada Lovelace" />
    <Avatar name="Marcus Chen" />
    <Avatar name="Elena Rostova" />
    <Avatar name="Noah Lindqvist" />
    <Avatar name="Sora Takahashi" />
</AvatarGroup>
```

## Behavior & Quirks

- **Required `variant` and `size`:** Neither prop has a default value. If an `<Avatar />` is rendered without `variant` or `size` outside an `<AvatarGroup />`, it throws an `Error` in `$effect.pre()`.
- **Deterministic `auto` hue:** When `color="auto"`, `seed?.trim() || name?.trim()` is hashed to an integer OKLCH hue (`0`–`360`) applied via inline `--cs-avatar-hue`. If neither `seed` nor `name` is non-empty, `data-color` falls back to `"base"`.
- **Initials extraction & fallback:** `initials` takes priority when non-empty after trimming. Otherwise, `name` is split on whitespace: `xs` takes the first character of the first word (1 char max); `sm`–`xl` take the first two characters of a single word or the first characters of the first and last words (2 chars max). When both `initials` and `name` are empty and no `children` are provided, a person silhouette SVG (`.cs-avatar-fallback`) renders instead.
- **Texture suppression at `xs`:** `.cs-avatar-pattern` is hidden automatically at `size="xs"` (`20px`) and whenever `pattern="none"`.
- **Opaque surface backing & cutout ring:** `.cs-avatar-surface` clips the pattern inside the squircle and layers `var(--cs-avatar-bg)` over `var(--cs-avatar-ring-color)` so overlapping `soft` avatars never bleed through each other. Override `--cs-avatar-ring-color` when placing an `<Avatar />` or `<AvatarGroup />` on a non-canvas surface (such as `--cs-color-elevated` or `--cs-color-sunken`).
- **Interactive hit area & disabled links:** Standalone or non-overlapping interactive avatars at `xs`–`lg` render `<HitArea />` (`sm` for `xs`–`md`, `md` for `lg`) to meet pointer target sizing; inside overlapping `<AvatarGroup />`s, `<HitArea />` is omitted so adjacent avatars do not collide. Disabled `<a>` avatars set `aria-disabled="true"`, `tabindex={-1}`, and call `event.preventDefault()` + `event.stopPropagation()` on click.
- **Accessibility & status labels:** Static `<span>` avatars derive `role="img"` and `aria-label` from `name` + localized `status` (`"online"`, `"busy"`, `"away"`, `"offline"`). Static avatars with no `name`, `aria-label`, or `aria-labelledby` set `aria-hidden="true"`. `.cs-avatar-surface` and `.cs-avatar-status` always carry `aria-hidden="true"`.
- **Group overflow & hover lift:** `<AvatarGroup />` tracks registered items in live DOM order and hides items at index `>= max` via `hidden` and `data-overflow-hidden`, rendering a `.cs-avatar-overflow` `+N` squircle with `tabular-nums`. In `overlap` mode, `:hover` and `:focus-visible` elevate the active avatar (`z-index: 2; translate: 0 -2px`).
