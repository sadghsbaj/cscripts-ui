<script module>
    export const id = "playground";
    export const label = "Playground";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { floating } from "cs/svelte/floating";
</script>

<Button
    class="self-start"
    variant="soft"
    color="base"
    size="md"
    {@attach floating({
        target: "color-picker",
        type: "auto",
        placement: "bottom",
        offset: "0.5rem",
        motion: "scale",
    })}
>
    <ButtonLabel>Test</ButtonLabel>
</Button>

<div id="color-picker">Color Picker</div>

<!-- <div class="size-full flex-center">
    <div class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8">
        <Button
            variant="solid"
            color="accent"
            size="lg"
            class="tooltip-button"
            popovertarget="playground-menu"
            interestfor="playground-tooltip"
        >
            <ButtonLabel>Hover me!</ButtonLabel>
        </Button>
    </div>
</div>

<div
    class="tooltip bg-elevation-1 shadow-elevation-1 rounded-3xl squircle-smooth text-xs font-500 text-main py-1 px-2 leading-snug tracking-tight"
    popover="hint"
    id="playground-tooltip"
    role="tooltip"
>
    Ich bin ein Tooltip!
</div>

<div
    class="menu bg-elevation-1 shadow-elevation-1 rounded-3xl squircle-smooth font-500 text-main p-3 flex flex-col gap-2"
    id="playground-menu"
    popover="auto"
>
    <Button variant="soft" color="base" size="md" class="menu-button">
        <ButtonLabel>Option 1</ButtonLabel>
    </Button>

    <Button variant="soft" color="base" size="md" class="menu-button">
        <ButtonLabel>Option 2</ButtonLabel>
    </Button>

    <Button variant="soft" color="base" size="md" class="menu-button">
        <ButtonLabel>Option 3</ButtonLabel>
    </Button>
</div>

<style>
    :global(.tooltip-button) {
        anchor-name: --anchor-button;
        interest-delay: 400ms 150ms;
    }

    .tooltip {
        position-anchor: --anchor-button;
        position-area: block-start;
        position-try-fallbacks: flip-block flip-inline;
        position-visibility: anchor-visible;
        position: fixed;
        margin: 0.5rem;

        opacity: 0;
        scale: 0.96;

        transition:
            opacity 150ms ease,
            scale 150ms ease,
            display 150ms allow-discrete,
            overlay 150ms allow-discrete;
    }

    .tooltip:popover-open {
        opacity: 1;
        scale: 1;
    }

    @starting-style {
        .tooltip:popover-open {
            opacity: 0;
            scale: 0.96;
        }
    }

    .menu {
        position-anchor: --anchor-button;
        position-area: block-end span-inline-end;
        position-try-fallbacks: flip-block;
        position-visibility: anchor-visible;
        position: fixed;
        margin-block: 0.5rem;
        inline-size: max-content;
        min-inline-size: anchor-size(inline);
        max-inline-size: calc(100vw - 2rem);
        max-block-size: calc(100vh - 2rem);
        overflow: auto;

        /* Geschlossener Zustand */
        opacity: 0;
        scale: 0.96;

        transform-origin: top left;
        transition:
            opacity 180ms ease,
            scale 180ms ease,
            display 180ms allow-discrete,
            overlay 180ms allow-discrete;
    }

    .menu:popover-open {
        opacity: 1;
        scale: 1;
    }

    @starting-style {
        .menu:popover-open {
            opacity: 0;
            scale: 0.96;
        }
    }
</style> -->
