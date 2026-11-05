<!--
@component
Invisible touch/click target expander (`<HitArea />`) that enlarges the interactive
surface of compact controls (icon buttons, close triggers, checkboxes) to meet mobile
and accessibility guidelines (40px–48px) without altering visual layout.

Architectural Notes:
- Defaults: Requires explicit `size` prop (`data-size`).
  See `../../explanations/component-defaults-and-globals.md`
- Anchor Containment: Automatically establishes a containing block on host via `:has()`.
  See `../../explanations/anchor-context-auto-establishment.md`
- Explicit DOM vs. Pseudo-elements: Rendered as a dedicated child `<span>` rather
  than claiming `::before` or `::after` on the parent. This guarantees zero slot
  collisions—leaving both pseudo-elements unconstrained for elastic surfaces,
  badges, or physics-driven animations on the host.
-->
<script lang="ts">
    import type { HitAreaProps } from "./index.ts";

    let { size, class: className, ...rest }: HitAreaProps = $props();
</script>

<span {...rest} aria-hidden="true" class={["cs-hit-area", className]} data-size={size}></span>

<style>
    @layer components {
        /* =========================================================
         * ANCHOR CONTEXT AUTO-ESTABLISHMENT (:has)
         * ---------------------------------------------------------
         * Automatically establishes a containing block for host bounds.
         * See ../../explanations/anchor-context-auto-establishment.md
         * ========================================================= */
        :global(:has(> .cs-hit-area)) {
            contain: layout;
        }

        /* =========================================================
         * EXPANDED HIT SURFACE
         * ---------------------------------------------------------
         * - Centered Positioning: Stays dead-center over host element.
         * - Minimum Dimensions: `100%` ensures the hit area seamlessly
         *   scales up if the host element is larger than the target size.
         * - Tap Highlight Reset: Prevents mobile WebKit/Blink browsers
         *   from drawing awkward oversized grey tap rectangles over the
         *   invisible expanded area.
         * - Containment: `contain: strict` eliminates any risk of layout,
         *   paint, or size recalculations leaking into the document.
         * ========================================================= */
        .cs-hit-area {
            -webkit-tap-highlight-color: transparent;
            position: absolute;
            inset: 50% auto auto 50%;
            width: var(--_size);
            min-width: 100%;
            height: var(--_size);
            min-height: 100%;
            translate: -50% -50%;
            user-select: none;
            contain: strict;
            cursor: inherit;
            pointer-events: inherit;

            /* =========================================================
             * TARGET SIZES (WCAG & Platform Guidelines)
             * ---------------------------------------------------------
             * - sm (40px): Compact desktop & dense toolbar minimum
             * - md (44px): Apple HIG recommended touch target
             * - lg (48px): W3C WCAG 2.5.5 AAA & Android Material target
             * ========================================================= */
            &[data-size="sm"] {
                --_size: 40px;
            }

            &[data-size="md"] {
                --_size: 44px;
            }

            &[data-size="lg"] {
                --_size: 48px;
            }
        }
    }
</style>
