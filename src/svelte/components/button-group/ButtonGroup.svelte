<!--
@component
Composite container (`<ButtonGroup />`) grouping multiple `<Button />` instances into
a cohesive segmented or clustered control bar with coordinated corner radii and physics.

Architectural Notes:
- Layout & Flow: Supports horizontal and vertical orientations via `orientation` (`"horizontal" | "vertical"`).
- Filtered Radii: Uses `:nth-child(1 of .cs-button)` to strictly target true buttons and flatten inner radii.
- Design System: Disallows `variant="solid"` (enforced via ESLint rule `button-group/no-solid-variant`).
-->
<script lang="ts">
    import type { ButtonGroupProps } from "./index.ts";

    let {
        orientation = "horizontal",
        separators = false,
        class: className,
        children,
        ...rest
    }: ButtonGroupProps = $props();
</script>

<div
    role="group"
    {...rest}
    class={["cs-button-group", className]}
    data-orientation={orientation}
    data-separators={separators}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-button-group {
            --_inner-radius: var(--cs-radius-none);

            display: inline-flex;
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);

            &:has(> :global(.cs-button[data-variant="elevated"])) {
                gap: 2px;
            }

            &:has(> :global(.cs-button:is([data-variant="elevated"], [data-variant="ghost"]))) {
                --_inner-radius: 4px;
            }

            > :global(.cs-button) {
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
             * Using `:nth-child(1 of .cs-button)` and
             * `:nth-last-child(1 of .cs-button)` guarantees that outer
             * corner radii apply exclusively to the true first and last
             * button in the group.
             * ========================================================= */
            &[data-orientation="horizontal"] {
                flex-direction: row;
                align-items: center;

                > :global(.cs-button:nth-child(1 of .cs-button)) {
                    border-top-left-radius: var(--_pill-radius);
                    border-bottom-left-radius: var(--_pill-radius);
                }

                > :global(.cs-button:nth-last-child(1 of .cs-button)) {
                    border-top-right-radius: var(--_pill-radius);
                    border-bottom-right-radius: var(--_pill-radius);
                }
            }

            &[data-orientation="vertical"] {
                flex-direction: column;
                align-items: stretch;

                > :global(.cs-button:nth-child(1 of .cs-button)) {
                    border-top-left-radius: var(--_pill-radius);
                    border-top-right-radius: var(--_pill-radius);
                }

                > :global(.cs-button:nth-last-child(1 of .cs-button)) {
                    border-bottom-right-radius: var(--_pill-radius);
                    border-bottom-left-radius: var(--_pill-radius);
                }
            }
        }
    }
</style>
