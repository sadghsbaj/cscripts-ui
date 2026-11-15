---
name: WorkAppLayout
kind: component
import: cs/svelte/work
exports:
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
---

# WorkAppLayout

## Overview
Application shell primitives (`WorkAppFrame`, `WorkAppHeader`, `WorkAppHeaderSegment`, `WorkAppMain`, `WorkAppSignature`, `WorkAppBrand`) for Pfleiderer internal tools, providing centered responsive framing, a segmented pill header, and brand/creator watermarks.

## API

### `WorkAppFrame`
Root page container (`<div class="cs-work-app-frame">`) extending `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `showSignature` | `boolean` | No | `true` | Automatically renders `<WorkAppSignature />` in the bottom-right corner. |

### `WorkAppHeader`
Top navigation bar (`<header class="cs-work-app-header">`) extending `HTMLAttributes<HTMLElement>`. Renders the tool identity pill on the left, a flexible spacer, child segments, and optionally `<WorkAppBrand />` on the right.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toolName` | `string` | No | `undefined` | Displayed tool title. Falls back to `toolName` from `<WorkAppIntro />` context (`getWorkAppIdentity()`). |
| `showBrand` | `boolean` | No | `true` | Automatically renders `<WorkAppBrand />` on the right side of the header. |

### `WorkAppHeaderSegment`
Positioned slot (`<div class="cs-work-app-header-segment">`) inside `<WorkAppHeader />` extending `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `align` | `WorkAppHeaderSegmentAlignment` | Yes | — | Horizontal flex/overlay slot: `"before" \| "start" \| "center" \| "end" \| "after"`. |
| `renderIsland` | `boolean` | No | `undefined` | Wraps the segment in an elevated pill surface (`data-island`). |
| `island` | `boolean` | No | `false` | Deprecated alias for `renderIsland`. |

- `data-alignment={align}`
- `data-island` (present when `renderIsland ?? island` is truthy)

### `WorkAppMain`
Main content container (`<main class="cs-work-app-main">`) extending `HTMLAttributes<HTMLElement>`.

### `WorkAppSignature`
Fixed bottom-right creator info button (`<button type="button" class="cs-work-app-signature">`) with a left-placed tooltip and `<HitArea size="md" />`, extending `Omit<HTMLAttributes<HTMLButtonElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | No | `"Entwickelt von Colin Schäfer"` | Tooltip and `aria-label` text. |

### `WorkAppBrand`
Non-interactive elevated pill badge (`<div class="cs-work-app-brand">`) rendering `<WorkLogo />`, extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

## Examples

```svelte
<script lang="ts">
    import { HitArea } from "cs/svelte/hit-area";
    import {
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppMain,
        WorkAppStatusDot,
        WorkAppThemeButton,
    } from "cs/svelte/work";
</script>

<WorkAppFrame>
    <WorkAppHeader toolName="Holzanalysen">
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
```

## Behavior & Quirks
- **Context-driven header title:** `<WorkAppHeader />` calls `getWorkAppIdentity()` and falls back to `identity.toolName` when `toolName` is not passed explicitly.
- **Segment ordering:** Header flex order places `"before"` (`5`) before the tool identity pill (`10`), `"start"` (`20`), un-segmented children (`25`), spacer (`30`), `"end"` (`40`), `<WorkAppBrand />` (`50`), and `"after"` (`60`). `"center"` is absolutely centered (`left: 50%; transform: translateX(-50%)`).
- **Responsive signature:** `<WorkAppSignature />` is hidden on viewports narrower than `640px`.
- **Responsive gutter:** `<WorkAppFrame />` enforces a minimum `48px` horizontal padding while centering content up to `--cs-container-7xl`.
