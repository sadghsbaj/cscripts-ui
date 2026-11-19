---
name: WorkAppIntro
kind: component
import: cs/svelte/work
exports:
  - WorkAppIntro
  - WorkAppIntroPhase
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
| `settled` | `boolean` (`$bindable`) | No | `false` | Output flag that becomes `true` once the intro reaches `"curtain"` or resolves as an instant boot. |
| `phase` | `WorkAppIntroPhase` (`$bindable`) | No | `"idle"` | Current boot phase of the intro choreography. |

### Types
- `WorkAppIntroPhase`: `"idle" | "cad" | "lock" | "brand" | "curtain"`

### Context Helpers
- `WorkAppIdentityContext`: `{ readonly toolCategory: string; readonly toolName: string; readonly phase: WorkAppIntroPhase; readonly settled: boolean }`
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
- **`settled` lifecycle:** `settled` is `false` before `onMount` and throughout `"cad"`, `"lock"`, and `"brand"`. It becomes `true` when the sequence reaches `"curtain"` (or is skipped) on cold boot, or immediately on instant boot when a recent session/timestamp is present.
- **Skip interaction:** Clicking the intro overlay or pressing a key (handled via `<svelte:window onkeydown={...} />`) skips the remaining boot sequence.
- **No internal exports:** `work-app-intro-state.internal.svelte.ts` is internal and not part of the `cs/svelte/work` public API.
