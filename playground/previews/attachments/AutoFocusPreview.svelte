<script module lang="ts">
    export const id = "auto-focus";
    export const label = "Auto-Focus";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { autoFocus } from "cs/svelte/focus";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let showSelectAll = $state(true);
    let showContainerForm = $state(false);
    let showCursorEnd = $state(false);

    const closeScript = ["</", "script>"].join("");

    const selectAllCode = `<script lang="ts">
    import { autoFocus } from "cs/svelte/focus";
${closeScript}

<input
    type="text"
    value="https://cscripts.dev/components"
    {@attach autoFocus({ select: "all" })}
/>`;

    const containerCode = `<div {@attach autoFocus("first-focusable")}>
    <input type="text" placeholder="First name (focused)" />
    <input type="text" placeholder="Last name" />
</div>`;

    const cursorEndCode = `<input
    type="text"
    value="#todo: "
    {@attach autoFocus({ select: "end", restoreFocus: true })}
/>`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="autoFocus"
        description="Focuses an element or its first focusable descendant on mount with optional text selection and focus restoration."
    />

    <PreviewSection
        title="Select All on Mount"
        description="Focuses the input and selects its full value when mounted."
        code={selectAllCode}
    >
        <div class="flex flex-col gap-3 w-full max-w-sm">
            {#if showSelectAll}
                <input
                    type="text"
                    value="https://cscripts.dev/components"
                    class="bg-sunken shadow-sunken rounded-xl squircle-soft px-3.5 h-36px w-full text-sm outline-none text-main"
                    {@attach autoFocus({ select: "all" })}
                />
            {:else}
                <div class="h-36px flex items-center text-weak text-sm">Unmounted</div>
            {/if}

            <Button
                variant="secondary"
                size="sm"
                class="self-start"
                onclick={() => {
                    showSelectAll = false;
                    setTimeout(() => (showSelectAll = true), 50);
                }}
            >
                <ButtonLabel>Remount</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Container Target"
        description="Attach to a wrapper to automatically focus the first interactive child."
        code={containerCode}
    >
        <div class="flex flex-col gap-3 w-full max-w-sm">
            <ToggleButton variant="soft" color="accent" size="sm" class="self-start" bind:pressed={showContainerForm}>
                <ToggleButtonLabel>{showContainerForm ? "Close form" : "Open form"}</ToggleButtonLabel>
            </ToggleButton>

            {#if showContainerForm}
                <div
                    class="bg-sunken shadow-sunken rounded-2xl squircle-soft p-4 flex flex-col gap-3 w-full"
                    {@attach autoFocus("first-focusable")}
                >
                    <input
                        type="text"
                        placeholder="First name (focused)"
                        class="bg-elevated rounded-xl squircle-soft px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                    />
                    <input
                        type="text"
                        placeholder="Last name"
                        class="bg-elevated rounded-xl squircle-soft px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                    />
                </div>
            {/if}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Cursor at End & Restore Focus"
        description="Places the caret at the end of the text and restores focus to the trigger on unmount."
        code={cursorEndCode}
    >
        <div class="flex flex-col gap-3 w-full max-w-sm">
            <ToggleButton variant="soft" color="accent" size="sm" class="self-start" bind:pressed={showCursorEnd}>
                <ToggleButtonLabel>{showCursorEnd ? "Close note" : "Open note"}</ToggleButtonLabel>
            </ToggleButton>

            {#if showCursorEnd}
                <input
                    type="text"
                    value="#todo: "
                    class="bg-sunken shadow-sunken rounded-xl squircle-soft px-3.5 h-36px w-full text-sm outline-none text-main"
                    {@attach autoFocus({ select: "end", restoreFocus: true })}
                />
            {/if}
        </div>
    </PreviewSection>
</div>
