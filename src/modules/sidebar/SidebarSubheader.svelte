<script lang="ts">
    import { Collapsible } from "../collapsible/index.ts";
    import { getSidebarContext } from "./sidebar.context.ts";
    import type { SidebarSubheaderProps } from "./sidebar.types.ts";

    let {
        ref = $bindable(null),
        railBehavior = "collapse",
        class: className,
        children,
        ...rest
    }: SidebarSubheaderProps = $props();

    const sidebar = getSidebarContext();
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-sidebar-subheader", className]}
    data-rail-behavior={railBehavior}
>
    {#if railBehavior === "collapse"}
        <Collapsible
            open={!sidebar.isRailCollapsed}
            axis="vertical"
            motion="fade"
            animate={sidebar.animate}
            keepMounted={true}
        >
            <div class="cs-sidebar-subheader-inner">
                {@render children?.()}
            </div>
        </Collapsible>
    {:else}
        <div class="cs-sidebar-subheader-inner">
            {@render children?.()}
        </div>
    {/if}
</div>
