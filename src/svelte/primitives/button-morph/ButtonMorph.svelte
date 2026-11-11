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
