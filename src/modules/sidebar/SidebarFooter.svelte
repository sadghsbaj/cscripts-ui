<script lang="ts">
    import type { SidebarFooterProps } from "./sidebar.types.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SidebarFooterProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-sidebar-footer", className]}>
    {@render children?.()}
</div>
