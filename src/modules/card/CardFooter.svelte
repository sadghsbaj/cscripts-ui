<script lang="ts">
    import type { CardFooterProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CardFooterProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-card-footer", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-card-footer {
            display: flex;
            flex-wrap: wrap;
            gap: var(--cs-card-gap);
            align-items: center;
            justify-content: space-between;
            min-inline-size: 0;
        }
    }
</style>
