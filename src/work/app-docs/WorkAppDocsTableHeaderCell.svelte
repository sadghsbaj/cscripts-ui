<script lang="ts">
    import type { WorkAppDocsTableHeaderCellProps } from "./index.ts";

    let {
        ref = $bindable(null),
        align = "start",
        scope = "col",
        children,
        class: className,
        ...rest
    }: WorkAppDocsTableHeaderCellProps = $props();
</script>

<th {...rest} bind:this={ref} {scope} data-align={align} class={["cs-work-app-docs-table-header-cell", className]}>
    {@render children?.()}
</th>

<style>
    @layer components.composite {
        .cs-work-app-docs-table-header-cell {
            padding: 9px 16px;
            background-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 2.5%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 4%, transparent)
            );
            box-shadow: inset 0 -1px 0 0 var(--cs-work-app-docs-table-header-divider);
            color: var(--cs-color-text-weak);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.01em;
            text-align: start;
        }

        .cs-work-app-docs-table-header-cell[data-align="center"] {
            text-align: center;
        }

        .cs-work-app-docs-table-header-cell[data-align="end"] {
            text-align: end;
        }
    }
</style>
