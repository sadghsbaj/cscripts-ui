<script lang="ts">
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { theme } from "cs/svelte/theme";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";
    import { tooltip } from "cs/svelte/tooltip";

    import ButtonRadiusExperiment from "./ButtonRadiusExperiment.svelte";
    import ButtonSoftExperiment from "./ButtonSoftExperiment.svelte";
    import ModalRadiusExperiment from "./ModalRadiusExperiment.svelte";
    import ToggleRadiusExperiment from "./ToggleRadiusExperiment.svelte";

    let activeExperiment = $state<"soft" | "radius" | "modal" | "toggle-radius">("toggle-radius");
</script>

<div class="size-full relative bg-elevation-0">
    <div class="fixed right-8 top-8 z-100 flex items-center gap-2">
        <Button
            size="md"
            variant="elevated"
            iconOnly
            aria-label="Theme wechseln"
            onclick={() => theme.toggle()}
            {@attach tooltip(`Theme: ${theme.resolved}`)}
        >
            <ButtonIcon icon={theme.resolvedIcon} />
            <HitArea size="md" />
        </Button>
    </div>

    <ScrollArea size="lg" direction="vertical" class="size-full">
        <ScrollAreaContent class="min-h-full flex items-center flex-col gap-8 p-8 lg:p-16">
            <ToggleButtonGroup type="single" orientation="horizontal" bind:value={activeExperiment}>
                <ToggleButton value="soft" variant="soft" color="accent" size="sm">
                    <ToggleButtonLabel>Soft: Farbig vs. Neutral-Base</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton value="radius" variant="soft" color="accent" size="sm">
                    <ToggleButtonLabel>Radius: Pill vs. 10/12/14px</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton value="modal" variant="soft" color="accent" size="sm">
                    <ToggleButtonLabel>Modal: Pill vs. 12px</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton value="toggle-radius" variant="soft" color="accent" size="sm">
                    <ToggleButtonLabel>Toggle: Pill vs. 10/12/14px</ToggleButtonLabel>
                </ToggleButton>
            </ToggleButtonGroup>

            {#if activeExperiment === "soft"}
                <ButtonSoftExperiment />
            {:else if activeExperiment === "radius"}
                <ButtonRadiusExperiment />
            {:else if activeExperiment === "modal"}
                <ModalRadiusExperiment />
            {:else}
                <ToggleRadiusExperiment />
            {/if}
        </ScrollAreaContent>
    </ScrollArea>
</div>
