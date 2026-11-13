<script module>
    export const id = "toggle-button-group";
    export const label = "Toggle-Button-Group";
</script>

<script lang="ts">
    import { Bold, Italic, Underline } from "@lucide/svelte";
    import { HitArea } from "cs/svelte/hit-area";
    import {
        TOGGLE_BUTTON_COLORS,
        TOGGLE_BUTTON_VARIANTS,
        ToggleButton,
        ToggleButtonIcon,
        ToggleButtonLabel,
        type ToggleButtonColor,
        type ToggleButtonVariant,
    } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each TOGGLE_BUTTON_VARIANTS as variant (variant)}
            {#each TOGGLE_BUTTON_COLORS as color (color)}
                {@render previewCard(false, variant, color)}
            {/each}
        {/each}

        {@render previewCardToolbar(false)}
    </div>
</div>

{#snippet previewCard(isElevated: boolean, variant: Exclude<ToggleButtonVariant, "elevated">, color: ToggleButtonColor)}
    <div
        class="{!isElevated
            ? 'bg-elevated shadow-elevated'
            : 'bg-canvas'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start px-2 gap-5"
    >
        <h2 class="title-2xl ml-2">
            {variant[0]?.toUpperCase() + variant.slice(1)}
            +
            {color[0]?.toUpperCase() + color.slice(1)}
        </h2>
        <div class="w-full h-full flex flex-col gap-2">
            <div class="flex gap-3 justify-between">
                {let selected = $state<string | undefined>("one")}

                <ToggleButtonGroup type="single" bind:value={selected} orientation="horizontal" allowDeselect>
                    <ToggleButton value="one" size="md" {variant} {color}>
                        <ToggleButtonLabel>Click me!</ToggleButtonLabel>
                    </ToggleButton>
                    <ToggleButtonGroupSeparator />
                    <ToggleButton value="two" size="md" {variant} {color}>
                        <ToggleButtonLabel>Click me!</ToggleButtonLabel>
                    </ToggleButton>
                    <ToggleButtonGroupSeparator />
                    <ToggleButton value="three" size="md" {variant} {color}>
                        <ToggleButtonLabel>Click me!</ToggleButtonLabel>
                    </ToggleButton>
                </ToggleButtonGroup>
            </div>
        </div>
    </div>
{/snippet}

{#snippet previewCardToolbar(isElevated: boolean)}
    <div
        class="{!isElevated
            ? 'bg-elevated shadow-elevated'
            : 'bg-canvas'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start px-2 gap-5"
    >
        <h2 class="title-2xl ml-2">Toolbar</h2>
        <div class="w-full h-full flex flex-col gap-2">
            <div class="flex gap-3 justify-between">
                {let selected = $state<string[]>([])}

                <ToggleButtonGroup type="multiple" bind:value={selected} orientation="horizontal">
                    <ToggleButton value="bold" size="md" variant="soft" color="accent" aria-label="bold" iconOnly>
                        <ToggleButtonIcon icon={Bold} />
                        <HitArea size="lg" />
                    </ToggleButton>
                    <ToggleButtonGroupSeparator />
                    <ToggleButton value="italic" size="md" variant="soft" color="accent" aria-label="italic" iconOnly>
                        <ToggleButtonIcon icon={Italic} />
                        <HitArea size="lg" />
                    </ToggleButton>
                    <ToggleButtonGroupSeparator />
                    <ToggleButton
                        value="underline"
                        size="md"
                        variant="soft"
                        color="accent"
                        aria-label="underline"
                        iconOnly
                    >
                        <ToggleButtonIcon icon={Underline} />
                        <HitArea size="lg" />
                    </ToggleButton>
                </ToggleButtonGroup>

                {JSON.stringify(selected)}
            </div>
        </div>
    </div>
{/snippet}
