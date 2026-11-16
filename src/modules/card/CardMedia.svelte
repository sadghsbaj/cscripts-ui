<script lang="ts">
    import { getCardContext, hasCardContext, type CardMediaProps } from "./index.ts";

    let {
        ref = $bindable(null),
        placement,
        ratio = "auto",
        fit = "cover",
        bleed = false,
        class: className,
        children,
        ...rest
    }: CardMediaProps = $props();

    const card = hasCardContext() ? getCardContext() : undefined;
    const resolvedPlacement = $derived(placement ?? (card?.orientation === "horizontal" ? "start" : "top"));
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-card-media", className]}
    data-placement={resolvedPlacement}
    data-fit={fit}
    data-ratio={ratio === "auto" ? "auto" : undefined}
    data-bleed={bleed ? "" : undefined}
    style:--cs-card-media-ratio={ratio === "auto" ? undefined : ratio}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-card-media {
            position: relative;
            aspect-ratio: var(--cs-card-media-ratio, auto);
            min-inline-size: 0;
            overflow: hidden;
            border-radius: var(--cs-card-inner-radius);
            corner-shape: var(--cs-squircle-smooth);

            &:is([data-placement="top"], [data-placement="bottom"]) {
                inline-size: 100%;

                &:not([data-ratio="auto"]) {
                    align-self: start;
                }
            }

            &:is([data-placement="start"], [data-placement="end"]) {
                align-self: start;
                inline-size: var(--cs-card-media-inline-size, 132px);

                &[data-ratio="auto"] {
                    align-self: stretch;
                }
            }

            &[data-bleed] {
                border-radius: 0;
                corner-shape: initial;

                &[data-placement="top"] {
                    margin-block-start: calc(var(--cs-card-padding) * -1);
                    margin-inline-start: var(--cs-card-media-bleed-start, calc(var(--cs-card-padding) * -1));
                    margin-inline-end: var(--cs-card-media-bleed-end, calc(var(--cs-card-padding) * -1));
                    inline-size: calc(
                        100% - var(--cs-card-media-bleed-start, calc(var(--cs-card-padding) * -1)) -
                            var(--cs-card-media-bleed-end, calc(var(--cs-card-padding) * -1))
                    );
                }

                &[data-placement="bottom"] {
                    margin-block-end: calc(var(--cs-card-padding) * -1);
                    margin-inline-start: var(--cs-card-media-bleed-start, calc(var(--cs-card-padding) * -1));
                    margin-inline-end: var(--cs-card-media-bleed-end, calc(var(--cs-card-padding) * -1));
                    inline-size: calc(
                        100% - var(--cs-card-media-bleed-start, calc(var(--cs-card-padding) * -1)) -
                            var(--cs-card-media-bleed-end, calc(var(--cs-card-padding) * -1))
                    );
                }

                &[data-placement="start"] {
                    align-self: stretch;
                    margin-block: calc(var(--cs-card-padding) * -1);
                    margin-inline-start: calc(var(--cs-card-padding) * -1);
                }

                &[data-placement="end"] {
                    align-self: stretch;
                    margin-block: calc(var(--cs-card-padding) * -1);
                    margin-inline-end: calc(var(--cs-card-padding) * -1);
                }
            }

            &[data-fit="cover"] {
                --cs-card-media-fit: cover;
            }

            &[data-fit="contain"] {
                --cs-card-media-fit: contain;
            }

            & > :global(:is(img, video, svg)) {
                display: block;
                inline-size: 100%;
                block-size: 100%;
                object-fit: var(--cs-card-media-fit, cover);
            }
        }
    }
</style>
