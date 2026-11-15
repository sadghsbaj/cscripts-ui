---
name: WorkAppIntro
kind: component
import: cs/svelte/work
exports:
  - WorkAppIntro
  - WorkAppIntroProps
  - WorkAppIdentityContext
  - getWorkAppIdentity
  - setWorkAppIdentity
---

# WorkAppIntro

## Overview
Full-screen Pfleiderer boot sequence wrapper that displays a staggered plant-location CAD intro before revealing the application workspace, while providing `WorkAppIdentityContext` to descendant layout components such as `<WorkAppHeader />`.

## API

### `WorkAppIntro` Props
Extends `HTMLAttributes<HTMLDivElement>` (spread onto the `.cs-work-app-intro` overlay element).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toolCategory` | `string` | Yes | — | Department or domain label displayed above the tool title. |
| `toolName` | `string` | Yes | — | Primary application title displayed in the intro stage and exposed via context. |
| `persist` | `boolean` | No | `true` | Persists the boot timestamp in storage so reloads within 30 minutes skip the full intro animation. Set to `false` in previews or tests to force a cold boot. |

### Context Helpers
- `WorkAppIdentityContext`: `{ readonly toolCategory: string; readonly toolName: string }`
- `getWorkAppIdentity()`: Reads the identity context set by `<WorkAppIntro />`.
- `setWorkAppIdentity(ctx)`: Sets the identity context.

## Examples

```svelte
<script lang="ts">
    import { WorkAppFrame, WorkAppHeader, WorkAppIntro, WorkAppMain } from "cs/svelte/work";
</script>

<WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen">
    <WorkAppFrame>
        <WorkAppHeader />
        <WorkAppMain>
            <!-- Page content -->
        </WorkAppMain>
    </WorkAppFrame>
</WorkAppIntro>
```

## Behavior & Quirks
- **Skip interaction:** Clicking the intro overlay or pressing a key (handled via `<svelte:window onkeydown={...} />`) skips the remaining boot sequence.
- **No internal exports:** `work-app-intro-state.internal.svelte.ts` is internal and not part of the `cs/svelte/work` public API.
