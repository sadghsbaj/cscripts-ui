<script module>
    export const id = "playground";
    export const label = "Playground";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Popover, popoverTrigger } from "cs/svelte/popover";

    const popoverId = "playground-popover";
</script>

<div class="size-full flex-center">
    <div
        class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px min-w-300px flex-center flex-col gap-3"
    >
        <Button variant="soft" color="base" size="md" {@attach popoverTrigger({ target: popoverId })}>
            <ButtonLabel>Click me!</ButtonLabel>
        </Button>
    </div>
</div>

<Popover id={popoverId} class="bg-red-500" size="content" placement="top">TEST</Popover>
