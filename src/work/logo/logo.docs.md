---
name: WorkLogo
kind: component
import: cs/svelte/work
exports:
  - WorkLogo
  - WorkLogoProps
---

# WorkLogo

## Overview
Inline Pfleiderer brand wordmark and emblem SVG (`aria-label="Pfleiderer"`), with CSS custom properties for base and accent fills.

## API

### `WorkLogo` Props
Extends `Omit<SVGAttributes<SVGSVGElement>, "children">`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-color-work-logo-base` | `#134094` | Fill color for the blue square and `PFLEIDERER` wordmark (`.cs-work-logo-base`). |
| `--cs-color-work-logo-accent` | `#00a870` | Fill color for the green diagonal accent stripes (`.cs-work-logo-accent`). |

## Examples

```svelte
<script lang="ts">
    import { WorkLogo } from "cs/svelte/work";
</script>

<WorkLogo class="h-8 w-auto" />
```

## Behavior & Quirks
- **Intrinsic viewBox:** Uses `viewBox="0 443.82 1024 137.97"` without fixed `width` or `height` attributes, so size it via CSS (`height`, `width: auto`).
