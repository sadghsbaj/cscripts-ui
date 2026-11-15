---
name: WorkLocations
kind: component
import: cs/svelte/work
exports:
  - WorkLocation
  - WorkLocationProps
  - WORK_LOCATION_IDS
  - WORK_LOCATIONS
  - WorkLocationId
  - WorkLocationMarker
  - WorkLocationDefinition
---

# WorkLocations

## Overview
SVG regional map primitives and coordinate metadata for Pfleiderer plant locations (`arnsberg`, `baruth`, `guetersloh`, `leutkirch`, `neumarkt`).

## API

### `WorkLocation` Props
Renders an `aria-hidden="true"` `<svg class="cs-work-location" data-location={location}>` with a `pathLength="1"` outline path and optional plant pin `<circle>`. Extends `Omit<SVGAttributes<SVGSVGElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `location` | `WorkLocationId` | Yes | — | Plant identifier: `"arnsberg" \| "baruth" \| "guetersloh" \| "leutkirch" \| "neumarkt"`. |
| `marker` | `boolean` | No | `false` | Renders the plant location `<circle class="cs-work-location-marker">` at `(marker.x, marker.y)`. |

### Data & Type Exports
- `WORK_LOCATION_IDS`: `readonly ["arnsberg", "baruth", "guetersloh", "leutkirch", "neumarkt"]`
- `WORK_LOCATIONS`: `Record<WorkLocationId, WorkLocationDefinition>` containing `id`, `label`, `width`, `height`, `viewBox`, `marker` (`x`, `y`, `xPercent`, `yPercent`), and `path`.
- `WorkLocationId`, `WorkLocationMarker`, `WorkLocationDefinition`, `WorkLocationProps`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-work-location-stroke` | `currentColor` | Outline stroke color. |
| `--cs-work-location-bg` | `color-mix(in oklch, var(--cs-work-location-stroke) 12%, transparent)` | Region fill color. |
| `--cs-work-location-stroke-width` | `8px` | Region outline stroke width. |
| `--cs-work-location-marker-bg` | `var(--cs-work-location-stroke)` | Marker circle fill color. |
| `--cs-work-location-marker-stroke` | `var(--cs-color-elevated)` | Marker circle stroke color. |
| `--cs-work-location-marker-stroke-width` | `9px` | Marker circle stroke width. |
| `--cs-work-location-marker-radius` | `30px` | Marker circle radius (`r`). |
| `--cs-work-location-marker-scale` | `1` | Marker circle scale transform. |

## Examples

```svelte
<script lang="ts">
    import { WorkLocation } from "cs/svelte/work";
</script>

<WorkLocation location="neumarkt" marker class="w-40 text-accent-500" />
```

## Behavior & Quirks
- **Normalized path length:** The `<path class="cs-work-location-map">` sets `pathLength="1"`, enabling `0..1` `stroke-dasharray` / `stroke-dashoffset` CAD draw animations.
- **Percent marker coordinates:** `WORK_LOCATIONS[id].marker.xPercent` and `yPercent` are provided for positioning HTML/CSS overlays (such as sonar rings) over the SVG without manual aspect-ratio math.
