<script lang="ts">
    import type { KpiCardFooterProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: KpiCardFooterProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-kpi-card-footer", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-footer {
            display: flex;
            flex-wrap: wrap;
            gap: var(--cs-kpi-card-gap);
            align-items: center;
            justify-content: space-between;
            min-inline-size: 0;
        }
    }
</style>
