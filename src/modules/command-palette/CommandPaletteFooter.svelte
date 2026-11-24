<script lang="ts">
    import type { CommandPaletteFooterProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteFooterProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-command-palette-footer", className]}>
    {@render children?.()}
</div>
