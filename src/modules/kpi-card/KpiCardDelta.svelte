<script lang="ts">
    import type { Component } from "svelte";
    import { Minus, TrendingDown, TrendingUp } from "@lucide/svelte";

    import {
        getKpiCardContext,
        hasKpiCardContext,
        type KpiCardColor,
        type KpiCardDeltaProps,
        type KpiCardDeltaTrend,
        type KpiCardIconComponentProps,
    } from "./index.ts";

    const TREND_COLOR_MAP: Record<KpiCardDeltaTrend, KpiCardColor> = {
        up: "positive",
        down: "negative",
        flat: "base",
    };

    const TREND_ICON_MAP: Record<KpiCardDeltaTrend, Component<KpiCardIconComponentProps>> = {
        up: TrendingUp,
        down: TrendingDown,
        flat: Minus,
    };

    let {
        ref = $bindable(null),
        trend,
        color,
        variant,
        showIcon = true,
        icon,
        class: className,
        children,
        ...rest
    }: KpiCardDeltaProps = $props();

    const kpiCard = hasKpiCardContext() ? getKpiCardContext() : undefined;
    const resolvedColor = $derived(color ?? (trend ? TREND_COLOR_MAP[trend] : "base"));
    const resolvedVariant = $derived(variant ?? (kpiCard?.layout === "inline" || kpiCard?.nested ? "plain" : "soft"));
    const ResolvedIcon = $derived(icon ?? (trend ? TREND_ICON_MAP[trend] : undefined));
    const hasIcon = $derived(resolvedVariant !== "dot" && showIcon && ResolvedIcon !== undefined);
</script>

<span
    bind:this={ref}
    {...rest}
    class={["cs-kpi-card-delta", className]}
    data-variant={resolvedVariant}
    data-color={resolvedColor}
    data-trend={trend}
>
    {#if resolvedVariant === "dot"}
        <span class="cs-kpi-card-delta-dot" aria-hidden="true"></span>
    {:else if hasIcon && ResolvedIcon}
        <ResolvedIcon class="cs-kpi-card-delta-icon" strokeWidth={2.25} aria-hidden="true" />
    {/if}
    {@render children?.()}
</span>

<style>
    @layer components.composite {
        .cs-kpi-card-delta {
            display: inline-flex;
            gap: var(--cs-kpi-card-delta-gap, 4px);
            align-items: center;
            justify-content: center;
            inline-size: fit-content;
            min-inline-size: 0;
            color: var(--cs-kpi-card-delta-fg);
            font-size: var(--cs-kpi-card-delta-font-size, var(--cs-text-xs));
            font-variant-numeric: tabular-nums lining-nums;
            font-weight: 500;
            line-height: var(--cs-leading-none);
            white-space: nowrap;

            & :global(.cs-kpi-card-delta-icon) {
                flex-shrink: 0;
                inline-size: var(--cs-kpi-card-delta-icon-size, 14px);
                block-size: var(--cs-kpi-card-delta-icon-size, 14px);
                pointer-events: none;
            }

            &[data-variant="soft"] {
                block-size: var(--cs-kpi-card-delta-height, 24px);
                padding-inline: var(--cs-kpi-card-delta-px, 8px);
                background-color: var(--cs-kpi-card-delta-bg);
                border-radius: calc(var(--cs-kpi-card-delta-height, 24px) / 2);
                corner-shape: var(--cs-squircle-soft);

                /* Compensate 1px on the leading edge for optical alignment with Lucide icon viewBox padding. */
                &:has(> :global(.cs-kpi-card-delta-icon):first-child) {
                    padding-inline-start: calc(var(--cs-kpi-card-delta-px, 8px) - 1px);
                }

                &[data-color="base"] {
                    --cs-kpi-card-delta-bg: var(--cs-kpi-card-soft-guard-bg, var(--cs-color-base-soft));
                    --cs-kpi-card-delta-fg: var(--cs-color-base-soft-fg);
                }

                &[data-color="accent"] {
                    --cs-kpi-card-delta-bg: var(--cs-color-accent-soft);
                    --cs-kpi-card-delta-fg: var(--cs-color-accent-soft-fg);
                }

                &[data-color="positive"] {
                    --cs-kpi-card-delta-bg: var(--cs-color-positive-soft);
                    --cs-kpi-card-delta-fg: var(--cs-color-positive-soft-fg);
                }

                &[data-color="caution"] {
                    --cs-kpi-card-delta-bg: var(--cs-color-caution-soft);
                    --cs-kpi-card-delta-fg: var(--cs-color-caution-soft-fg);
                }

                &[data-color="negative"] {
                    --cs-kpi-card-delta-bg: var(--cs-color-negative-soft);
                    --cs-kpi-card-delta-fg: var(--cs-color-negative-soft-fg);
                }
            }

            &[data-variant="plain"] {
                background-color: transparent;

                &[data-color="base"] {
                    --cs-kpi-card-delta-fg: var(--cs-color-text-weak);
                }

                &[data-color="accent"] {
                    --cs-kpi-card-delta-fg: var(--cs-color-accent-soft-fg);
                }

                &[data-color="positive"] {
                    --cs-kpi-card-delta-fg: var(--cs-color-positive-soft-fg);
                }

                &[data-color="caution"] {
                    --cs-kpi-card-delta-fg: var(--cs-color-caution-soft-fg);
                }

                &[data-color="negative"] {
                    --cs-kpi-card-delta-fg: var(--cs-color-negative-soft-fg);
                }
            }

            &[data-variant="dot"] {
                --cs-kpi-card-delta-fg: var(--cs-color-text-main);
                background-color: transparent;

                &[data-color="base"] {
                    --cs-kpi-card-delta-dot-bg: var(--cs-color-text-weak);
                }

                &[data-color="accent"] {
                    --cs-kpi-card-delta-dot-bg: var(--cs-color-accent-solid);
                }

                &[data-color="positive"] {
                    --cs-kpi-card-delta-dot-bg: var(--cs-color-positive-solid);
                }

                &[data-color="caution"] {
                    --cs-kpi-card-delta-dot-bg: var(--cs-color-caution-solid);
                }

                &[data-color="negative"] {
                    --cs-kpi-card-delta-dot-bg: var(--cs-color-negative-solid);
                }
            }
        }

        .cs-kpi-card-delta-dot {
            flex-shrink: 0;
            inline-size: var(--cs-kpi-card-delta-dot-size, 6px);
            block-size: var(--cs-kpi-card-delta-dot-size, 6px);
            background-color: var(--cs-kpi-card-delta-dot-bg);
            border-radius: var(--cs-radius-full);
        }
    }
</style>
