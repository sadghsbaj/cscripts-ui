<script lang="ts">
    import type { CardTitleProps } from "./index.ts";

    let { ref = $bindable(null), as = "h3", class: className, children, ...rest }: CardTitleProps = $props();
</script>

<svelte:element this={as} bind:this={ref} {...rest} class={["cs-card-title", className]}>
    {@render children?.()}
</svelte:element>

<style>
    @layer components.composite {
        .cs-card-title {
            margin: 0;
            min-inline-size: 0;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-card-title-size, var(--cs-text-base));
            font-weight: 600;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-tight);
        }
    }
</style>
