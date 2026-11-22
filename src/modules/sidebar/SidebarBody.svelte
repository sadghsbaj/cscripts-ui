<script lang="ts">
    import { ScrollArea, ScrollAreaContent } from "../scroll-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import { getSidebarContext } from "./sidebar.context.ts";
    import type { SidebarBodyProps } from "./sidebar.types.ts";

    let {
        ref = $bindable(null),
        scrollable = true,
        scrollbar = "hover",
        fade = false,
        class: className,
        children,
        ...rest
    }: SidebarBodyProps = $props();

    const sidebar = getSidebarContext();
    const scrollAreaSize = $derived(sidebar.size === "lg" ? "md" : "sm");
    const fadeSize = $derived(typeof fade === "string" ? fade : "sm");
    const fadeEnabled = $derived(Boolean(fade));
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-sidebar-body", className]}
    data-scrollable={scrollable ? "" : undefined}
>
    {#if scrollable}
        <ScrollArea class="cs-sidebar-scroll-area" size={scrollAreaSize} direction="vertical" {scrollbar}>
            <ScrollAreaContent
                class="cs-sidebar-scroll-content"
                {@attach scrollFade({
                    size: fadeSize,
                    direction: "vertical",
                    edges: "both",
                    enabled: fadeEnabled,
                })}
            >
                {@render children?.()}
            </ScrollAreaContent>
        </ScrollArea>
    {:else}
        {@render children?.()}
    {/if}
</div>
