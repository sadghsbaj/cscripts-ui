<script lang="ts">
    import type { KpiCardBreakdownItemProps } from "./index.ts";

    let {
        ref = $bindable(null),
        label,
        value,
        share,
        dotColor,
        class: className,
        children,
        ...rest
    }: KpiCardBreakdownItemProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-kpi-card-breakdown-item", className]} data-dot-color={dotColor}>
    {#if label !== undefined || dotColor !== undefined}
        <span class="cs-kpi-card-breakdown-label">
            {#if dotColor !== undefined}
                <span class="cs-kpi-card-breakdown-dot" aria-hidden="true"></span>
            {/if}
            {#if label !== undefined}
                <span class="cs-kpi-card-breakdown-label-text">{label}</span>
            {/if}
        </span>
    {/if}

    {#if value !== undefined || share !== undefined}
        <span class="cs-kpi-card-breakdown-end">
            {#if value !== undefined}
                <span class="cs-kpi-card-breakdown-value">{value}</span>
            {/if}
            {#if share !== undefined}
                <span class="cs-kpi-card-breakdown-share">{share}</span>
            {/if}
        </span>
    {/if}

    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-breakdown-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-inline-size: 0;

            &[data-dot-color="base"] {
                --cs-kpi-card-breakdown-dot-bg: var(--cs-color-text-weak);
            }

            &[data-dot-color="accent"] {
                --cs-kpi-card-breakdown-dot-bg: var(--cs-color-accent-solid);
            }

            &[data-dot-color="positive"] {
                --cs-kpi-card-breakdown-dot-bg: var(--cs-color-positive-solid);
            }

            &[data-dot-color="caution"] {
                --cs-kpi-card-breakdown-dot-bg: var(--cs-color-caution-solid);
            }

            &[data-dot-color="negative"] {
                --cs-kpi-card-breakdown-dot-bg: var(--cs-color-negative-solid);
            }
        }

        :global(.cs-kpi-card-breakdown[data-columns="1"]) .cs-kpi-card-breakdown-item {
            flex-direction: row;
            gap: 8px;
            align-items: center;
            justify-content: space-between;
            min-block-size: var(--cs-kpi-card-breakdown-row-height, 28px);
            padding-block: 4px;
        }

        .cs-kpi-card-breakdown-label {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            min-inline-size: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-kpi-card-breakdown-font-size, 13px);
            line-height: var(--cs-leading-snug);
        }

        .cs-kpi-card-breakdown-label-text {
            min-inline-size: 0;
            overflow-wrap: break-word;
        }

        .cs-kpi-card-breakdown-dot {
            flex-shrink: 0;
            inline-size: 6px;
            block-size: 6px;
            background-color: var(--cs-kpi-card-breakdown-dot-bg);
            border-radius: var(--cs-radius-full);
        }

        .cs-kpi-card-breakdown-end {
            display: inline-flex;
            flex-shrink: 0;
            gap: 6px;
            align-items: baseline;
        }

        .cs-kpi-card-breakdown-value {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-kpi-card-breakdown-font-size, 13px);
            font-variant-numeric: tabular-nums lining-nums;
            font-weight: 500;
            line-height: var(--cs-leading-snug);
        }

        .cs-kpi-card-breakdown-share {
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            font-variant-numeric: tabular-nums lining-nums;
            line-height: var(--cs-leading-snug);
        }
    }
</style>
