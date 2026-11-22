<script lang="ts">
    import type { SidebarHeaderProps } from "./sidebar.types.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SidebarHeaderProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-sidebar-header", className]}>
    {@render children?.()}
</div>
