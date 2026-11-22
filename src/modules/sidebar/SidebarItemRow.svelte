<script lang="ts">
    import type { SidebarItemRowProps } from "./sidebar.types.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SidebarItemRowProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-sidebar-item-row", className]}>
    {@render children?.()}
</div>
