<!--
@component
Accessible icon element (`<TooltipIcon icon={...} />`) for `<Tooltip />` overlays.

Architectural Notes:
- Accessibility: Automatically enforces `aria-hidden="true"` on decorative icons.
- Optical Sizing: Sized relative to the tooltip `--_fs` variable with matching `stroke-width: 2.25`.
-->
<script lang="ts">
    import type { TooltipIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: TooltipIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-tooltip-icon", className]} />

<style>
    @layer components.composite {
        :global(.cs-tooltip-icon) {
            flex-shrink: 0;
            inline-size: var(--_fs, var(--cs-text-xs));
            block-size: var(--_fs, var(--cs-text-xs));
            color: var(--cs-color-text-strong, currentColor);
            stroke-width: 2.25;
            pointer-events: none;
        }
    }
</style>
