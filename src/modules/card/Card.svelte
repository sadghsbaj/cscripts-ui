<script lang="ts">
    import { createSurfaceRadius } from "../../shared/surface-radius/index.ts";
    import { setCardContext, type CardProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        orientation = "vertical",
        class: className,
        children,
        ...rest
    }: CardProps = $props();

    const surfaceRadius = createSurfaceRadius(() => size);

    setCardContext({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get orientation() {
            return orientation;
        },
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-card", className]}
    data-variant={variant}
    data-size={size}
    data-orientation={orientation}
    data-nested={surfaceRadius.isNested ? "" : undefined}
    style:--cs-card-nested-radius={surfaceRadius.nestedRadius}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-card {
            --cs-card-fg: var(--cs-color-text-main);
            --cs-card-inner-radius: max(
                var(--cs-card-inner-radius-base, var(--cs-radius-lg)),
                calc(var(--cs-card-radius) - var(--cs-card-padding))
            );
            isolation: isolate;

            position: relative;
            display: grid;
            grid-template-columns: [main-start] minmax(0, 1fr) [main-end];
            gap: var(--cs-card-gap);
            inline-size: 100%;
            block-size: auto;
            padding: var(--cs-card-padding);
            overflow: clip;
            color: var(--cs-card-fg);
            font-family: var(--cs-font-sans);
            background-color: var(--cs-card-bg);
            border-radius: var(--cs-card-radius);
            corner-shape: var(--cs-card-squircle, var(--cs-squircle));
            box-shadow: var(--cs-card-shadow, none);

            /* =========================================================
             * SIZES
             * ========================================================= */
            &[data-size="sm"] {
                --cs-card-padding: 12px;
                --cs-card-gap: 8px;
                --cs-card-header-gap: 2px;
                --cs-card-radius: var(--cs-radius-2xl);
                --cs-card-inner-radius-base: var(--cs-radius-lg);
                --cs-card-close-offset: 8px;
                --cs-card-close-size: 16px;
                --cs-card-title-size: var(--cs-text-sm);
                --cs-card-description-size: var(--cs-text-xs);
                --cs-card-media-inline-size: 96px;
                --cs-card-rail-padding: 4px;
                --cs-card-rail-gap: 4px;
                --cs-card-ornament-size: 88px;
            }

            &[data-size="md"] {
                --cs-card-padding: 16px;
                --cs-card-gap: 12px;
                --cs-card-header-gap: 4px;
                --cs-card-radius: var(--cs-radius-3xl);
                --cs-card-inner-radius-base: 10px;
                --cs-card-close-offset: 10px;
                --cs-card-close-size: 24px;
                --cs-card-title-size: var(--cs-text-base);
                --cs-card-description-size: var(--cs-text-sm);
                --cs-card-media-inline-size: 132px;
                --cs-card-rail-padding: 6px;
                --cs-card-rail-gap: 6px;
                --cs-card-ornament-size: 104px;
            }

            &[data-size="lg"] {
                --cs-card-padding: 24px;
                --cs-card-gap: 16px;
                --cs-card-header-gap: 6px;
                --cs-card-radius: 28px;
                --cs-card-inner-radius-base: 12px;
                --cs-card-close-offset: 12px;
                --cs-card-close-size: 32px;
                --cs-card-title-size: var(--cs-text-lg);
                --cs-card-description-size: var(--cs-text-sm);
                --cs-card-media-inline-size: 168px;
                --cs-card-rail-padding: 8px;
                --cs-card-rail-gap: 8px;
                --cs-card-ornament-size: 124px;
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="elevated"] {
                --cs-card-bg: var(--cs-color-elevated);
                --cs-card-shadow: var(--cs-shadow-elevated);
            }

            &[data-variant="soft"] {
                --cs-card-bg: var(--cs-color-base-soft);
                --cs-card-shadow: none;
            }

            &[data-variant="sunken"] {
                --cs-card-bg: var(--cs-color-sunken);
                --cs-card-shadow: var(--cs-shadow-sunken);
            }

            &[data-variant="transparent"] {
                --cs-card-bg: transparent;
                --cs-card-shadow: none;
            }

            /* =========================================================
             * CONCENTRIC NESTING
             * ========================================================= */
            &[data-nested] {
                --cs-card-radius: var(--cs-card-nested-radius);
                --cs-card-inner-radius-base: var(--cs-radius-lg);
                corner-shape: var(--cs-squircle-smooth);
            }

            /* =========================================================
             * GRID TRACKS FOR SIDE MEDIA & RAILS
             * ---------------------------------------------------------
             * Only materialize start/end auto tracks when a matching
             * side child is present so absent tracks never add column-gap.
             * ========================================================= */
            &:has(> :global(:is(.cs-card-media, .cs-card-rail)[data-placement="start"])) {
                grid-template-columns: [start-start] auto [start-end main-start] minmax(0, 1fr) [main-end];

                & > :global(.cs-card-media[data-bleed]:is([data-placement="top"], [data-placement="bottom"])) {
                    --cs-card-media-bleed-start: 0px;
                }
            }

            &:has(> :global(:is(.cs-card-media, .cs-card-rail)[data-placement="end"])) {
                grid-template-columns: [main-start] minmax(0, 1fr) [main-end end-start] auto [end-end];

                & > :global(.cs-card-media[data-bleed]:is([data-placement="top"], [data-placement="bottom"])) {
                    --cs-card-media-bleed-end: 0px;
                }
            }

            &:has(> :global(:is(.cs-card-media, .cs-card-rail)[data-placement="start"])):has(
                    > :global(:is(.cs-card-media, .cs-card-rail)[data-placement="end"])
                ) {
                grid-template-columns:
                    [start-start] auto [start-end main-start] minmax(0, 1fr)
                    [main-end end-start] auto [end-end];
            }

            /* Explicit row counts when side tracks span `1 / -1` so CSS Grid never
             * spans only the first row or allocates empty trailing rows. */
            &:has(> :global(:is(.cs-card-media, .cs-card-rail):is([data-placement="start"], [data-placement="end"]))) {
                grid-template-rows: minmax(auto, 1fr);

                &:has(
                    > :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                ) {
                    grid-template-rows: auto minmax(auto, 1fr);
                }

                &:has(
                    > :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                ) {
                    grid-template-rows: auto auto minmax(auto, 1fr);
                }

                &:has(
                    > :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                ) {
                    grid-template-rows: auto auto auto minmax(auto, 1fr);
                }

                &:has(
                    > :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                        ~ :global(
                            :not(
                                .cs-card-ornament,
                                .cs-card-close,
                                .cs-card-rail,
                                .cs-card-media[data-placement="start"],
                                .cs-card-media[data-placement="end"]
                            )
                        )
                ) {
                    grid-template-rows: auto auto auto auto minmax(auto, 1fr);
                }
            }

            /* =========================================================
             * CHILD PLACEMENT & STACKING
             * ========================================================= */
            &
                > :global(
                    :not(
                        .cs-card-ornament,
                        .cs-card-close,
                        .cs-card-rail,
                        .cs-card-media[data-placement="start"],
                        .cs-card-media[data-placement="end"]
                    )
                ) {
                position: relative;
                z-index: 1;
                grid-column: main-start / main-end;
                min-inline-size: 0;
            }

            & > :global(.cs-card-media[data-placement="top"]) {
                order: -2;
            }

            & > :global(.cs-card-header) {
                align-self: start;
                order: -1;
            }

            & > :global(.cs-card-footer) {
                align-self: end;
                order: 1;
            }

            & > :global(.cs-card-media[data-placement="bottom"]) {
                order: 2;
            }

            & > :global(:is(.cs-card-media, .cs-card-rail)[data-placement="start"]) {
                position: relative;
                z-index: 1;
                grid-row: 1 / -1;
                grid-column: start-start / start-end;
            }

            & > :global(:is(.cs-card-media, .cs-card-rail)[data-placement="end"]) {
                position: relative;
                z-index: 1;
                grid-row: 1 / -1;
                grid-column: end-start / end-end;
            }

            /* =========================================================
             * CORNER CLOSE BUTTON & TITLE CLEARANCE
             * ========================================================= */
            & > :global(.cs-card-close) {
                position: absolute;
                inset-block-start: var(--cs-card-close-offset);
                inset-inline-end: var(--cs-card-close-offset);
                z-index: 2;
            }

            &:has(> :global(.cs-card-close)):not(
                    :has(> :global(:is(.cs-card-rail, .cs-card-media)[data-placement="end"]))
                )
                > :global(:is(.cs-card-header, .cs-card-title:first-of-type)) {
                padding-inline-end: calc(var(--cs-card-close-size, 24px) + var(--cs-card-close-offset));
            }
        }
    }
</style>
