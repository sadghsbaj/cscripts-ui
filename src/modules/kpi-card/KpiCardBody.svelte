<script lang="ts">
    import type { KpiCardBodyProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: KpiCardBodyProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-kpi-card-body", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-body {
            display: flex;
            flex-direction: column;
            gap: var(--cs-kpi-card-gap);
            min-inline-size: 0;
            color: var(--cs-color-text-main);
        }
    }
</style>
