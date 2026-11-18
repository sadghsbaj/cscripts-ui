<script lang="ts">
    import { createSurfaceRadius } from "../../shared/surface-radius/index.ts";
    import { setKpiCardContext, type KpiCardProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        layout = "stack",
        class: className,
        children,
        ...rest
    }: KpiCardProps = $props();

    const surfaceRadius = createSurfaceRadius(() => size);

    setKpiCardContext({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get layout() {
            return layout;
        },
        get nested() {
            return surfaceRadius.isNested;
        },
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-kpi-card", className]}
    data-variant={variant}
    data-size={size}
    data-layout={layout}
    data-nested={surfaceRadius.isNested ? "" : undefined}
    style:--cs-kpi-card-nested-radius={surfaceRadius.nestedRadius}
>
    {#if layout === "split"}
        <!-- Inner grid wrapper lets split query its ancestor .cs-kpi-card inline-size container. -->
        <div class="cs-kpi-card-split">
            {@render children?.()}
        </div>
    {:else}
        {@render children?.()}
    {/if}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card {
            --cs-kpi-card-fg: var(--cs-color-text-main);
            --cs-kpi-card-affix-fg: var(--cs-color-text-weak);
            --cs-kpi-card-inner-radius: max(
                var(--cs-kpi-card-inner-radius-base, var(--cs-radius-lg)),
                calc(var(--cs-kpi-card-radius) - var(--cs-kpi-card-padding))
            );
            isolation: isolate;

            position: relative;
            display: grid;
            grid-template-columns: [main-start] minmax(0, 1fr) [main-end];
            gap: var(--cs-kpi-card-gap);
            align-content: start;
            inline-size: 100%;
            block-size: auto;
            padding: var(--cs-kpi-card-padding);
            overflow: clip;
            color: var(--cs-kpi-card-fg);
            font-family: var(--cs-font-sans);
            background-color: var(--cs-kpi-card-bg);
            border-radius: var(--cs-kpi-card-radius);
            corner-shape: var(--cs-kpi-card-squircle, var(--cs-squircle));
            box-shadow: var(--cs-kpi-card-shadow, none);

            /* =========================================================
             * SIZES (1:1 shell parity with Card)
             * ========================================================= */
            &[data-size="sm"] {
                --cs-kpi-card-padding: 12px;
                --cs-kpi-card-gap: 8px;
                --cs-kpi-card-header-gap: 2px;
                --cs-kpi-card-header-col-gap: 6px;
                --cs-kpi-card-section-gap: 8px;
                --cs-kpi-card-radius: var(--cs-radius-2xl);
                --cs-kpi-card-inner-radius-base: var(--cs-radius-lg);
                --cs-kpi-card-close-offset: 8px;
                --cs-kpi-card-close-size: 16px;
                --cs-kpi-card-label-size: var(--cs-text-xs);
                --cs-kpi-card-label-lh: 16px;
                --cs-kpi-card-comparison-size: 11px;
                --cs-kpi-card-comparison-lh: 15px;
                --cs-kpi-card-value-size: 22px;
                --cs-kpi-card-value-lh: 26px;
                --cs-kpi-card-value-tracking: -0.025em;
                --cs-kpi-card-value-affix-gap: 3px;
                --cs-kpi-card-icon-size: 14px;
                --cs-kpi-card-delta-height: 20px;
                --cs-kpi-card-delta-px: 6px;
                --cs-kpi-card-delta-font-size: 11px;
                --cs-kpi-card-delta-icon-size: 12px;
                --cs-kpi-card-delta-gap: 3px;
                --cs-kpi-card-delta-dot-size: 6px;
                --cs-kpi-card-visual-inline-size: 104px;
                --cs-kpi-card-visual-inline-block-size: 24px;
                --cs-kpi-card-visual-min-block-size: 40px;
                --cs-kpi-card-visual-padding: 8px;
                --cs-kpi-card-breakdown-padding: 8px;
                --cs-kpi-card-breakdown-gap: 6px;
                --cs-kpi-card-breakdown-font-size: var(--cs-text-xs);
                --cs-kpi-card-breakdown-row-height: 24px;
                --cs-kpi-card-ornament-size: 88px;
                --cs-kpi-card-group-gap: 8px;
            }

            &[data-size="md"] {
                --cs-kpi-card-padding: 16px;
                --cs-kpi-card-gap: 12px;
                --cs-kpi-card-header-gap: 3px;
                --cs-kpi-card-header-col-gap: 8px;
                --cs-kpi-card-section-gap: 12px;
                --cs-kpi-card-radius: var(--cs-radius-3xl);
                --cs-kpi-card-inner-radius-base: 10px;
                --cs-kpi-card-close-offset: 10px;
                --cs-kpi-card-close-size: 24px;
                --cs-kpi-card-label-size: 13px;
                --cs-kpi-card-label-lh: 18px;
                --cs-kpi-card-comparison-size: var(--cs-text-xs);
                --cs-kpi-card-comparison-lh: 16px;
                --cs-kpi-card-value-size: 28px;
                --cs-kpi-card-value-lh: 32px;
                --cs-kpi-card-value-tracking: -0.028em;
                --cs-kpi-card-value-affix-gap: 3px;
                --cs-kpi-card-icon-size: 16px;
                --cs-kpi-card-delta-height: 24px;
                --cs-kpi-card-delta-px: 8px;
                --cs-kpi-card-delta-font-size: var(--cs-text-xs);
                --cs-kpi-card-delta-icon-size: 14px;
                --cs-kpi-card-delta-gap: 4px;
                --cs-kpi-card-delta-dot-size: 6px;
                --cs-kpi-card-visual-inline-size: 144px;
                --cs-kpi-card-visual-inline-block-size: 28px;
                --cs-kpi-card-visual-min-block-size: 52px;
                --cs-kpi-card-visual-padding: 10px;
                --cs-kpi-card-breakdown-padding: 10px;
                --cs-kpi-card-breakdown-gap: 8px;
                --cs-kpi-card-breakdown-font-size: 13px;
                --cs-kpi-card-breakdown-row-height: 28px;
                --cs-kpi-card-ornament-size: 104px;
                --cs-kpi-card-group-gap: 12px;
            }

            &[data-size="lg"] {
                --cs-kpi-card-padding: 24px;
                --cs-kpi-card-gap: 16px;
                --cs-kpi-card-header-gap: 4px;
                --cs-kpi-card-header-col-gap: 10px;
                --cs-kpi-card-section-gap: 16px;
                --cs-kpi-card-radius: 28px;
                --cs-kpi-card-inner-radius-base: 12px;
                --cs-kpi-card-close-offset: 12px;
                --cs-kpi-card-close-size: 32px;
                --cs-kpi-card-label-size: var(--cs-text-sm);
                --cs-kpi-card-label-lh: 20px;
                --cs-kpi-card-comparison-size: 13px;
                --cs-kpi-card-comparison-lh: 18px;
                --cs-kpi-card-value-size: 34px;
                --cs-kpi-card-value-lh: 38px;
                --cs-kpi-card-value-tracking: -0.03em;
                --cs-kpi-card-value-affix-gap: 4px;
                --cs-kpi-card-icon-size: 18px;
                --cs-kpi-card-delta-height: 24px;
                --cs-kpi-card-delta-px: 8px;
                --cs-kpi-card-delta-font-size: var(--cs-text-xs);
                --cs-kpi-card-delta-icon-size: 14px;
                --cs-kpi-card-delta-gap: 4px;
                --cs-kpi-card-delta-dot-size: 6px;
                --cs-kpi-card-visual-inline-size: 192px;
                --cs-kpi-card-visual-inline-block-size: 32px;
                --cs-kpi-card-visual-min-block-size: 68px;
                --cs-kpi-card-visual-padding: 12px;
                --cs-kpi-card-breakdown-padding: 12px;
                --cs-kpi-card-breakdown-gap: 10px;
                --cs-kpi-card-breakdown-font-size: 13px;
                --cs-kpi-card-breakdown-row-height: 32px;
                --cs-kpi-card-ornament-size: 124px;
                --cs-kpi-card-group-gap: 12px;
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="elevated"] {
                --cs-kpi-card-bg: var(--cs-color-elevated);
                --cs-kpi-card-shadow: var(--cs-shadow-elevated);
                --cs-kpi-card-soft-guard-bg: var(--cs-color-base-soft);
            }

            &[data-variant="soft"] {
                --cs-kpi-card-bg: var(--cs-color-base-soft);
                --cs-kpi-card-shadow: none;
                --cs-kpi-card-soft-guard-bg: var(--cs-color-base-soft-hover);
            }

            &[data-variant="sunken"] {
                --cs-kpi-card-bg: var(--cs-color-sunken);
                --cs-kpi-card-shadow: var(--cs-shadow-sunken);
                --cs-kpi-card-soft-guard-bg: var(--cs-color-base-soft);
            }

            &[data-variant="transparent"] {
                --cs-kpi-card-bg: transparent;
                --cs-kpi-card-shadow: none;
                --cs-kpi-card-soft-guard-bg: var(--cs-color-base-soft);
            }

            /* =========================================================
             * LAYOUT: HERO
             * ========================================================= */
            &[data-layout="hero"] {
                --cs-kpi-card-value-tracking: var(--cs-tracking-tighter);

                gap: var(--cs-kpi-card-section-gap);

                &[data-size="sm"] {
                    --cs-kpi-card-section-gap: 12px;
                    --cs-kpi-card-value-size: 26px;
                    --cs-kpi-card-value-lh: 30px;
                }

                &[data-size="md"] {
                    --cs-kpi-card-section-gap: 16px;
                    --cs-kpi-card-value-size: 32px;
                    --cs-kpi-card-value-lh: 36px;
                }

                &[data-size="lg"] {
                    --cs-kpi-card-section-gap: 20px;
                    --cs-kpi-card-value-size: 40px;
                    --cs-kpi-card-value-lh: 44px;
                }
            }

            /* =========================================================
             * CONCENTRIC NESTING & INLINE VALUE STEP-DOWN
             * ========================================================= */
            &[data-nested] {
                --cs-kpi-card-radius: var(--cs-kpi-card-nested-radius);
                --cs-kpi-card-inner-radius-base: var(--cs-radius-lg);
                --cs-kpi-card-delta-height: 20px;
                --cs-kpi-card-delta-px: 6px;
                --cs-kpi-card-delta-font-size: 11px;
                --cs-kpi-card-delta-icon-size: 12px;
                --cs-kpi-card-delta-gap: 3px;
                corner-shape: var(--cs-squircle-smooth);
            }

            &:is([data-layout="inline"], [data-nested]) {
                --cs-kpi-card-value-tracking: var(--cs-tracking-tight);

                &[data-size="sm"] {
                    --cs-kpi-card-value-size: 18px;
                    --cs-kpi-card-value-lh: 22px;
                }

                &[data-size="md"] {
                    --cs-kpi-card-value-size: 20px;
                    --cs-kpi-card-value-lh: 24px;
                }

                &[data-size="lg"] {
                    --cs-kpi-card-value-size: 24px;
                    --cs-kpi-card-value-lh: 28px;
                }
            }

            /* =========================================================
             * STACK & HERO: SIDE VISUAL TRACKS & FLOW PLACEMENT
             * ========================================================= */
            &:is([data-layout="stack"], [data-layout="hero"]) {
                &:has(> :global(.cs-kpi-card-visual[data-placement="start"])) {
                    grid-template-columns: [start-start] auto [start-end main-start] minmax(0, 1fr) [main-end];
                    align-content: stretch;

                    & > :global(.cs-kpi-card-visual[data-bleed]:is([data-placement="top"], [data-placement="bottom"])) {
                        --cs-kpi-card-visual-bleed-start: 0px;
                    }
                }

                &:has(> :global(.cs-kpi-card-visual[data-placement="end"])) {
                    grid-template-columns: [main-start] minmax(0, 1fr) [main-end end-start] auto [end-end];
                    align-content: stretch;

                    & > :global(.cs-kpi-card-visual[data-bleed]:is([data-placement="top"], [data-placement="bottom"])) {
                        --cs-kpi-card-visual-bleed-end: 0px;
                    }
                }

                &:has(> :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"]))) {
                    grid-template-rows: minmax(auto, 1fr);

                    &:has(
                        > :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                            ~ :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                    ) {
                        grid-template-rows: auto minmax(auto, 1fr);
                    }

                    &:has(
                        > :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                            ~ :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                            ~ :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                    ) {
                        grid-template-rows: auto auto minmax(auto, 1fr);
                    }

                    &:has(
                        > :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                            ~ :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                            ~ :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                            ~ :global(
                                :not(
                                    .cs-kpi-card-ornament,
                                    .cs-kpi-card-close,
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )
                            )
                    ) {
                        grid-template-rows: auto auto auto minmax(auto, 1fr);
                    }
                }

                &
                    > :global(
                        :not(
                            .cs-kpi-card-ornament,
                            .cs-kpi-card-close,
                            .cs-kpi-card-visual[data-placement="start"],
                            .cs-kpi-card-visual[data-placement="end"]
                        )
                    ) {
                    position: relative;
                    z-index: 1;
                    grid-column: main-start / main-end;
                    min-inline-size: 0;
                }

                & > :global(.cs-kpi-card-visual[data-placement="top"]) {
                    order: -2;
                }

                & > :global(.cs-kpi-card-header) {
                    align-self: start;
                    order: -1;
                }

                & > :global(.cs-kpi-card-footer) {
                    align-self: end;
                    order: 1;
                }

                & > :global(.cs-kpi-card-visual[data-placement="bottom"]) {
                    order: 2;
                }

                & > :global(.cs-kpi-card-visual[data-placement="start"]) {
                    position: relative;
                    z-index: 1;
                    grid-row: 1 / -1;
                    grid-column: start-start / start-end;
                    inline-size: var(--cs-kpi-card-visual-inline-size, 144px);
                }

                & > :global(.cs-kpi-card-visual[data-placement="end"]) {
                    position: relative;
                    z-index: 1;
                    grid-row: 1 / -1;
                    grid-column: end-start / end-end;
                    inline-size: var(--cs-kpi-card-visual-inline-size, 144px);
                }

                &:has(> :global(.cs-kpi-card-close)):not(:has(> :global(.cs-kpi-card-visual[data-placement="end"])))
                    > :global(.cs-kpi-card-header) {
                    padding-inline-end: calc(var(--cs-kpi-card-close-size, 24px) + var(--cs-kpi-card-close-offset));
                }
            }

            /* =========================================================
             * LAYOUT: INLINE
             * ========================================================= */
            &[data-layout="inline"] {
                --cs-kpi-card-visual-inline-size: 72px;

                grid-template-columns: [main-start] minmax(0, 1fr) [main-end metric-start] auto [metric-end];
                row-gap: var(--cs-kpi-card-gap);
                column-gap: var(--cs-kpi-card-gap);
                align-items: center;

                &:has(> :global(.cs-kpi-card-value)):has(> :global(.cs-kpi-card-delta)) {
                    grid-template-columns:
                        [main-start] minmax(0, 1fr) [main-end metric-start] auto [metric-mid] auto
                        [metric-end];
                }

                &:has(> :global(.cs-kpi-card-visual[data-placement="start"])) {
                    grid-template-columns:
                        [start-start] auto [start-end main-start] minmax(0, 1fr)
                        [main-end metric-start] auto [metric-end];

                    &:has(> :global(.cs-kpi-card-value)):has(> :global(.cs-kpi-card-delta)) {
                        grid-template-columns:
                            [start-start] auto [start-end main-start] minmax(0, 1fr)
                            [main-end metric-start] auto [metric-mid] auto [metric-end];
                    }
                }

                &:has(> :global(.cs-kpi-card-visual[data-placement="end"])) {
                    grid-template-columns:
                        [main-start] minmax(0, 1fr) [main-end metric-start] auto [metric-end end-start] auto
                        [end-end];

                    &:has(> :global(.cs-kpi-card-value)):has(> :global(.cs-kpi-card-delta)) {
                        grid-template-columns:
                            [main-start] minmax(0, 1fr) [main-end metric-start] auto [metric-mid] auto
                            [metric-end end-start] auto [end-end];
                    }
                }

                & > :global(:not(.cs-kpi-card-ornament, .cs-kpi-card-close)) {
                    position: relative;
                    z-index: 1;
                    min-inline-size: 0;
                }

                & > :global(.cs-kpi-card-visual[data-placement="top"]) {
                    grid-row: 1;
                    grid-column: 1 / -1;
                }

                & > :global(.cs-kpi-card-header) {
                    grid-row: 1;
                    grid-column: main-start / main-end;
                    align-self: center;
                }

                & > :global(.cs-kpi-card-comparison) {
                    grid-row: 2;
                    grid-column: main-start / main-end;
                    align-self: start;
                    margin-block-start: calc(var(--cs-kpi-card-header-gap) - var(--cs-kpi-card-gap));
                }

                & > :global(.cs-kpi-card-metric) {
                    grid-row: 1;
                    grid-column: metric-start / metric-end;
                    align-self: center;
                    justify-self: end;
                }

                & > :global(.cs-kpi-card-value) {
                    grid-row: 1;
                    grid-column: metric-start / metric-end;
                    align-self: center;
                    justify-self: end;
                }

                & > :global(.cs-kpi-card-delta) {
                    grid-row: 1;
                    grid-column: metric-start / metric-end;
                    align-self: center;
                    justify-self: end;
                }

                &:has(> :global(.cs-kpi-card-value)):has(> :global(.cs-kpi-card-delta)) {
                    & > :global(.cs-kpi-card-value) {
                        grid-column: metric-start / metric-mid;
                    }

                    & > :global(.cs-kpi-card-delta) {
                        grid-column: metric-mid / metric-end;
                    }
                }

                &:has(> :global(.cs-kpi-card-comparison)) {
                    & > :global(:is(.cs-kpi-card-metric, .cs-kpi-card-value, .cs-kpi-card-delta)) {
                        grid-row: 1 / span 2;
                    }
                }

                &:has(> :global(.cs-kpi-card-visual[data-placement="top"])) {
                    & > :global(.cs-kpi-card-header),
                    & > :global(:is(.cs-kpi-card-metric, .cs-kpi-card-value, .cs-kpi-card-delta)) {
                        grid-row: 2;
                    }

                    & > :global(.cs-kpi-card-comparison) {
                        grid-row: 3;
                    }

                    &:has(> :global(.cs-kpi-card-comparison))
                        > :global(:is(.cs-kpi-card-metric, .cs-kpi-card-value, .cs-kpi-card-delta)) {
                        grid-row: 2 / span 2;
                    }
                }

                & > :global(.cs-kpi-card-visual[data-placement="start"]) {
                    grid-row: 1;
                    grid-column: start-start / start-end;
                    align-self: center;
                    inline-size: var(--cs-kpi-card-visual-inline-size, 72px);
                    block-size: var(--cs-kpi-card-visual-inline-block-size, 28px);

                    & > :global(svg) {
                        block-size: 100%;
                        max-block-size: 100%;
                    }
                }

                & > :global(.cs-kpi-card-visual[data-placement="end"]) {
                    grid-row: 1;
                    grid-column: end-start / end-end;
                    align-self: center;
                    inline-size: var(--cs-kpi-card-visual-inline-size, 72px);
                    block-size: var(--cs-kpi-card-visual-inline-block-size, 28px);

                    & > :global(svg) {
                        block-size: 100%;
                        max-block-size: 100%;
                    }
                }

                & > :global(.cs-kpi-card-visual[data-bleed]:is([data-placement="start"], [data-placement="end"])) {
                    align-self: center;
                    margin-block: 0;
                }

                &:has(> :global(.cs-kpi-card-comparison))
                    > :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"])) {
                    grid-row: 1 / span 2;
                }

                &
                    > :global(
                        :is(
                            .cs-kpi-card-target,
                            .cs-kpi-card-breakdown,
                            .cs-kpi-card-body,
                            .cs-kpi-card-actions,
                            .cs-kpi-card-footer,
                            .cs-kpi-card-visual[data-placement="bottom"]
                        )
                    ) {
                    grid-column: 1 / -1;
                }

                &:has(> :global(.cs-kpi-card-close)):not(:has(> :global(.cs-kpi-card-visual[data-placement="end"]))) {
                    & > :global(:is(.cs-kpi-card-metric, .cs-kpi-card-value, .cs-kpi-card-delta)) {
                        padding-inline-end: calc(var(--cs-kpi-card-close-size, 24px) + var(--cs-kpi-card-close-offset));
                    }

                    &:not(:has(> :global(:is(.cs-kpi-card-metric, .cs-kpi-card-value, .cs-kpi-card-delta))))
                        > :global(.cs-kpi-card-header) {
                        padding-inline-end: calc(var(--cs-kpi-card-close-size, 24px) + var(--cs-kpi-card-close-offset));
                    }
                }
            }

            /* =========================================================
             * LAYOUT: SPLIT (Container-Responsive)
             * ========================================================= */
            &[data-layout="split"] {
                container-type: inline-size;
                display: block;

                & > .cs-kpi-card-split {
                    display: grid;
                    grid-template-columns: [main-start] minmax(0, 1fr) [main-end];
                    gap: var(--cs-kpi-card-gap);
                    align-content: start;
                    min-inline-size: 0;
                    block-size: 100%;

                    & > :global(:not(.cs-kpi-card-ornament, .cs-kpi-card-close)) {
                        position: relative;
                        z-index: 1;
                        grid-column: main-start / main-end;
                        min-inline-size: 0;
                    }

                    & > :global(.cs-kpi-card-visual[data-placement="top"]) {
                        order: -2;
                    }

                    & > :global(.cs-kpi-card-header) {
                        align-self: start;
                        order: -1;
                    }

                    & > :global(.cs-kpi-card-footer) {
                        align-self: end;
                        order: 1;
                    }

                    & > :global(.cs-kpi-card-visual[data-placement="bottom"]) {
                        order: 2;
                    }

                    &:where(:has(> :global(.cs-kpi-card-visual[data-placement="end"]))) {
                        grid-template-columns:
                            [main-start] minmax(0, 1fr) [main-end end-start] minmax(
                                var(--cs-kpi-card-visual-inline-size, 144px),
                                42%
                            )
                            [end-end];
                        align-content: stretch;

                        & > :global(.cs-kpi-card-visual[data-placement="end"]) {
                            grid-row: 1 / span 1;
                            grid-column: end-start / end-end;
                            align-self: stretch;
                            order: 0;
                        }
                    }

                    &:where(:has(> :global(.cs-kpi-card-visual[data-placement="start"]))) {
                        grid-template-columns:
                            [start-start] minmax(var(--cs-kpi-card-visual-inline-size, 144px), 42%)
                            [start-end main-start] minmax(0, 1fr) [main-end];
                        align-content: stretch;

                        & > :global(.cs-kpi-card-visual[data-placement="start"]) {
                            grid-row: 1 / span 1;
                            grid-column: start-start / start-end;
                            align-self: stretch;
                            order: 0;
                        }
                    }

                    &:where(:has(> :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"])))) {
                        /* Pin header top and ground the metric (+ optional comparison) to the bottom when no full-width band follows. */
                        &:where(
                            :not(
                                :has(
                                    > :global(
                                        :is(
                                            .cs-kpi-card-target,
                                            .cs-kpi-card-breakdown,
                                            .cs-kpi-card-body,
                                            .cs-kpi-card-actions,
                                            .cs-kpi-card-footer,
                                            .cs-kpi-card-visual[data-placement="top"],
                                            .cs-kpi-card-visual[data-placement="bottom"]
                                        )
                                    )
                                )
                            )
                        ) {
                            &:where(:has(> :global(.cs-kpi-card-header))) {
                                grid-template-rows: auto minmax(0, 1fr);
                            }

                            &:where(:not(:has(> :global(.cs-kpi-card-header)))) {
                                grid-template-rows: minmax(0, 1fr);
                            }

                            &
                                > :global(
                                    :is(
                                        .cs-kpi-card-metric,
                                        .cs-kpi-card-value,
                                        .cs-kpi-card-delta,
                                        .cs-kpi-card-comparison
                                    )
                                ) {
                                align-self: end;
                            }
                        }

                        /* Match side visual row span to the top metric cluster so target/breakdown/footer span 1 / -1 below. */
                        &:where(
                                :has(
                                    > :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                        ~ :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                )
                            )
                            > :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"])) {
                            grid-row: 1 / span 2;
                        }

                        &:where(
                                :has(
                                    > :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                        ~ :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                        ~ :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                )
                            )
                            > :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"])) {
                            grid-row: 1 / span 3;
                        }

                        &:where(
                                :has(
                                    > :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                        ~ :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                        ~ :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                        ~ :global(
                                            :is(
                                                .cs-kpi-card-header,
                                                .cs-kpi-card-metric,
                                                .cs-kpi-card-value,
                                                .cs-kpi-card-delta,
                                                .cs-kpi-card-comparison
                                            )
                                        )
                                )
                            )
                            > :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"])) {
                            grid-row: 1 / span 4;
                        }

                        &
                            > :global(
                                :is(
                                    .cs-kpi-card-target,
                                    .cs-kpi-card-breakdown,
                                    .cs-kpi-card-body,
                                    .cs-kpi-card-actions,
                                    .cs-kpi-card-footer
                                )
                            ) {
                            grid-column: 1 / -1;
                        }

                        &:where(
                                :has(
                                    > :global(
                                        :is(
                                            .cs-kpi-card-target,
                                            .cs-kpi-card-breakdown,
                                            .cs-kpi-card-body,
                                            .cs-kpi-card-actions,
                                            .cs-kpi-card-footer,
                                            .cs-kpi-card-visual[data-placement="bottom"]
                                        )
                                    )
                                )
                            )
                            > :global(
                                :is(
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )[data-bleed]
                            ) {
                            --cs-kpi-card-visual-bleed-bottom: 0px;
                        }

                        &:where(:has(> :global(.cs-kpi-card-visual[data-placement="top"])))
                            > :global(
                                :is(
                                    .cs-kpi-card-visual[data-placement="start"],
                                    .cs-kpi-card-visual[data-placement="end"]
                                )[data-bleed]
                            ) {
                            --cs-kpi-card-visual-bleed-top: 0px;
                        }
                    }

                    &:has(> :global(.cs-kpi-card-close)):not(:has(> :global(.cs-kpi-card-visual[data-placement="end"])))
                        > :global(.cs-kpi-card-header) {
                        padding-inline-end: calc(var(--cs-kpi-card-close-size, 24px) + var(--cs-kpi-card-close-offset));
                    }
                }
            }

            /* =========================================================
             * CORNER CLOSE BUTTON
             * ========================================================= */
            & > :global(.cs-kpi-card-close),
            & > .cs-kpi-card-split > :global(.cs-kpi-card-close) {
                position: absolute;
                inset-block-start: var(--cs-kpi-card-close-offset);
                inset-inline-end: var(--cs-kpi-card-close-offset);
                z-index: 2;
            }
        }

        /* =========================================================
         * SPLIT RESPONSIVE COLLAPSE
         * ========================================================= */
        @container (max-width: 300px) {
            .cs-kpi-card[data-layout="split"]:is([data-size="sm"], [data-size="md"]) > .cs-kpi-card-split {
                grid-template-rows: auto;
                grid-template-columns: [main-start] minmax(0, 1fr) [main-end];
                align-content: start;

                & > :global(:is(.cs-kpi-card-metric, .cs-kpi-card-value, .cs-kpi-card-delta, .cs-kpi-card-comparison)) {
                    align-self: auto;
                }

                & > :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"])) {
                    grid-row: auto;
                    grid-column: main-start / main-end;
                    align-self: auto;
                    order: 0;
                    inline-size: 100%;
                }

                & > :global(.cs-kpi-card-visual[data-bleed]:is([data-placement="start"], [data-placement="end"])) {
                    align-self: auto;
                    margin-block: 0;
                    margin-inline: calc(var(--cs-kpi-card-padding) * -1);
                    inline-size: calc(100% + var(--cs-kpi-card-padding) * 2);
                }

                &:has(> :global(.cs-kpi-card-close)) > :global(.cs-kpi-card-header) {
                    padding-inline-end: calc(var(--cs-kpi-card-close-size, 24px) + var(--cs-kpi-card-close-offset));
                }
            }
        }

        @container (max-width: 360px) {
            .cs-kpi-card[data-layout="split"][data-size="lg"] > .cs-kpi-card-split {
                grid-template-rows: auto;
                grid-template-columns: [main-start] minmax(0, 1fr) [main-end];
                align-content: start;

                & > :global(:is(.cs-kpi-card-metric, .cs-kpi-card-value, .cs-kpi-card-delta, .cs-kpi-card-comparison)) {
                    align-self: auto;
                }

                & > :global(.cs-kpi-card-visual:is([data-placement="start"], [data-placement="end"])) {
                    grid-row: auto;
                    grid-column: main-start / main-end;
                    align-self: auto;
                    order: 0;
                    inline-size: 100%;
                }

                & > :global(.cs-kpi-card-visual[data-bleed]:is([data-placement="start"], [data-placement="end"])) {
                    align-self: auto;
                    margin-block: 0;
                    margin-inline: calc(var(--cs-kpi-card-padding) * -1);
                    inline-size: calc(100% + var(--cs-kpi-card-padding) * 2);
                }

                &:has(> :global(.cs-kpi-card-close)) > :global(.cs-kpi-card-header) {
                    padding-inline-end: calc(var(--cs-kpi-card-close-size, 24px) + var(--cs-kpi-card-close-offset));
                }
            }
        }
    }
</style>
