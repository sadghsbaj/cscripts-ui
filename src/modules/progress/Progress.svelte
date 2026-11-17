<script lang="ts">
    import { untrack } from "svelte";
    import type { ProgressProps } from "./index.ts";
    import {
        computeActiveSegmentCount,
        computeSegmentStagger,
        computeStaggerStepMs,
        normalizeProgress,
        resolveSegmentCount,
    } from "./progress.internal.ts";

    let {
        ref = $bindable(null),
        appearance,
        variant,
        size,
        color = "accent",
        orientation = "horizontal",
        value,
        min = 0,
        max = 100,
        segments,
        class: className,
        ...rest
    }: ProgressProps = $props();

    const normalized = $derived(normalizeProgress(value, min, max));
    const segmentCount = $derived(resolveSegmentCount(appearance, segments));
    const activeCount = $derived(
        computeActiveSegmentCount(normalized.ratio, segmentCount, normalized.isIndeterminate),
    );

    // Non-reactive snapshot of the committed count avoids mount animations and $effect loops.
    let prevActiveCount = untrack(() => activeCount);

    const stagger = $derived.by(() => {
        const current = activeCount;
        const prev = prevActiveCount;

        if (normalized.isIndeterminate || current === prev) {
            return { stepMs: 0, delays: [] as number[], activatingFrom: null as number | null };
        }

        const stepMs = computeStaggerStepMs(prev, current);
        const delays = Array.from({ length: segmentCount }, (_, index) =>
            computeSegmentStagger(index, prev, current, false),
        );

        return {
            stepMs,
            delays,
            activatingFrom: current > prev ? prev : null,
        };
    });

    $effect(() => {
        prevActiveCount = normalized.isIndeterminate ? 0 : activeCount;
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-progress", className]}
    role="progressbar"
    aria-valuenow={normalized.isIndeterminate ? undefined : normalized.clampedValue}
    aria-valuemin={normalized.isIndeterminate ? undefined : normalized.safeMin}
    aria-valuemax={normalized.isIndeterminate ? undefined : normalized.safeMax}
    data-appearance={appearance}
    data-variant={variant}
    data-color={color}
    data-size={size}
    data-orientation={orientation}
    data-indeterminate={normalized.isIndeterminate ? "" : undefined}
    style:--cs-progress-ratio={appearance === "bar" && !normalized.isIndeterminate
        ? normalized.ratio
        : undefined}
    style:--cs-progress-segments={appearance !== "bar" ? segmentCount : undefined}
    style:--cs-progress-stagger-step={appearance !== "bar" && stagger.stepMs > 0
        ? `${stagger.stepMs}ms`
        : undefined}
>
    {#if appearance === "bar"}
        <div class="cs-progress-fill" aria-hidden="true"></div>
    {:else}
        {#each { length: segmentCount } as _, index (index)}
            <span
                class="cs-progress-segment"
                aria-hidden="true"
                data-active={!normalized.isIndeterminate && index < activeCount ? "" : undefined}
                data-activating={stagger.activatingFrom !== null &&
                index >= stagger.activatingFrom &&
                index < activeCount
                    ? ""
                    : undefined}
                style:--cs-progress-index={index}
                style:--cs-progress-stagger={stagger.delays[index] ?? 0}
            ></span>
        {/each}
    {/if}
</div>

<style>
    @layer components.primitive {
        .cs-progress {
            --cs-progress-dir: 1;
            --cs-progress-radius: var(--cs-radius-full);

            &:dir(rtl) {
                --cs-progress-dir: -1;
            }

            /* =========================================================
             * SIZES
             * ========================================================= */
            &[data-size="xs"] {
                --cs-progress-thickness: 4px;
                --cs-progress-gap: 2px;
            }

            &[data-size="sm"] {
                --cs-progress-thickness: 6px;
                --cs-progress-gap: 3px;
            }

            &[data-size="md"] {
                --cs-progress-thickness: 8px;
                --cs-progress-gap: 4px;
            }

            &[data-size="lg"] {
                --cs-progress-thickness: 12px;
                --cs-progress-gap: 5px;
            }

            &[data-size="xl"] {
                --cs-progress-thickness: 16px;
                --cs-progress-gap: 6px;
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="soft"] {
                --cs-progress-track-bg: var(--cs-color-base-soft);
                --cs-progress-track-shadow: none;
                --cs-progress-fill-shadow: none;
            }

            &[data-variant="elevated"] {
                --cs-progress-track-bg: var(--cs-color-elevated);
                --cs-progress-track-shadow: var(--cs-shadow-elevated);
                --cs-progress-fill-shadow: var(--cs-shadow-solid-active);
            }

            /* =========================================================
             * COLORS
             * ========================================================= */
            &[data-color="base"] {
                --cs-progress-fill-bg: var(--cs-color-base-solid);
            }

            &[data-color="accent"] {
                --cs-progress-fill-bg: var(--cs-color-accent-solid);
            }

            &[data-color="positive"] {
                --cs-progress-fill-bg: var(--cs-color-positive-solid);
            }

            &[data-color="caution"] {
                --cs-progress-fill-bg: var(--cs-color-caution-solid);
            }

            &[data-color="negative"] {
                --cs-progress-fill-bg: var(--cs-color-negative-solid);
            }

            /* =========================================================
             * ORIENTATIONS
             * ========================================================= */
            &[data-orientation="horizontal"] {
                inline-size: 100%;
                block-size: var(--cs-progress-thickness);
            }

            &[data-orientation="vertical"] {
                inline-size: var(--cs-progress-thickness);
                block-size: 100%;
                min-block-size: 48px;
            }

            /* =========================================================
             * APPEARANCE: BAR
             * ========================================================= */
            &[data-appearance="bar"] {
                position: relative;
                overflow: clip;
                background-color: var(--cs-progress-track-bg);
                box-shadow: var(--cs-progress-track-shadow);
                border-radius: var(--cs-progress-radius);
                corner-shape: var(--cs-squircle-soft);
            }

            /* =========================================================
             * APPEARANCE: DASHED
             * ========================================================= */
            &[data-appearance="dashed"] {
                display: grid;
                grid-template-columns: repeat(var(--cs-progress-segments, 5), 1fr);
                gap: var(--cs-progress-gap);

                &[data-orientation="vertical"] {
                    grid-template-columns: none;
                    grid-template-rows: repeat(var(--cs-progress-segments, 5), 1fr);
                    align-content: stretch;

                    & .cs-progress-segment {
                        /* Map index 0 to the bottom row so vertical progress fills bottom-to-top. */
                        grid-row: calc(var(--cs-progress-segments, 5) - var(--cs-progress-index, 0));
                    }
                }

                & .cs-progress-segment {
                    inline-size: 100%;
                    block-size: 100%;
                    border-radius: var(--cs-progress-radius);
                    corner-shape: var(--cs-squircle-soft);

                    &[data-activating] {
                        animation: cs-progress-dash-pop var(--cs-dur-200) var(--cs-spring-snappy)
                            calc(var(--cs-progress-stagger, 0) * var(--cs-progress-stagger-step, 0ms));
                    }
                }
            }

            /* =========================================================
             * APPEARANCE: DOTTED
             * ========================================================= */
            &[data-appearance="dotted"] {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: var(--cs-progress-gap);

                &[data-orientation="vertical"] {
                    flex-direction: column-reverse;
                }

                & .cs-progress-segment {
                    flex-shrink: 0;
                    inline-size: var(--cs-progress-thickness);
                    block-size: var(--cs-progress-thickness);
                    border-radius: var(--cs-progress-radius);

                    &[data-activating] {
                        animation: cs-progress-dot-pop var(--cs-dur-200) var(--cs-spring-snappy)
                            calc(var(--cs-progress-stagger, 0) * var(--cs-progress-stagger-step, 0ms));
                    }
                }
            }

            /* =========================================================
             * INDETERMINATE
             * ========================================================= */
            &[data-indeterminate] {
                &[data-appearance="bar"] .cs-progress-fill {
                    inline-size: 38%;
                    transition: none;
                    animation: cs-progress-bar-indeterminate 1400ms cubic-bezier(0.4, 0, 0.2, 1)
                        infinite;
                }

                &[data-appearance="bar"][data-orientation="vertical"] .cs-progress-fill {
                    inline-size: 100%;
                    block-size: 38%;
                    animation-name: cs-progress-bar-indeterminate-vertical;
                }

                & .cs-progress-segment {
                    transition: none;
                    animation: cs-progress-segment-indeterminate 1200ms var(--cs-ease-sine-in-out)
                        calc(var(--cs-progress-index, 0) * 90ms) infinite;
                }
            }
        }

        .cs-progress-fill {
            inline-size: 100%;
            block-size: 100%;
            background-color: var(--cs-progress-fill-bg);
            box-shadow: var(--cs-progress-fill-shadow);
            border-radius: var(--cs-progress-radius);
            corner-shape: var(--cs-squircle-soft);
            transform: translateX(
                calc((var(--cs-progress-ratio, 0) - 1) * 100% * var(--cs-progress-dir, 1))
            );
            transition: transform var(--cs-dur-280) var(--cs-ease-quart-out);
        }

        .cs-progress[data-orientation="vertical"] .cs-progress-fill {
            transform: translateY(calc((1 - var(--cs-progress-ratio, 0)) * 100%));
        }

        .cs-progress-segment {
            background-color: var(--cs-progress-track-bg);
            box-shadow: var(--cs-progress-track-shadow);
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect)
                    calc(var(--cs-progress-stagger, 0) * var(--cs-progress-stagger-step, 0ms)),
                box-shadow var(--cs-dur-effect) var(--cs-ease-effect)
                    calc(var(--cs-progress-stagger, 0) * var(--cs-progress-stagger-step, 0ms));

            &[data-active] {
                background-color: var(--cs-progress-fill-bg);
                box-shadow: var(--cs-progress-fill-shadow);
            }
        }

        @keyframes cs-progress-bar-indeterminate {
            0% {
                transform: translateX(calc(-100% * var(--cs-progress-dir, 1)));
            }
            100% {
                transform: translateX(calc(270% * var(--cs-progress-dir, 1)));
            }
        }

        @keyframes cs-progress-bar-indeterminate-vertical {
            0% {
                transform: translateY(270%);
            }
            100% {
                transform: translateY(-100%);
            }
        }

        @keyframes cs-progress-segment-indeterminate {
            0%,
            100% {
                background-color: var(--cs-progress-track-bg);
                box-shadow: var(--cs-progress-track-shadow);
            }
            40% {
                background-color: var(--cs-progress-fill-bg);
                box-shadow: var(--cs-progress-fill-shadow);
            }
        }

        @keyframes cs-progress-dash-pop {
            0%,
            100% {
                transform: scale(1);
            }
            45% {
                transform: scale(1.04);
            }
        }

        @keyframes cs-progress-dot-pop {
            0%,
            100% {
                transform: scale(1);
            }
            45% {
                transform: scale(1.12);
            }
        }
    }
</style>
