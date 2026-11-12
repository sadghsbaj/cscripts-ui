<!--
@component
Composite state-morphing container (`<ButtonMorph />`) that smoothly interpolates geometry,
surfaces, icons, and labels across multiple `<ButtonMorphItem />` button states.

Architectural Notes:
- Shared Morph Shell: Synchronizes outer dimensions (`--_morph-width`, `--_morph-height`) and
  locks active/exiting button surfaces during transitions so `::before` backgrounds and
  `:focus-visible` outlines morph as a single cohesive body.
  See `../../explanations/elastic-surfaces.md`
- Interaction Safety & Auto-Reset: Includes capture-phase accidental double-click protection
  (`guardDelay`), automatic keyboard focus handoff, and configurable auto-reset via timeout
  (hover-paused), outside click (`clickOutside`), or `Escape`.
- Defaults & Resets: Requires explicit configuration and relies on global foundation focus/outline behaviors.
  See `../../explanations/component-defaults-and-globals.md`
-->
<script lang="ts">
    import { untrack } from "svelte";

    import { clickOutside } from "../click-outside/index.ts";
    import {
        ButtonMorphManager,
        DEFAULT_GUARD_DELAY_MS,
        setButtonMorphContext,
        type ButtonMorphProps,
    } from "./index.ts";

    let {
        value = $bindable(),
        defaultValue,
        guardDelay = DEFAULT_GUARD_DELAY_MS,
        resetTimeout,
        resetOnOutsideClick = false,
        resetOnEscape = false,
        onReset,
        class: className,
        children,
        ...rest
    }: ButtonMorphProps = $props();

    const morph = new ButtonMorphManager({
        getValue: () => value,
        setValue: (nextValue) => {
            value = nextValue;
        },
        getDefaultValue: () => defaultValue,
        getGuardDelay: () => guardDelay,
        getResetTimeout: () => resetTimeout,
        getResetOnOutsideClick: () => resetOnOutsideClick,
        getResetOnEscape: () => resetOnEscape,
        onReset: (reason) => onReset?.(reason),
    });

    setButtonMorphContext(morph);

    // Only `value` and `resetTimeout` should re-trigger the sync. `syncValue` reads and writes a lot of
    // manager state (transition flags, timers); tracking those would re-run this effect on every flip.
    $effect(() => {
        const currentValue = value;
        void resetTimeout;
        untrack(() => morph.syncValue(currentValue));
    });
</script>

<div
    {...rest}
    {@attach morph.attachRoot}
    {@attach clickOutside({
        handler: morph.handleOutsideClick,
        enabled: morph.isOutsideClickActive,
    })}
    class={["cs-button-morph", className]}
    data-direction={morph.direction}
    data-measured={morph.isMeasured ? "" : undefined}
    data-transitioning={morph.isTransitioning ? "" : undefined}
    data-guarded={morph.isGuarded ? "" : undefined}
    style:--_morph-width={morph.width !== null ? `${morph.width}px` : undefined}
    style:--_morph-height={morph.height !== null ? `${morph.height}px` : undefined}
    style:--_morph-from-bg={morph.surfaceFrom?.background}
    style:--_morph-from-shadow={morph.surfaceFrom?.shadow}
    style:--_morph-to-bg={morph.surfaceTo?.background}
    style:--_morph-to-shadow={morph.surfaceTo?.shadow}
    style:--_morph-from-corner={morph.surfaceFrom?.corner ?? undefined}
    style:--_morph-to-corner={morph.surfaceTo?.corner ?? undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-button-morph {
            /* =========================================================
             * DIRECTIONAL CONTENT VECTORS
             * ---------------------------------------------------------
             * Forward transitions (e.g. "idle" -> "confirm") roll incoming
             * content upward from +3px while outgoing content exits to -3px.
             * Backward transitions (e.g. reset back to "idle") invert the
             * vertical axis so the spatial mental model feels reversible.
             * ========================================================= */
            --_enter-y: 3px;
            --_exit-y: -3px;

            isolation: isolate;
            position: relative;
            display: inline-grid;
            flex-shrink: 0;
            place-items: center;
            vertical-align: middle;

            &[data-direction="backward"] {
                --_enter-y: -3px;
                --_exit-y: 3px;
            }

            /* =========================================================
             * MEASURED SHELL & VISCOUS SPRING INTERPOLATION
             * ---------------------------------------------------------
             * Before `ResizeObserver` captures the initial slot dimensions,
             * the container sizes naturally to its active child (SSR-safe).
             * Once `[data-measured]` is set:
             * 1. `grid-template-columns/rows: minmax(0, 1fr)` constrains the
             *    shared `1 / 1` grid cell strictly to `--_morph-width` and
             *    `--_morph-height`. Without `minmax(0, 1fr)`, a wider incoming
             *    button's intrinsic `min-content` width would immediately blow
             *    out the grid track to the right on frame 0.
             * 2. `--cs-spring-morph` (350ms) provides tactile initial friction
             *    and a gentle ~1.4% settle so the eye can comfortably track
             *    the pill morphing and pushing adjacent layout siblings.
             * ========================================================= */
            &[data-measured] {
                grid-template-rows: minmax(0, 1fr);
                grid-template-columns: minmax(0, 1fr);
                width: var(--_morph-width);
                height: var(--_morph-height);
                transition:
                    width 350ms var(--cs-spring-morph),
                    height 350ms var(--cs-spring-morph);
            }

            /* =========================================================
             * CONTINUOUS MORPH SURFACE (::before)
             * ---------------------------------------------------------
             * See ../../explanations/elastic-surfaces.md
             *
             * During a transition the individual button surfaces are hidden
             * (see ButtonMorphItem) and this single shell surface takes over.
             * It interpolates directly from the outgoing button's resolved
             * background and shadow to the incoming one's, so the user sees
             * one body changing color instead of two translucent layers
             * stacked on top of each other (which muddies `soft` surfaces).
             *
             * - `--cs-radius-full` on a single, symmetric element always yields
             *   a perfect pill at any interpolated height, so the shape never
             *   needs to chase the animating size.
             * - Colors, shadows and the corner exponent are read once by the state
             *   manager at the moment of the switch, which keeps the handoff to and
             *   from the real button surfaces visually seamless.
             * - `corner-shape` is driven by the registered `--_morph-corner` number
             *   (see `@property` below) instead of being keyframed directly: it is a
             *   shorthand, and shorthands containing `var()` are not animated inside
             *   `@keyframes`. The custom property is a plain longhand, so it
             *   interpolates (e.g. a `CloseButton` at 1.2 into a `Button` at 1.6).
             * ========================================================= */
            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 0;
                border-radius: var(--cs-radius-full);
                corner-shape: superellipse(var(--_morph-corner));
                opacity: 0;
                pointer-events: none;
            }

            &[data-transitioning]::before {
                background-color: var(--_morph-to-bg, transparent);
                box-shadow: var(--_morph-to-shadow, none);
                opacity: 1;
                animation: cs-button-morph-surface 160ms var(--cs-ease-quad-in-out) both;
            }
        }

        /* Registered so the browser can interpolate it numerically (must stay in sync with `--cs-squircle-smooth`). */
        @property --_morph-corner {
            syntax: "<number>";
            inherits: false;
            initial-value: 1.6;
        }

        @keyframes cs-button-morph-surface {
            from {
                --_morph-corner: var(--_morph-from-corner, 1.6);
                background-color: var(--_morph-from-bg, transparent);
                box-shadow: var(--_morph-from-shadow, none);
            }
            to {
                --_morph-corner: var(--_morph-to-corner, 1.6);
                background-color: var(--_morph-to-bg, transparent);
                box-shadow: var(--_morph-to-shadow, none);
            }
        }
    }
</style>
