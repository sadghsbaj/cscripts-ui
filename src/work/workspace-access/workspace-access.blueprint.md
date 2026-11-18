# Blueprint: `workspace-access` (`src/work/workspace-access/`)

## 1. Overview & Scope

- **Kind:** `component` (two focused Work-App UI components sharing status definitions and types)
- **Import surface:** `src/work/workspace-access/index.ts`, re-exported via `src/work/index.ts` (`cs/svelte/work`)
- **Purpose:** Provides a unified directory-access UX for Pfleiderer Work apps that store data in a user-selected local/network folder via the File System Access API:
  1. `WorkWorkspaceGate.svelte` — a blocking, non-dismissible stage rendered inside an external `<Overlay variant="blur">` when the workspace is not yet ready.
  2. `WorkWorkspaceMenu.svelte` — a compact `<Popover>` menu anchored to `<WorkAppStatusDot>` in the top-left header (`WorkAppHeaderSegment align="before"`), without blur or backdrop.

### Architectural Boundaries
- **Strict decoupling from `src/modules/file-system/`:** Zero runtime or type imports from `src/modules/file-system/`. The module defines its own `WorkspaceAccessStatus` union whose string values align 1:1 with `MountStatus` (`"unlinked" | "restoring" | "needs-permission" | "ready" | "stale" | "unsupported"`), plus pure UI props (`status`, `directoryName`, `busy`, `errorMessage`) and async-capable action callbacks (`onselect`, `ongrant`, `ondisconnect`).
- **Focused Work-App API:** No generic `variant` or `size` props. Only the exact states, copy, and controls required by Work apps.
- **Explicit Non-Goals:**
  - Does not manage `FileSystemDirectoryHandle`, IndexedDB persistence, or permissions directly.
  - Does not render a file tree, sync progress bar, or conflict resolver.
  - Does not wrap `Modal.svelte` (see Section 4 for rationale).

---

## 2. Public API

### Exports (`src/work/workspace-access/index.ts`)

```ts
export { default as WorkWorkspaceGate } from "./WorkWorkspaceGate.svelte";
export { default as WorkWorkspaceMenu } from "./WorkWorkspaceMenu.svelte";

export const WORKSPACE_ACCESS_STATUSES = [
    "unlinked",
    "restoring",
    "needs-permission",
    "ready",
    "stale",
    "unsupported",
] as const;
export type WorkspaceAccessStatus = (typeof WORKSPACE_ACCESS_STATUSES)[number];

export const WORKSPACE_ACCESS_DOT_STATUS_MAP: Record<WorkspaceAccessStatus, WorkAppStatusColor> = {
    ready: "positive",
    restoring: "caution",
    "needs-permission": "caution",
    unlinked: "negative",
    stale: "negative",
    unsupported: "negative",
};
```

### `WorkWorkspaceGateProps`

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`:

| Prop / Bindable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | `null` | Root `.cs-work-workspace-gate` element reference. |
| `status` | `WorkspaceAccessStatus` | *(required)* | Current workspace access state. |
| `directoryName` | `string \| null` | `undefined` | Optional folder name displayed as a badge in `needs-permission` (and `stale` if known). |
| `busy` | `boolean` | `false` | Disables action buttons and shows busy/loading feedback while a picker or permission prompt is active. |
| `errorMessage` | `string \| null` | `undefined` | Optional inline error notice (e.g. from `workspace.lastError?.message`). |
| `appName` | `string` | `getWorkAppIdentity()?.toolName` | Optional app name used in copy; automatically reads `WorkAppIntro` context when available. |
| `onselect` | `() => void \| Promise<void>` | `undefined` | Called when the user clicks **"Ordner wählen"**, **"Wechseln"**, or **"Neu wählen"**. |
| `ongrant` | `() => void \| Promise<void>` | `undefined` | Called when the user clicks **"Freigeben"** (`needs-permission`). |

**Exported Component Method:**
- `nudge(): void` — Triggers the blocked attention/shake pulse (`data-blocked`) when the user clicks the enclosing `<Overlay>` backdrop or presses `Escape`. Mirrors `Modal.nudge()`.

### `WorkWorkspaceMenuProps`

Extends `Omit<PopoverProps, "placement" | "width" | "children">`:

| Prop / Bindable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable`) | `null` | Root `<Popover>` element reference. |
| `id` | `string` | *(required)* | Popover ID targeted by `{@attach popoverTrigger({ target: id, triggerOn: "click" })}` on `WorkAppStatusDot`. |
| `status` | `WorkspaceAccessStatus` | *(required)* | Current workspace access state. |
| `directoryName` | `string \| null` | `undefined` | Active or remembered folder name. |
| `busy` | `boolean` | `false` | Disables menu action buttons while an operation is in flight. |
| `errorMessage` | `string \| null` | `undefined` | Optional compact error notice inside the menu. |
| `placement` | `PopoverPlacement` | `"bottom-start"` | Anchor placement relative to `WorkAppStatusDot`. |
| `width` | `PopoverWidth` | `"content"` | Popover width mode (bounded by CSS `min-inline-size` / `max-inline-size`). |
| `offset` | `string` | `"16px"` | Distance from the status dot trigger. |
| `onselect` | `() => void \| Promise<void>` | `undefined` | Called by **"Wechseln"** / **"Ordner wählen"** / **"Neu wählen"**. |
| `ongrant` | `() => void \| Promise<void>` | `undefined` | Called by **"Freigeben"** (`needs-permission`). |
| `ondisconnect` | `() => void \| Promise<void>` | `undefined` | Called by **"Trennen"** (`ready`, and optionally `needs-permission` / `stale`). |

### CSS Custom Properties (`--cs-work-workspace-*`)

Following `.agents/rules/naming.md` (no `--_` private prefixes):

- **Gate:**
  - `--cs-work-workspace-gate-bg` (default: `var(--cs-color-elevated)`)
  - `--cs-work-workspace-gate-fg` (default: `var(--cs-color-text-main)`)
  - `--cs-work-workspace-gate-shadow` (default: `var(--cs-shadow-floating)`)
  - `--cs-work-workspace-gate-radius` (default: `28px`)
  - `--cs-work-workspace-gate-padding` (default: `28px`)
  - `--cs-work-workspace-gate-width` (default: `440px`)
- **Menu:**
  - `--cs-work-workspace-menu-bg` (default: `var(--cs-color-elevated)`)
  - `--cs-work-workspace-menu-fg` (default: `var(--cs-color-text-main)`)
  - `--cs-work-workspace-menu-shadow` (default: `var(--cs-shadow-floating)`)
  - `--cs-work-workspace-menu-radius` (default: `20px`)
  - `--cs-work-workspace-menu-padding` (default: `16px`)
  - `--cs-work-workspace-menu-width` (default: `280px`)

### Consumer Integration Snippet

```svelte
<script lang="ts">
    import { createFileSystemWorkspace } from "cs/svelte/file-system";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";
    import { popoverTrigger } from "cs/svelte/popover";
    import {
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppIntro,
        WorkAppMain,
        WorkAppStatusDot,
        WorkWorkspaceGate,
        WorkWorkspaceMenu,
        WORKSPACE_ACCESS_DOT_STATUS_MAP,
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

        <WorkAppMain>{/* App content */}</WorkAppMain>
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
    <Overlay variant="blur" onclick={() => gateRef?.nudge()}>
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

---

## 3. DOM, Semantics & Accessibility

### `WorkWorkspaceGate`
- **Root Element:** `<div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>`
- **Classes & Selectors:**
  - `.cs-work-workspace-gate`
  - `.cs-work-workspace-gate-header` (title + subtle `?` info button)
  - `.cs-work-workspace-gate-badge` (optional folder pill in `needs-permission` / `stale`)
  - `.cs-work-workspace-gate-description`
  - `.cs-work-workspace-gate-error` (`role="alert"`, rendered only when `errorMessage` is non-empty)
  - `.cs-work-workspace-gate-actions`
  - `.cs-work-workspace-gate-info` (read-only `<Popover>` attached to the `?` button)
- **`data-*` Attributes:**
  - `data-status={status}`
  - `data-busy={busy ? "" : undefined}`
  - `data-blocked={isBlocked ? "" : undefined}`
- **Focus & Keyboard:**
  - Uses `focusTrap` attachment (`enabled: () => status !== "ready"`, `initialFocus: "first-focusable"`, `fallbackFocus: "self"`, `restoreFocus: true`).
  - `allowOutsideClick`: permits `pointerdown` to reach the enclosing `.cs-overlay` backdrop so `Overlay.onclick` triggers `gateRef?.nudge()`.
  - `Escape`: calls `nudge()` instead of closing (the gate is non-dismissible). If the `?` info `Popover` (`popover="auto"`) is open, `Escape` closes the info popover first before reaching the gate.
  - When `busy` is `true`, action buttons set `disabled={busy}` (or `aria-disabled`) while keeping focus inside the dialog (`fallbackFocus: "self"`).

### `WorkWorkspaceMenu`
- **Root Element:** `<Popover popover="auto">` with class `.cs-work-workspace-menu` and `role="region"` + `aria-label={...}` (standard `<Button>`s inside allow natural `Tab` / `Shift+Tab` / `Enter` / `Space` interaction without custom roving-tabindex `role="menu"` overhead).
- **Classes & Selectors:**
  - `.cs-work-workspace-menu`
  - `.cs-work-workspace-menu-status` (dot/status label + `directoryName`)
  - `.cs-work-workspace-menu-error` (`role="alert"`, when `errorMessage` is present)
  - `.cs-work-workspace-menu-actions`
- **`data-*` Attributes:**
  - `data-status={status}`
  - `data-busy={busy ? "" : undefined}`
- **Popover Lifecycle:**
  - `popover="auto"` handles outside-click and `Escape` dismissal natively and restores focus to `WorkAppStatusDot`.
  - Clicking an action button invokes the callback (`onselect` / `ongrant` / `ondisconnect`) and calls `ref?.hidePopover()` so native file pickers or permission prompts open cleanly without an overlapping menu.

---

## 4. Visual & Motion Contract

### Why a Custom Gate Stage Inside `<Overlay variant="blur">` (Instead of `Modal.svelte`)
1. **Shared Overlay Infrastructure:** Wrapping `<WorkWorkspaceGate>` inside `<Overlay variant="blur">` reuses `Overlay`'s `popover="manual"` top-layer promotion, `scrollLock`, `VisualViewport` tracking, and `allow-discrete` blur exit transition—matching `Modal`'s composition model and cleanly sequencing after `WorkAppIntro`.
2. **Non-Dismissible Stage:** `Modal.svelte` is built around `dismissible`, `onBeforeClose`, and `ModalHeader`/`ModalFooter` card slots. A workspace gate cannot be dismissed; building the stage directly avoids fighting `Modal`'s close lifecycle while exposing a clean `nudge()` hook for backdrop attention.
3. **State Morphing & Info Popover:** The gate transitions smoothly in-place between `restoring`, `needs-permission`, `unlinked`, `stale`, and `unsupported`, and hosts a subtle `?` button in the top-right corner that opens a read-only `<Popover>` explaining browser folder permissions in plain language.

### State Matrix

| `status` | Gate Visuals & Controls | Menu Visuals & Controls | Dot (`WorkAppStatusDot`) |
| :--- | :--- | :--- | :--- |
| `unlinked` | Title, short prompt, `?` info button, Primary **"Ordner wählen"** (no icon). | Status `"Kein Ordner gewählt"`, Primary **"Ordner wählen"**. | `negative` |
| `restoring` | Calm, non-interactive restoring state (spinner/pulse, no action buttons). Recommended: consumer keeps `<Overlay>` hidden during `restoring` to avoid a brief blur flash on returning visits. | Status `"Wird wiederhergestellt..."`, disabled/no actions. | `caution` |
| `needs-permission` | Folder badge (`directoryName` if provided), short prompt, `?` info button, Primary **"Freigeben"** + Secondary **"Wechseln"**. | Folder name + `"Freigabe erforderlich"`, Primary **"Freigeben"**, Secondary **"Wechseln"**, optional **"Trennen"**. | `caution` |
| `ready` | *(Gate not shown by consumer; renders nothing if mounted.)* | Folder name + `"Ausgewählt"` badge, **"Wechseln"** + **"Trennen"** (negative/ghost or secondary). | `positive` |
| `stale` | Short hint (folder moved/unavailable), `?` info button, Primary **"Neu wählen"**. | Status `"Ordner nicht mehr erreichbar"`, Primary **"Neu wählen"**, optional **"Trennen"**. | `negative` |
| `unsupported` | Clear browser-support hint (e.g. Chromium-based desktop browser required), **no broken action buttons**. | Status `"Browser nicht unterstützt"`, short hint, no action buttons. | `negative` |

### Surface & Motion
- **Gate:** `--cs-color-elevated`, `--cs-shadow-floating`, `border-radius: 28px`, `corner-shape: var(--cs-squircle)` (matching `Modal.svelte`). Entry/exit scale + opacity transition; `nudge()` applies a brief horizontal/scale shake keyframe on `[data-blocked]`, disabled under `prefers-reduced-motion: reduce`.
- **Menu & Info Popover:** `--cs-color-elevated`, `--cs-shadow-floating`, `border-radius: 20px`, `corner-shape: var(--cs-squircle-soft)`, inheriting `Popover`'s directional spring (`animate = true`).

---

## 5. i18n Defaults (`t({ de, en })`)

All built-in copy uses `t({ de, en })` from `src/shared/lang.internal.ts` (never re-exported):

- **Gate Titles / Actions:**
  - `unlinked`: `"Arbeitsordner wählen"` / `"Select workspace folder"` · CTA: `"Ordner wählen"` / `"Select folder"`
  - `needs-permission`: `"Zugriff freigeben"` / `"Grant folder access"` · CTAs: `"Freigeben"` / `"Grant access"`, `"Wechseln"` / `"Change"`
  - `stale`: `"Ordner nicht gefunden"` / `"Folder unavailable"` · CTA: `"Neu wählen"` / `"Select again"`
  - `unsupported`: `"Browser nicht unterstützt"` / `"Browser not supported"`
  - `restoring`: `"Arbeitsbereich wird geladen..."` / `"Restoring workspace..."`
- **Info `?` Popover:**
  - `aria-label`: `"Warum wird diese Berechtigung benötigt?"` / `"Why is this permission needed?"`
  - Body: Simple, non-technical explanation that data stays locally in the chosen folder and the browser asks for confirmation after a reload for security.
- **Menu:**
  - `ready` badge: `"Ausgewählt"` / `"Selected"` · Actions: `"Wechseln"` / `"Change"`, `"Trennen"` / `"Disconnect"`

---

## 6. Edge Cases, Constraints & Verify Checklist

### Edge Cases & Constraints
1. **Top-Layer Stacking (`Overlay` + Info `Popover`):** `Overlay` uses `popover="manual"`, while the Gate's `?` info `Popover` uses `popover="auto"`. Opening an `auto` popover inside a `manual` overlay promotes the info popover above the overlay without dismissing the overlay.
2. **`WorkAppStatusDot` Tooltip vs. Menu:** `WorkAppStatusDot` attaches `tooltip` on hover/focus. Clicking it opens `WorkWorkspaceMenu`; verify the tooltip hides cleanly on click/open and does not overlap the menu.
3. **`directoryName` Availability:** `FileSystemWorkspace` (`src/modules/file-system/workspace.svelte.ts`) does not currently expose `directoryName` on its public interface. `directoryName` is therefore optional in both components so consumers can pass it from app state (or from a future `workspace.directoryName` getter) with clean fallback copy when omitted.
4. **Browser Support:** CSS Anchor Positioning (`Popover` + `WorkAppStatusDot`) and `corner-shape: squircle` are progressive enhancements targeting modern Chromium desktop browsers (matching File System Access API availability).

### Verify Checklist (for implementation)
- [ ] Zero imports from `src/modules/file-system/` in `src/work/workspace-access/`.
- [ ] `WorkWorkspaceGate` inside `<Overlay variant="blur">` traps focus, nudges on backdrop click and `Escape`, and never exposes a close button.
- [ ] `?` info `Popover` opens above `Overlay` in the top layer and closes on `Escape` without triggering Gate `nudge()`.
- [ ] `WorkWorkspaceMenu` anchors cleanly to `WorkAppStatusDot` via `popoverTrigger` (`bottom-start`, `offset="16px"`) and closes before/upon action click.
- [ ] All 6 `WorkspaceAccessStatus` states render distinct, accurate UI in both Gate and Menu, with `unsupported` rendering zero broken action buttons.
- [ ] Exported via `src/work/index.ts` and covered by unit/component tests (`*.svelte.test.ts`).
