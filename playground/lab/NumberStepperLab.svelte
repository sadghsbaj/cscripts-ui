<script lang="ts">
    import type { Snippet } from "svelte";
    import type { SvelteSet } from "svelte/reactivity";
    import { ChevronLeft, ChevronRight, Minus, Plus, X, ZoomIn, ZoomOut } from "@lucide/svelte";

    interface Props {
        selectMode: boolean;
        rejectedIds: SvelteSet<string>;
        onToggleReject: (id: string) => void;
    }

    let { selectMode, rejectedIds, onToggleReject }: Props = $props();

    let zoomB = $state(100);
    let zoomD = $state(125);

    let insetB = $state(100);
    let insetC = $state(80);

    let wellA = $state(50);
    let wellB = $state(100);

    let sizeXs = $state(50);
    let sizeSm = $state(50);
    let sizeMd = $state(50);
    let sizeLg = $state(50);
    let sizeXl = $state(50);

    let cardA = $state(50);
    let cardB = $state(100);
    let cardC = $state(50);

    function step(val: number, delta: number, min = 10, max = 400): number {
        return Math.min(max, Math.max(min, val + delta));
    }
</script>

{#snippet pickable(id: string, content: Snippet)}
    {let isRejected = $derived(rejectedIds.has(id))}
    <div
        class="ns-pick-wrap"
        data-select-mode={selectMode ? "" : undefined}
        data-rejected={isRejected ? "" : undefined}
        data-variant-id={id}
    >
        <div class="ns-pick-content" inert={selectMode ? true : undefined}>
            {@render content()}
        </div>

        {#if selectMode}
            <button
                type="button"
                class="ns-pick-layer"
                aria-label="Variante {id} zum Entfernen markieren"
                aria-pressed={isRejected}
                onclick={() => onToggleReject(id)}
            >
                {#if isRejected}
                    <span class="ns-pick-badge">
                        <X class="ns-pick-x" />
                    </span>
                {/if}
            </button>
        {/if}
    </div>
{/snippet}

<div class="w-full max-w-5xl flex flex-col items-center gap-14 py-10">
    <!-- 1. UNIFIED PILL WITH HAIRLINE DIVIDERS -->
    <div class="flex-center flex-wrap gap-6">
        {#snippet v1_2()}
            <div class="ns-pill" data-surface="soft" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (zoomB = step(zoomB, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (zoomB = 100)}>
                    {zoomB}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (zoomB = step(zoomB, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("1.2-pill-soft-hairline", v1_2)}

        {#snippet v1_4()}
            <div class="ns-pill" data-surface="elevated" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (zoomD = step(zoomD, -25))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (zoomD = 100)}>
                    {zoomD}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (zoomD = step(zoomD, 25))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("1.4-pill-elevated-hairline", v1_4)}
    </div>

    <!-- 2. UNIFIED TRACK WITH CONCENTRIC INSET CIRCULAR BUTTONS -->
    <div class="flex-center flex-wrap gap-6">
        {#snippet v2_2()}
            <div class="ns-track" data-surface="soft" data-btn="elevated">
                <button type="button" class="ns-circle-inset" aria-label="Verkleinern" onclick={() => (insetB = step(insetB, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <button type="button" class="ns-track-val" aria-label="Zurücksetzen" onclick={() => (insetB = 100)}>
                    {insetB}%
                </button>
                <button type="button" class="ns-circle-inset" aria-label="Vergrößern" onclick={() => (insetB = step(insetB, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("2.2-track-soft-btn-elevated", v2_2)}

        {#snippet v2_3()}
            <div class="ns-track" data-surface="elevated" data-btn="soft">
                <button type="button" class="ns-circle-inset" aria-label="Verkleinern" onclick={() => (insetC = step(insetC, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <button type="button" class="ns-track-val" aria-label="Zurücksetzen" onclick={() => (insetC = 80)}>
                    {insetC}%
                </button>
                <button type="button" class="ns-circle-inset" aria-label="Vergrößern" onclick={() => (insetC = step(insetC, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("2.3-track-elevated-btn-soft", v2_3)}
    </div>

    <!-- 3. UNIFIED PILL WITH INSET CENTER VALUE PILL / WELL -->
    <div class="flex-center flex-wrap gap-6">
        {#snippet v3_1()}
            <div class="ns-center-well" data-outer="soft" data-inner="elevated">
                <button type="button" class="ns-well-btn" aria-label="Verkleinern" onclick={() => (wellA = step(wellA, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <button type="button" class="ns-well-pill" aria-label="Zurücksetzen" onclick={() => (wellA = 50)}>
                    {wellA}%
                </button>
                <button type="button" class="ns-well-btn" aria-label="Vergrößern" onclick={() => (wellA = step(wellA, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("3.1-well-outer-soft-inner-elevated", v3_1)}

        {#snippet v3_2()}
            <div class="ns-center-well" data-outer="elevated" data-inner="soft">
                <button type="button" class="ns-well-btn" aria-label="Verkleinern" onclick={() => (wellB = step(wellB, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <button type="button" class="ns-well-pill" aria-label="Zurücksetzen" onclick={() => (wellB = 100)}>
                    {wellB}%
                </button>
                <button type="button" class="ns-well-btn" aria-label="Vergrößern" onclick={() => (wellB = step(wellB, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("3.2-well-outer-elevated-inner-soft", v3_2)}
    </div>

    <!-- 4. WITHOUT NUMBER IN THE MIDDLE (COMPACT STEPPER / ZOOM PAIRS) -->
    <div class="flex-center flex-wrap gap-6">
        {#snippet v7_1()}
            <div class="ns-pill" data-surface="soft" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern">
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern">
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("7.1-pair-pill-soft-hairline", v7_1)}

        {#snippet v7_2()}
            <div class="ns-pill" data-surface="elevated" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern">
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern">
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("7.2-pair-pill-elevated-hairline", v7_2)}

        {#snippet v7_5()}
            <div class="ns-track ns-track-pair" data-surface="soft" data-btn="elevated">
                <button type="button" class="ns-circle-inset" aria-label="Verkleinern">
                    <Minus class="ns-icon" />
                </button>
                <button type="button" class="ns-circle-inset" aria-label="Vergrößern">
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("7.5-pair-track-soft-inset-circles", v7_5)}

        {#snippet v7_6()}
            <div class="ns-pill" data-surface="elevated" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Herauszoomen">
                    <ZoomOut class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Hineinzoomen">
                    <ZoomIn class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("7.6-pair-zoom-icons-elevated", v7_6)}

        {#snippet v7_7()}
            <div class="ns-pill" data-surface="soft" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Zurück">
                    <ChevronLeft class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Weiter">
                    <ChevronRight class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("7.7-pair-chevrons-soft", v7_7)}
    </div>

    <!-- 5. SIZE SCALE (XS 28PX .. XL 44PX) -->
    <div class="flex-center flex-wrap gap-5">
        {#snippet v9_1()}
            <div class="ns-pill" data-surface="soft" data-size="xs">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (sizeXs = step(sizeXs, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (sizeXs = 50)}>
                    {sizeXs}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (sizeXs = step(sizeXs, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("9.1-size-xs", v9_1)}

        {#snippet v9_2()}
            <div class="ns-pill" data-surface="soft" data-size="sm">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (sizeSm = step(sizeSm, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (sizeSm = 50)}>
                    {sizeSm}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (sizeSm = step(sizeSm, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("9.2-size-sm", v9_2)}

        {#snippet v9_3()}
            <div class="ns-pill" data-surface="soft" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (sizeMd = step(sizeMd, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (sizeMd = 50)}>
                    {sizeMd}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (sizeMd = step(sizeMd, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("9.3-size-md", v9_3)}

        {#snippet v9_4()}
            <div class="ns-pill" data-surface="soft" data-size="lg">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (sizeLg = step(sizeLg, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (sizeLg = 50)}>
                    {sizeLg}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (sizeLg = step(sizeLg, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("9.4-size-lg", v9_4)}

        {#snippet v9_5()}
            <div class="ns-pill" data-surface="soft" data-size="xl">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (sizeXl = step(sizeXl, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (sizeXl = 50)}>
                    {sizeXl}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (sizeXl = step(sizeXl, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("9.5-size-xl", v9_5)}
    </div>

    <!-- 6. ON ELEVATED CARD SURFACE (HOW THEY SIT INSIDE CARDS/TOOLBARS) -->
    <div class="w-full bg-elevated shadow-elevated rounded-3xl squircle p-8 flex-center flex-wrap gap-7">
        {#snippet v11_1()}
            <div class="ns-pill" data-surface="soft" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (cardA = step(cardA, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-val" aria-label="Zurücksetzen" onclick={() => (cardA = 50)}>
                    {cardA}%
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (cardA = step(cardA, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("11.1-card-pill-soft", v11_1)}

        {#snippet v11_2()}
            <div class="ns-track" data-surface="soft" data-btn="elevated">
                <button type="button" class="ns-circle-inset" aria-label="Verkleinern" onclick={() => (cardB = step(cardB, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <button type="button" class="ns-track-val" aria-label="Zurücksetzen" onclick={() => (cardB = 100)}>
                    {cardB}%
                </button>
                <button type="button" class="ns-circle-inset" aria-label="Vergrößern" onclick={() => (cardB = step(cardB, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("11.2-card-track-inset-circles", v11_2)}

        {#snippet v11_3()}
            <div class="ns-center-well" data-outer="soft" data-inner="elevated">
                <button type="button" class="ns-well-btn" aria-label="Verkleinern" onclick={() => (cardC = step(cardC, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <button type="button" class="ns-well-pill" aria-label="Zurücksetzen" onclick={() => (cardC = 50)}>
                    {cardC}%
                </button>
                <button type="button" class="ns-well-btn" aria-label="Vergrößern" onclick={() => (cardC = step(cardC, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("11.3-card-center-well", v11_3)}
    </div>
</div>

<style>
    /* =========================================================================
     * SELECTION LAYER (FOR PICKING VARIATIONS TO REMOVE)
     * ========================================================================= */
    .ns-pick-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .ns-pick-content {
        display: inline-flex;
        transition:
            opacity var(--cs-dur-effect) var(--cs-ease-effect),
            filter var(--cs-dur-effect) var(--cs-ease-effect),
            scale var(--cs-dur-effect) var(--cs-ease-effect);

        .ns-pick-wrap[data-rejected] & {
            opacity: 0.25;
            filter: grayscale(0.85);
            scale: 0.96;
        }
    }

    .ns-pick-layer {
        position: absolute;
        inset: -6px;
        z-index: 20;
        border-radius: 22px;
        corner-shape: var(--cs-squircle-soft);
        background: transparent;
        transition:
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            box-shadow var(--cs-dur-effect-fast) var(--cs-ease-effect);

        @media (hover: hover) {
            &:hover {
                background-color: color-mix(in oklch, var(--cs-color-negative-500) 7%, transparent);
                box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--cs-color-negative-solid) 55%, transparent);
            }
        }

        .ns-pick-wrap[data-rejected] & {
            background-color: color-mix(in oklch, var(--cs-color-negative-500) 10%, transparent);
            box-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);
        }
    }

    .ns-pick-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        color: var(--cs-color-negative-solid-fg);
        background-color: var(--cs-color-negative-solid);
        box-shadow: var(--cs-shadow-solid);
    }

    :global(.ns-pick-x) {
        width: 11px;
        height: 11px;
        stroke-width: 3;
        pointer-events: none;
    }

    /* =========================================================================
     * SHARED ICON & TYPOGRAPHY PRIMITIVES
     * ========================================================================= */
    :global(.ns-icon) {
        width: var(--ns-icon-size, 16px);
        height: var(--ns-icon-size, 16px);
        stroke-width: 2.35;
        pointer-events: none;
        flex-shrink: 0;
        transition: scale var(--cs-dur-effect) var(--cs-ease-effect);
    }

    button {
        cursor: default;
        user-select: none;
        font-variant-numeric: tabular-nums;
    }

    button:active :global(.ns-icon) {
        scale: 0.88;
        transition: scale var(--cs-dur-press) var(--cs-ease-press);
    }

    /* =========================================================================
     * 1. UNIFIED PILL (HORIZONTAL)
     * ========================================================================= */
    .ns-pill {
        --ns-h: 36px;
        --ns-font: var(--cs-text-sm);
        --ns-val-min-w: 52px;
        --ns-icon-size: 16px;
        --ns-bg: var(--cs-color-base-soft);
        --ns-hover: var(--cs-color-base-soft-hover);
        --ns-fg: var(--cs-color-text-main);
        --ns-fg-strong: var(--cs-color-text-strong);
        --ns-shadow: none;
        --ns-sep-color: color-mix(in oklab, var(--cs-color-text-main) 16%, transparent);

        position: relative;
        display: inline-flex;
        align-items: stretch;
        height: var(--ns-h);
        font-size: var(--ns-font);
        font-weight: 600;
        background-color: var(--ns-bg);
        border-radius: calc(var(--ns-h) / 2);
        corner-shape: var(--cs-squircle-soft);
        box-shadow: var(--ns-shadow);

        &[data-surface="elevated"] {
            --ns-bg: var(--cs-color-elevated);
            --ns-hover: var(--cs-color-base-soft);
            --ns-shadow: var(--cs-shadow-elevated);
        }

        &[data-size="xs"] {
            --ns-h: 28px;
            --ns-font: var(--cs-text-xs);
            --ns-val-min-w: 42px;
            --ns-icon-size: 14px;
        }

        &[data-size="sm"] {
            --ns-h: 32px;
            --ns-font: var(--cs-text-xs);
            --ns-val-min-w: 46px;
            --ns-icon-size: 14px;
        }

        &[data-size="md"] {
            --ns-h: 36px;
            --ns-font: var(--cs-text-sm);
            --ns-val-min-w: 52px;
            --ns-icon-size: 16px;
        }

        &[data-size="lg"] {
            --ns-h: 40px;
            --ns-font: var(--cs-text-sm);
            --ns-val-min-w: 58px;
            --ns-icon-size: 17px;
        }

        &[data-size="xl"] {
            --ns-h: 44px;
            --ns-font: var(--cs-text-base);
            --ns-val-min-w: 64px;
            --ns-icon-size: 18px;
        }
    }

    .ns-pill-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        height: 100%;
        color: var(--ns-fg);
        background: transparent;
        border-radius: 0;
        transition:
            background-color var(--cs-dur-effect) var(--cs-ease-effect),
            color var(--cs-dur-effect) var(--cs-ease-effect);

        &:first-child {
            border-top-left-radius: calc(var(--ns-h) / 2);
            border-bottom-left-radius: calc(var(--ns-h) / 2);
        }

        &:last-child {
            border-top-right-radius: calc(var(--ns-h) / 2);
            border-bottom-right-radius: calc(var(--ns-h) / 2);
        }

        @media (hover: hover) {
            &:hover {
                color: var(--ns-fg-strong);
                background-color: var(--ns-hover);
            }
        }
    }

    .ns-pill-val {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--ns-val-min-w);
        padding-inline: 8px;
        color: var(--ns-fg-strong);
        background: transparent;
        transition:
            background-color var(--cs-dur-effect) var(--cs-ease-effect),
            color var(--cs-dur-effect) var(--cs-ease-effect);

        @media (hover: hover) {
            &:hover {
                background-color: var(--ns-hover);
            }
        }
    }

    .ns-sep {
        position: relative;
        width: 0;
        align-self: stretch;
        pointer-events: none;
        z-index: 1;

        &::before {
            content: "";
            position: absolute;
            inset-block: 24%;
            left: 0;
            width: 1px;
            translate: -50% 0;
            background-color: var(--ns-sep-color);
            transition: opacity var(--cs-dur-effect) var(--cs-ease-effect);
        }
    }

    .ns-pill > button:is(:hover, :active, :focus-visible) + .ns-sep::before,
    .ns-sep:has(+ button:is(:hover, :active, :focus-visible))::before {
        opacity: 0;
    }

    /* =========================================================================
     * 2. UNIFIED TRACK WITH INSET CIRCULAR BUTTONS
     * ========================================================================= */
    .ns-track {
        --ns-h: 36px;
        --ns-pad: 3px;
        --ns-circle: calc(var(--ns-h) - var(--ns-pad) * 2);

        display: inline-flex;
        align-items: center;
        height: var(--ns-h);
        padding: var(--ns-pad);
        font-size: var(--cs-text-sm);
        font-weight: 600;
        border-radius: calc(var(--ns-h) / 2);
        corner-shape: var(--cs-squircle-soft);

        &[data-surface="soft"] {
            background-color: var(--cs-color-base-soft);
        }

        &[data-surface="elevated"] {
            background-color: var(--cs-color-elevated);
            box-shadow: var(--cs-shadow-elevated);
        }

        &.ns-track-pair {
            gap: 3px;
        }
    }

    .ns-circle-inset {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--ns-circle, 30px);
        height: var(--ns-circle, 30px);
        border-radius: 50%;
        color: var(--cs-color-text-main);
        background-color: transparent;
        transition:
            background-color var(--cs-dur-effect) var(--cs-ease-effect),
            color var(--cs-dur-effect) var(--cs-ease-effect),
            box-shadow var(--cs-dur-effect) var(--cs-ease-effect),
            scale var(--cs-dur-squash) var(--cs-ease-squash);

        &:active {
            scale: 0.93;
            transition: scale var(--cs-dur-press) var(--cs-ease-press);
        }

        [data-btn="elevated"] & {
            color: var(--cs-color-text-strong);
            background-color: light-dark(white, color-mix(in oklab, var(--cs-color-base-100) 14%, transparent));
            box-shadow: light-dark(var(--cs-shadow-xs), none);

            @media (hover: hover) {
                &:hover {
                    background-color: light-dark(white, color-mix(in oklab, var(--cs-color-base-100) 20%, transparent));
                    box-shadow: light-dark(var(--cs-shadow-sm), none);
                }
            }
        }

        [data-btn="soft"] & {
            color: var(--cs-color-text-main);
            background-color: var(--cs-color-base-soft);

            @media (hover: hover) {
                &:hover {
                    color: var(--cs-color-text-strong);
                    background-color: var(--cs-color-base-soft-hover);
                }
            }
        }
    }

    .ns-track-val {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 52px;
        height: 100%;
        padding-inline: 8px;
        color: var(--cs-color-text-strong);
        border-radius: 999px;
        transition: color var(--cs-dur-effect) var(--cs-ease-effect);
    }

    /* =========================================================================
     * 3. UNIFIED PILL WITH INSET CENTER VALUE PILL / WELL
     * ========================================================================= */
    .ns-center-well {
        --ns-h: 36px;
        --ns-pad: 4px;

        display: inline-flex;
        align-items: center;
        height: var(--ns-h);
        padding-inline: 2px;
        font-size: var(--cs-text-sm);
        font-weight: 600;
        border-radius: calc(var(--ns-h) / 2);
        corner-shape: var(--cs-squircle-soft);

        &[data-outer="soft"] {
            background-color: var(--cs-color-base-soft);
        }

        &[data-outer="elevated"] {
            background-color: var(--cs-color-elevated);
            box-shadow: var(--cs-shadow-elevated);
        }
    }

    .ns-well-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        color: var(--cs-color-text-main);
        background: transparent;
        transition:
            color var(--cs-dur-effect) var(--cs-ease-effect),
            background-color var(--cs-dur-effect) var(--cs-ease-effect);

        @media (hover: hover) {
            &:hover {
                color: var(--cs-color-text-strong);
            }
        }
    }

    .ns-well-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 54px;
        height: calc(var(--ns-h) - var(--ns-pad) * 2);
        padding-inline: 10px;
        color: var(--cs-color-text-strong);
        border-radius: calc((var(--ns-h) - var(--ns-pad) * 2) / 2);
        corner-shape: var(--cs-squircle-soft);
        transition:
            background-color var(--cs-dur-effect) var(--cs-ease-effect),
            box-shadow var(--cs-dur-effect) var(--cs-ease-effect);

        [data-inner="elevated"] & {
            background-color: light-dark(white, color-mix(in oklab, var(--cs-color-base-100) 14%, transparent));
            box-shadow: light-dark(var(--cs-shadow-xs), none);
        }

        [data-inner="soft"] & {
            background-color: var(--cs-color-base-soft);
        }
    }
</style>
