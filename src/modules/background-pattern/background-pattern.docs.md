---
name: BackgroundPattern
kind: component
import: cs/svelte/background-pattern
exports:
  - BackgroundPattern
  - BACKGROUND_PATTERN_VARIANTS
  - BACKGROUND_PATTERN_SIZES
  - BACKGROUND_PATTERN_SPACING
  - BackgroundPatternVariant
  - BackgroundPatternSize
  - BackgroundPatternProps
---

# BackgroundPattern

## Overview
Decorative SVG `<pattern>` background primitive that renders subtle, edge-aligned geometric patterns (`dots`, `grid`, `lines`, `crosses`, `hexagons`, `topography`) inside a positioned container. Always sets `aria-hidden="true"` and `pointer-events: none`.

## API

### `BackgroundPattern` Props
Extends `Omit<SVGAttributes<SVGSVGElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `BackgroundPatternVariant` | Yes | — | Pattern geometry: `"dots" \| "grid" \| "lines" \| "crosses" \| "hexagons" \| "topography"`. |
| `size` | `BackgroundPatternSize` | Yes | — | Tile spacing preset: `"sm"` (16px), `"md"` (24px), `"lg"` (32px). |
| `ref` | `SVGSVGElement \| null` | No | `null` | `$bindable` reference to the root `<svg>` element. |

### `data-*` Attributes
- `data-variant={variant}`
- `data-size={size}`

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-background-pattern-fg` | `light-dark(color-mix(in oklch, var(--cs-color-base-900) 12%, transparent), color-mix(in oklch, var(--cs-color-base-100) 16%, transparent))` | Stroke and dot color (`currentColor`). |
| `--cs-background-pattern-line-width` | `1px` | Stroke width for line-based variants. |
| `--cs-background-pattern-dot-radius` | `1.5px` | Circle radius for the `"dots"` variant. |

## Examples

```svelte
<script lang="ts">
    import { BackgroundPattern } from "cs/svelte/background-pattern";
</script>

<div class="relative isolate overflow-hidden h-44 w-full rounded-2xl bg-canvas">
    <BackgroundPattern variant="dots" size="md" />
</div>
```

```svelte
<!-- Combine with fadeMask for a soft vignette -->
<div class="relative isolate overflow-hidden h-64 rounded-2xl bg-canvas">
    <div class="absolute inset-0" {@attach fadeMask({ variant: "radial", strength: "lg" })}>
        <BackgroundPattern variant="grid" size="sm" />
    </div>
</div>
```

## Behavior & Quirks
- **Host containment:** Automatically applies `contain: layout` to any direct parent via `:global(:has(> .cs-background-pattern))` and positions itself with `position: absolute; inset: 0; z-index: -1; border-radius: inherit; corner-shape: inherit;`. Use `overflow: hidden` and `isolate` on the host when clipping to rounded corners.
- **Edge-to-edge tile rounding:** Measures `clientWidth` / `clientHeight` and divides by an integer tile count so patterns never clip mid-tile at container edges. `"hexagons"` locks `spaceY` to `spaceX * Math.sqrt(3)` to interlock without distortion.
- **Unique pattern IDs:** Uses `$props.id()` so multiple instances on the same page never collide.
