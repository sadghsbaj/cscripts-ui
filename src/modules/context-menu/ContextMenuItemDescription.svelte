<script lang="ts">
    import { getContextMenuItemContext, hasContextMenuItemContext } from "./context-menu.context.internal.ts";
    import type { ContextMenuItemDescriptionProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ContextMenuItemDescriptionProps = $props();

    const item = hasContextMenuItemContext() ? getContextMenuItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerDescriptionElement(ref);
    });
</script>

<p bind:this={ref} {...rest} class={["cs-context-menu-item-description", "cs-listbox-item-description", className]}>
    {@render children?.()}
</p>
