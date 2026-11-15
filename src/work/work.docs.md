---
name: Work
kind: component
import: cs/svelte/work
exports:
  - WorkLogo
  - WorkLogoProps
  - WorkLocation
  - WORK_LOCATION_IDS
  - WORK_LOCATIONS
  - WorkLocationId
  - WorkLocationMarker
  - WorkLocationDefinition
  - WorkLocationProps
  - WorkAppIntro
  - WorkAppIntroProps
  - WorkAppIdentityContext
  - getWorkAppIdentity
  - setWorkAppIdentity
  - WorkAppFrame
  - WorkAppHeader
  - WorkAppHeaderSegment
  - WorkAppMain
  - WorkAppSignature
  - WorkAppBrand
  - WORK_APP_HEADER_SEGMENT_ALIGNMENTS
  - WorkAppHeaderSegmentAlignment
  - WorkAppHeaderSegmentProps
  - WorkAppFrameProps
  - WorkAppHeaderProps
  - WorkAppMainProps
  - WorkAppSignatureProps
  - WorkAppBrandProps
  - WorkAppThemeButton
  - WorkAppHeaderThemeButton
  - WorkAppHelpButton
  - WorkAppDocsButton
  - WorkAppStatusDot
  - WorkAppStatusPill
  - WorkAppStatusButton
  - WORK_APP_STATUS_COLORS
  - WORK_APP_STATUS_DEFAULTS
  - WorkAppStatusColor
  - WorkAppStatusDotProps
  - WorkAppStatusPillProps
  - WorkAppStatusButtonProps
  - WorkAppThemeButtonProps
  - WorkAppHelpButtonProps
  - WorkAppDocsButtonProps
---

# Work

## Overview
Domain-specific Pfleiderer application shell, branding, plant-location map primitives, boot intro sequence, and header controls exported from `cs/svelte/work`.

## API

### `logo` — `<WorkLogo />`
- `WorkLogoProps`: `Omit<SVGAttributes<SVGSVGElement>, "children">`.
- CSS custom properties: `--cs-color-work-logo-base` (defaults to `#134094`), `--cs-color-work-logo-accent` (defaults to `#00a870`).

### `locations` — `<WorkLocation />`
- `WorkLocationProps`: `location: WorkLocationId` (`"arnsberg" | "baruth" | "guetersloh" | "leutkirch" | "neumarkt"`), `marker?: boolean`, plus `Omit<SVGAttributes<SVGSVGElement>, "children">`.
- Data exports: `WORK_LOCATION_IDS`, `WORK_LOCATIONS` (metadata with `id`, `label`, `width`, `height`, `viewBox`, `marker`, `path`).
- CSS custom properties:
  - `--cs-work-location-stroke` (`currentColor`)
  - `--cs-work-location-bg` (`color-mix(in oklch, var(--cs-work-location-stroke) 12%, transparent)`)
  - `--cs-work-location-stroke-width` (`8px`)
  - `--cs-work-location-marker-bg`, `--cs-work-location-marker-stroke`, `--cs-work-location-marker-stroke-width`, `--cs-work-location-marker-radius`, `--cs-work-location-marker-scale`

### `app-intro` — `<WorkAppIntro />`
Boot sequence wrapper that displays a staggered plant-location CAD intro before revealing children, and provides `WorkAppIdentityContext` (`getWorkAppIdentity`, `setWorkAppIdentity`) to `<WorkAppHeader />`.
- `toolCategory: string` (required) — Department/domain label above the title.
- `toolName: string` (required) — Application title (also read by `<WorkAppHeader />` via context).
- `persist?: boolean` (`@default true`) — Stores the boot timestamp in storage so reloads within 30 minutes skip the full intro animation (`false` forces cold boot in previews/tests).

### `app-layout` — App Shell Components
- `WorkAppFrame`: `showSignature?: boolean` (`@default true`) — Renders `<WorkAppSignature />` in the bottom-right corner.
- `WorkAppHeader`: `toolName?: string` (falls back to `WorkAppIntro` context), `showBrand?: boolean` (`@default true`) — Renders `<WorkAppBrand />` on the right.
- `WorkAppHeaderSegment`: `align: "before" | "start" | "center" | "end" | "after"` (required), `renderIsland?: boolean` (wraps segment in an elevated pill island; `island` is deprecated).
- `WorkAppMain`: `HTMLAttributes<HTMLElement>` — Main content container.
- `WorkAppSignature`: `text?: string` (`@default "Entwickelt von Colin Schäfer"`).
- `WorkAppBrand`: `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

### `app-controls` — Header Action Controls
- `WorkAppStatusDot` (aliases: `WorkAppStatusPill`, `WorkAppStatusButton`):
  - `status?: "positive" | "caution" | "negative" | "base"` (`WORK_APP_STATUS_COLORS`), `label?: string` (defaults via `WORK_APP_STATUS_DEFAULTS`), `pulse?: boolean`.
- `WorkAppThemeButton` (alias: `WorkAppHeaderThemeButton`):
  - Cycles `theme` (`cs/svelte/theme`) on click; `aria-label?: string`.
- `WorkAppHelpButton` (alias: `WorkAppDocsButton`):
  - `aria-label?: string`, `icon?: Component<ButtonIconComponentProps>`.

## Examples

```svelte
<script lang="ts">
    import { HitArea } from "cs/svelte/hit-area";
    import {
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppIntro,
        WorkAppMain,
        WorkAppStatusDot,
        WorkAppThemeButton,
    } from "cs/svelte/work";
</script>

<WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen">
    <WorkAppFrame>
        <WorkAppHeader>
            <WorkAppHeaderSegment align="before" renderIsland>
                <WorkAppStatusDot status="positive">
                    <HitArea size="md" />
                </WorkAppStatusDot>
            </WorkAppHeaderSegment>
            <WorkAppHeaderSegment align="end">
                <WorkAppHelpButton onclick={openHelp} />
                <WorkAppThemeButton />
            </WorkAppHeaderSegment>
        </WorkAppHeader>
        <WorkAppMain>
            <!-- Page content -->
        </WorkAppMain>
    </WorkAppFrame>
</WorkAppIntro>
```

## Behavior & Quirks
- **Context-driven header title:** `<WorkAppHeader />` automatically reads `toolName` from `<WorkAppIntro />` context unless overridden via its `toolName` prop.
- **No internal exports:** `work-app-intro-state.internal.svelte.ts` is internal and not part of the `cs/svelte/work` public API.
