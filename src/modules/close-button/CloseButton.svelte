<!--
@component
Compact dismiss/close trigger (`<CloseButton />`) with a subordinate `text-weak` ->
`text-strong` visual hierarchy and spring-physics press feedback.

Architectural Notes:
- Defaults & Resets: Requires explicit `size` and `variant` props (`data-size`, `data-variant`).
-->
<script lang="ts">
    import { X } from "@lucide/svelte";

    import type { CloseButtonProps } from "./index.ts";

    let { variant, size, class: className, children, ...rest }: CloseButtonProps = $props();
</script>

<button
    aria-label="Close"
    {...rest}
    type="button"
    class={["cs-close-button", className]}
    data-variant={variant}
    data-size={size}
>
    <X aria-hidden="true" class="cs-close-button-icon" />
    {@render children?.()}
</button>

<style>
    @layer components.primitive {
        .cs-close-button {
            /* Close buttons share a unified text-weak -> text-main hierarchy across all variants
            * to remain visually subordinate to primary content, unlike action buttons. */
            --cs-close-button-fg: var(--cs-color-text-weak);
            --cs-close-button-fg-hover: var(--cs-color-text-main);

            isolation: isolate;
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            aspect-ratio: 1/1;
            color: var(--cs-close-button-fg);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-soft);
            transition:
                color 200ms var(--cs-ease-quad-out),
                scale 200ms var(--cs-ease-expo-out);

            /* =========================================================
             * ELASTIC SURFACE (::before)
             * ---------------------------------------------------------
             * Decouples visual surface from icon for squash-and-stretch.
             * ========================================================= */
            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                background-color: var(--cs-close-button-bg);
                border-radius: inherit;
                corner-shape: inherit;
                box-shadow: var(--cs-close-button-shadow, none);
                transition:
                    background-color 200ms var(--cs-ease-quad-out),
                    box-shadow 200ms var(--cs-ease-quad-out),
                    scale 600ms var(--cs-spring-release); /* CSS linear() transition */
            }

            @media (hover: hover) {
                &:hover,
                &[data-morph-hover] {
                    color: var(--cs-close-button-fg-hover, var(--cs-close-button-fg));
                    &::before {
                        background-color: var(--cs-close-button-bg-hover);
                        box-shadow: var(--cs-close-button-shadow-hover, var(--cs-close-button-shadow, none));
                    }
                }

                &[data-morph-hover]::before {
                    transition: none;
                }
            }

            /* =========================================================
             * ACTIVE STATES (Pointer vs. Keyboard)
             * ---------------------------------------------------------
             * Interaction modality split (spring squash vs uniform scale).
             * ========================================================= */
            &:active {
                color: var(--cs-close-button-fg-hover, var(--cs-close-button-fg));

                &::before {
                    background-color: var(--cs-close-button-bg-hover);
                    box-shadow: var(--cs-close-button-shadow-active, none);
                    transition:
                        background-color 140ms var(--cs-ease-quad-out),
                        box-shadow 140ms var(--cs-ease-quad-out),
                        scale 140ms var(--cs-ease-quad-out);
                }

                &:not(:focus-visible)::before {
                    scale: var(--cs-close-button-squash-active, var(--cs-squash-default));
                }

                &:focus-visible {
                    scale: 0.97;
                }

                /* Recedes the cross glyph on press to enhance physical tactile depth */
                > :global(.cs-close-button-icon) {
                    scale: 0.9;
                    transition: scale 140ms var(--cs-ease-quad-out);
                }
            }

            /* =========================================================
            * CLOSE SVG ICONS
            * ---------------------------------------------------------
            * Scaled to 65% (instead of 50% for standard buttons) because
            * diagonal cross glyphs have high negative space, and compact
            * sizes (16px–24px) require a larger glyph ratio to stay legible.
            * ========================================================= */
            > :global(.cs-close-button-icon) {
                flex-shrink: 0;
                width: calc(100% / 3 * 2);
                height: calc(100% / 3 * 2);
                stroke-width: 2.5;
                transition: scale 600ms var(--cs-spring-release);
                pointer-events: none;
            }

            /* =========================================================
            * SIZES
            * ========================================================= */
            &[data-size="xs"] {
                height: 16px;
            }

            &[data-size="sm"] {
                height: 24px;
            }

            &[data-size="md"] {
                height: 32px;
            }

            &[data-size="lg"] {
                height: 40px;
            }

            &[data-size="xl"] {
                height: 48px;
            }

            /* =========================================================
            * VARIANTS
            * ---------------------------------------------------------
            * Variant Hierarchy & Surface Pairing:
            * - soft (Primary Workhorse): The default choice for almost all
            *   UI surfaces, including floating islands (elevated modals,
            *   drawers, popovers) and compact elements (toasts, cards) to
            *   provide a calm, grounded, tactile tint.
            * - elevated (Canvas Pairing): Best for canvas surfaces
            *   (fullscreen media lightboxes, raw canvas) for crisp lift.
            * - ghost (Niche Fallback): Strictly reserved for rare edge cases
            *   where even a soft tinted surface plate would visually clash.
            * ========================================================= */

            &[data-variant="soft"] {
                --cs-close-button-bg: var(--cs-color-base-soft);
                --cs-close-button-bg-hover: var(--cs-color-base-soft-hover);
            }

            &[data-variant="ghost"] {
                --cs-close-button-bg: transparent;
                --cs-close-button-bg-hover: var(--cs-color-base-soft);
            }

            &[data-variant="elevated"] {
                --cs-close-button-bg: var(--cs-color-elevated);
                --cs-close-button-bg-hover: var(--cs-color-elevated-hover);
                --cs-close-button-shadow: var(--cs-shadow-elevated);
                --cs-close-button-shadow-hover: var(--cs-shadow-elevated-hover);
                --cs-close-button-shadow-active: var(--cs-shadow-elevated);
            }

            /* =========================================================
             * DISABLED
             * ========================================================= */
            &:is(:disabled, [aria-disabled="true"], [data-disabled]) {
                --cs-disabled-opacity: 1;
                --cs-close-button-fg: var(--cs-color-disabled-fg);
                --cs-close-button-shadow: none;

                &[data-variant="soft"] {
                    --cs-close-button-bg: var(--cs-color-disabled-bg);
                }

                &[data-variant="ghost"] {
                    --cs-close-button-bg: transparent;
                }

                &[data-variant="elevated"] {
                    --cs-close-button-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-close-button-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                }
            }
        }
    }
</style>
