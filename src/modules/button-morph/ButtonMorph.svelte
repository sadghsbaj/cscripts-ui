<!--
@component
Composite state-morphing container (`<ButtonMorph />`) that smoothly interpolates geometry,
surfaces, icons, and labels across multiple `<ButtonMorphItem />` button states.

Architectural Notes:
- Shared Morph Shell: Synchronizes outer dimensions (`--cs-button-morph-width`, `--cs-button-morph-height`) and
  locks active/exiting button surfaces during transitions so `::before` backgrounds and
  `:focus-visible` outlines morph as a single cohesive body.
- Interaction Safety & Auto-Reset: Includes capture-phase accidental double-click protection
  (`guardDelay`), automatic keyboard focus handoff, and configurable auto-reset via timeout
  (hover-paused), outside click (`clickOutside`), or `Escape`.
- Defaults & Resets: Requires explicit configuration and relies on global foundation focus/outline behaviors.
-->
<script lang="ts">
    import { untrack } from "svelte";

    import { clickOutside } from "../click-outside/index.ts";
    import { ButtonMorphManager, DEFAULT_GUARD_DELAY_MS } from "./button-morph-state.internal.svelte.ts";
    import { setButtonMorphContext, type ButtonMorphProps } from "./index.ts";

    let {
        ref = $bindable(null),
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
    bind:this={ref}
    {...rest}
    {@attach morph.attachRoot}
    {@attach clickOutside({
        onOutsideClick: morph.handleOutsideClick,
        enabled: morph.isOutsideClickActive,
    })}
    class={["cs-button-morph", className]}
    data-direction={morph.direction}
    data-measured={morph.isMeasured ? "" : undefined}
    data-transitioning={morph.isTransitioning ? "" : undefined}
    data-guarded={morph.isGuarded ? "" : undefined}
    style:--cs-button-morph-width={morph.width !== null ? `${morph.width}px` : undefined}
    style:--cs-button-morph-height={morph.height !== null ? `${morph.height}px` : undefined}
    style:--cs-button-morph-from-bg={morph.surfaceFrom?.background}
    style:--cs-button-morph-from-shadow={morph.surfaceFrom?.shadow}
    style:--cs-button-morph-to-bg={morph.surfaceTo?.background}
    style:--cs-button-morph-to-shadow={morph.surfaceTo?.shadow}
    style:--cs-button-morph-from-superellipse={morph.surfaceFrom?.corner ?? undefined}
    style:--cs-button-morph-to-superellipse={morph.surfaceTo?.corner ?? undefined}
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
            --cs-button-morph-enter-y: 3px;
            --cs-button-morph-exit-y: -3px;

            isolation: isolate;
            position: relative;
            display: inline-grid;
            flex-shrink: 0;
            place-items: center;
            vertical-align: middle;

            &[data-direction="backward"] {
                --cs-button-morph-enter-y: -3px;
                --cs-button-morph-exit-y: 3px;
            }

            /* =========================================================
             * MEASURED SHELL & VISCOUS SPRING INTERPOLATION
             * ---------------------------------------------------------
             * Before `ResizeObserver` captures the initial slot dimensions,
             * the container sizes naturally to its active child (SSR-safe).
             * Once `[data-measured]` is set:
             * 1. `grid-template-columns/rows: minmax(0, 1fr)` constrains the
             *    shared `1 / 1` grid cell strictly to `--cs-button-morph-width` and
             *    `--cs-button-morph-height`. Without `minmax(0, 1fr)`, a wider incoming
             *    button's intrinsic `min-content` width would immediately blow
             *    out the grid track to the right on frame 0.
             * 2. `--cs-spring-morph` (350ms) provides tactile initial friction
             *    and a gentle ~1.4% settle so the eye can comfortably track
             *    the pill morphing and pushing adjacent layout siblings.
             * ========================================================= */
            &[data-measured] {
                grid-template-rows: minmax(0, 1fr);
                grid-template-columns: minmax(0, 1fr);
                width: var(--cs-button-morph-width);
                height: var(--cs-button-morph-height);
                transition:
                    width 350ms var(--cs-spring-morph),
                    height 350ms var(--cs-spring-morph);
            }

            /* =========================================================
             * CONTINUOUS MORPH SURFACE (::before)
             * ---------------------------------------------------------
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
             * - `corner-shape` is driven by the registered `--cs-button-morph-superellipse` number
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
                corner-shape: superellipse(var(--cs-button-morph-superellipse));
                opacity: 0;
                pointer-events: none;
            }

            &[data-transitioning]::before {
                background-color: var(--cs-button-morph-to-bg, transparent);
                box-shadow: var(--cs-button-morph-to-shadow, none);
                opacity: 1;
                animation: cs-button-morph-surface 160ms var(--cs-ease-quad-in-out) both;
            }
        }

        /* Registered so the browser can interpolate it numerically (must stay in sync with `--cs-squircle-smooth`). */
        @property --cs-button-morph-superellipse {
            syntax: "<number>";
            inherits: false;
            initial-value: 1.6;
        }

        @keyframes cs-button-morph-surface {
            from {
                --cs-button-morph-superellipse: var(--cs-button-morph-from-superellipse, 1.6);
                background-color: var(--cs-button-morph-from-bg, transparent);
                box-shadow: var(--cs-button-morph-from-shadow, none);
            }
            to {
                --cs-button-morph-superellipse: var(--cs-button-morph-to-superellipse, 1.6);
                background-color: var(--cs-button-morph-to-bg, transparent);
                box-shadow: var(--cs-button-morph-to-shadow, none);
            }
        }
    }
</style>
