<!--
@component
Accessible icon wrapper (`<ToggleButtonIcon icon={...} />`) for `<ToggleButton />` components.

Architectural Notes:
- Accessibility: Automatically enforces `aria-hidden="true"` so decorative button
  icons never pollute screen reader announcements.
- Optical Sizing: Automatically sizes icons to `font-size + 2px` (`calc(1em + 2px)`)
  for text buttons—or `50%` when placed inside `iconOnly` buttons—and matches
  `stroke-width: 2.5` to the `600` button font weight.
-->
<script lang="ts">
    import type { ToggleButtonIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: ToggleButtonIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-toggle-button-icon", className]} />

<style>
    @layer components.primitive {
        :global(.cs-toggle-button-icon) {
            flex-shrink: 0;
            width: calc(1em + 2px);
            height: calc(1em + 2px);
            stroke-width: 2.5;
            pointer-events: none;

            /* 50% scale ensures integer pixel alignment and optical balance without text. */
            :global(.cs-toggle-button[data-icon-only]) > & {
                width: 50%;
                height: 50%;
            }
        }
    }
</style>
