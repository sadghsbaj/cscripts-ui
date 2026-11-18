<script lang="ts">
    import { getKpiCardContext, hasKpiCardContext, type KpiCardVisualProps } from "./index.ts";

    let {
        ref = $bindable(null),
        placement,
        variant = "transparent",
        ratio = "auto",
        bleed = false,
        class: className,
        children,
        ...rest
    }: KpiCardVisualProps = $props();

    const kpiCard = hasKpiCardContext() ? getKpiCardContext() : undefined;
    const resolvedPlacement = $derived(
        placement ?? (kpiCard?.layout === "split" || kpiCard?.layout === "inline" ? "end" : "bottom")
    );
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-kpi-card-visual", className]}
    data-placement={resolvedPlacement}
    data-variant={variant}
    data-ratio={ratio === "auto" ? "auto" : undefined}
    data-bleed={bleed ? "" : undefined}
    style:--cs-kpi-card-visual-ratio={ratio === "auto" ? undefined : ratio}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-visual {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            aspect-ratio: var(--cs-kpi-card-visual-ratio, auto);
            min-inline-size: 0;
            overflow: hidden;
            background-color: var(--cs-kpi-card-visual-bg, transparent);
            border-radius: var(--cs-kpi-card-visual-radius, var(--cs-kpi-card-inner-radius));
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-kpi-card-visual-shadow, none);

            &[data-ratio="auto"]:is([data-placement="top"], [data-placement="bottom"]) {
                min-block-size: var(--cs-kpi-card-visual-min-block-size, 52px);
            }

            &:is([data-placement="top"], [data-placement="bottom"]) {
                inline-size: 100%;

                &:not([data-ratio="auto"]) {
                    align-self: start;
                }
            }

            &:is([data-placement="start"], [data-placement="end"]) {
                align-self: start;

                &[data-ratio="auto"] {
                    align-self: stretch;
                }
            }

            &[data-variant="transparent"] {
                --cs-kpi-card-visual-bg: transparent;
                --cs-kpi-card-visual-shadow: none;
            }

            &[data-variant="soft"] {
                --cs-kpi-card-visual-bg: var(--cs-kpi-card-soft-guard-bg, var(--cs-color-base-soft));
                --cs-kpi-card-visual-shadow: none;
                padding: var(--cs-kpi-card-visual-padding, 10px);
            }

            &[data-variant="sunken"] {
                --cs-kpi-card-visual-bg: var(--cs-color-sunken);
                --cs-kpi-card-visual-shadow: var(--cs-shadow-sunken);
                padding: var(--cs-kpi-card-visual-padding, 10px);
            }

            &[data-bleed] {
                border-radius: 0;
                corner-shape: initial;

                &[data-placement="top"] {
                    margin-block-start: calc(var(--cs-kpi-card-padding) * -1);
                    margin-inline-start: var(--cs-kpi-card-visual-bleed-start, calc(var(--cs-kpi-card-padding) * -1));
                    margin-inline-end: var(--cs-kpi-card-visual-bleed-end, calc(var(--cs-kpi-card-padding) * -1));
                    inline-size: calc(
                        100% - var(--cs-kpi-card-visual-bleed-start, calc(var(--cs-kpi-card-padding) * -1)) -
                            var(--cs-kpi-card-visual-bleed-end, calc(var(--cs-kpi-card-padding) * -1))
                    );
                    padding-block-end: 4px;
                }

                &[data-placement="bottom"] {
                    margin-block-end: calc(var(--cs-kpi-card-padding) * -1);
                    margin-inline-start: var(--cs-kpi-card-visual-bleed-start, calc(var(--cs-kpi-card-padding) * -1));
                    margin-inline-end: var(--cs-kpi-card-visual-bleed-end, calc(var(--cs-kpi-card-padding) * -1));
                    inline-size: calc(
                        100% - var(--cs-kpi-card-visual-bleed-start, calc(var(--cs-kpi-card-padding) * -1)) -
                            var(--cs-kpi-card-visual-bleed-end, calc(var(--cs-kpi-card-padding) * -1))
                    );
                    padding-block-start: 4px;
                }

                &[data-placement="start"] {
                    align-self: stretch;
                    margin-block-start: var(--cs-kpi-card-visual-bleed-top, calc(var(--cs-kpi-card-padding) * -1));
                    margin-block-end: var(--cs-kpi-card-visual-bleed-bottom, calc(var(--cs-kpi-card-padding) * -1));
                    margin-inline-start: calc(var(--cs-kpi-card-padding) * -1);
                }

                &[data-placement="end"] {
                    align-self: stretch;
                    margin-block-start: var(--cs-kpi-card-visual-bleed-top, calc(var(--cs-kpi-card-padding) * -1));
                    margin-block-end: var(--cs-kpi-card-visual-bleed-bottom, calc(var(--cs-kpi-card-padding) * -1));
                    margin-inline-end: calc(var(--cs-kpi-card-padding) * -1);
                }
            }

            & > :global(svg) {
                display: block;
                inline-size: 100%;
                max-inline-size: 100%;
            }
        }
    }
</style>
