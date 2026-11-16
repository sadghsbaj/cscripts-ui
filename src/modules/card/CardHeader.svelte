<script lang="ts">
    import type { CardHeaderProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CardHeaderProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-card-header", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-card-header {
            display: flex;
            flex-direction: column;
            gap: var(--cs-card-header-gap);
            min-inline-size: 0;
        }
    }
</style>
