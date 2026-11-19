<script lang="ts">
    import type { WorkAppDocsTableCellProps } from "./index.ts";

    let {
        ref = $bindable(null),
        align = "start",
        children,
        class: className,
        ...rest
    }: WorkAppDocsTableCellProps = $props();
</script>

<td {...rest} bind:this={ref} data-align={align} class={["cs-work-app-docs-table-cell", className]}>
    {@render children?.()}
</td>

<style>
    @layer components.composite {
        .cs-work-app-docs-table-cell {
            padding: 10px 16px;
            color: var(--cs-color-text-main);
            font-size: 13px;
            line-height: 18px;
            text-align: start;
            vertical-align: top;
        }

        .cs-work-app-docs-table-cell:first-child {
            color: var(--cs-color-text-strong);
            font-weight: 500;
        }

        .cs-work-app-docs-table-cell[data-align="center"] {
            text-align: center;
        }

        .cs-work-app-docs-table-cell[data-align="end"] {
            text-align: end;
        }
    }
</style>
