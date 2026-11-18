<script lang="ts">
    import type { KpiCardMetricProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: KpiCardMetricProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-kpi-card-metric", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-metric {
            display: flex;
            flex-wrap: wrap;
            row-gap: 6px;
            column-gap: var(--cs-kpi-card-metric-gap, 8px);
            align-items: baseline;
            min-inline-size: 0;
        }

        :global(.cs-kpi-card[data-layout="inline"]) .cs-kpi-card-metric {
            justify-content: flex-end;
        }
    }
</style>
