<script lang="ts">
    import type { WorkAppDocsTableProps } from "./index.ts";

    let { ref = $bindable(null), caption, children, class: className, ...rest }: WorkAppDocsTableProps = $props();
</script>

<div {...rest} bind:this={ref} class={["cs-work-app-docs-table-wrap", className]}>
    <table class="cs-work-app-docs-table">
        {#if caption}
            <caption class="cs-work-app-docs-table-caption">{caption}</caption>
        {/if}
        {@render children?.()}
    </table>
</div>

<style>
    @layer components.composite {
        .cs-work-app-docs-table-wrap {
            --cs-work-app-docs-table-header-divider: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 8.5%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 11%, transparent)
            );
            --cs-work-app-docs-table-divider: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 5.5%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 7%, transparent)
            );

            margin-block: 20px;
            overflow-x: auto;
            border-radius: var(--cs-radius-2xl);
            corner-shape: var(--cs-squircle);
            background-color: var(--cs-color-elevated);
            box-shadow: var(--cs-shadow-elevated);
        }

        .cs-work-app-docs-table {
            width: 100%;
            border-collapse: collapse;
            text-align: start;
            font-variant-numeric: tabular-nums;
        }

        .cs-work-app-docs-table-caption {
            padding: 12px 16px 8px;
            color: var(--cs-color-text-weak);
            font-size: 12px;
            font-weight: 600;
            text-align: start;
        }

        .cs-work-app-docs-table :global(tbody tr:not(:last-child) td) {
            box-shadow: inset 0 -1px 0 0 var(--cs-work-app-docs-table-divider);
        }
    }
</style>
