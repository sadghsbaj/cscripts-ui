<script module lang="ts">
    export const id = "click-outside";
    export const label = "Click-Outside";
</script>

<script lang="ts">
    import { clickOutside } from "cs/svelte/click-outside";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let isBasicOpen = $state(false);

    let isIgnoreElementOpen = $state(false);
    let triggerButtonEl = $state<HTMLElement | undefined>();

    let isSelectorOpen = $state(false);
    let selectorTriggerEl = $state<HTMLElement | undefined>();

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {@attach} bindings */
    const wrapperCode = `<script lang="ts">
    import { clickOutside } from "cs/svelte/click-outside";

    let isOpen = $state(false);
${closeScript}

<div {@attach clickOutside(() => (isOpen = false))}>
    <button onclick={() => (isOpen = !isOpen)}>Toggle</button>
    {#if isOpen}
        <div>Click outside this wrapper to close</div>
    {/if}
</div>`;

    const ignoreElementCode = `<div bind:this={triggerEl}>
    <button onclick={() => (isOpen = !isOpen)}>Toggle</button>
</div>

{#if isOpen}
    <div
        {@attach clickOutside({
            handler: () => (isOpen = false),
            ignore: triggerEl,
        })}
    >
        Trigger clicks are ignored
    </div>
{/if}`;

    const ignoreSelectorCode = `<div
    {@attach clickOutside({
        handler: () => (isOpen = false),
        ignore: [triggerEl, ".safe-zone"],
    })}
>
    Protected from .safe-zone clicks
</div>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="clickOutside"
        description="Detects pointer clicks outside an element with support for ignored triggers and CSS selectors."
    />

    <PreviewSection
        title="Wrapper Pattern"
        description="Attach directly to a container wrapping both the trigger and its content."
        code={wrapperCode}
    >
        <div
            class="flex-center flex-col gap-3 w-full max-w-xs"
            {@attach clickOutside(() => (isBasicOpen = false))}
        >
            <ToggleButton variant="soft" color="accent" size="md" bind:pressed={isBasicOpen}>
                <ToggleButtonLabel>{isBasicOpen ? "Close" : "Open"}</ToggleButtonLabel>
            </ToggleButton>

            {#if isBasicOpen}
                <div
                    class="w-full h-12 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-2xl squircle-soft text-xs font-medium text-strong select-none"
                >
                    Active (click outside to dismiss)
                </div>
            {/if}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Ignore Element"
        description="Exclude a separate trigger element so clicking it does not immediately close and reopen."
        code={ignoreElementCode}
    >
        <div class="flex-center flex-col gap-3 w-full max-w-xs">
            <div bind:this={triggerButtonEl}>
                <ToggleButton variant="soft" color="accent" size="md" bind:pressed={isIgnoreElementOpen}>
                    <ToggleButtonLabel>{isIgnoreElementOpen ? "Close" : "Open"}</ToggleButtonLabel>
                </ToggleButton>
            </div>

            {#if isIgnoreElementOpen}
                <div
                    class="w-full h-12 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-2xl squircle-soft text-xs font-medium text-strong select-none"
                    {@attach clickOutside({
                        handler: () => (isIgnoreElementOpen = false),
                        ignore: triggerButtonEl,
                    })}
                >
                    Protected from trigger
                </div>
            {/if}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Ignore Selector"
        description="Pass CSS selectors or element arrays to keep external safe zones interactive."
        code={ignoreSelectorCode}
    >
        <div class="flex-center flex-col gap-3 w-full max-w-xs">
            <div class="flex-center gap-3 w-full">
                <div bind:this={selectorTriggerEl}>
                    <ToggleButton variant="soft" color="accent" size="md" bind:pressed={isSelectorOpen}>
                        <ToggleButtonLabel>{isSelectorOpen ? "Close" : "Open"}</ToggleButtonLabel>
                    </ToggleButton>
                </div>

                <div
                    class="safe-zone h-9 px-3.5 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-full squircle text-xs text-weak select-none hover:text-strong transition-colors"
                >
                    .safe-zone
                </div>
            </div>

            {#if isSelectorOpen}
                <div
                    class="w-full h-12 flex-center border border-dashed border-base-300 dark:border-base-700 rounded-2xl squircle-soft text-xs font-medium text-strong select-none"
                    {@attach clickOutside({
                        handler: () => (isSelectorOpen = false),
                        ignore: [selectorTriggerEl, ".safe-zone"],
                    })}
                >
                    Protected from .safe-zone
                </div>
            {/if}
        </div>
    </PreviewSection>
</div>
