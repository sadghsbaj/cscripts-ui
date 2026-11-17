<script lang="ts">
    import type { Snippet } from "svelte";
    import type { SvelteSet } from "svelte/reactivity";
    import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Minus, Plus, X, ZoomIn, ZoomOut } from "@lucide/svelte";
    import { middleClick } from "cs/svelte/middle-click";
    import { NumberMorph } from "cs/svelte/number-morph";

    interface Props {
        selectMode: boolean;
        rejectedIds: SvelteSet<string>;
        onToggleReject: (id: string) => void;
    }

    let { selectMode, rejectedIds, onToggleReject }: Props = $props();

    let zoomB = $state(100);
    let zoomD = $state(125);

    let inputWellSoft = $state(100);
    let inputWellElevated = $state(16);

    let sizeXs = $state(50);
    let sizeSm = $state(50);
    let sizeMd = $state(50);
    let sizeLg = $state(50);
    let sizeXl = $state(50);

    let cardA = $state(50);
    let cardInput = $state(100);

    function step(val: number, delta: number, min = 10, max = 400): number {
        return Math.min(max, Math.max(min, val + delta));
    }

    function commitInput(
        event: Event & { currentTarget: HTMLInputElement },
        current: number,
        min = 10,
        max = 400
    ): number {
        const cleaned = event.currentTarget.value.replaceAll(/[^0-9-]/g, "");
        if (!cleaned) {
            event.currentTarget.value = String(current);
            return current;
        }
        const parsed = Math.trunc(Number(cleaned));
        if (Number.isNaN(parsed)) {
            event.currentTarget.value = String(current);
            return current;
        }
        const clamped = Math.min(max, Math.max(min, parsed));
        event.currentTarget.value = String(clamped);
        return clamped;
    }

    function handleInputKeydown(
        event: KeyboardEvent & { currentTarget: HTMLInputElement },
        onStep: (delta: number) => void
    ): void {
        switch (event.key) {
            case "ArrowUp": {
                event.preventDefault();
                onStep(1);
                break;
            }
            case "ArrowDown": {
                event.preventDefault();
                onStep(-1);
                break;
            }
            case "Enter": {
                event.currentTarget.blur();
                break;
            }
        }
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
    <!-- 1. FLAT TRACK WITH HAIRLINE SEPARATORS (BUTTON IN MIDDLE: CLICK = RESET) -->
    <div class="flex-center flex-wrap gap-6">
        {#snippet v1_2()}
            <div class="ns-pill" data-surface="soft" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (zoomB = step(zoomB, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (zoomB = 100)}
                    {@attach middleClick({ onMiddleClick: () => (zoomB = 100) })}
                >
                    <NumberMorph class="ns-val-text" value={zoomB} suffix="%" willChange />
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
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (zoomD = 100)}
                    {@attach middleClick({ onMiddleClick: () => (zoomD = 100) })}
                >
                    <NumberMorph class="ns-val-text" value={zoomD} suffix="%" willChange />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (zoomD = step(zoomD, 25))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("1.4-pill-elevated-hairline", v1_4)}
    </div>

    <!-- 2. TRACK WITH HIGHLIGHTED CENTER WELL (INPUT IN MIDDLE: CLICK = TYPE, MIDDLE-CLICK = RESET) -->
    <div class="flex-center flex-wrap gap-6">
        {#snippet v3_1()}
            <div class="ns-center-well" data-outer="soft" data-inner="elevated">
                <button
                    type="button"
                    class="ns-well-btn"
                    aria-label="Verkleinern"
                    onclick={() => (inputWellSoft = step(inputWellSoft, -10))}
                >
                    <Minus class="ns-icon" />
                </button>
                <label
                    class="ns-well-input-shell"
                    {@attach middleClick({ onMiddleClick: () => (inputWellSoft = 100) })}
                >
                    <input
                        type="text"
                        inputmode="numeric"
                        aria-label="Zoom in Prozent"
                        class="ns-well-input"
                        value={inputWellSoft}
                        onfocus={(e) => e.currentTarget.select()}
                        onchange={(e) => (inputWellSoft = commitInput(e, inputWellSoft, 10, 400))}
                        onkeydown={(e) => handleInputKeydown(e, (dir) => (inputWellSoft = step(inputWellSoft, dir * 10)))}
                    />
                    <span class="ns-input-unit">%</span>
                </label>
                <button
                    type="button"
                    class="ns-well-btn"
                    aria-label="Vergrößern"
                    onclick={() => (inputWellSoft = step(inputWellSoft, 10))}
                >
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("3.1-well-outer-soft-inner-elevated-input", v3_1)}

        {#snippet v3_2()}
            <div class="ns-center-well" data-outer="elevated" data-inner="soft">
                <button
                    type="button"
                    class="ns-well-btn"
                    aria-label="Verkleinern"
                    onclick={() => (inputWellElevated = step(inputWellElevated, -1, 6, 96))}
                >
                    <Minus class="ns-icon" />
                </button>
                <label
                    class="ns-well-input-shell"
                    {@attach middleClick({ onMiddleClick: () => (inputWellElevated = 16) })}
                >
                    <input
                        type="text"
                        inputmode="numeric"
                        aria-label="Schriftgröße in Pixel"
                        class="ns-well-input ns-well-input-narrow"
                        value={inputWellElevated}
                        onfocus={(e) => e.currentTarget.select()}
                        onchange={(e) => (inputWellElevated = commitInput(e, inputWellElevated, 6, 96))}
                        onkeydown={(e) =>
                            handleInputKeydown(e, (dir) => (inputWellElevated = step(inputWellElevated, dir, 6, 96)))}
                    />
                    <span class="ns-input-unit">px</span>
                </label>
                <button
                    type="button"
                    class="ns-well-btn"
                    aria-label="Vergrößern"
                    onclick={() => (inputWellElevated = step(inputWellElevated, 1, 6, 96))}
                >
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("3.2-well-outer-elevated-inner-soft-input", v3_2)}
    </div>

    <!-- 3. ICON-ONLY PAIRS (FLAT TRACK WITH HAIRLINE SEPARATOR) -->
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

    <!-- 3B. VERTICAL: ICON-ONLY PAIRS & VERTICAL MIDDLE-VALUE EXPERIMENTS -->
    <div class="flex-center flex-wrap gap-7">
        <!-- Vertical Icon-Only: Soft +/- -->
        {#snippet vv_1()}
            <div class="ns-pill-v" data-surface="soft">
                <button type="button" class="ns-pill-v-btn" aria-label="Vergrößern">
                    <Plus class="ns-icon" />
                </button>
                <span class="ns-sep-v" aria-hidden="true"></span>
                <button type="button" class="ns-pill-v-btn" aria-label="Verkleinern">
                    <Minus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("vert.1-pair-soft-plus-minus", vv_1)}

        <!-- Vertical Icon-Only: Elevated +/- -->
        {#snippet vv_2()}
            <div class="ns-pill-v" data-surface="elevated">
                <button type="button" class="ns-pill-v-btn" aria-label="Vergrößern">
                    <Plus class="ns-icon" />
                </button>
                <span class="ns-sep-v" aria-hidden="true"></span>
                <button type="button" class="ns-pill-v-btn" aria-label="Verkleinern">
                    <Minus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("vert.2-pair-elevated-plus-minus", vv_2)}

        <!-- Vertical Icon-Only: Elevated ZoomIn/ZoomOut -->
        {#snippet vv_3()}
            <div class="ns-pill-v" data-surface="elevated">
                <button type="button" class="ns-pill-v-btn" aria-label="Hineinzoomen">
                    <ZoomIn class="ns-icon" />
                </button>
                <span class="ns-sep-v" aria-hidden="true"></span>
                <button type="button" class="ns-pill-v-btn" aria-label="Herauszoomen">
                    <ZoomOut class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("vert.3-pair-elevated-zoom-icons", vv_3)}

        <!-- Vertical Icon-Only: Soft ChevronUp/ChevronDown -->
        {#snippet vv_4()}
            <div class="ns-pill-v" data-surface="soft">
                <button type="button" class="ns-pill-v-btn" aria-label="Nach oben">
                    <ChevronUp class="ns-icon" />
                </button>
                <span class="ns-sep-v" aria-hidden="true"></span>
                <button type="button" class="ns-pill-v-btn" aria-label="Nach unten">
                    <ChevronDown class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("vert.4-pair-soft-chevrons", vv_4)}
    </div>

    <!-- 4. SIZE SCALE (XS 28PX .. XL 44PX) -->
    <div class="flex-center flex-wrap gap-5">
        {#snippet v9_1()}
            <div class="ns-pill" data-surface="soft" data-size="xs">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (sizeXs = step(sizeXs, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (sizeXs = 50)}
                    {@attach middleClick({ onMiddleClick: () => (sizeXs = 50) })}
                >
                    <span class="ns-val-text">{sizeXs}%</span>
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
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (sizeSm = 50)}
                    {@attach middleClick({ onMiddleClick: () => (sizeSm = 50) })}
                >
                    <span class="ns-val-text">{sizeSm}%</span>
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
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (sizeMd = 50)}
                    {@attach middleClick({ onMiddleClick: () => (sizeMd = 50) })}
                >
                    <span class="ns-val-text">{sizeMd}%</span>
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
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (sizeLg = 50)}
                    {@attach middleClick({ onMiddleClick: () => (sizeLg = 50) })}
                >
                    <span class="ns-val-text">{sizeLg}%</span>
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
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (sizeXl = 50)}
                    {@attach middleClick({ onMiddleClick: () => (sizeXl = 50) })}
                >
                    <span class="ns-val-text">{sizeXl}%</span>
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (sizeXl = step(sizeXl, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("9.5-size-xl", v9_5)}
    </div>

    <!-- 5. ON ELEVATED CARD SURFACE (HOW THEY SIT INSIDE CARDS/TOOLBARS) -->
    <div class="w-full bg-elevated shadow-elevated rounded-3xl squircle p-8 flex-center flex-wrap gap-7">
        {#snippet v11_1()}
            <div class="ns-pill" data-surface="soft" data-size="md">
                <button type="button" class="ns-pill-btn" aria-label="Verkleinern" onclick={() => (cardA = step(cardA, -10))}>
                    <Minus class="ns-icon" />
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button
                    type="button"
                    class="ns-pill-val"
                    aria-label="Zurücksetzen"
                    onclick={() => (cardA = 50)}
                    {@attach middleClick({ onMiddleClick: () => (cardA = 50) })}
                >
                    <span class="ns-val-text">{cardA}%</span>
                </button>
                <span class="ns-sep" aria-hidden="true"></span>
                <button type="button" class="ns-pill-btn" aria-label="Vergrößern" onclick={() => (cardA = step(cardA, 10))}>
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("11.1-card-pill-soft", v11_1)}

        {#snippet v11_4()}
            <div class="ns-center-well" data-outer="soft" data-inner="elevated">
                <button
                    type="button"
                    class="ns-well-btn"
                    aria-label="Verkleinern"
                    onclick={() => (cardInput = step(cardInput, -10))}
                >
                    <Minus class="ns-icon" />
                </button>
                <label
                    class="ns-well-input-shell"
                    {@attach middleClick({ onMiddleClick: () => (cardInput = 100) })}
                >
                    <input
                        type="text"
                        inputmode="numeric"
                        aria-label="Zoom in Prozent"
                        class="ns-well-input"
                        value={cardInput}
                        onfocus={(e) => e.currentTarget.select()}
                        onchange={(e) => (cardInput = commitInput(e, cardInput, 10, 400))}
                        onkeydown={(e) => handleInputKeydown(e, (dir) => (cardInput = step(cardInput, dir * 10)))}
                    />
                    <span class="ns-input-unit">%</span>
                </label>
                <button
                    type="button"
                    class="ns-well-btn"
                    aria-label="Vergrößern"
                    onclick={() => (cardInput = step(cardInput, 10))}
                >
                    <Plus class="ns-icon" />
                </button>
            </div>
        {/snippet}
        {@render pickable("11.4-card-center-input", v11_4)}
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
        will-change: scale;
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
     * 1. FLAT TRACK WITH HAIRLINE SEPARATORS
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
        user-select: none;

        &[data-surface="elevated"] {
            --ns-bg: var(--cs-color-elevated);
            --ns-hover: light-dark(
                color-mix(in oklab, var(--cs-color-base-900) 3%, transparent),
                var(--cs-color-base-soft)
            );
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
        corner-shape: var(--cs-squircle-soft);
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

        &:focus-visible {
            z-index: 2;
        }

        @media (hover: hover) {
            &:hover {
                color: var(--ns-fg-strong);
                background-color: var(--ns-hover);
            }
        }
    }

    .ns-pill-val {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--ns-val-min-w);
        padding-inline: 8px;
        color: var(--ns-fg-strong);
        background: transparent;
        font-variant-numeric: tabular-nums;
        transition:
            background-color var(--cs-dur-effect) var(--cs-ease-effect),
            color var(--cs-dur-effect) var(--cs-ease-effect);

        &:focus-visible {
            z-index: 2;
        }

        @media (hover: hover) {
            &:hover {
                background-color: var(--ns-hover);
            }
        }

        &:active :global(.ns-val-text) {
            scale: 0.93;
            transition: scale var(--cs-dur-press) var(--cs-ease-press);
        }
    }

    :global(.ns-val-text) {
        will-change: scale;
        scale: 1;
        transition: scale var(--cs-dur-squash) var(--cs-ease-squash);
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
     * 2. TRACK WITH HIGHLIGHTED CENTER WELL (EDITABLE INPUT)
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

    .ns-well-input-shell {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 1px;
        min-width: 58px;
        height: calc(var(--ns-h) - var(--ns-pad) * 2);
        padding-inline: 8px;
        color: var(--cs-color-text-strong);
        border-radius: calc((var(--ns-h) - var(--ns-pad) * 2) / 2);
        corner-shape: var(--cs-squircle-soft);
        cursor: text;
        transition:
            background-color var(--cs-dur-effect) var(--cs-ease-effect),
            box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);

        [data-inner="elevated"] & {
            background-color: light-dark(white, color-mix(in oklab, var(--cs-color-base-100) 14%, transparent));
            box-shadow: light-dark(var(--cs-shadow-xs), none);

            @media (hover: hover) {
                &:hover:not(:focus-within) {
                    background-color: light-dark(white, color-mix(in oklab, var(--cs-color-base-100) 20%, transparent));
                }
            }
        }

        [data-inner="soft"] & {
            background-color: var(--cs-color-base-soft);

            @media (hover: hover) {
                &:hover:not(:focus-within) {
                    background-color: var(--cs-color-base-soft-hover);
                }
            }
        }

        &:focus-within {
            box-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);
        }
    }

    .ns-well-input {
        width: 3ch;
        padding: 0;
        margin: 0;
        font: inherit;
        font-variant-numeric: tabular-nums;
        color: inherit;
        text-align: right;
        background: transparent;
        border: none;
        outline: none;
        caret-color: var(--cs-color-accent-solid);

        &.ns-well-input-narrow {
            width: 2.2ch;
        }
    }

    .ns-input-unit {
        color: var(--cs-color-text-weak);
        font-weight: 500;
        user-select: none;
        pointer-events: none;
    }

    /* =========================================================================
     * 3. VERTICAL TRACKS (ICON-ONLY & VERTICAL VALUE EXPERIMENTS)
     * ========================================================================= */
    .ns-pill-v {
        --ns-w: 36px;
        --ns-bg: var(--cs-color-base-soft);
        --ns-hover: var(--cs-color-base-soft-hover);
        --ns-fg: var(--cs-color-text-main);
        --ns-fg-strong: var(--cs-color-text-strong);
        --ns-shadow: none;
        --ns-sep-color: color-mix(in oklab, var(--cs-color-text-main) 16%, transparent);

        position: relative;
        display: inline-flex;
        flex-direction: column;
        align-items: stretch;
        width: var(--ns-w);
        font-size: var(--cs-text-xs);
        font-weight: 600;
        background-color: var(--ns-bg);
        border-radius: calc(var(--ns-w) / 2);
        corner-shape: var(--cs-squircle-soft);
        box-shadow: var(--ns-shadow);
        user-select: none;

        &[data-surface="elevated"] {
            --ns-bg: var(--cs-color-elevated);
            --ns-hover: light-dark(
                color-mix(in oklab, var(--cs-color-base-900) 3%, transparent),
                var(--cs-color-base-soft)
            );
            --ns-shadow: var(--cs-shadow-elevated);
        }
    }

    .ns-pill-v-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        aspect-ratio: 1;
        color: var(--ns-fg);
        background: transparent;
        border-radius: 0;
        corner-shape: var(--cs-squircle-soft);
        transition:
            background-color var(--cs-dur-effect) var(--cs-ease-effect),
            color var(--cs-dur-effect) var(--cs-ease-effect);

        &:first-child {
            border-top-left-radius: calc(var(--ns-w) / 2);
            border-top-right-radius: calc(var(--ns-w) / 2);
        }

        &:last-child {
            border-bottom-left-radius: calc(var(--ns-w) / 2);
            border-bottom-right-radius: calc(var(--ns-w) / 2);
        }

        &:focus-visible {
            z-index: 2;
        }

        @media (hover: hover) {
            &:hover {
                color: var(--ns-fg-strong);
                background-color: var(--ns-hover);
            }
        }
    }

    .ns-sep-v {
        position: relative;
        height: 0;
        align-self: stretch;
        pointer-events: none;
        z-index: 1;

        &::before {
            content: "";
            position: absolute;
            inset-inline: 24%;
            top: 0;
            height: 1px;
            translate: 0 -50%;
            background-color: var(--ns-sep-color);
            transition: opacity var(--cs-dur-effect) var(--cs-ease-effect);
        }
    }

    .ns-pill-v > button:is(:hover, :active, :focus-visible) + .ns-sep-v::before,
    .ns-sep-v:has(+ button:is(:hover, :active, :focus-visible))::before {
        opacity: 0;
    }
</style>
