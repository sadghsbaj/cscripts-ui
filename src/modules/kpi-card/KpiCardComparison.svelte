<script lang="ts">
    import type { KpiCardComparisonProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: KpiCardComparisonProps = $props();
</script>

<p bind:this={ref} {...rest} class={["cs-kpi-card-comparison", className]}>
    {@render children?.()}
</p>

<style>
    @layer components.composite {
        .cs-kpi-card-comparison {
            margin: 0;
            min-inline-size: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-kpi-card-comparison-size, var(--cs-text-xs));
            font-variant-numeric: tabular-nums lining-nums;
            line-height: var(--cs-kpi-card-comparison-lh, 16px);
        }
    }
</style>
