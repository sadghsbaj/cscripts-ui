<!--
@component
Primary interactive button primitive (`<Button />`) supporting polymorphic rendering
(`as="button" | "a" | "label"`), semantic variants, and spring-physics press feedback.

Architectural Notes:
- Defaults & Resets: Requires explicit `variant`, `size`, and `color` (except `elevated`) props.
  See `../../explanations/component-defaults-and-globals.md`
-->
<script lang="ts">
    import type { ButtonProps } from "./index.ts";

    let { variant, color, size, as = "button", iconOnly, class: className, children, ...rest }: ButtonProps = $props();
</script>

<svelte:element
    this={as}
    type={as === "button" ? "button" : undefined}
    {...rest}
    class={["cs-button", className]}
    data-variant={variant}
    data-color={color}
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
            --_pill-radius: calc(var(--_height) / 2);

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
                z-index: -1;
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

            @media (hover: hover) {
                &:hover {
                    color: var(--_fg-hover, var(--_fg));
                    &::before {
                        background-color: var(--_bg-hover);
                        box-shadow: var(--_shadow-hover, var(--_shadow, none));
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

                &:not(:focus-visible)::before {
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
                --_active-squash: var(--cs-squash-default);
                aspect-ratio: 1;
                padding-inline: 0;
                corner-shape: var(--cs-squircle-soft);
            }

            /* =========================================================
            * COLORS
            * ---------------------------------------------------------
            * Only `base` defines `--_soft-fg-hover` (shifting from muted
            * `text-main` to high-contrast `text-strong` on interaction).
            * Chromatic intents (`accent`, `danger`) intentionally omit it so
            * their foreground stays locked at peak saturation without washing
            * out into pastel tints in dark mode.
            * ========================================================= */
            &[data-color="accent"] {
                --_solid-bg: var(--cs-color-accent-solid);
                --_solid-bg-hover: var(--cs-color-accent-solid-hover);
                --_solid-fg: var(--cs-color-accent-solid-fg);

                --_soft-bg: var(--cs-color-accent-soft);
                --_soft-bg-hover: var(--cs-color-accent-soft-hover);
                --_soft-fg: var(--cs-color-accent-soft-fg);
            }

            &[data-color="base"] {
                --_solid-bg: var(--cs-color-base-solid);
                --_solid-bg-hover: var(--cs-color-base-solid-hover);
                --_solid-fg: var(--cs-color-base-solid-fg);
                --_solid-shadow: light-dark(rgb(255 255 255 / 0.18), rgb(255 255 255 / 0.08));

                --_soft-bg: var(--cs-color-base-soft);
                --_soft-bg-hover: var(--cs-color-base-soft-hover);
                --_soft-fg: var(--cs-color-base-soft-fg);
                --_soft-fg-hover: var(--cs-color-base-soft-fg-hover);
            }

            &[data-color="danger"] {
                --_solid-bg: var(--cs-color-danger-solid);
                --_solid-bg-hover: var(--cs-color-danger-solid-hover);
                --_solid-fg: var(--cs-color-danger-solid-fg);

                --_soft-bg: var(--cs-color-danger-soft);
                --_soft-bg-hover: var(--cs-color-danger-soft-hover);
                --_soft-fg: var(--cs-color-danger-soft-fg);
            }

            /* =========================================================
            * VARIANTS
            * ========================================================= */
            &[data-variant="solid"] {
                --_bg: var(--_solid-bg);
                --_bg-hover: var(--_solid-bg-hover);
                --_fg: var(--_solid-fg);
                --_shadow: inset 0 1px 0 0 var(--_solid-shadow, rgb(255 255 255 / 0.18)), 0 1px 2px 0 rgb(0 0 0 / 0.08);
            }

            &[data-variant="soft"] {
                --_bg: var(--_soft-bg);
                --_bg-hover: var(--_soft-bg-hover);
                --_fg: var(--_soft-fg);
                --_fg-hover: var(--_soft-fg-hover, var(--_soft-fg));
            }

            &[data-variant="ghost"] {
                --_bg: transparent;
                --_bg-hover: var(--_soft-bg);
                --_fg: var(--_soft-fg);
                --_fg-hover: var(--_soft-fg-hover, var(--_soft-fg));
            }

            /* =========================================================
             * ELEVATED VARIANT
             * ---------------------------------------------------------
             * Neutral floating surface (no data-color required).
             * Hover Physics (Light vs. Dark): See ../../explanations/elevated-hover-physics.md
             * ========================================================= */
            &[data-variant="elevated"] {
                --_bg: var(--cs-color-elevation-1);
                --_bg-hover: light-dark(var(--_bg), var(--cs-color-elevation-2));
                --_fg: var(--cs-color-text-strong);
                --_border: 1px solid var(--cs-color-elevation-1-border);
                --_shadow: var(--cs-shadow-sm);
                --_shadow-hover: var(--cs-shadow-md);
                --_shadow-active: var(--cs-shadow-sm);
            }
        }
    }
</style>
