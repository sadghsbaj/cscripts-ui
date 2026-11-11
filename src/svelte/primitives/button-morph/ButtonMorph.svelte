<!--
@component
Composite state-morphing container (`<ButtonMorph />`) that smoothly interpolates geometry,
surfaces, icons, and labels across multiple `<ButtonMorphItem />` button states.

Architectural Notes:
- Shared Morph Shell: Synchronizes outer dimensions (`--_morph-width`, `--_morph-height`) and
  locks active/exiting button surfaces during transitions so `::before` backgrounds and
  `:focus-visible` outlines morph as a single cohesive body.
- Interaction Safety & Auto-Reset: Includes capture-phase accidental double-click protection
  (`guardDelay`), automatic keyboard focus handoff, and configurable auto-reset via timeout
  (hover-paused), outside click (`clickOutside`), or `Escape`.
-->
<script lang="ts">
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

    $effect(() => {
        void value;
        void resetTimeout;
        morph.syncValue(value);
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
             * content upward from +6px while outgoing content exits to -6px.
             * Backward transitions (e.g. reset back to "idle") invert the
             * vertical axis so the spatial mental model feels reversible.
             * ========================================================= */
            --_enter-y: 6px;
            --_exit-y: -6px;

            isolation: isolate;
            position: relative;
            display: inline-grid;
            place-items: center;
            vertical-align: middle;
            flex-shrink: 0;

            &[data-direction="backward"] {
                --_enter-y: -6px;
                --_exit-y: 6px;
            }

            /* =========================================================
             * MEASURED SHELL & SPRING INTERPOLATION
             * ---------------------------------------------------------
             * Before `ResizeObserver` captures the initial slot dimensions,
             * the container sizes naturally to its active child (SSR-safe).
             * Once `[data-measured]` is set, explicit pixel dimensions take
             * over so subsequent state changes interpolate smoothly via
             * `--cs-spring-snappy` (~4% tactile overshoot) and push/pull
             * adjacent layout siblings without abrupt jumps.
             * ========================================================= */
            &[data-measured] {
                width: var(--_morph-width);
                height: var(--_morph-height);
                transition:
                    width 320ms var(--cs-spring-snappy),
                    height 320ms var(--cs-spring-snappy);
            }
        }
    }
</style>
