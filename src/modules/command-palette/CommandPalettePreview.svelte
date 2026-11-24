<script lang="ts">
    import type { CommandPalettePreviewProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPalettePreviewProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-command-palette-preview", className]}>
    {@render children?.()}
</div>
