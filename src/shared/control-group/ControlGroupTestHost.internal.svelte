<script module lang="ts">
    import type { Snippet } from "svelte";
    import { createControlGroupContext, type ControlGroupContext } from "./index.ts";

    const [getPrimaryGroup, setPrimaryGroup, hasPrimaryGroup] = createControlGroupContext();
    const [getSecondaryGroup, setSecondaryGroup, hasSecondaryGroup] = createControlGroupContext();

    interface ContextProbeResult {
        id: string;
        hasPrimary: boolean;
        primaryGroup: ControlGroupContext | undefined;
        hasSecondary: boolean;
        secondaryGroup: ControlGroupContext | undefined;
    }
</script>

<script lang="ts">
    import Self from "./ControlGroupTestHost.internal.svelte";

    interface Props {
        mode: "standalone" | "nested-same" | "nested-separate" | "provider" | "probe";
        id?: string;
        providePrimary?: ControlGroupContext;
        provideSecondary?: ControlGroupContext;
        outerGroup?: ControlGroupContext;
        innerGroup?: ControlGroupContext;
        onProbe?: (result: ContextProbeResult) => void;
        children?: Snippet;
    }

    let {
        mode,
        id = "probe",
        providePrimary,
        provideSecondary,
        outerGroup,
        innerGroup,
        onProbe,
        children,
    }: Props = $props();

    if (mode === "provider") {
        if (providePrimary) {
            setPrimaryGroup(providePrimary);
        }
        if (provideSecondary) {
            setSecondaryGroup(provideSecondary);
        }
    }

    if (mode === "probe") {
        const hasPrimary = hasPrimaryGroup();
        const primaryGroup = hasPrimary ? getPrimaryGroup() : undefined;
        const hasSecondary = hasSecondaryGroup();
        const secondaryGroup = hasSecondary ? getSecondaryGroup() : undefined;
        onProbe?.({
            id,
            hasPrimary,
            primaryGroup,
            hasSecondary,
            secondaryGroup,
        });
    }
</script>

{#if mode === "provider"}
    {@render children?.()}
{:else if mode === "standalone"}
    <Self mode="probe" id="standalone" {onProbe} />
{:else if mode === "nested-same"}
    <Self mode="provider" providePrimary={outerGroup}>
        <Self mode="probe" id="outer-child" {onProbe} />
        <Self mode="provider" providePrimary={innerGroup}>
            <Self mode="probe" id="inner-child" {onProbe} />
        </Self>
    </Self>
{:else if mode === "nested-separate"}
    <Self mode="provider" providePrimary={outerGroup}>
        <Self mode="provider" provideSecondary={innerGroup}>
            <Self mode="probe" id="both-child" {onProbe} />
        </Self>
    </Self>
{/if}
