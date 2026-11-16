<script lang="ts">
    import type { CardBodyProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CardBodyProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-card-body", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-card-body {
            display: flex;
            flex-direction: column;
            gap: var(--cs-card-gap);
            min-inline-size: 0;
            color: var(--cs-color-text-main);
        }
    }
</style>
