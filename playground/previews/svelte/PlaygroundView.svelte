<script module>
    export const id = "playground";
    export const label = "Playground";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Popover, popoverTrigger } from "cs/svelte/popover";
    import { Tooltip, tooltip } from "cs/svelte/tooltip";

    const popoverId = "playground-popover";
    const richTooltipId = "playground-rich-tooltip";
</script>

<div class="size-full flex-center">
    <div
        class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px min-w-300px flex-center flex-col gap-3"
    >
        <Button variant="soft" color="base" size="md" {@attach popoverTrigger({ target: popoverId })}>
            <ButtonLabel>Click me!</ButtonLabel>
        </Button>

        <Button
            variant="soft"
            color="base"
            size="md"
            {@attach tooltip({ text: "Schneller Tooltip!", placement: "right" })}
        >
            <ButtonLabel>Hover me!</ButtonLabel>
        </Button>

        <Button variant="soft" color="base" size="md" {@attach tooltip({ target: richTooltipId, placement: "bottom" })}>
            <ButtonLabel>Rich Tooltip</ButtonLabel>
        </Button>
    </div>
</div>

<Popover id={popoverId} class="bg-red-500" size="content" placement="top">TEST</Popover>

<Tooltip id={richTooltipId}>
    <span>Speichern</span> <kbd>⌘S</kbd>
</Tooltip>
