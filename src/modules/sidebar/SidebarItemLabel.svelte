<script lang="ts">
    import { hasSidebarItemContext, getSidebarItemContext } from "./sidebar-context.internal.ts";
    import type { SidebarItemLabelProps } from "./sidebar.types.ts";

    let {
        ref = $bindable(null),
        class: className,
        children,
        ...rest
    }: SidebarItemLabelProps = $props();

    const item = hasSidebarItemContext() ? getSidebarItemContext() : null;

    $effect(() => {
        if (!item || !ref) return;
        return item.registerLabelElement(ref);
    });
</script>

<span bind:this={ref} {...rest} class={["cs-sidebar-item-label", className]}>
    {@render children?.()}
</span>
