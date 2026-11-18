<script lang="ts">
    import { getKpiCardContext, hasKpiCardContext, type KpiCardIconProps } from "./index.ts";

    let { ref = $bindable(null), icon: Icon, color = "base", strokeWidth, class: className, ...rest }: KpiCardIconProps = $props();

    const kpiCard = hasKpiCardContext() ? getKpiCardContext() : undefined;
    const resolvedStrokeWidth = $derived(strokeWidth ?? (kpiCard?.size === "lg" ? 2 : 2.25));
</script>

<span bind:this={ref} aria-hidden="true" {...rest} class={["cs-kpi-card-icon", className]} data-color={color}>
    <Icon strokeWidth={resolvedStrokeWidth} />
</span>

<style>
    @layer components.composite {
        .cs-kpi-card-icon {
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            inline-size: var(--cs-kpi-card-icon-size, 16px);
            block-size: var(--cs-kpi-card-icon-size, 16px);
            color: var(--cs-kpi-card-icon-fg);
            pointer-events: none;

            & > :global(svg) {
                inline-size: var(--cs-kpi-card-icon-size, 16px);
                block-size: var(--cs-kpi-card-icon-size, 16px);
            }

            &[data-color="base"] {
                --cs-kpi-card-icon-fg: var(--cs-color-text-weak);
            }

            &[data-color="accent"] {
                --cs-kpi-card-icon-fg: var(--cs-color-accent-soft-fg);
            }

            &[data-color="positive"] {
                --cs-kpi-card-icon-fg: var(--cs-color-positive-soft-fg);
            }

            &[data-color="caution"] {
                --cs-kpi-card-icon-fg: var(--cs-color-caution-soft-fg);
            }

            &[data-color="negative"] {
                --cs-kpi-card-icon-fg: var(--cs-color-negative-soft-fg);
            }
        }
    }
</style>
