<script lang="ts">
    import type { SidebarPinnedProps } from "./sidebar.types.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SidebarPinnedProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-sidebar-pinned", className]}>
    {@render children?.()}
</div>
