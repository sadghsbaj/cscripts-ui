<script lang="ts">
    import type { CommandPaletteItemShortcutProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteItemShortcutProps = $props();
</script>

<span bind:this={ref} {...rest} aria-hidden="true" class={["cs-command-palette-item-shortcut", className]}>
    {@render children?.()}
</span>
