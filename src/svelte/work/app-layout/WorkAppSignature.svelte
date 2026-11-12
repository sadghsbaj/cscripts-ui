<!--
@component
Subtle corner creator info indicator (`<WorkAppSignature />`) for internal work tools.

Architectural Notes:
- Frame Integration: Automatically rendered inside `<WorkAppFrame />` by default (`showSignature = true`),
  so it does not need to be placed manually in standard layouts. Exported standalone for custom frames.
- Semantic Info Trigger: Uses a native `<button type="button">` for full accessibility compliance (no non-interactive
  tabindex warnings) with `cursor: default` and zero click mechanics.
- 1:1 XS Ghost Base Visuals: Handcrafted 28px squircle with an optically balanced 14px icon (`:global`), soft base hover,
  and high z-index anchoring to `bottom: 24px; right: 24px;`.
-->
<script lang="ts">
    import { Info } from "@lucide/svelte";

    import { HitArea } from "../../primitives/hit-area/index.ts";
    import { tooltip } from "../../primitives/tooltip/tooltip.attach.svelte.ts";
    import type { WorkAppSignatureProps } from "./index.ts";

    let { text = "Entwickelt von Colin Schäfer", class: className, ...rest }: WorkAppSignatureProps = $props();
</script>

<button
    {...rest}
    type="button"
    aria-label={text}
    class={["cs-work-app-signature", className]}
    {@attach tooltip({ text, placement: "left" })}
>
    <Info aria-hidden="true" class="cs-work-app-signature-icon" />
    <HitArea size="md" />
</button>

<style>
    @layer components.primitive {
        .cs-work-app-signature {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 10;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            aspect-ratio: 1;
            width: 28px;
            height: 28px;
            padding: 0;
            color: var(--cs-color-base-soft-fg);
            background-color: transparent;
            border: none;
            border-radius: 14px;
            corner-shape: var(--cs-squircle-soft);
            opacity: 0.6;
            user-select: none;
            transition:
                opacity 150ms var(--cs-ease-quad-out),
                color 200ms var(--cs-ease-quad-out),
                background-color 200ms var(--cs-ease-quad-out);
            cursor: default;

            @media (hover: hover) {
                &:hover {
                    color: var(--cs-color-base-soft-fg-hover);
                    background-color: var(--cs-color-base-soft);
                    opacity: 1;
                }
            }

            &:focus-visible {
                color: var(--cs-color-base-soft-fg-hover);
                background-color: var(--cs-color-base-soft);
                opacity: 1;
            }

            @media (width < 640px) {
                display: none;
            }
        }

        :global(.cs-work-app-signature-icon) {
            flex-shrink: 0;
            width: 14px;
            height: 14px;
            stroke-width: 2.5;
            pointer-events: none;
        }
    }
</style>
