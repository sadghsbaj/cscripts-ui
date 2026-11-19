<script module lang="ts">
    export const id = "work-workspace-access";
    export const label = "WorkspaceAccess";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";
    import { popoverTrigger } from "cs/svelte/popover";
    import { Switch } from "cs/svelte/switch";
    import { TextInput, TextInputField } from "cs/svelte/text-input";
    import {
        ToggleButton,
        ToggleButtonGroup,
        ToggleButtonLabel,
    } from "cs/svelte/toggle-button";
    import {
        WORKSPACE_ACCESS_DOT_STATUS_MAP,
        WORKSPACE_ACCESS_STATUSES,
        WorkAppHeaderSegment,
        WorkAppStatusDot,
        WorkWorkspaceGate,
        WorkWorkspaceMenu,
        type WorkspaceAccessStatus,
    } from "cs/svelte/work";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let status = $state<WorkspaceAccessStatus>("unlinked");
    let busy = $state(false);
    let directoryName = $state("Holzanalysen-Daten");
    let errorMessage = $state("");
    let overlayOpen = $state(false);
    let gateRef = $state<{ nudge: () => void } | null>(null);
    let headerSegmentRef = $state<HTMLElement | null>(null);

    const uid = $props.id();
    const menuId = `${uid}-menu`;
    const busySwitchId = `${uid}-busy`;
    const dirInputId = `${uid}-dir`;
    const errorInputId = `${uid}-error`;

    function handleSelect(): void {
        status = "ready";
        errorMessage = "";
        overlayOpen = false;
    }

    function handleGrant(): void {
        status = "ready";
        errorMessage = "";
        overlayOpen = false;
    }

    function handleDisconnect(): void {
        status = "unlinked";
        errorMessage = "";
    }

    function openOverlayGate(): void {
        if (status === "ready") {
            status = "unlinked";
        }
        overlayOpen = true;
    }
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="WorkspaceAccess"
        description="Blocking workspace gate and header status menu for local folder access."
    />

    <PreviewSection
        title="State Controls"
        description="Switch across all six WorkspaceAccessStatus values and optional state props."
    >
        <div class="flex flex-col gap-5 w-full max-w-680px">
            <ToggleButtonGroup
                type="single"
                allowDeselect={false}
                bind:value={status}
                class="flex-wrap"
            >
                {#each WORKSPACE_ACCESS_STATUSES as item (item)}
                    <ToggleButton variant="soft" color="accent" size="sm" value={item}>
                        <ToggleButtonLabel>{item}</ToggleButtonLabel>
                    </ToggleButton>
                {/each}
            </ToggleButtonGroup>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div class="flex flex-col gap-1.5">
                    <label for={dirInputId} class="text-xs font-medium text-weak">directoryName</label>
                    <TextInput variant="soft" size="sm">
                        <TextInputField
                            id={dirInputId}
                            bind:value={directoryName}
                            placeholder="Folder name"
                        />
                    </TextInput>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for={errorInputId} class="text-xs font-medium text-weak">errorMessage</label>
                    <TextInput variant="soft" size="sm">
                        <TextInputField
                            id={errorInputId}
                            bind:value={errorMessage}
                            placeholder="Optional error notice"
                        />
                    </TextInput>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <Switch id={busySwitchId} size="sm" bind:checked={busy} />
                <label for={busySwitchId} class="text-sm text-main select-none cursor-pointer">
                    busy
                </label>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Status Dot & Menu"
        description="Click the header status dot to open WorkWorkspaceMenu anchored below."
    >
        <div class="flex-center h-12">
            <WorkAppHeaderSegment align="before" renderIsland bind:ref={headerSegmentRef}>
                <WorkAppStatusDot
                    status={WORKSPACE_ACCESS_DOT_STATUS_MAP[status]}
                    pulse={status !== "ready"}
                    {@attach popoverTrigger({
                        target: menuId,
                        triggerOn: "pointerdown",
                        anchor: () => headerSegmentRef,
                    })}
                >
                    <HitArea size="md" />
                </WorkAppStatusDot>
            </WorkAppHeaderSegment>
        </div>

        <WorkWorkspaceMenu
            id={menuId}
            offset="8px"
            {status}
            {directoryName}
            {busy}
            {errorMessage}
            onselect={handleSelect}
            ongrant={handleGrant}
            ondisconnect={handleDisconnect}
        />
    </PreviewSection>

    <PreviewSection
        title="Overlay Gate"
        description="Renders WorkWorkspaceGate inside Overlay blur; backdrop clicks and Escape trigger nudge()."
    >
        <Button variant="primary" size="md" onclick={openOverlayGate}>
            <ButtonLabel>Open Overlay Gate</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Inline Gate Stage"
        description="Mount the gate inline outside Overlay to inspect morphing stage states directly."
    >
        <div
            class="w-full rounded-3xl squircle bg-sunken shadow-sunken p-8 sm:p-12 flex-center min-h-420px"
        >
            {#if status === "ready"}
                <div class="flex flex-col items-center gap-3 text-center">
                    <p class="text-sm text-weak m-0">Status: ready — Gate hidden</p>
                    <Button variant="tertiary" size="sm" onclick={() => (status = "unlinked")}>
                        <ButtonLabel>Reset to unlinked</ButtonLabel>
                    </Button>
                </div>
            {:else}
                <WorkWorkspaceGate
                    {status}
                    {directoryName}
                    {busy}
                    {errorMessage}
                    appName="Holzanalysen"
                    onselect={handleSelect}
                    ongrant={handleGrant}
                />
            {/if}
        </div>
    </PreviewSection>
</div>

{#if overlayOpen && status !== "ready"}
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
            {status}
            {directoryName}
            {busy}
            {errorMessage}
            appName="Holzanalysen"
            onselect={handleSelect}
            ongrant={handleGrant}
        />

        {#if status === "unsupported" || status === "restoring"}
            <div class="fixed bottom-5 left-1/2 -translate-x-1/2">
                <Button variant="elevated" size="sm" onclick={() => (overlayOpen = false)}>
                    <ButtonLabel>Exit preview</ButtonLabel>
                </Button>
            </div>
        {/if}
    </Overlay>
{/if}
