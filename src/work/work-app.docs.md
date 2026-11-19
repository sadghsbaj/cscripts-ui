---
name: WorkApp
kind: hybrid
import: cs/svelte/work
exports:
  - WorkAppIntro
  - WorkAppFrame
  - WorkAppHeader
  - WorkAppHeaderSegment
  - WorkAppMain
  - WorkAppViewStage
  - workAppViewIn
  - workAppViewOut
  - WorkAppStatusDot
  - WorkAppHelpButton
  - WorkAppThemeButton
  - WorkWorkspaceGate
  - WorkWorkspaceMenu
  - WORKSPACE_ACCESS_DOT_STATUS_MAP
---

# WorkApp

## Overview

Canonical composition recipe for internal Pfleiderer Work applications combining `cs/svelte/work`, `cs/svelte/scroll-area`, `cs/svelte/scroll-fade`, `cs/svelte/overlay`, and `cs/svelte/file-system`.

## Canonical Work App Recipe

```svelte
<script lang="ts">
    import { createFileSystemWorkspace } from "cs/svelte/file-system";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";
    import { popoverTrigger } from "cs/svelte/popover";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import {
        WORKSPACE_ACCESS_DOT_STATUS_MAP,
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppIntro,
        WorkAppMain,
        WorkAppStatusDot,
        WorkAppThemeButton,
        WorkWorkspaceGate,
        WorkWorkspaceMenu,
    } from "cs/svelte/work";

    const uid = $props.id();
    const menuId = `${uid}-workspace-menu`;

    const workspace = createFileSystemWorkspace({ namespace: "holzanalysen" });

    let showDocs = $state(false);
    let introSettled = $state(false);
    let headerSegmentRef = $state<HTMLElement | null>(null);
    let gateRef = $state<{ nudge: () => void } | null>(null);

    const showGate = $derived(
        introSettled && workspace.mountStatus !== "ready" && workspace.mountStatus !== "restoring",
    );
</script>

<WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen" bind:settled={introSettled}>
    <ScrollArea size="lg" direction="vertical" class="h-dvh w-full">
        <ScrollAreaContent {@attach scrollFade({ size: "lg", direction: "vertical", edges: "both" })}>
            <WorkAppFrame>
                <WorkAppHeader>
                    <WorkAppHeaderSegment align="before" renderIsland bind:ref={headerSegmentRef}>
                        <WorkAppStatusDot
                            status={WORKSPACE_ACCESS_DOT_STATUS_MAP[workspace.mountStatus]}
                            pulse={workspace.mountStatus !== "ready"}
                            {@attach popoverTrigger({
                                target: menuId,
                                triggerOn: "pointerdown",
                                anchor: () => headerSegmentRef,
                            })}
                        >
                            <HitArea size="md" />
                        </WorkAppStatusDot>

                        <WorkWorkspaceMenu
                            id={menuId}
                            offset="8px"
                            status={workspace.mountStatus}
                            directoryName={workspace.directoryName}
                            busy={workspace.isBusy}
                            errorMessage={workspace.lastError?.message}
                            onselect={() => workspace.pick()}
                            ongrant={() => workspace.requestAccess()}
                            ondisconnect={() => workspace.forget()}
                        />
                    </WorkAppHeaderSegment>

                    <WorkAppHeaderSegment align="end">
                        <WorkAppHelpButton bind:pressed={showDocs} />
                        <WorkAppThemeButton />
                    </WorkAppHeaderSegment>
                </WorkAppHeader>

                <WorkAppMain>
                    <!-- Application content -->
                </WorkAppMain>
            </WorkAppFrame>
        </ScrollAreaContent>
    </ScrollArea>

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
                directoryName={workspace.directoryName}
                busy={workspace.isBusy}
                errorMessage={workspace.lastError?.message}
                onselect={() => workspace.pick()}
                ongrant={() => workspace.requestAccess()}
            />
        </Overlay>
    {/if}
</WorkAppIntro>
```

## In-App Documentation

Keep `<WorkAppHeader>` mounted and toggle `<WorkAppDocs>` inside `<WorkAppMain>` using `<WorkAppHelpButton bind:pressed={showDocs} />`. Wrap the conditional views in `<WorkAppViewStage activeKey={showDocs ? "docs" : "app"}>` with `in:workAppViewIn` and `out:workAppViewOut` so view switches overlap cleanly and preserve scroll positions per view. `<WorkAppDocs>` renders a centered `760px` view and uses `<WorkAppDocsTabs />` (`SegmentedControl`) to split documentation into chapters without leaving the app shell.

```svelte
<script lang="ts">
    import {
        WorkAppDocs,
        WorkAppDocsChapter,
        WorkAppDocsContent,
        WorkAppDocsHeader,
        WorkAppDocsTabs,
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppMain,
        WorkAppThemeButton,
        WorkAppViewStage,
        workAppViewIn,
        workAppViewOut,
    } from "cs/svelte/work";

    let showDocs = $state(false);
</script>

<WorkAppFrame>
    <WorkAppHeader>
        <WorkAppHeaderSegment align="end">
            <WorkAppHelpButton bind:pressed={showDocs} />
            <WorkAppThemeButton />
        </WorkAppHeaderSegment>
    </WorkAppHeader>

    <WorkAppMain>
        <WorkAppViewStage activeKey={showDocs ? "docs" : "app"}>
            {#if showDocs}
                <div in:workAppViewIn out:workAppViewOut>
                    <WorkAppDocs defaultChapter="overview">
                        <WorkAppDocsHeader title="Holzanalysen" />
                        <WorkAppDocsTabs />

                        <WorkAppDocsContent>
                            <WorkAppDocsChapter id="overview" title="Overview">
                                <!-- Chapter content -->
                            </WorkAppDocsChapter>
                            <WorkAppDocsChapter id="shortcuts" title="Shortcuts">
                                <!-- Chapter content -->
                            </WorkAppDocsChapter>
                        </WorkAppDocsContent>
                    </WorkAppDocs>
                </div>
            {:else}
                <div in:workAppViewIn out:workAppViewOut>
                    <!-- Application content -->
                </div>
            {/if}
        </WorkAppViewStage>
    </WorkAppMain>
</WorkAppFrame>
```

## Extensions & Notes

- **Navigation tabs in header:** Add a `<WorkAppHeaderSegment align="center">` (or `align="before"` alongside the status segment) containing a `<ToggleButtonGroup type="single" bind:value={activeTab}>` with `<ToggleButton>` items (`cs/svelte/toggle-button`) when the app has top-level views. Keep domain-specific filters and business context inside `<WorkAppMain>`.
- **Guarding data loading:** Run initial reads and workspace queries only when `workspace.mountStatus === "ready"` (for example inside `$effect(() => { if (workspace.mountStatus !== "ready") return; ... })`). Keeping `<Overlay>` hidden during `"restoring"` avoids a brief blur flash while returning handles are rehydrated.
- **Waiting for `introSettled` before showing `<Overlay>`:** `showGate` waits for `introSettled` because `<Overlay>` uses `showPopover()` in the browser Top Layer, which would otherwise paint over `<WorkAppIntro>`'s `z-index: 50` stage and capture focus before the intro finishes. Binding `introSettled` syncs the gate entrance with the `"curtain"` transition on cold boot and shows it immediately on instant boot.
- **Inherited `toolName`:** `<WorkWorkspaceGate>` automatically reads `toolName` from `<WorkAppIntro>` context (`getWorkAppIdentity()`), so `appName` does not need to be passed separately.
- **Apps without `file-system`:** Omit `<WorkAppStatusDot>`, `<WorkWorkspaceMenu>`, and the `<Overlay>` + `<WorkWorkspaceGate>` block; keep `<WorkAppIntro>`, `<ScrollArea>`, `<WorkAppFrame>`, `<WorkAppHeader>`, `<WorkAppHelpButton>`, `<WorkAppThemeButton>`, and `<WorkAppMain>`.
