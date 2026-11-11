<script module lang="ts">
    export const id = "click-outside";
    export const label = "Click-Outside";
</script>

<script lang="ts">
    import { Check, ShieldAlert, Sparkles } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { clickOutside } from "cs/svelte/click-outside";

    // Example 1: Standard outside click
    let isBasicOpen = $state(false);

    // Example 2: Ignore specific element reference
    let isIgnoreElementOpen = $state(false);
    let triggerButtonEl = $state<HTMLElement | undefined>();

    // Example 3: Ignore by CSS selector
    let isSelectorOpen = $state(false);
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- 1. Standard Callback -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-260px flex flex-col justify-between items-start gap-5 relative"
        >
            <div class="flex flex-col gap-2 w-full">
                <h2 class="title-xl">Standard</h2>
                <span class="description-sm">Schließt beim Klick außerhalb</span>
            </div>

            <div class="w-full flex-center flex-col gap-3 min-h-110px">
                {#if isBasicOpen}
                    <div
                        class="bg-accent-soft text-accent-soft-fg px-4 py-3 rounded-2xl squircle flex items-center gap-2.5 shadow-sm text-sm font-500 w-full justify-between"
                        {@attach clickOutside(() => (isBasicOpen = false))}
                    >
                        <div class="flex items-center gap-2">
                            <Sparkles class="size-4.5" />
                            <span>Offen</span>
                        </div>
                        <span class="text-xs text-weak">Klick daneben</span>
                    </div>
                {:else}
                    <Button variant="soft" color="base" size="md" onclick={() => (isBasicOpen = true)}>
                        <ButtonLabel>Öffnen</ButtonLabel>
                    </Button>
                {/if}
            </div>
        </div>

        <!-- 2. Ignore Element Reference -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-260px flex flex-col justify-between items-start gap-5 relative"
        >
            <div class="flex flex-col gap-2 w-full">
                <h2 class="title-xl">Ignore Element</h2>
                <span class="description-sm">Trigger-Klick schließt nicht versehentlich</span>
            </div>

            <div class="w-full flex-center flex-col gap-3 min-h-110px">
                <div bind:this={triggerButtonEl}>
                    <Button
                        variant={isIgnoreElementOpen ? "solid" : "soft"}
                        color={isIgnoreElementOpen ? "accent" : "base"}
                        size="md"
                        onclick={() => (isIgnoreElementOpen = !isIgnoreElementOpen)}
                    >
                        <ButtonLabel>{isIgnoreElementOpen ? "Schließen" : "Öffnen"}</ButtonLabel>
                    </Button>
                </div>

                {#if isIgnoreElementOpen}
                    <div
                        class="bg-elevation-2 px-4 py-3 rounded-2xl squircle flex items-center gap-2 text-sm text-strong w-full justify-center"
                        {@attach clickOutside({
                            handler: () => (isIgnoreElementOpen = false),
                            ignore: triggerButtonEl,
                        })}
                    >
                        <Check class="size-4.5 text-accent-soft-fg" />
                        <span>Aktiv</span>
                    </div>
                {/if}
            </div>
        </div>

        <!-- 3. Ignore CSS Selector -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-260px flex flex-col justify-between items-start gap-5 relative"
        >
            <div class="flex flex-col gap-2 w-full">
                <h2 class="title-xl">Ignore Selector</h2>
                <span class="description-sm">Klicks auf .safe-zone werden ignoriert</span>
            </div>

            <div class="w-full flex-center flex-col gap-3 min-h-110px">
                <div class="flex items-center gap-2 w-full justify-center">
                    <Button variant="soft" color="base" size="md" onclick={() => (isSelectorOpen = !isSelectorOpen)}>
                        <ButtonLabel>{isSelectorOpen ? "Schließen" : "Öffnen"}</ButtonLabel>
                    </Button>

                    <div
                        class="safe-zone bg-elevation-2 px-3 py-1.5 rounded-xl squircle text-xs font-500 text-weak select-none cursor-pointer"
                    >
                        .safe-zone
                    </div>
                </div>

                {#if isSelectorOpen}
                    <div
                        class="bg-elevation-2 px-4 py-3 rounded-2xl squircle flex items-center gap-2 text-sm text-strong w-full justify-between"
                        {@attach clickOutside({
                            handler: () => (isSelectorOpen = false),
                            ignore: ".safe-zone",
                        })}
                    >
                        <div class="flex items-center gap-2">
                            <ShieldAlert class="size-4.5 text-warning-soft-fg" />
                            <span>Geschützt</span>
                        </div>
                        <span class="text-xs text-weaker">Safe-Zone bleibt aktiv</span>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
