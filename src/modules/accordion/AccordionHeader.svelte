<script lang="ts">
    import type { AccordionHeaderProps } from "./index.ts";

    let {
        ref = $bindable<HTMLHeadingElement | HTMLDivElement | null>(null),
        as = "h3",
        class: className,
        children,
        ...rest
    }: AccordionHeaderProps = $props();
</script>

<svelte:element this={as} bind:this={ref} {...rest} class={["cs-accordion-header", className]}>
    {@render children?.()}
</svelte:element>

<style>
    @layer components.composite {
        .cs-accordion-header {
            margin: 0;
            font-size: inherit;
            font-weight: inherit;
            line-height: inherit;
        }
    }
</style>
