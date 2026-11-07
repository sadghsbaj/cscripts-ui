<!--
@component
Two-state toggle button primitive (`<ToggleButton />`) supporting controlled and uncontrolled
state via `bind:pressed` or `pressed`, semantic color themes, and spring-physics press feedback.

Architectural Notes:
- Accessibility: Operates as an accessible WAI-ARIA toggle button using `aria-pressed="true" | "false"`.
- Defaults & Resets: Requires explicit `variant`, `size`, and `color` props.
  See `../../explanations/component-defaults-and-globals.md`
-->
<script lang="ts">
    import type { ToggleButtonProps } from "./index.ts";

    let {
        variant,
        color,
        size,
        iconOnly,
        pressed = $bindable(false),
        class: className,
        onclick,
        children,
        ...rest
    }: ToggleButtonProps = $props();

    function handleClick(
        event: MouseEvent & {
            currentTarget: EventTarget & HTMLButtonElement;
        }
    ): void {
        onclick?.(event);
        if (!event.defaultPrevented) {
            pressed = !pressed;
        }
    }
</script>

<button
    {...rest}
    type="button"
    aria-pressed={pressed}
    onclick={handleClick}
    class={["cs-toggle-button", className]}
    data-variant={variant}
    data-color={color}
    data-size={size}
    data-icon-only={iconOnly ? "" : undefined}
>
    {@render children?.()}
</button>

<style>
    @layer components.primitive {
        .cs-toggle-button {
            /* Dynamically computed from height instead of --cs-radius-full (9999px).
            * A 9999px radius would trigger the CSS Corner Overlap reduction algorithm
            * (CSS Backgrounds & Borders §5.5) on asymmetric corners (e.g. inside ButtonGroup),
            * proportionally crushing small adjacent radii (e.g. 4px) down to near 0px. */
            --_pill-radius: calc(var(--_height) / 2);

            /* Fill transition per state (consumed by ::after).
             * When releasing (pressed -> unpressed), transform deliberately uses a slower
             * 300ms quad-in curve while opacity fades out in only 140ms. Because quad-in
             * starts slowly, the fill barely shrinks (~0.90 scale) before becoming completely
             * invisible. This yields a calm, smooth background fade for the human eye without
             * an abrupt collapse, while still allowing ::after to settle at scale(0.55) so the
             * next press pop-in has full spring distance and momentum. */
            --_fill-transition: transform 300ms var(--cs-ease-quad-in), opacity 140ms linear;

            isolation: isolate;
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            height: var(--_height);
            color: var(--_fg);
            font-weight: 600;
            white-space: nowrap;
            border-radius: var(--_pill-radius);
            corner-shape: var(--cs-squircle-smooth);
            user-select: none;
            transition:
                color 200ms var(--cs-ease-quad-out),
                scale 200ms var(--cs-ease-expo-out);

            /* =========================================================
             * ELASTIC SURFACE (::before)
             * ---------------------------------------------------------
             * Decouples visual surface from text/icons for squash-and-stretch.
             * See ../../explanations/elastic-surfaces.md
             * ========================================================= */
            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -2;
                background-color: var(--_bg);
                border: var(--_border, none);
                border-radius: inherit;
                corner-shape: inherit;
                box-shadow: var(--_shadow, none);
                transition:
                    background-color 200ms var(--cs-ease-quad-out),
                    box-shadow 200ms var(--cs-ease-quad-out),
                    scale 600ms var(--cs-spring-release); /* CSS linear() transition */
            }

            /* =========================================================
            * PRESSED FILL (::after)
            * ---------------------------------------------------------
            * Lives above the base surface. Pops in from the center with a
            * spring overshoot when pressed, shrinks back (no spring) when
            * released. `transform` drives the pop, `scale` the shared
            * pointer squash, so both compose without fighting.
            * ========================================================= */
            &::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                background-color: var(--_soft-bg);
                border-radius: inherit;
                corner-shape: inherit;
                opacity: 0;
                transform: scale(0.55);
                transition:
                    var(--_fill-transition),
                    background-color 200ms var(--cs-ease-quad-out),
                    scale 600ms var(--cs-spring-release);
                pointer-events: none;
            }

            @media (hover: hover) {
                &:hover {
                    color: var(--_fg-hover, var(--_fg));

                    &::before {
                        background-color: var(--_bg-hover);
                        box-shadow: var(--_shadow-hover, var(--_shadow, none));
                    }

                    &::after {
                        background-color: var(--_soft-bg-hover);
                    }
                }
            }

            /* =========================================================
             * ACTIVE STATES (Pointer vs. Keyboard)
             * ---------------------------------------------------------
             * Interaction modality split (spring squash vs uniform scale).
             * See ../../explanations/elastic-surfaces.md
             * ========================================================= */
            &:active {
                color: var(--_fg-hover, var(--_fg));

                &::before {
                    background-color: var(--_bg-hover);
                    box-shadow: var(--_shadow-active, none);
                    transition:
                        background-color 140ms var(--cs-ease-quad-out),
                        box-shadow 140ms var(--cs-ease-quad-out),
                        scale 140ms var(--cs-ease-quad-out);
                }

                &::after {
                    background-color: var(--_soft-bg-hover);
                    transition:
                        var(--_fill-transition),
                        background-color 140ms var(--cs-ease-quad-out),
                        scale 140ms var(--cs-ease-quad-out);
                }

                &:not(:focus-visible)::before,
                &:not(:focus-visible)::after {
                    scale: var(--_active-squash, var(--cs-squash-subtle));
                }

                &:focus-visible {
                    scale: var(--_active-focus-scale, 0.97);
                }
            }

            /* =========================================================
            * SIZES
            * ---------------------------------------------------------
            * Size Hierarchy Guidance:
            * - Workhorses: sm, md, lg are the primary sizes for daily UI.
            * - Extremes: xs and xl exist for edge cases (e.g. ultra-dense
            *   inline badges or standalone hero CTAs) and should not be
            *   treated as general-purpose defaults.
            * ========================================================= */
            &[data-size="xs"] {
                --_height: 28px;
                gap: 4px;
                padding-inline: 8px;
                font-size: var(--cs-text-xs);
            }

            &[data-size="sm"] {
                --_height: 32px;
                gap: 4px;
                padding-inline: 12px;
                font-size: var(--cs-text-xs);
            }

            &[data-size="md"] {
                --_height: 36px;
                gap: 6px;
                padding-inline: 14px;
                font-size: var(--cs-text-sm);
            }

            &[data-size="lg"] {
                --_height: 40px;
                gap: 6px;
                padding-inline: 16px;
                font-size: var(--cs-text-sm);
            }

            &[data-size="xl"] {
                --_height: 44px;
                gap: 6px;
                padding-inline: 20px;
                font-size: var(--cs-text-base);
            }

            /* =========================================================
            * ICON-ONLY TOGGLE BUTTONS
            * ---------------------------------------------------------
            * Icon-only toggle buttons must be explicitly declared using the
            * `[data-icon-only]` attribute.
            *
            * Placed after SIZES so `.cs-toggle-button[data-icon-only]` `(0, 2, 0)`
            * overrides size-specific inline padding at equal specificity
            * through source order.
            *
            * Explicit declaration keeps the component behavior stable when
            * auxiliary children such as notification badges, hit areas or
            * screen-reader labels are added.
            * ========================================================= */
            &[data-icon-only] {
                --_active-squash: var(--cs-squash-default);
                aspect-ratio: 1;
                padding-inline: 0;
                corner-shape: var(--cs-squircle-soft);
            }

            /* =========================================================
            * COLORS
            * ========================================================= */
            &[data-color="accent"] {
                --_soft-bg: var(--cs-color-accent-soft);
                --_soft-bg-hover: var(--cs-color-accent-soft-hover);
                --_soft-fg: var(--cs-color-accent-soft-fg);
            }

            &[data-color="success"] {
                --_soft-bg: var(--cs-color-success-soft);
                --_soft-bg-hover: var(--cs-color-success-soft-hover);
                --_soft-fg: var(--cs-color-success-soft-fg);
            }

            &[data-color="warning"] {
                --_soft-bg: var(--cs-color-warning-soft);
                --_soft-bg-hover: var(--cs-color-warning-soft-hover);
                --_soft-fg: var(--cs-color-warning-soft-fg);
            }

            &[data-color="danger"] {
                --_soft-bg: var(--cs-color-danger-soft);
                --_soft-bg-hover: var(--cs-color-danger-soft-hover);
                --_soft-fg: var(--cs-color-danger-soft-fg);
            }

            /* =========================================================
            * VARIANTS
            * ========================================================= */
            &[data-variant="soft"] {
                --_bg: var(--cs-color-base-soft);
                --_bg-hover: var(--cs-color-base-soft-hover);
            }

            &[data-variant="ghost"] {
                --_bg: transparent;
                --_bg-hover: var(--cs-color-base-soft);
            }

            /* =========================================================
            * ARIA PRESSED
            * ---------------------------------------------------------
            * The base surface (::before) stays untouched. Pressed only
            * reveals the fill layer (::after) with a spring pop and
            * switches the foreground color.
            * ========================================================= */
            &[aria-pressed="false"] {
                --_fg: var(--cs-color-base-soft-fg);
                --_fg-hover: var(--cs-color-base-soft-fg-hover);
            }

            &[aria-pressed="true"] {
                --_fg: var(--_soft-fg);
                --_fill-transition: transform 500ms var(--cs-spring-snappy), opacity 90ms linear;

                &::after {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        }
    }
</style>
