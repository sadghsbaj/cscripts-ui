<!--
@component
Visual divider (`<ButtonGroupSeparator />`) placed between `<Button />` instances inside a `<ButtonGroup />`.
Automatically adapts its tint to the adjacent `<Button />` variant and color via `color-mix()`.
-->
<script lang="ts">
    import type { ButtonGroupSeparatorProps } from "./index.ts";

    let { class: className, ...rest }: ButtonGroupSeparatorProps = $props();
</script>

<span role="separator" aria-hidden="true" {...rest} class={["cs-button-group-separator", className]}></span>

<style>
    @layer components.composite {
        .cs-button-group-separator {
            position: relative;
            z-index: 1;
            flex-shrink: 0;
            align-self: stretch;
            pointer-events: none;

            &::before {
                content: "";
                position: absolute;
                background-color: color-mix(in oklab, var(--_separator-fg) var(--_separator-alpha), transparent);
                transition: opacity 150ms var(--cs-ease-quad-out);
            }
        }

        /* Completely remove from the flex flow (prevents double gap!) */
        :global(.cs-button[data-variant="elevated"]) + .cs-button-group-separator {
            display: none;
        }

        /* =========================================================
         * CHROMATIC & VARIANT ADAPTATION (Reads from preceding Button)
         * ========================================================= */

        /* 1. SOFT & GHOST: Uses the respective soft text color (blue, red, zinc) */
        :global(.cs-button[data-color="accent"]:is([data-variant="soft"], [data-variant="ghost"]))
            + .cs-button-group-separator {
            --_separator-fg: var(--cs-color-accent-soft-fg);
            --_separator-alpha: 18%;
        }

        :global(.cs-button[data-color="danger"]:is([data-variant="soft"], [data-variant="ghost"]))
            + .cs-button-group-separator {
            --_separator-fg: var(--cs-color-danger-soft-fg);
            --_separator-alpha: 18%;
        }

        :global(.cs-button[data-color="base"]:is([data-variant="soft"], [data-variant="ghost"]))
            + .cs-button-group-separator {
            --_separator-fg: var(--cs-color-base-soft-fg);
            --_separator-alpha: 18%;
        }

        /* =========================================================
         * AUTO-HIDE ON ADJACENT INTERACTION
         * Smoothly fades out the line when hovering or clicking left or right
         * ========================================================= */
        :global(.cs-button:is(:hover, :active, :focus-visible)) + .cs-button-group-separator::before,
        .cs-button-group-separator:has(+ :global(.cs-button:is(:hover, :active, :focus-visible)))::before {
            opacity: 0;
        }

        /* =========================================================
         * GEOMETRY (Zero-Footprint Flex Item)
         * ========================================================= */
        :global(.cs-button-group[data-orientation="horizontal"]) > .cs-button-group-separator {
            width: 0;

            &::before {
                inset-block: 22%; /* Scales proportionally from xs to xl */
                left: 0;
                width: 1px;
                translate: -50% 0;
            }
        }

        :global(.cs-button-group[data-orientation="vertical"]) > .cs-button-group-separator {
            height: 0;

            &::before {
                inset-inline: 16%;
                top: 0;
                height: 1px;
                translate: 0 -50%;
            }
        }
    }
</style>
