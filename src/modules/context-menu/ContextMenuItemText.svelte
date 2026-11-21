<script lang="ts">
    import { getContextMenuItemContext, hasContextMenuItemContext } from "./context-menu.context.internal.ts";
    import type { ContextMenuItemTextProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ContextMenuItemTextProps = $props();

    const item = hasContextMenuItemContext() ? getContextMenuItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerTextElement(ref);
    });
</script>

<span bind:this={ref} {...rest} class={["cs-context-menu-item-text", "cs-listbox-item-text", className]}>
    {@render children?.()}
</span>
