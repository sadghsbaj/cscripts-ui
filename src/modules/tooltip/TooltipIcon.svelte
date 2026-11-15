<script lang="ts">
    import type { TooltipIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: TooltipIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-tooltip-icon", className]} />

<style>
    @layer components.composite {
        :global(.cs-tooltip-icon) {
            flex-shrink: 0;
            inline-size: var(--cs-tooltip-font-size, var(--cs-text-xs));
            block-size: var(--cs-tooltip-font-size, var(--cs-text-xs));
            color: var(--cs-color-text-strong, currentColor);
            stroke-width: 2.25;
            pointer-events: none;
        }
    }
</style>
