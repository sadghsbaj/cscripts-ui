<!--
@component
Subtle neutral divider (`<ToggleButtonGroupSeparator />`) placed between `<ToggleButton />` instances inside a `<ToggleButtonGroup />`.
Automatically fades out when adjacent toggle buttons are active (`aria-pressed="true"`), hovered, or focused.
-->
<script lang="ts">
    import type { ToggleButtonGroupSeparatorProps } from "./index.ts";

    let { class: className, ...rest }: ToggleButtonGroupSeparatorProps = $props();
</script>

<span role="separator" aria-hidden="true" {...rest} class={["cs-toggle-button-group-separator", className]}></span>

<style>
    @layer components.composite {
        .cs-toggle-button-group-separator {
            --_separator-fg: var(--cs-color-base-soft-fg);
            --_separator-alpha: 18%;

            position: relative;
            z-index: 1;
            flex-shrink: 0;
            align-self: stretch;
            pointer-events: none;

            &::before {
                content: "";
                position: absolute;
                background-color: color-mix(in oklab, var(--_separator-fg) var(--_separator-alpha), transparent);
                transition:
                    opacity 150ms var(--cs-ease-quad-out),
                    background-color 150ms var(--cs-ease-quad-out);
            }
        }

        /* =========================================================
         * AUTO-HIDE ON ADJACENT INTERACTION OR ACTIVE TOGGLE
         * Smoothly fades out the line when active, hovered, or focused left/right
         * ========================================================= */
        :global(.cs-toggle-button:is([aria-pressed="true"], :hover, :active, :focus-visible))
            + .cs-toggle-button-group-separator::before,
        .cs-toggle-button-group-separator:has(
                + :global(.cs-toggle-button:is([aria-pressed="true"], :hover, :active, :focus-visible))
            )::before {
            opacity: 0;
        }

        /* =========================================================
         * RE-EMERGE BETWEEN TWO PRESSED TOGGLE BUTTONS
         * If BOTH adjacent buttons are pressed (and neither is currently
         * hovered, active, or focused), the separator re-emerges in the
         * respective color so adjacent active segments remain visually distinct.
         * ========================================================= */
        :global(.cs-toggle-button[aria-pressed="true"]:not(:hover, :active, :focus-visible))
            + .cs-toggle-button-group-separator:has(
                + :global(.cs-toggle-button[aria-pressed="true"]:not(:hover, :active, :focus-visible))
            )::before {
            opacity: 1;
        }

        :global(.cs-toggle-button[aria-pressed="true"][data-color="accent"])
            + .cs-toggle-button-group-separator:has(+ :global(.cs-toggle-button[aria-pressed="true"])) {
            --_separator-fg: var(--cs-color-accent-soft-fg);
            --_separator-alpha: 18%;
        }

        :global(.cs-toggle-button[aria-pressed="true"][data-color="success"])
            + .cs-toggle-button-group-separator:has(+ :global(.cs-toggle-button[aria-pressed="true"])) {
            --_separator-fg: var(--cs-color-success-soft-fg);
            --_separator-alpha: 18%;
        }

        :global(.cs-toggle-button[aria-pressed="true"][data-color="warning"])
            + .cs-toggle-button-group-separator:has(+ :global(.cs-toggle-button[aria-pressed="true"])) {
            --_separator-fg: var(--cs-color-warning-soft-fg);
            --_separator-alpha: 18%;
        }

        :global(.cs-toggle-button[aria-pressed="true"][data-color="danger"])
            + .cs-toggle-button-group-separator:has(+ :global(.cs-toggle-button[aria-pressed="true"])) {
            --_separator-fg: var(--cs-color-danger-soft-fg);
            --_separator-alpha: 18%;
        }

        /* =========================================================
         * GEOMETRY (Zero-Footprint Flex Item)
         * ========================================================= */
        :global(.cs-toggle-button-group[data-orientation="horizontal"]) > .cs-toggle-button-group-separator {
            width: 0;

            &::before {
                inset-block: 22%; /* Scales proportionally from xs to xl */
                left: 0;
                width: 1px;
                translate: -50% 0;
            }
        }

        :global(.cs-toggle-button-group[data-orientation="vertical"]) > .cs-toggle-button-group-separator {
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
