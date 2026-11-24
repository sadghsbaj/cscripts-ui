<script lang="ts">
    import {
        getCommandPaletteItemContext,
        hasCommandPaletteItemContext,
    } from "./command-palette.context.internal.ts";
    import type { CommandPaletteItemDescriptionProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteItemDescriptionProps = $props();

    const item = hasCommandPaletteItemContext() ? getCommandPaletteItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerDescriptionElement(ref);
    });
</script>

<p bind:this={ref} {...rest} class={["cs-command-palette-item-description", "cs-listbox-item-description", className]}>
    {@render children?.()}
</p>
