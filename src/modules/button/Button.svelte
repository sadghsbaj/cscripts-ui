<!--
@component
Primary interactive button primitive (`<Button />`) supporting polymorphic rendering
(`as="button" | "a" | "label"`), semantic variants, and spring-physics press feedback.

Architectural Notes:
- Defaults & Resets: Requires explicit `variant` and `size` props (`negative` optional on `primary`, `secondary`, `ghost`).
-->
<script lang="ts">
    import type { ButtonProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        negative,
        size,
        as = "button",
        iconOnly,
        class: className,
        children,
        ...rest
    }: ButtonProps = $props();
</script>

<svelte:element
    this={as}
    bind:this={ref}
    type={as === "button" ? "button" : undefined}
    {...rest}
    class={["cs-button", className]}
    data-variant={variant}
    data-negative={negative ? "" : undefined}
    data-size={size}
    data-icon-only={iconOnly ? "" : undefined}
>
    {@render children?.()}
</svelte:element>

<style>
    @layer components.primitive {
        .cs-button {
            /* Dynamically computed from height instead of --cs-radius-full (9999px).
            * A 9999px radius would trigger the CSS Corner Overlap reduction algorithm
            * (CSS Backgrounds & Borders §5.5) on asymmetric corners (e.g. inside ButtonGroup),
            * proportionally crushing small adjacent radii (e.g. 4px) down to near 0px. */
            --cs-button-pill-radius: calc(var(--cs-button-height) / 2);

            isolation: isolate;
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            height: var(--cs-button-height);
            color: var(--cs-button-fg);
            font-weight: 600;
            white-space: nowrap;
            border-radius: var(--cs-button-pill-radius);
            corner-shape: var(--cs-squircle-soft);
            transition:
                color 200ms var(--cs-ease-quad-out),
                scale 200ms var(--cs-ease-expo-out);

            &:any-link {
                cursor: pointer;
            }

            /* =========================================================
             * ELASTIC SURFACE (::before)
             * ---------------------------------------------------------
             * Decouples visual surface from text/icons for squash-and-stretch.
             * ========================================================= */
            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                background-color: var(--cs-button-bg);
                border-radius: inherit;
                corner-shape: inherit;
                box-shadow: var(--cs-button-shadow, none);
                transition:
                    background-color 200ms var(--cs-ease-quad-out),
                    box-shadow 200ms var(--cs-ease-quad-out),
                    scale 600ms var(--cs-spring-release); /* CSS linear() transition */
            }

            @media (hover: hover) {
                &:hover,
                &[data-morph-hover] {
                    color: var(--cs-button-fg-hover, var(--cs-button-fg));
                    &::before {
                        background-color: var(--cs-button-bg-hover);
                        box-shadow: var(--cs-button-shadow-hover, var(--cs-button-shadow, none));
                    }
                }

                &[data-morph-hover]::before {
                    transition: none;
                }
            }

            /* =========================================================
             * INTENT TOKENS (Accent by default, overridden by [data-negative])
             * ---------------------------------------------------------
             * Uses `*-soft-fg` (600 light / 400 dark) for chromatic text on
             * neutral `base-soft` / transparent surfaces to guarantee contrast.
             * ========================================================= */
            --cs-button-solid-bg: var(--cs-color-accent-solid);
            --cs-button-solid-bg-hover: var(--cs-color-accent-solid-hover);
            --cs-button-solid-fg: var(--cs-color-accent-solid-fg);
            --cs-button-accent-fg: var(--cs-color-accent-soft-fg);

            /* =========================================================
             * ACTIVE STATES (Pointer vs. Keyboard)
             * ---------------------------------------------------------
             * Interaction modality split (spring squash vs uniform scale).
             * ========================================================= */
            &:active {
                color: var(--cs-button-fg-hover, var(--cs-button-fg));

                &::before {
                    background-color: var(--cs-button-bg-hover);
                    box-shadow: var(--cs-button-shadow-active, none);
                    transition:
                        background-color 140ms var(--cs-ease-quad-out),
                        box-shadow 140ms var(--cs-ease-quad-out),
                        scale 140ms var(--cs-ease-quad-out);
                }

                &:not(:focus-visible)::before {
                    scale: var(--cs-button-squash-active, var(--cs-squash-subtle));
                }

                &:focus-visible {
                    scale: var(--cs-button-focus-scale-active, 0.97);
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
                --cs-button-height: 28px;
                gap: 4px;
                padding-inline: 8px;
                font-size: var(--cs-text-xs);
            }

            &[data-size="sm"] {
                --cs-button-height: 32px;
                gap: 4px;
                padding-inline: 12px;
                font-size: var(--cs-text-xs);
            }

            &[data-size="md"] {
                --cs-button-height: 36px;
                gap: 6px;
                padding-inline: 14px;
                font-size: var(--cs-text-sm);
            }

            &[data-size="lg"] {
                --cs-button-height: 40px;
                gap: 6px;
                padding-inline: 16px;
                font-size: var(--cs-text-sm);
            }

            &[data-size="xl"] {
                --cs-button-height: 44px;
                gap: 6px;
                padding-inline: 20px;
                font-size: var(--cs-text-base);
            }

            /* =========================================================
            * ICON-ONLY BUTTONS
            * ---------------------------------------------------------
            * Icon-only buttons must be explicitly declared using the
            * `[data-icon-only]` attribute.
            *
            * Placed after SIZES so `.cs-button[data-icon-only]` `(0, 2, 0)`
            * overrides size-specific inline padding at equal specificity
            * through source order.
            *
            * Explicit declaration keeps the component behavior stable when
            * auxiliary children such as notification badges, hit areas or
            * screen-reader labels are added.
            * ========================================================= */
            &[data-icon-only] {
                --cs-button-squash-active: var(--cs-squash-default);
                aspect-ratio: 1;
                padding-inline: 0;
            }

            &[data-negative] {
                --cs-button-solid-bg: var(--cs-color-negative-solid);
                --cs-button-solid-bg-hover: var(--cs-color-negative-solid-hover);
                --cs-button-solid-fg: var(--cs-color-negative-solid-fg);
                --cs-button-accent-fg: var(--cs-color-negative-soft-fg);
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="primary"] {
                --cs-button-bg: var(--cs-button-solid-bg);
                --cs-button-bg-hover: var(--cs-button-solid-bg-hover);
                --cs-button-fg: var(--cs-button-solid-fg);
                --cs-button-shadow: var(--cs-shadow-solid);
                --cs-button-shadow-active: var(--cs-shadow-solid-active);
            }

            &[data-variant="secondary"] {
                --cs-button-bg: var(--cs-color-base-soft);
                --cs-button-bg-hover: var(--cs-color-base-soft-hover);
                --cs-button-fg: var(--cs-button-accent-fg);
            }

            &[data-variant="tertiary"] {
                --cs-button-bg: var(--cs-color-base-soft);
                --cs-button-bg-hover: var(--cs-color-base-soft-hover);
                --cs-button-fg: var(--cs-color-base-soft-fg);
                --cs-button-fg-hover: var(--cs-color-base-soft-fg-hover);
            }

            &[data-variant="ghost"] {
                --cs-button-bg: transparent;
                --cs-button-bg-hover: var(--cs-color-base-soft);
                --cs-button-fg: var(--cs-color-base-soft-fg);
                --cs-button-fg-hover: var(--cs-color-base-soft-fg-hover);

                &[data-negative] {
                    --cs-button-fg: var(--cs-button-accent-fg);
                    --cs-button-fg-hover: var(--cs-button-accent-fg);
                }
            }

            /* =========================================================
             * ELEVATED VARIANT
             * ---------------------------------------------------------
             * Neutral floating surface.
             * ========================================================= */
            &[data-variant="elevated"] {
                --cs-button-bg: var(--cs-color-elevated);
                --cs-button-bg-hover: var(--cs-color-elevated-hover);
                --cs-button-fg: var(--cs-color-text-strong);
                --cs-button-shadow: var(--cs-shadow-elevated);
                --cs-button-shadow-hover: var(--cs-shadow-elevated-hover);
                --cs-button-shadow-active: var(--cs-shadow-elevated);
            }

            /* =========================================================
             * DISABLED
             * ========================================================= */
            &:is(:disabled, [aria-disabled="true"], [data-disabled]) {
                --cs-disabled-opacity: 1;
                --cs-button-fg: var(--cs-color-disabled-fg);
                --cs-button-shadow: none;

                &[data-variant="primary"],
                &[data-variant="secondary"],
                &[data-variant="tertiary"] {
                    --cs-button-bg: var(--cs-color-disabled-bg);
                }

                &[data-variant="ghost"] {
                    --cs-button-bg: transparent;
                    --cs-button-fg: var(--cs-color-disabled-fg);
                }

                &[data-variant="elevated"] {
                    --cs-button-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-button-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                }
            }
        }
    }
</style>
