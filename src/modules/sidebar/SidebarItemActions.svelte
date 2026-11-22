<script lang="ts">
    import type { SidebarItemActionsProps } from "./sidebar.types.ts";

    let {
        ref = $bindable(null),
        alwaysVisible = false,
        class: className,
        children,
        ...rest
    }: SidebarItemActionsProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-sidebar-item-actions", className]}
    data-always-visible={alwaysVisible ? "" : undefined}
>
    {@render children?.()}
</div>
