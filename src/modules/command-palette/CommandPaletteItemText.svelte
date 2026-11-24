<script lang="ts">
    import {
        getCommandPaletteItemContext,
        hasCommandPaletteItemContext,
    } from "./command-palette.context.internal.ts";
    import type { CommandPaletteItemTextProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteItemTextProps = $props();

    const item = hasCommandPaletteItemContext() ? getCommandPaletteItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerTextElement(ref);
    });
</script>

<span bind:this={ref} {...rest} class={["cs-command-palette-item-text", "cs-listbox-item-text", className]}>
    {@render children?.()}
</span>
