---
name: WorkAppControls
kind: component
import: cs/svelte/work
exports:
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

# WorkAppControls

## Overview
Pre-configured header action controls for Pfleiderer applications: `<WorkAppThemeButton />` for cycling light/dark/system theme, `<WorkAppHelpButton />` for opening documentation, and `<WorkAppStatusDot />` for displaying live connection/service status.

## API

### `WorkAppThemeButton` (alias: `WorkAppHeaderThemeButton`)
Elevated `48px × 48px` icon-only `<Button />` with `<HitArea size="md" />` and bottom tooltip showing the active German theme label. Extends `Omit<HTMLButtonAttributes, "color" | "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `aria-label` | `string` | No | `"Theme wechseln"` | Accessible button label. |

Calls `theme.cycle()` (`cs/svelte/theme`) on click unless `onclick` calls `event.preventDefault()`.

### `WorkAppHelpButton` (alias: `WorkAppDocsButton`)
Elevated `48px × 48px` icon-only `<Button />` with `<HitArea size="md" />` and a bottom tooltip (`"Hilfe"` / `"Help"`, switching to `"Hilfe schließen"` / `"Close help"` when `pressed` is `true`). Extends `Omit<HTMLButtonAttributes, "color" | "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `aria-label` | `string` | No | `"Dokumentation und Hilfe"` / `"Documentation and help"` | Accessible button label. |
| `icon` | `Component<ButtonIconComponentProps>` | No | `BookOpen` | Lucide/custom icon component rendered via `<ButtonIcon />`. Swaps to `X` when `pressed` is `true`. |
| `pressed` | `boolean` | No | — | `$bindable` pressed state. When defined (`pressed !== undefined`), clicking toggles `pressed` (unless `onclick` calls `event.preventDefault()`), sets `aria-pressed` and `data-pressed`, swaps the icon to `X`, and switches the tooltip to `"Hilfe schließen"` / `"Close help"`. |
| `onPressedChange` | `(pressed: boolean) => void` | No | — | Callback invoked with the next `pressed` state when toggled by click. |

### `WorkAppStatusDot` (aliases: `WorkAppStatusPill`, `WorkAppStatusButton`)
12px circular `<button type="button">` status indicator with optional dual-ring pulse animation and bottom tooltip (`offset: "24px"`). Extends `Omit<HTMLButtonAttributes, "color" | "aria-label">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `WorkAppStatusColor` | No | `"positive"` | Semantic status: `"positive" \| "caution" \| "negative" \| "base"` (`WORK_APP_STATUS_COLORS`). |
| `label` | `string` | No | `WORK_APP_STATUS_DEFAULTS[status]` | Overrides both the hover tooltip text and the `aria-label` prefix (`"${displayLabel} (${status})"`). Defaults: `"Verbunden"`, `"Wartend"`, `"Getrennt"`, `"Inaktiv"`. |
| `pulse` | `boolean` | No | `true` | Enables dual concentric pulse rings (`data-pulse`). |

- `data-status={status}`
- `data-pulse` (present when `pulse` is truthy)

### CSS Custom Properties
| Variable | Description |
| :--- | :--- |
| `--cs-work-app-status-dot-bg` | Dot and pulse ring fill color (automatically mapped from `data-status` to `--cs-color-positive-solid`, `--cs-color-caution-solid`, `--cs-color-negative-solid`, or `--cs-color-base-400`). |

## Examples

```svelte
<script lang="ts">
    import { HitArea } from "cs/svelte/hit-area";
    import {
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppStatusDot,
        WorkAppThemeButton,
    } from "cs/svelte/work";
</script>

<WorkAppHeader toolName="Holzanalysen">
    <WorkAppHeaderSegment align="before" renderIsland>
        <WorkAppStatusDot status="positive">
            <HitArea size="md" />
        </WorkAppStatusDot>
    </WorkAppHeaderSegment>
    <WorkAppHeaderSegment align="end">
        <WorkAppHelpButton onclick={() => console.log("help")} />
        <WorkAppThemeButton />
    </WorkAppHeaderSegment>
</WorkAppHeader>
```

## Behavior & Quirks
- **Status tooltip text:** `<WorkAppStatusDot />` uses `label ?? WORK_APP_STATUS_DEFAULTS[status]` for both its hover tooltip text and its `aria-label` prefix (`"${displayLabel} (${status})"`).
- **Hit area slot:** `<WorkAppStatusDot />` renders `{@render children?.()}` inside the 12px `<button>` so consumers can pass `<HitArea size="md" />` for a comfortable pointer target.
