<script lang="ts">
    import type { KpiCardHeaderProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: KpiCardHeaderProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-kpi-card-header", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-header {
            display: grid;
            grid-template-columns: [header-main-start] minmax(0, 1fr) [header-main-end];
            grid-auto-columns: auto;
            grid-auto-flow: column;
            column-gap: var(--cs-kpi-card-header-col-gap, 8px);
            align-items: center;
            min-inline-size: 0;

            &:has(> :global(.cs-kpi-card-icon:first-child)) {
                grid-template-columns:
                    [header-icon-start] auto [header-icon-end header-main-start] minmax(0, 1fr)
                    [header-main-end];
            }

            &:has(> :global(:not(.cs-kpi-card-icon:first-child, .cs-kpi-card-label))) {
                grid-template-columns:
                    [header-main-start] minmax(0, 1fr) [header-main-end header-end-start] auto
                    [header-end-end];
            }

            &:has(> :global(.cs-kpi-card-icon:first-child)):has(
                    > :global(:not(.cs-kpi-card-icon:first-child, .cs-kpi-card-label))
                ) {
                grid-template-columns:
                    [header-icon-start] auto [header-icon-end header-main-start] minmax(0, 1fr)
                    [header-main-end header-end-start] auto [header-end-end];
            }

            & > :global(.cs-kpi-card-icon:first-child) {
                grid-row: 1;
                grid-column: header-icon-start / header-icon-end;
                align-self: center;
            }

            & > :global(.cs-kpi-card-label) {
                grid-row: 1;
                grid-column: header-main-start / header-main-end;
                align-self: center;
            }

            & > :global(:not(.cs-kpi-card-icon:first-child, .cs-kpi-card-label)) {
                grid-row: 1;
                align-self: center;
                justify-self: end;
            }
        }
    }
</style>
