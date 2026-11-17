<script lang="ts">
    import { middleClick } from "../middle-click/index.ts";
    import { setNumberStepperContext, type NumberStepperProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        orientation,
        value = $bindable(0),
        min,
        max,
        step = 1,
        defaultValue,
        onValueChange,
        disabled = false,
        invalid = false,
        class: className,
        children,
        ...rest
    }: NumberStepperProps = $props();

    function getDecimalPlaces(num: number): number {
        if (!Number.isFinite(num)) return 0;
        const str = num.toString();
        const expIndex = str.indexOf("e-");
        if (expIndex !== -1) {
            const exp = Number(str.slice(expIndex + 2));
            const dotIndex = str.indexOf(".");
            const fracLen = dotIndex === -1 ? 0 : expIndex - dotIndex - 1;
            return exp + fracLen;
        }
        const dotIndex = str.indexOf(".");
        return dotIndex === -1 ? 0 : str.length - dotIndex - 1;
    }

    function clamp(num: number): number {
        let next = num;
        if (min !== undefined && next < min) next = min;
        if (max !== undefined && next > max) next = max;
        return next;
    }

    function commitValue(next: number): void {
        if (disabled || !Number.isFinite(next)) return;
        const clamped = clamp(next);
        if (clamped === value) return;
        value = clamped;
        onValueChange?.(clamped);
    }

    function stepBy(delta: number): void {
        if (disabled) return;
        const decimals = Math.max(getDecimalPlaces(step), getDecimalPlaces(min ?? 0));
        const rawNext = value + delta;
        const normalized = decimals > 0 ? Number(rawNext.toFixed(decimals)) : rawNext;
        commitValue(normalized);
    }

    function decrement(): void {
        stepBy(-step);
    }

    function increment(): void {
        stepBy(step);
    }

    function reset(): void {
        if (disabled || defaultValue === undefined) return;
        commitValue(defaultValue);
    }

    const canDecrement = $derived(!disabled && (min === undefined || value > min));
    const canIncrement = $derived(!disabled && (max === undefined || value < max));

    setNumberStepperContext({
        get value() {
            return value;
        },
        get min() {
            return min;
        },
        get max() {
            return max;
        },
        get step() {
            return step;
        },
        get defaultValue() {
            return defaultValue;
        },
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get orientation() {
            return orientation;
        },
        get disabled() {
            return Boolean(disabled);
        },
        get invalid() {
            return Boolean(invalid);
        },
        get canDecrement() {
            return canDecrement;
        },
        get canIncrement() {
            return canIncrement;
        },
        decrement,
        increment,
        stepBy,
        commitValue,
        reset,
    });
</script>

<div
    bind:this={ref}
    role="group"
    {...rest}
    {@attach middleClick({
        enabled: () => !disabled && defaultValue !== undefined,
        onMiddleClick: () => reset(),
    })}
    class={["cs-number-stepper", className]}
    data-variant={variant}
    data-size={size}
    data-orientation={orientation}
    data-disabled={disabled ? "" : undefined}
    data-invalid={invalid ? "" : undefined}
    aria-disabled={disabled ? "true" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-number-stepper {
            --cs-number-stepper-fg: var(--cs-color-text-main);
            --cs-number-stepper-fg-strong: var(--cs-color-text-strong);
            --cs-number-stepper-fg-disabled: var(--cs-color-disabled-fg);
            --cs-number-stepper-sep-color: color-mix(in oklch, var(--cs-color-text-main) 16%, transparent);
            --cs-number-stepper-well-ring: inset 0 0 0 0px transparent;

            position: relative;
            display: inline-flex;
            align-items: center;
            width: fit-content;
            color: var(--cs-number-stepper-fg);
            font-size: var(--cs-number-stepper-font-size);
            line-height: 1;
            background-color: var(--cs-number-stepper-bg);
            border-radius: var(--cs-number-stepper-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-number-stepper-shadow);
            user-select: none;
            cursor: default;
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                box-shadow var(--cs-dur-effect) var(--cs-ease-effect);

            /* =========================================================
             * SIZES (xs - xl, matching Button & TextInput 28-44px 1:1)
             * ========================================================= */
            &[data-size="xs"] {
                --cs-number-stepper-height: 28px;
                --cs-number-stepper-width: 28px;
                --cs-number-stepper-pad: 3px;
                --cs-number-stepper-font-size: var(--cs-text-xs);
                --cs-number-stepper-icon-size: 14px;
                --cs-number-stepper-value-min-width: 42px;
                --cs-number-stepper-well-px: 8px;
            }

            &[data-size="sm"] {
                --cs-number-stepper-height: 32px;
                --cs-number-stepper-width: 32px;
                --cs-number-stepper-pad: 3px;
                --cs-number-stepper-font-size: var(--cs-text-xs);
                --cs-number-stepper-icon-size: 14px;
                --cs-number-stepper-value-min-width: 46px;
                --cs-number-stepper-well-px: 8px;
            }

            &[data-size="md"] {
                --cs-number-stepper-height: 36px;
                --cs-number-stepper-width: 36px;
                --cs-number-stepper-pad: 3px;
                --cs-number-stepper-font-size: var(--cs-text-sm);
                --cs-number-stepper-icon-size: 16px;
                --cs-number-stepper-value-min-width: 52px;
                --cs-number-stepper-well-px: 10px;
            }

            &[data-size="lg"] {
                --cs-number-stepper-height: 40px;
                --cs-number-stepper-width: 40px;
                --cs-number-stepper-pad: 4px;
                --cs-number-stepper-font-size: var(--cs-text-sm);
                --cs-number-stepper-icon-size: 16px;
                --cs-number-stepper-value-min-width: 58px;
                --cs-number-stepper-well-px: 10px;
            }

            &[data-size="xl"] {
                --cs-number-stepper-height: 44px;
                --cs-number-stepper-width: 44px;
                --cs-number-stepper-pad: 4px;
                --cs-number-stepper-font-size: var(--cs-text-base);
                --cs-number-stepper-icon-size: 18px;
                --cs-number-stepper-value-min-width: 64px;
                --cs-number-stepper-well-px: 10px;
            }

            /* =========================================================
             * ORIENTATIONS
             * ========================================================= */
            &[data-orientation="horizontal"] {
                flex-direction: row;
                height: var(--cs-number-stepper-height);
                --cs-number-stepper-radius: calc(var(--cs-number-stepper-height) / 2);
            }

            &[data-orientation="vertical"] {
                flex-direction: column;
                width: var(--cs-number-stepper-width);
                --cs-number-stepper-radius: calc(var(--cs-number-stepper-width) / 2);
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="soft"] {
                --cs-number-stepper-bg: var(--cs-color-base-soft);
                --cs-number-stepper-shadow: none;
                --cs-number-stepper-btn-bg-hover: var(--cs-color-base-soft-hover);
                --cs-number-stepper-btn-bg-hover-input: var(--cs-color-base-soft-hover);
                --cs-number-stepper-well-bg: light-dark(
                    white,
                    color-mix(in oklch, var(--cs-color-base-100) 14%, transparent)
                );
                --cs-number-stepper-well-bg-hover: light-dark(
                    white,
                    color-mix(in oklch, var(--cs-color-base-100) 18%, transparent)
                );
                --cs-number-stepper-well-shadow: light-dark(var(--cs-shadow-xs), none);
                --cs-number-stepper-well-shadow-hover: light-dark(var(--cs-shadow-sm), none);
            }

            &[data-variant="elevated"] {
                --cs-number-stepper-bg: var(--cs-color-elevated);
                --cs-number-stepper-shadow: var(--cs-shadow-elevated);
                --cs-number-stepper-btn-bg-hover: light-dark(
                    color-mix(in oklch, var(--cs-color-base-900) 4%, transparent),
                    var(--cs-color-base-soft)
                );
                --cs-number-stepper-btn-bg-hover-input: var(--cs-color-base-soft);
                --cs-number-stepper-well-bg: var(--cs-color-base-soft);
                --cs-number-stepper-well-bg-hover: var(--cs-color-base-soft-hover);
                --cs-number-stepper-well-shadow: none;
                --cs-number-stepper-well-shadow-hover: none;
            }

            /* =========================================================
             * STATES
             * ========================================================= */
            &[data-invalid]:not([data-disabled]) {
                --cs-number-stepper-well-ring: inset 0 0 0 2px var(--cs-color-negative-solid);
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-number-stepper-fg: var(--cs-color-disabled-fg);
                --cs-number-stepper-fg-strong: var(--cs-color-disabled-fg);
                --cs-number-stepper-fg-disabled: var(--cs-color-disabled-fg);
                --cs-number-stepper-well-ring: inset 0 0 0 0px transparent;

                &[data-variant="soft"] {
                    --cs-number-stepper-bg: var(--cs-color-disabled-bg);
                    --cs-number-stepper-shadow: none;
                    --cs-number-stepper-well-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-number-stepper-well-bg-hover: var(--cs-color-disabled-bg-elevated);
                    --cs-number-stepper-well-shadow: none;
                    --cs-number-stepper-well-shadow-hover: none;
                }

                &[data-variant="elevated"] {
                    --cs-number-stepper-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-number-stepper-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                    --cs-number-stepper-well-bg: var(--cs-color-disabled-bg);
                    --cs-number-stepper-well-bg-hover: var(--cs-color-disabled-bg);
                    --cs-number-stepper-well-shadow: none;
                    --cs-number-stepper-well-shadow-hover: none;
                }
            }

            /* =========================================================
             * EDITABLE INPUT MODE LAYOUT
             * ========================================================= */
            &:has(> :global(.cs-number-stepper-input-shell)) {
                padding: var(--cs-number-stepper-pad);
                gap: var(--cs-number-stepper-pad);
                --cs-number-stepper-btn-bg-hover: var(--cs-number-stepper-btn-bg-hover-input);

                & > :global(.cs-number-stepper-btn) {
                    width: calc(var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2);
                    height: calc(var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2);
                    border-radius: calc((var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2) / 2);
                    corner-shape: var(--cs-squircle-soft);
                }
            }

            /* =========================================================
             * NON-INPUT MODE (SEGMENTED TRACK + HAIRLINE SEPARATORS)
             * ========================================================= */
            &[data-orientation="horizontal"]:not(:has(> :global(.cs-number-stepper-input-shell))) {
                & > :global(.cs-number-stepper-btn) {
                    height: 100%;
                    aspect-ratio: 1;
                }

                & > :global(*:first-child) {
                    border-start-start-radius: var(--cs-number-stepper-radius);
                    border-end-start-radius: var(--cs-number-stepper-radius);
                    corner-shape: var(--cs-squircle-soft);
                }

                & > :global(*:last-child) {
                    border-start-end-radius: var(--cs-number-stepper-radius);
                    border-end-end-radius: var(--cs-number-stepper-radius);
                    corner-shape: var(--cs-squircle-soft);
                }

                & > :global(*:not(:last-child))::after {
                    content: "";
                    position: absolute;
                    inset-block: 24%;
                    right: 0;
                    width: 1px;
                    background-color: var(--cs-number-stepper-sep-color);
                    pointer-events: none;
                    transition: opacity var(--cs-dur-effect) var(--cs-ease-effect);
                }

                & > :global(button:not(:disabled):is(:hover, :active, :focus-visible):not(:last-child))::after,
                & > :global(*:not(:last-child):has(+ button:not(:disabled):is(:hover, :active, :focus-visible)))::after {
                    opacity: 0;
                }
            }

            &[data-orientation="vertical"] {
                & > :global(.cs-number-stepper-btn) {
                    width: 100%;
                    aspect-ratio: 1;
                }

                /* Increment always sits on top, decrement on bottom regardless of DOM order */
                & > :global([data-direction="increment"]) {
                    order: 1;
                    border-start-start-radius: var(--cs-number-stepper-radius);
                    border-start-end-radius: var(--cs-number-stepper-radius);
                    corner-shape: var(--cs-squircle-soft);

                    &::after {
                        content: "";
                        position: absolute;
                        inset-inline: 24%;
                        bottom: 0;
                        height: 1px;
                        background-color: var(--cs-number-stepper-sep-color);
                        pointer-events: none;
                        transition: opacity var(--cs-dur-effect) var(--cs-ease-effect);
                    }
                }

                & > :global([data-direction="decrement"]) {
                    order: 2;
                    border-end-start-radius: var(--cs-number-stepper-radius);
                    border-end-end-radius: var(--cs-number-stepper-radius);
                    corner-shape: var(--cs-squircle-soft);
                }

                & > :global([data-direction="increment"]:not(:disabled):is(:hover, :active, :focus-visible))::after,
                &:has(> :global([data-direction="decrement"]:not(:disabled):is(:hover, :active, :focus-visible)))
                    > :global([data-direction="increment"])::after {
                    opacity: 0;
                }
            }

            /* =========================================================
             * STEP BUTTONS (SHARED BY DECREMENT & INCREMENT)
             * ========================================================= */
            & > :global(.cs-number-stepper-btn) {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                padding: 0;
                border: none;
                background-color: transparent;
                color: var(--cs-number-stepper-fg);
                cursor: default;
                transition:
                    background-color var(--cs-dur-effect) var(--cs-ease-effect),
                    color var(--cs-dur-effect) var(--cs-ease-effect);

                &:focus-visible {
                    z-index: 2;
                }

                @media (hover: hover) {
                    &:hover:not(:disabled) {
                        background-color: var(--cs-number-stepper-btn-bg-hover);
                        color: var(--cs-number-stepper-fg-strong);
                    }
                }

                &:disabled {
                    --cs-disabled-opacity: 1;
                    color: var(--cs-number-stepper-fg-disabled);
                }

                & > :global(.cs-number-stepper-icon) {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: var(--cs-number-stepper-icon-size);
                    height: var(--cs-number-stepper-icon-size);
                    flex-shrink: 0;
                    transition: scale var(--cs-dur-200) var(--cs-spring-snappy);
                }

                &:active:not(:disabled) > :global(.cs-number-stepper-icon) {
                    scale: 0.88;
                    transition: scale var(--cs-dur-press) var(--cs-ease-press);
                }
            }
        }
    }
</style>
