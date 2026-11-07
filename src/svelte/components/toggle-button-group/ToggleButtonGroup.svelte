<!--
@component
Composite container (`<ToggleButtonGroup />`) grouping multiple `<ToggleButton />` instances into
a cohesive segmented or clustered control bar with coordinated corner radii and physics.

Architectural Notes:
- Layout & Flow: Supports horizontal and vertical orientations via `orientation` (`"horizontal" | "vertical"`).
- Filtered Radii: Uses `:nth-child(1 of .cs-toggle-button)` to strictly target true toggle buttons and flatten inner radii.
-->
<script lang="ts">
    import type { ToggleButtonGroupProps } from "./index.ts";

    let { orientation = "horizontal", class: className, children, ...rest }: ToggleButtonGroupProps = $props();
</script>

<div role="group" {...rest} class={["cs-toggle-button-group", className]} data-orientation={orientation}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-toggle-button-group {
            --_inner-radius: var(--cs-radius-none);

            display: inline-flex;
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);

            > :global(.cs-toggle-button) {
                --_active-squash: 0.97;
                --_active-focus-scale: 0.97;
                border-radius: var(--_inner-radius);
            }

            /* =========================================================
             * FILTERED FIRST/LAST BUTTON TARGETING (`:nth-child(... of S)`)
             * ---------------------------------------------------------
             * Standard `:first-child` and `:last-child` fail if non-button
             * nodes (auxiliary DOM elements, comments, or Svelte block
             * markers) are present.
             *
             * Using `:nth-child(1 of .cs-toggle-button)` and
             * `:nth-last-child(1 of .cs-toggle-button)` guarantees that outer
             * corner radii apply exclusively to the true first and last
             * toggle button in the group.
             * ========================================================= */
            &[data-orientation="horizontal"] {
                flex-direction: row;
                align-items: center;

                > :global(.cs-toggle-button:nth-child(1 of .cs-toggle-button)) {
                    border-top-left-radius: var(--_pill-radius);
                    border-bottom-left-radius: var(--_pill-radius);
                }

                > :global(.cs-toggle-button:nth-last-child(1 of .cs-toggle-button)) {
                    border-top-right-radius: var(--_pill-radius);
                    border-bottom-right-radius: var(--_pill-radius);
                }
            }

            &[data-orientation="vertical"] {
                flex-direction: column;
                align-items: stretch;

                > :global(.cs-toggle-button:nth-child(1 of .cs-toggle-button)) {
                    border-top-left-radius: var(--_pill-radius);
                    border-top-right-radius: var(--_pill-radius);
                }

                > :global(.cs-toggle-button:nth-last-child(1 of .cs-toggle-button)) {
                    border-bottom-right-radius: var(--_pill-radius);
                    border-bottom-left-radius: var(--_pill-radius);
                }
            }

            /* =========================================================
             * HIT AREA CONTAINMENT (Unidirectional Touch Expansion)
             * ---------------------------------------------------------
             * Constrains the touch expander to 100% on the shared layout axis
             * to eliminate tap collision between adjacent buttons, while allowing
             * the unconstrained cross-axis to expand freely into open space.
             * ========================================================= */
            &[data-orientation="horizontal"] :global(.cs-hit-area) {
                left: 0;
                width: 100%;
                min-width: 0;
                translate: 0 -50%;
            }

            &[data-orientation="vertical"] :global(.cs-hit-area) {
                top: 0;
                height: 100%;
                min-height: 0;
                translate: -50% 0;
            }
        }
    }
</style>
