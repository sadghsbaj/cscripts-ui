<script lang="ts">
    import type { SidebarItemIconProps } from "./sidebar.types.ts";

    let {
        icon: Icon,
        color,
        strokeWidth,
        class: className,
        ...rest
    }: SidebarItemIconProps = $props();
</script>

<span class={["cs-sidebar-item-icon", className]} aria-hidden="true">
    <Icon {color} {strokeWidth} {...rest} aria-hidden="true" />
</span>
