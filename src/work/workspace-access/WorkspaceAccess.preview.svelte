<script module lang="ts">
    export const id = "work-workspace-access";
    export const label = "WorkspaceAccess";
</script>

<script lang="ts">
    import { X } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
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
    import { tooltip } from "cs/svelte/tooltip";
    import {
        WORKSPACE_ACCESS_DOT_STATUS_MAP,
        WORKSPACE_ACCESS_STATUSES,
        WorkAppHeaderSegment,
        WorkAppStatusDot,
        WorkWorkspaceGate,
        WorkWorkspaceMenu,
        type WorkspaceAccessStatus,
    } from "cs/svelte/work";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let status = $state<WorkspaceAccessStatus>("unlinked");
    let busy = $state(false);
    let directoryName = $state("Holzanalysen-Daten");
    let errorMessage = $state("");
    let overlayOpen = $state(false);
    let inlineGateOpen = $state(false);
    let gateRef = $state<{ nudge: () => void } | null>(null);

    const uid = $props.id();
    const menuId = `${uid}-menu`;
    const busySwitchId = `${uid}-busy`;
    const inlineSwitchId = `${uid}-inline`;
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
        <div class="flex-center py-2">
            <WorkAppHeaderSegment align="before" renderIsland>
                <WorkAppStatusDot
                    status={WORKSPACE_ACCESS_DOT_STATUS_MAP[status]}
                    pulse={status !== "ready"}
                    {@attach popoverTrigger({ target: menuId, triggerOn: "click" })}
                >
                    <HitArea size="md" />
                </WorkAppStatusDot>
            </WorkAppHeaderSegment>
        </div>

        <WorkWorkspaceMenu
            id={menuId}
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
        <div class="flex flex-col items-center gap-6 w-full">
            <div class="flex items-center gap-3">
                <Switch id={inlineSwitchId} size="sm" bind:checked={inlineGateOpen} />
                <label for={inlineSwitchId} class="text-sm text-main select-none cursor-pointer">
                    Show inline gate
                </label>
            </div>

            {#if inlineGateOpen}
                <SunkenWell class="w-full flex justify-center py-8 px-4">
                    <WorkWorkspaceGate
                        {status}
                        {directoryName}
                        {busy}
                        {errorMessage}
                        appName="Holzanalysen"
                        onselect={handleSelect}
                        ongrant={handleGrant}
                        style="opacity: 1; scale: 1; translate: 0 0;"
                    />
                </SunkenWell>
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
        <Button
            variant="secondary"
            size="sm"
            iconOnly
            aria-label="Close overlay preview"
            class="fixed top-4 right-4"
            {@attach tooltip({ text: "Close overlay preview" })}
            onclick={() => {
                overlayOpen = false;
            }}
        >
            <ButtonIcon icon={X} />
            <HitArea size="md" />
        </Button>

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
    </Overlay>
{/if}
