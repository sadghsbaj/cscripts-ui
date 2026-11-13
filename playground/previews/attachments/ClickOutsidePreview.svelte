<script module lang="ts">
    export const id = "click-outside";
    export const label = "Click-Outside";
</script>

<script lang="ts">
    import { clickOutside } from "cs/svelte/click-outside";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";

    let isBasicOpen = $state(false);

    let isIgnoreElementOpen = $state(false);
    let triggerButtonEl = $state<HTMLElement | undefined>();

    let isSelectorOpen = $state(false);
    let selectorTriggerEl = $state<HTMLElement | undefined>();
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- 1. Wrapper Pattern -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Wrapper</h2>
                <span class="description-sm whitespace-nowrap">Wraps trigger and content</span>
            </div>

            <div
                class="w-full flex-center flex-col gap-3 min-h-100px"
                {@attach clickOutside(() => (isBasicOpen = false))}
            >
                <ToggleButton variant="soft" color="accent" size="md" bind:pressed={isBasicOpen}>
                    <ToggleButtonLabel>{isBasicOpen ? "Close" : "Open"}</ToggleButtonLabel>
                </ToggleButton>

                {#if isBasicOpen}
                    <div
                        class="w-full h-12 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-2xl squircle label-sm text-strong select-none"
                    >
                        Active
                    </div>
                {/if}
            </div>
        </div>

        <!-- 2. Ignore Element -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Ignore Element</h2>
                <span class="description-sm whitespace-nowrap">Trigger is excluded</span>
            </div>

            <div class="w-full flex-center flex-col gap-3 min-h-100px">
                <div bind:this={triggerButtonEl}>
                    <ToggleButton variant="soft" color="accent" size="md" bind:pressed={isIgnoreElementOpen}>
                        <ToggleButtonLabel>{isIgnoreElementOpen ? "Close" : "Open"}</ToggleButtonLabel>
                    </ToggleButton>
                </div>

                {#if isIgnoreElementOpen}
                    <div
                        class="w-full h-12 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-2xl squircle label-sm text-strong select-none"
                        {@attach clickOutside({
                            handler: () => (isIgnoreElementOpen = false),
                            ignore: triggerButtonEl,
                        })}
                    >
                        Protected
                    </div>
                {/if}
            </div>
        </div>

        <!-- 3. Ignore Selector -->
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-240px flex flex-col justify-between items-start gap-6"
        >
            <div class="flex flex-col gap-1 w-full">
                <h2 class="title-xl">Ignore Selector</h2>
                <span class="description-sm whitespace-nowrap">Safe zone is excluded</span>
            </div>

            <div class="w-full flex-center flex-col gap-3 min-h-100px">
                <div class="flex-center gap-3 w-full">
                    <div bind:this={selectorTriggerEl}>
                        <ToggleButton variant="soft" color="accent" size="md" bind:pressed={isSelectorOpen}>
                            <ToggleButtonLabel>{isSelectorOpen ? "Close" : "Open"}</ToggleButtonLabel>
                        </ToggleButton>
                    </div>

                    <div
                        class="safe-zone h-9 px-3.5 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-full squircle label-xs text-weak select-none cursor-pointer hover:text-strong transition-colors"
                    >
                        .safe-zone
                    </div>
                </div>

                {#if isSelectorOpen}
                    <div
                        class="w-full h-12 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-2xl squircle label-sm text-strong select-none"
                        {@attach clickOutside({
                            handler: () => (isSelectorOpen = false),
                            ignore: [selectorTriggerEl, ".safe-zone"],
                        })}
                    >
                        Protected
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
