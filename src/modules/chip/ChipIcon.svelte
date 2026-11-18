<script lang="ts">
    import type { ChipIconProps } from "./index.ts";

    let { icon: Icon, strokeWidth = 2.25, class: className, ...rest }: ChipIconProps = $props();
</script>

<Icon {...rest} {strokeWidth} aria-hidden="true" class={["cs-chip-icon", className]} />

<style>
    @layer components.primitive {
        :global(.cs-chip-icon) {
            flex-shrink: 0;
            inline-size: var(--cs-chip-icon-size);
            block-size: var(--cs-chip-icon-size);
            pointer-events: none;
        }
    }
</style>
