<script lang="ts">
    import type { KpiCardLabelProps } from "./index.ts";

    let { ref = $bindable(null), as = "h3", class: className, children, ...rest }: KpiCardLabelProps = $props();
</script>

<svelte:element this={as} bind:this={ref} {...rest} class={["cs-kpi-card-label", className]}>
    {@render children?.()}
</svelte:element>

<style>
    @layer components.composite {
        .cs-kpi-card-label {
            text-wrap: balance;
            margin: 0;
            min-inline-size: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-kpi-card-label-size, 13px);
            font-weight: 500;
            line-height: var(--cs-kpi-card-label-lh, 18px);
            overflow-wrap: break-word;
        }

        :global(.cs-kpi-card[data-layout="inline"]) .cs-kpi-card-label {
            text-wrap: initial;
            overflow-x: clip;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
</style>
