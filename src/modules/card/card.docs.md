---
name: Card
kind: component
import: cs/svelte/card
exports:
    - Card
    - CardHeader
    - CardTitle
    - CardDescription
    - CardBody
    - CardFooter
    - CardActions
    - CardMedia
    - CardRail
    - CardOrnament
    - CardClose
    - CARD_VARIANTS
    - CARD_SIZES
    - CARD_ORIENTATIONS
    - CARD_TITLE_ELEMENTS
    - CARD_ACTIONS_ALIGNS
    - CARD_ACTIONS_ORIENTATIONS
    - CARD_MEDIA_PLACEMENTS
    - CARD_MEDIA_RATIOS
    - CARD_MEDIA_FITS
    - CARD_RAIL_VARIANTS
    - CARD_RAIL_PLACEMENTS
    - CARD_RAIL_COLUMNS
    - CARD_ORNAMENT_PLACEMENTS
    - CARD_ORNAMENT_SHAPES
    - CardVariant
    - CardSize
    - CardOrientation
    - CardTitleElement
    - CardActionsAlign
    - CardActionsOrientation
    - CardMediaPlacement
    - CardMediaRatio
    - CardMediaFit
    - CardRailVariant
    - CardRailPlacement
    - CardRailColumns
    - CardOrnamentPlacement
    - CardOrnamentShape
    - CardProps
    - CardHeaderProps
    - CardTitleProps
    - CardDescriptionProps
    - CardBodyProps
    - CardFooterProps
    - CardActionsProps
    - CardMediaProps
    - CardRailProps
    - CardOrnamentProps
    - CardCloseProps
    - CardContext
    - getCardContext
    - setCardContext
    - hasCardContext
---

# Card

## Overview

Borderless-first, composable structural surface container (`<Card />`) built on monochrome surface tokens, superellipse squircles, and automatic concentric radius nesting. `Card` carries no internal interactive logic beyond context propagation for proportional sizing, media placement, and nested corner radii—allowing arbitrary content such as forms, inputs, icons, inline links, media, charts, and nested cards.

## Usage Guidance

- **`variant` (required):**
    - **`elevated`** _(recommended primary)_: Default go-to surface on `canvas` or `sunken` backgrounds.
    - **`transparent`**: Clean structural layout grouping without an added backdrop plate; ensure text contrast suits the parent surface.
    - **`sunken`**: Smooth recessed surface for inset wells or `CardRail` control docks.
    - **`soft`**: Weakest / fallback card variant — reserve for specific cases where a card sits on an `elevated` surface and neither `sunken` nor `transparent` fits. In Dark Mode, inside `elevated` cards prefer `sunken` or `transparent` sub-cards; if using `soft`, pair it with `soft` controls (`Checkbox variant="soft"`, `Switch`, `TextInput variant="soft"`) rather than `elevated` checkboxes whose hover state (`base-800`) approaches `--cs-color-base-soft` lightness.
- **`size` (required):**
    - **`md`** _(recommended default)_: Standard density for most application cards.
    - **`lg`**: Prominent hero, feature, or settings panels.
    - **`sm`**: Compact tiles and dense grids.
    - `size` controls padding, gaps, radii, and type scale—it never sets fixed pixel widths or heights.
- **`CardClose` over `CardMedia` (3-step rule):**
    1. First consider whether a close button is actually needed when artwork occupies the top-right corner—the cleanest composition leaves media unobstructed.
    2. If dismissal is needed over media, evaluate `CardClose variant="elevated"`, whose opaque backdrop and shadow prevent bleed-through and corner seam artifacts.
    3. Only if neither fits, use `variant="soft"` and verify contrast visually or override `--cs-close-button-bg` locally in the consuming app.
- **Keyboard Tab Order & DOM Structure:** Place `<CardClose>` right after `<CardHeader>` (or first if `CardHeader` has no leading interactive controls) and before `<CardBody>` / `<CardFooter>` so keyboard `Tab` navigation moves naturally top-to-bottom rather than jumping to the close button last. Keep `CardHeader` -> `CardBody` -> `CardFooter` in logical DOM order.
- **Composition & Nesting:** Compose icons, inline links, and form inputs freely inside `CardBody` or `CardHeader`. Use `CardActions` (`align`, `orientation`) for footer button groups, `CardRail` for `sunken` control docks (note that tight icon-only rail controls intentionally omit `<HitArea />` so adjacent cells do not overlap), and `CardOrnament` (`shape="circle"`, `--cs-card-ornament-color` mixed `in oklab`) for clipped decorative accents. Nested `<Card>` instances automatically compute concentric inner radii (`data-nested` / `--cs-card-nested-radius`).

## API

### `Card` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-card">`.

| Prop          | Type                     | Required | Default      | Description                                                                                                 |
| :------------ | :----------------------- | :------- | :----------- | :---------------------------------------------------------------------------------------------------------- |
| `variant`     | `CardVariant`            | Yes      | —            | Surface style: `"elevated" \| "soft" \| "sunken" \| "transparent"`.                                         |
| `size`        | `CardSize`               | Yes      | —            | Spatial density and radius scale: `"sm" \| "md" \| "lg"`.                                                   |
| `orientation` | `CardOrientation`        | No       | `"vertical"` | Layout orientation context (`"vertical" \| "horizontal"`), used by child `<CardMedia />` default placement. |
| `children`    | `Snippet`                | No       | `undefined`  | Composed card regions and arbitrary content.                                                                |
| `ref`         | `HTMLDivElement \| null` | No       | `null`       | `$bindable` reference to the root `<div>`.                                                                  |

### Structural Subcomponents

- **`CardHeader`**: Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div class="cs-card-header">` (`ref = $bindable(null)`, `...rest`) as a flex column with `gap: var(--cs-card-header-gap)`. Placed at `order: -1; align-self: start` in the main column.
- **`CardTitle`**: Extends `HTMLAttributes<HTMLHeadingElement | HTMLDivElement>` with `{ as?: CardTitleElement }` (default `"h3"`, `"h2" | "h3" | "h4" | "h5" | "h6" | "div"`). Renders `<svelte:element this={as} class="cs-card-title">` (`ref = $bindable(null)`, `...rest`) using `--cs-color-text-strong`, `font-weight: 600`, `--cs-leading-tight`, and `--cs-tracking-tight`.
- **`CardDescription`**: Extends `HTMLAttributes<HTMLParagraphElement>`. Renders `<p class="cs-card-description">` (`ref = $bindable(null)`, `...rest`) using `--cs-color-text-weak` and `--cs-leading-normal`.
- **`CardBody`**: Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div class="cs-card-body">` (`ref = $bindable(null)`, `...rest`) as a flex column with `gap: var(--cs-card-gap)` and `--cs-color-text-main`.
- **`CardFooter`**: Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div class="cs-card-footer">` (`ref = $bindable(null)`, `...rest`) as a wrapping horizontal flex row (`align-items: center; justify-content: space-between; gap: var(--cs-card-gap)`). Placed at `order: 1; align-self: end` in the main column.

### `CardActions` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-card-actions">`.

| Prop          | Type                     | Required | Default        | Description                                                    |
| :------------ | :----------------------- | :------- | :------------- | :------------------------------------------------------------- |
| `align`       | `CardActionsAlign`       | No       | `"end"`        | Alignment of action controls: `"start" \| "end" \| "stretch"`. |
| `orientation` | `CardActionsOrientation` | No       | `"horizontal"` | Direction of action controls: `"horizontal" \| "vertical"`.    |
| `children`    | `Snippet`                | No       | `undefined`    | Action buttons or controls.                                    |
| `ref`         | `HTMLDivElement \| null` | No       | `null`         | `$bindable` reference to the `<div>`.                          |

### `CardMedia` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-card-media">`.

| Prop        | Type                     | Required | Default             | Description                                                                                                                                          |
| :---------- | :----------------------- | :------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `placement` | `CardMediaPlacement`     | No       | `"top"` / `"start"` | Grid placement: `"top" \| "bottom" \| "start" \| "end"`. Defaults to `"start"` when parent `Card` has `orientation="horizontal"`, otherwise `"top"`. |
| `ratio`     | `CardMediaRatio`         | No       | `"auto"`            | Aspect ratio: `"auto" \| "1/1" \| "4/3" \| "16/9" \| "21/9"` or any custom CSS `aspect-ratio` string.                                                |
| `fit`       | `CardMediaFit`           | No       | `"cover"`           | Object-fit applied to direct `img`, `video`, and `svg` children: `"cover" \| "contain"`.                                                             |
| `bleed`     | `boolean`                | No       | `false`             | Extends media flush to the outer card edge (clipped by `Card`), removing inner media corner rounding.                                                |
| `children`  | `Snippet`                | No       | `undefined`         | Media element (`<img>`, `<video>`, `<svg>`, or custom markup).                                                                                       |
| `ref`       | `HTMLDivElement \| null` | No       | `null`              | `$bindable` reference to the `<div>`.                                                                                                                |

### `CardRail` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-card-rail">`. Dedicated full-height side dock (`grid-row: 1 / -1`) for compact controls.

| Prop        | Type                     | Required | Default     | Description                                                                                |
| :---------- | :----------------------- | :------- | :---------- | :----------------------------------------------------------------------------------------- |
| `variant`   | `CardRailVariant`        | Yes      | —           | Rail surface: `"sunken" \| "soft" \| "transparent"` (`transparent` sets padding to `0px`). |
| `placement` | `CardRailPlacement`      | No       | `"end"`     | Side track placement: `"start" \| "end"`.                                                  |
| `columns`   | `CardRailColumns`        | No       | `1`         | Grid column layout: `1 \| 2 \| "auto"` (`"auto"` flows items horizontally).                |
| `children`  | `Snippet`                | No       | `undefined` | Rail controls (e.g., compact icon-only `ToggleButton` or `Button` items).                  |
| `ref`       | `HTMLDivElement \| null` | No       | `null`      | `$bindable` reference to the `<div>`.                                                      |

### `CardOrnament` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div aria-hidden="true" class="cs-card-ornament">`. Absolute-positioned decorative layer (`z-index: 0; pointer-events: none`) that never occupies CSS Grid tracks.

| Prop        | Type                     | Required | Default         | Description                                                                                                  |
| :---------- | :----------------------- | :------- | :-------------- | :----------------------------------------------------------------------------------------------------------- |
| `placement` | `CardOrnamentPlacement`  | No       | `"bottom-left"` | Anchor region: `"bottom-left" \| "bottom-right" \| "top-right" \| "inset"`.                                  |
| `shape`     | `CardOrnamentShape`      | No       | `"none"`        | Ornament framing: `"circle"` (duotone bleeding disc with centered child) or `"none"` (raw positioned layer). |
| `children`  | `Snippet`                | No       | `undefined`     | Decorative icon, SVG, or ambient pattern.                                                                    |
| `ref`       | `HTMLDivElement \| null` | No       | `null`          | `$bindable` reference to the `<div>`.                                                                        |

### `CardClose` Props

Extends `Omit<CloseButtonProps, "size"> & { size?: CloseButtonSize }` and renders `<CloseButton class="cs-card-close">` with an embedded `<HitArea size="md" />`.

| Prop      | Type                        | Required | Default    | Description                                                                                                                                      |
| :-------- | :-------------------------- | :------- | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant` | `CloseButtonVariant`        | Yes      | —          | Close button surface: `"soft" \| "ghost" \| "elevated"`.                                                                                         |
| `size`    | `CloseButtonSize`           | No       | Contextual | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. Defaults from parent `Card` `size` (`sm -> "xs"`, `md -> "sm"`, `lg -> "md"`), or `"sm"` outside `Card`. |
| `ref`     | `HTMLButtonElement \| null` | No       | `null`     | `$bindable` reference to the `<button>`.                                                                                                         |

### Constants & Context Helpers

- `CARD_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const`
- `CARD_SIZES = ["sm", "md", "lg"] as const`
- `CARD_ORIENTATIONS = ["vertical", "horizontal"] as const`
- `CARD_TITLE_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "div"] as const`
- `CARD_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const`
- `CARD_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const`
- `CARD_MEDIA_PLACEMENTS = ["top", "bottom", "start", "end"] as const`
- `CARD_MEDIA_RATIOS = ["auto", "1/1", "4/3", "16/9", "21/9"] as const`
- `CARD_MEDIA_FITS = ["cover", "contain"] as const`
- `CARD_RAIL_VARIANTS = ["sunken", "soft", "transparent"] as const`
- `CARD_RAIL_PLACEMENTS = ["start", "end"] as const`
- `CARD_RAIL_COLUMNS = [1, 2, "auto"] as const`
- `CARD_ORNAMENT_PLACEMENTS = ["bottom-left", "bottom-right", "top-right", "inset"] as const`
- `CARD_ORNAMENT_SHAPES = ["circle", "none"] as const`
- `getCardContext(): CardContext`, `setCardContext(value: CardContext): CardContext`, `hasCardContext(): boolean` — reads/sets `{ readonly variant: CardVariant; readonly size: CardSize; readonly orientation: CardOrientation }`.

### `data-*` Attributes

- **`Card`**: `data-variant={variant}`, `data-size={size}`, `data-orientation={orientation}`, `data-nested` (present when nested inside an ancestor `Card`).
- **`CardActions`**: `data-align={align}`, `data-orientation={orientation}`.
- **`CardMedia`**: `data-placement={resolvedPlacement}`, `data-fit={fit}`, `data-ratio="auto"` (present only when `ratio === "auto"`), `data-bleed` (present when `bleed` is truthy).
- **`CardRail`**: `data-variant={variant}`, `data-placement={placement}`, `data-columns={columns}`.
- **`CardOrnament`**: `data-placement={placement}`, `data-shape={shape}`.
- **`CardClose`**: Inherits `data-variant` and `data-size` from `CloseButton`.

### CSS Custom Properties

| Variable                                                                        | Description                                                                                                                                             |
| :------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--cs-card-bg` / `--cs-card-fg` / `--cs-card-shadow`                            | Surface background, text color (`--cs-color-text-main`), and box-shadow.                                                                                |
| `--cs-card-padding` / `--cs-card-gap` / `--cs-card-header-gap`                  | Card padding (`12px`/`16px`/`24px`), track/section gap (`8px`/`12px`/`16px`), and header stack gap (`2px`/`4px`/`6px`).                                 |
| `--cs-card-radius` / `--cs-card-squircle`                                       | Outer radius (`--cs-radius-2xl`/`--cs-radius-3xl`/`28px`, or `--cs-card-nested-radius` when nested) and `corner-shape` (`--cs-squircle`).               |
| `--cs-card-inner-radius` / `--cs-card-inner-radius-base`                        | Concentric inner radius (`max(var(--cs-card-inner-radius-base, var(--cs-radius-lg)), calc(var(--cs-card-radius) - var(--cs-card-padding)))`).           |
| `--cs-card-nested-radius`                                                       | Computed inner radius passed via inline style from an ancestor `Card` (`${parentInnerRadius}px`).                                                       |
| `--cs-card-title-size` / `--cs-card-description-size`                           | Typography sizes for `CardTitle` (`--cs-text-sm`/`--cs-text-base`/`--cs-text-lg`) and `CardDescription` (`--cs-text-xs`/`--cs-text-sm`/`--cs-text-sm`). |
| `--cs-card-close-offset` / `--cs-card-close-size`                               | Corner inset (`8px`/`10px`/`12px`) and clearance width (`16px`/`24px`/`32px`) for `CardClose`.                                                          |
| `--cs-card-media-inline-size` / `--cs-card-media-ratio` / `--cs-card-media-fit` | Side media width (`96px`/`132px`/`168px`), CSS `aspect-ratio`, and `object-fit`.                                                                        |
| `--cs-card-media-bleed-start` / `--cs-card-media-bleed-end`                     | Bleed edge offsets for `top`/`bottom` bleed media (automatically reset to `0px` beside a `start`/`end` track).                                          |
| `--cs-card-rail-bg` / `--cs-card-rail-shadow` / `--cs-card-rail-radius`         | `CardRail` surface fill, shadow, and radius (defaults to `--cs-card-inner-radius`).                                                                     |
| `--cs-card-rail-padding` / `--cs-card-rail-gap`                                 | `CardRail` padding (`4px`/`6px`/`8px`, `0px` for `transparent`) and cell gap (`4px`/`6px`/`8px`).                                                       |
| `--cs-card-ornament-color` / `--cs-card-ornament-tint`                          | Accent color for `shape="circle"` (defaults to `--cs-color-accent-500`), mixed `in oklab` via `light-dark(...)`.                                        |
| `--cs-card-ornament-size` / `--cs-card-ornament-icon-size`                      | Diameter of `shape="circle"` (`88px`/`104px`/`124px`) and child `<svg>` size (`40%`).                                                                   |

## Examples

### Standard Vertical Card

Use `CardClose variant="elevated"` instead of `"soft"` if top-right artwork has high visual contrast or busy details (see the 3-step `CardClose` guidance above).

```svelte
<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        Card,
        CardActions,
        CardBody,
        CardClose,
        CardDescription,
        CardFooter,
        CardHeader,
        CardMedia,
        CardTitle,
    } from "cs/svelte/card";
</script>

<Card variant="elevated" size="md" orientation="vertical">
    <CardMedia ratio="16/9">
        <!-- artwork / image -->
    </CardMedia>

    <CardHeader>
        <CardTitle>Design System Release</CardTitle>
        <CardDescription>Calm monochrome surfaces with concentric squircle radii.</CardDescription>
    </CardHeader>

    <CardClose variant="soft" />

    <CardBody>
        <p class="text-sm text-main m-0">
            Composable regions adapt smoothly between stacked vertical cards and side-tracked horizontal layouts.
        </p>
    </CardBody>

    <CardFooter>
        <span class="text-xs text-weak">Updated today</span>
        <CardActions align="end" orientation="horizontal">
            <Button variant="secondary" size="sm">
                <ButtonLabel>Preview</ButtonLabel>
            </Button>
            <Button variant="primary" size="sm">
                <ButtonLabel>Publish</ButtonLabel>
            </Button>
        </CardActions>
    </CardFooter>
</Card>
```

### Horizontal Media & Action Card

```svelte
<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        Card,
        CardActions,
        CardClose,
        CardDescription,
        CardFooter,
        CardHeader,
        CardMedia,
        CardTitle,
    } from "cs/svelte/card";

    let dismissed = $state(false);

    function handleDismiss() {
        dismissed = true;
    }
</script>

{#if !dismissed}
    <Card variant="elevated" size="md" orientation="horizontal">
        <CardMedia ratio="1/1">
            <!-- artwork / image -->
        </CardMedia>

        <CardHeader>
            <CardTitle>Become an ACME Creator</CardTitle>
            <CardDescription>
                Publish reusable themes, motion presets, and component packs for teams building on the shared workspace.
            </CardDescription>
        </CardHeader>

        <CardClose variant="soft" onclick={handleDismiss} />

        <CardFooter>
            <div class="flex flex-col leading-tight">
                <span class="text-sm font-semibold text-strong">Only 10 spots</span>
                <span class="text-xs text-weak">Submission ends Oct 10</span>
            </div>

            <CardActions>
                <Button variant="primary" size="md">
                    <ButtonLabel>Apply Now</ButtonLabel>
                </Button>
            </CardActions>
        </CardFooter>
    </Card>
{/if}
```

### Dashboard Control Tiles

```svelte
<script lang="ts">
    import {
        Fan,
        Lamp,
        Lock,
        Monitor,
        Power,
        Settings,
        Sofa,
        Speaker,
        Thermometer,
        Utensils,
        Wind,
    } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { Card, CardDescription, CardHeader, CardOrnament, CardRail, CardTitle } from "cs/svelte/card";
    import { ToggleButton, ToggleButtonIcon } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";

    let livingLights = $state(true);
    let livingSpeaker = $state(false);
    let livingLock = $state(true);
    let livingClimate = $state(false);

    let kitchenLights = $state(true);
    let kitchenFan = $state(false);
    let kitchenPower = $state(true);

    let studyDeskLamp = $state(true);
    let studyAir = $state(true);
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <Card variant="elevated" size="sm" orientation="horizontal" class="min-h-140px">
        <CardOrnament
            placement="bottom-left"
            shape="circle"
            style="--cs-card-ornament-color: var(--cs-color-amber-500)"
        >
            <Sofa />
        </CardOrnament>

        <CardHeader>
            <CardTitle>Living Room</CardTitle>
            <CardDescription class="tabular-nums">24.2°C / 48%</CardDescription>
        </CardHeader>

        <CardRail variant="sunken" placement="end" columns={2}>
            <ToggleButton
                variant="ghost"
                color="accent"
                size="sm"
                iconOnly
                bind:pressed={livingLights}
                aria-label="Toggle living room lights"
                {@attach tooltip({ text: "Lights" })}
            >
                <ToggleButtonIcon icon={Lamp} />
            </ToggleButton>

            <ToggleButton
                variant="ghost"
                color="accent"
                size="sm"
                iconOnly
                bind:pressed={livingSpeaker}
                aria-label="Toggle living room speaker"
                {@attach tooltip({ text: "Speaker" })}
            >
                <ToggleButtonIcon icon={Speaker} />
            </ToggleButton>

            <ToggleButton
                variant="ghost"
                color="positive"
                size="sm"
                iconOnly
                bind:pressed={livingLock}
                aria-label="Toggle front door lock"
                {@attach tooltip({ text: "Door lock" })}
            >
                <ToggleButtonIcon icon={Lock} />
            </ToggleButton>

            <ToggleButton
                variant="ghost"
                color="caution"
                size="sm"
                iconOnly
                bind:pressed={livingClimate}
                aria-label="Toggle heating boost"
                {@attach tooltip({ text: "Heating boost" })}
            >
                <ToggleButtonIcon icon={Thermometer} />
            </ToggleButton>
        </CardRail>
    </Card>

    <Card variant="elevated" size="sm" orientation="horizontal" class="min-h-140px">
        <CardOrnament
            placement="bottom-left"
            shape="circle"
            style="--cs-card-ornament-color: var(--cs-color-emerald-500)"
        >
            <Utensils />
        </CardOrnament>

        <CardHeader>
            <CardTitle>Kitchen</CardTitle>
            <CardDescription class="tabular-nums">21.8°C / 51%</CardDescription>
        </CardHeader>

        <CardRail variant="sunken" placement="end" columns={1} style="--cs-card-rail-radius: var(--cs-radius-full)">
            <ToggleButton
                variant="ghost"
                color="accent"
                size="sm"
                iconOnly
                class="rounded-full"
                bind:pressed={kitchenLights}
                aria-label="Toggle kitchen lights"
                {@attach tooltip({ text: "Counter lights" })}
            >
                <ToggleButtonIcon icon={Lamp} />
            </ToggleButton>

            <ToggleButton
                variant="ghost"
                color="accent"
                size="sm"
                iconOnly
                class="rounded-full"
                bind:pressed={kitchenFan}
                aria-label="Toggle extractor fan"
                {@attach tooltip({ text: "Extractor fan" })}
            >
                <ToggleButtonIcon icon={Fan} />
            </ToggleButton>

            <ToggleButton
                variant="ghost"
                color="positive"
                size="sm"
                iconOnly
                class="rounded-full"
                bind:pressed={kitchenPower}
                aria-label="Toggle kitchen outlets"
                {@attach tooltip({ text: "Appliance power" })}
            >
                <ToggleButtonIcon icon={Power} />
            </ToggleButton>
        </CardRail>
    </Card>

    <Card variant="elevated" size="sm" orientation="horizontal" class="min-h-140px">
        <CardOrnament placement="bottom-left" shape="circle" style="--cs-card-ornament-color: var(--cs-color-sky-500)">
            <Monitor />
        </CardOrnament>

        <CardHeader>
            <CardTitle>Study</CardTitle>
            <CardDescription class="tabular-nums">23.4°C / 44%</CardDescription>
        </CardHeader>

        <CardRail variant="sunken" placement="end" columns={1} style="--cs-card-rail-radius: var(--cs-radius-full)">
            <ToggleButton
                variant="ghost"
                color="accent"
                size="sm"
                iconOnly
                class="rounded-full"
                bind:pressed={studyDeskLamp}
                aria-label="Toggle desk lamp"
                {@attach tooltip({ text: "Desk lamp" })}
            >
                <ToggleButtonIcon icon={Lamp} />
            </ToggleButton>

            <ToggleButton
                variant="ghost"
                color="accent"
                size="sm"
                iconOnly
                class="rounded-full"
                bind:pressed={studyAir}
                aria-label="Toggle air purifier"
                {@attach tooltip({ text: "Air purifier" })}
            >
                <ToggleButtonIcon icon={Wind} />
            </ToggleButton>

            <Button
                variant="ghost"
                size="sm"
                iconOnly
                class="rounded-full"
                aria-label="Study room settings"
                {@attach tooltip({ text: "Room settings" })}
            >
                <ButtonIcon icon={Settings} />
            </Button>
        </CardRail>
    </Card>
</div>
```

## Behavior & Quirks

- **Implicit CSS Grid tracks without `@container`:** `Card` avoids `container-type: inline-size` so intrinsic sizing (`fit-content`, auto-sized tracks, `Popover`s) continues to work. Start and end `auto` columns only materialize via `:has()` when a `CardMedia` or `CardRail` uses `placement="start"` or `"end"`, with explicit `grid-template-rows` supporting up to 5 main-column items so side tracks (`grid-row: 1 / -1`) span cleanly without trailing empty rows.
- **Visual `order` vs. DOM `Tab` order:** `Card` uses CSS `order` (`CardMedia[top]` at `-2`, `CardHeader` at `-1`, `CardFooter` at `1`, `CardMedia[bottom]` at `2`) and `position: absolute` on `CardClose` and `CardOrnament`. Keeping `CardHeader` -> `CardClose` -> `CardBody` -> `CardFooter` in logical DOM order preserves predictable keyboard `Tab` flow.
- **Automatic `CardClose` clearance:** When a direct `CardClose` is present without an `end`-placed `CardMedia` or `CardRail`, `.cs-card` automatically adds `padding-inline-end: calc(var(--cs-card-close-size, 24px) + var(--cs-card-close-offset))` to `CardHeader` (or a first-child `CardTitle`) to prevent text overlap.
- **Automatic concentric nesting:** Each `Card` provides an internal radius context (`sm -> 8px`, `md -> 10px`, `lg -> 12px`; nested cards subtract their own padding down to an `8px` floor). Nested `<Card>` roots automatically receive `data-nested`, `--cs-card-nested-radius`, and `corner-shape: var(--cs-squircle-smooth)`.
- **`overflow: clip` and `isolation: isolate`:** `Card` clips `CardOrnament` and `bleed` `CardMedia` cleanly to the squircle boundary without creating a scroll container or clipping outer `box-shadow`.
- **Single-column pill `CardRail`:** Override `--cs-card-rail-radius: var(--cs-radius-full)` on `CardRail columns={1}` when housing circular (`rounded-full`) icon buttons.
