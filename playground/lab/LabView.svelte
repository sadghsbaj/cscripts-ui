<script lang="ts">
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { theme } from "cs/svelte/theme";
    import { tooltip } from "cs/svelte/tooltip";
    import ToggleButtonSoftCompare from "./ToggleButtonSoftCompare.svelte";
</script>

<div class="size-full relative bg-canvas">
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
        <ScrollAreaContent class="min-h-full flex-center flex-col gap-8 p-8 lg:p-16">
            <ToggleButtonSoftCompare />
        </ScrollAreaContent>
    </ScrollArea>
</div>
