<script lang="ts">
    import type { CommandPaletteItemTrailingProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteItemTrailingProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-command-palette-item-trailing", className]}>
    {@render children?.()}
</span>
