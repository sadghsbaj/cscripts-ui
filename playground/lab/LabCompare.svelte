<script lang="ts">
    import type { Snippet } from "svelte";
    import { Columns2, Layers } from "@lucide/svelte";
    import { HitArea } from "cs/svelte/hit-area";
    import { ToggleButton, ToggleButtonIcon, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";
    import { tooltip } from "cs/svelte/tooltip";

    export interface LabVariant {
        id: string;
        label: string;
        content: Snippet;
    }

    interface Props {
        variants: readonly LabVariant[];
        mode?: "split" | "switch";
    }

    let { variants, mode = $bindable("split") }: Props = $props();

    let activeId = $state<string>();
    $effect(() => {
        if (!activeId || variants.every((v) => v.id !== activeId)) {
            activeId = variants[0]?.id;
        }
    });
    const activeVariant = $derived(variants.find((v) => v.id === activeId));
</script>

<div class="w-full max-w-6xl flex flex-col items-center gap-6">
    <div class="flex items-center gap-3">
        {#if mode === "switch"}
            <ToggleButtonGroup type="single" orientation="horizontal" bind:value={activeId}>
                {#each variants as variant, index (variant.id)}
                    {#if index > 0}
                        <ToggleButtonGroupSeparator />
                    {/if}
                    <ToggleButton value={variant.id} variant="soft" color="accent" size="sm">
                        <ToggleButtonLabel>{variant.label}</ToggleButtonLabel>
                    </ToggleButton>
                {/each}
            </ToggleButtonGroup>
        {/if}

        <ToggleButtonGroup type="single" orientation="horizontal" bind:value={mode}>
            <ToggleButton
                value="split"
                variant="soft"
                color="accent"
                size="sm"
                iconOnly
                aria-label="Nebeneinander"
                {@attach tooltip("Nebeneinander")}
            >
                <ToggleButtonIcon icon={Columns2} />
                <HitArea size="sm" />
            </ToggleButton>
            <ToggleButtonGroupSeparator />
            <ToggleButton
                value="switch"
                variant="soft"
                color="accent"
                size="sm"
                iconOnly
                aria-label="Umschalten"
                {@attach tooltip("Umschalten")}
            >
                <ToggleButtonIcon icon={Layers} />
                <HitArea size="sm" />
            </ToggleButton>
        </ToggleButtonGroup>
    </div>

    {#if mode === "split"}
        <div
            class="w-full grid gap-6"
            style:grid-template-columns="repeat(auto-fit, minmax(280px, 1fr))"
        >
            {#each variants as variant (variant.id)}
                <section class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 flex flex-col gap-5">
                    <h2 class="title-lg text-weak">{variant.label}</h2>
                    <div class="flex-1 flex-center">
                        {@render variant.content()}
                    </div>
                </section>
            {/each}
        </div>
    {:else if activeVariant}
        <section class="w-full max-w-2xl bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 flex flex-col gap-5">
            <h2 class="title-lg text-weak">{activeVariant.label}</h2>
            <div class="flex-center min-h-40">
                {@render activeVariant.content()}
            </div>
        </section>
    {/if}
</div>
