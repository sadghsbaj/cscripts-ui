---
name: WorkWorkspaceAccess
kind: component
import: cs/svelte/work
exports:
  - WorkWorkspaceGate
  - WorkWorkspaceMenu
  - WORKSPACE_ACCESS_STATUSES
  - WORKSPACE_ACCESS_DOT_STATUS_MAP
  - WorkspaceAccessStatus
  - WorkWorkspaceGateProps
  - WorkWorkspaceMenuProps
---

# WorkWorkspaceAccess

## Overview

Unified local-folder access UI for Pfleiderer Work applications: `<WorkWorkspaceGate />` provides a blocking, non-dismissible stage inside `<Overlay variant="blur">` when a workspace folder is required, and `<WorkWorkspaceMenu />` provides a compact `<Popover>` anchored to `<WorkAppStatusDot />` in `<WorkAppHeader />`.

### Architectural Decoupling

`src/work/workspace-access/` has zero runtime or type imports from `src/modules/file-system/`. Instead, it defines `WorkspaceAccessStatus` (`"unlinked" | "restoring" | "needs-permission" | "ready" | "stale" | "unsupported"`), which aligns 1:1 with `MountStatus`, alongside pure UI props (`status`, `directoryName`, `busy`, `errorMessage`) and async-capable callbacks (`onselect`, `ongrant`, `ondisconnect`).

## API

### `WorkWorkspaceGate`
Blocking dialog stage (`<div role="dialog" aria-modal="true" class="cs-work-workspace-gate">`) extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders nothing when `status === "ready"`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | No | `null` | Root `.cs-work-workspace-gate` element reference. |
| `status` | `WorkspaceAccessStatus` | Yes | — | Current workspace access state. |
| `directoryName` | `string \| null` | No | `undefined` | Folder name displayed as a pill in `needs-permission` and `stale` states. |
| `busy` | `boolean` | No | `false` | Disables action buttons and sets `data-busy`. |
| `errorMessage` | `string \| null` | No | `undefined` | Optional inline error banner (`role="alert"`). |
| `appName` | `string` | No | `getWorkAppIdentity()?.toolName` | Application name interpolated into `unlinked` copy; falls back to `<WorkAppIntro />` context. |
| `onselect` | `() => void \| Promise<void>` | No | `undefined` | Triggered by **"Ordner wählen"** (`unlinked`), **"Wechseln"** (`needs-permission`), or **"Neu wählen"** (`stale`). |
| `ongrant` | `() => void \| Promise<void>` | No | `undefined` | Triggered by **"Freigeben"** (`needs-permission`). |

- **Exported Method:** `nudge(): void` — Applies `data-blocked` for `320ms` to play the attention shake animation when the user clicks the `<Overlay>` backdrop or presses `Escape`.
- **DOM Attributes:** `data-status={status}`, `data-busy` (when `busy` is truthy), `data-blocked` (during `nudge()`).

### `WorkWorkspaceMenu`
Compact `<Popover popover="auto" role="region" class="cs-work-workspace-menu">` extending `Omit<PopoverProps, "placement" | "width" | "children">`.

| Prop / Bindable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | No | `null` | Root `<Popover>` element reference. |
| `id` | `string` | Yes | — | Popover ID targeted by `{@attach popoverTrigger({ target: id, triggerOn: "click" })}`. |
| `status` | `WorkspaceAccessStatus` | Yes | — | Current workspace access state. |
| `directoryName` | `string \| null` | No | `undefined` | Active or remembered folder name shown in `ready`, `needs-permission`, and `stale`. |
| `busy` | `boolean` | No | `false` | Disables action buttons and sets `data-busy`. |
| `errorMessage` | `string \| null` | No | `undefined` | Optional compact error banner (`role="alert"`). |
| `placement` | `PopoverPlacement` | No | `"bottom-start"` | Anchor placement relative to `<WorkAppStatusDot />`. |
| `width` | `PopoverWidth` | No | `"content"` | Popover width mode (`--cs-work-workspace-menu-width` applies when `"content"`). |
| `offset` | `string` | No | `"16px"` | Distance between the status dot trigger and the menu. |
| `onselect` | `() => void \| Promise<void>` | No | `undefined` | Triggered by **"Wechseln"**, **"Ordner wählen"**, or **"Neu wählen"**. |
| `ongrant` | `() => void \| Promise<void>` | No | `undefined` | Triggered by **"Freigeben"** (`needs-permission`). |
| `ondisconnect` | `() => void \| Promise<void>` | No | `undefined` | Triggered by **"Trennen"** (`ready`, `needs-permission`, `stale`) when provided. |

- **DOM Attributes:** `data-status={status}`, `data-dot-status={WORKSPACE_ACCESS_DOT_STATUS_MAP[status]}`, `data-busy` (when `busy` is truthy).

### Status Constants

- `WORKSPACE_ACCESS_STATUSES`: `["unlinked", "restoring", "needs-permission", "ready", "stale", "unsupported"] as const`
- `WORKSPACE_ACCESS_DOT_STATUS_MAP`: Maps `ready` → `"positive"`, `restoring` / `needs-permission` → `"caution"`, and `unlinked` / `stale` / `unsupported` → `"negative"`.

### CSS Custom Properties

#### Gate (`--cs-work-workspace-gate-*`)
| Variable | Default | Notes |
| :--- | :--- | :--- |
| `--cs-work-workspace-gate-bg` | `var(--cs-color-elevated)` | Surface background and badge cutout ring. |
| `--cs-work-workspace-gate-fg` | `var(--cs-color-text-main)` | Base text color. |
| `--cs-work-workspace-gate-shadow` | `var(--cs-shadow-floating)` | Floating shadow. |
| `--cs-work-workspace-gate-radius` | `28px` | `24px` below `640px`. |
| `--cs-work-workspace-gate-squircle` | `var(--cs-squircle)` | `corner-shape` superellipse. |
| `--cs-work-workspace-gate-padding` | `32px` | `24px` below `640px`. |
| `--cs-work-workspace-gate-max-width` | `460px` | `100%` below `640px`. |
| `--cs-work-workspace-gate-halo-bg` | `var(--cs-color-accent-soft)` | Stage halo fill (morphs by `data-status`). |
| `--cs-work-workspace-gate-folder-stroke` | `var(--cs-color-accent-soft-fg)` | SVG folder stroke (morphs by `data-status`). |
| `--cs-work-workspace-gate-folder-bg` | `color-mix(in oklab, var(--cs-color-accent-solid) 12%, transparent)` | SVG folder flap fill (morphs by `data-status`). |
| `--cs-work-workspace-gate-flap-transform` | `translateY(1.5px) scaleY(0.94)` | SVG front-flap transform (morphs by `data-status`). |
| `--cs-work-workspace-gate-badge-bg` | `var(--cs-color-accent-solid)` | Satellite state badge fill (morphs by `data-status`). |
| `--cs-work-workspace-gate-badge-fg` | `var(--cs-color-accent-solid-fg)` | Satellite state badge glyph color (morphs by `data-status`). |

#### Menu (`--cs-work-workspace-menu-*`)
| Variable | Default | Notes |
| :--- | :--- | :--- |
| `--cs-work-workspace-menu-bg` | `var(--cs-color-elevated)` | Popover surface background. |
| `--cs-work-workspace-menu-fg` | `var(--cs-color-text-main)` | Base text color. |
| `--cs-work-workspace-menu-shadow` | `var(--cs-shadow-floating)` | Floating shadow. |
| `--cs-work-workspace-menu-radius` | `20px` | Outer radius. |
| `--cs-work-workspace-menu-squircle` | `var(--cs-squircle)` | `corner-shape` superellipse. |
| `--cs-work-workspace-menu-padding` | `12px` | Inner padding. |
| `--cs-work-workspace-menu-width` | `264px` | Applied when `data-width="content"` (`min: 240px`, `max: 300px`). |
| `--cs-work-workspace-menu-dot-bg` | `var(--cs-color-negative-solid)` | Status dot fill (mapped from `data-dot-status`). |
| `--cs-work-workspace-menu-label-fg` | `var(--cs-color-text-weak)` | Status label color (mapped from `data-dot-status`). |

## Examples

```svelte
<script lang="ts">
    import { createFileSystemWorkspace } from "cs/svelte/file-system";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";
    import { popoverTrigger } from "cs/svelte/popover";
    import {
        WORKSPACE_ACCESS_DOT_STATUS_MAP,
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppIntro,
        WorkAppMain,
        WorkAppStatusDot,
        WorkWorkspaceGate,
        WorkWorkspaceMenu,
    } from "cs/svelte/work";

    const workspace = createFileSystemWorkspace({ namespace: "holzanalysen" });
    const MENU_ID = "workspace-access-menu";

    let gateRef = $state<{ nudge: () => void } | null>(null);
    let directoryName = $state<string | null>(null);

    const showGate = $derived(
        workspace.mountStatus !== "ready" && workspace.mountStatus !== "restoring",
    );
</script>

<WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen">
    <WorkAppFrame>
        <WorkAppHeader>
            <WorkAppHeaderSegment align="before" renderIsland>
                <WorkAppStatusDot
                    status={WORKSPACE_ACCESS_DOT_STATUS_MAP[workspace.mountStatus]}
                    pulse={workspace.mountStatus !== "ready"}
                    {@attach popoverTrigger({ target: MENU_ID, triggerOn: "click" })}
                >
                    <HitArea size="md" />
                </WorkAppStatusDot>
            </WorkAppHeaderSegment>
        </WorkAppHeader>

        <WorkAppMain>
            <!-- Application content -->
        </WorkAppMain>
    </WorkAppFrame>
</WorkAppIntro>

<WorkWorkspaceMenu
    id={MENU_ID}
    status={workspace.mountStatus}
    {directoryName}
    busy={workspace.isBusy}
    errorMessage={workspace.lastError?.message}
    onselect={() => workspace.pick()}
    ongrant={() => workspace.requestAccess()}
    ondisconnect={() => workspace.forget()}
/>

{#if showGate}
    <Overlay
        variant="blur"
        onclick={(event) => {
            if (event.target === event.currentTarget) {
                gateRef?.nudge();
            }
        }}
    >
        <WorkWorkspaceGate
            bind:this={gateRef}
            status={workspace.mountStatus}
            {directoryName}
            busy={workspace.isBusy}
            errorMessage={workspace.lastError?.message}
            onselect={() => workspace.pick()}
            ongrant={() => workspace.requestAccess()}
        />
    </Overlay>
{/if}
```

## Behavior & Quirks

- **Overlay visibility & `restoring`:** `<WorkWorkspaceGate />` animates to `opacity: 1` when hosted inside `.cs-overlay:popover-open` and renders nothing when `status === "ready"`. Keep `<Overlay>` hidden while `status === "restoring"` to avoid a brief blur flash on returning visits.
- **Focus trap & `Escape` handling:** `<WorkWorkspaceGate />` attaches `focusTrap` while `status !== "ready"`, allowing backdrop `pointerdown` events to reach the enclosing `.cs-overlay` so `Overlay.onclick` triggers `nudge()`. Pressing `Escape` closes the `?` info `<Popover>` first if open; otherwise it calls `nudge()`.
- **Menu auto-dismiss on action:** Clicking an action button in `<WorkWorkspaceMenu />` calls `ref?.hidePopover?.()` before invoking `onselect`, `ongrant`, or `ondisconnect` so native folder pickers and permission prompts open without an overlapping popover.
