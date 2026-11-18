<script lang="ts">
    import type { KpiCardValueProps } from "./index.ts";

    let { ref = $bindable(null), prefix, suffix, class: className, children, ...rest }: KpiCardValueProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-kpi-card-value", className]}>
    {#if prefix}
        <span class="cs-kpi-card-value-prefix">{prefix}</span>
    {/if}
    {@render children?.()}
    {#if suffix}
        <span class="cs-kpi-card-value-suffix">{suffix}</span>
    {/if}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-value {
            --cs-number-morph-char-height: 1.05em;
            --cs-number-morph-mask-height: 0.18em;
            --cs-number-morph-mask-width: 0.35em;
            --cs-number-morph-affix-fg: var(--cs-kpi-card-affix-fg, var(--cs-color-text-weak));

            display: inline-flex;
            align-items: baseline;
            min-inline-size: 0;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-kpi-card-value-size, 28px);
            font-variant-numeric: tabular-nums lining-nums;
            font-weight: var(--cs-kpi-card-value-weight, 600);
            line-height: var(--cs-kpi-card-value-lh, 32px);
            letter-spacing: var(--cs-kpi-card-value-tracking, var(--cs-tracking-tight));
        }

        .cs-kpi-card-value-prefix {
            margin-inline-end: 1px;
            color: var(--cs-kpi-card-affix-fg, var(--cs-color-text-weak));
            font-size: 0.72em;
            font-weight: 500;
            line-height: 1;
        }

        .cs-kpi-card-value-suffix {
            margin-inline-start: var(--cs-kpi-card-value-affix-gap, 3px);
            color: var(--cs-kpi-card-affix-fg, var(--cs-color-text-weak));
            font-size: 0.65em;
            font-weight: 500;
            line-height: 1;
        }
    }
</style>
