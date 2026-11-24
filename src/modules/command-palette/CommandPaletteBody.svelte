<script lang="ts">
    import type { CommandPaletteBodyProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteBodyProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-command-palette-body", className]}>
    {@render children?.()}
</div>
