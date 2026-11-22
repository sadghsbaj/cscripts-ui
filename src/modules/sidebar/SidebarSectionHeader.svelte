<script lang="ts">
    import type { Attachment } from "svelte/attachments";
    import {
        getSidebarSectionContext,
        hasSidebarSectionContext,
        setSidebarSectionHeaderContext,
    } from "./sidebar-context.internal.ts";
    import type { SidebarSectionHeaderProps } from "./sidebar.types.ts";

    let {
        ref = $bindable(null),
        class: className,
        children,
        ...rest
    }: SidebarSectionHeaderProps = $props();

    const section = hasSidebarSectionContext() ? getSidebarSectionContext() : null;

    setSidebarSectionHeaderContext({ insideHeader: true });

    // Relocate header outside <Collapsible> when parent SidebarSection is collapsible so the trigger stays interactive.
    const attachToHeaderSlot: Attachment<HTMLDivElement> = (node) => {
        if (!section?.collapsible) return;
        const slot = section.getHeaderSlot();
        if (!slot || node.parentElement === slot) return;
        slot.append(node);
    };
</script>

<div class="cs-sidebar-section-fold" {@attach attachToHeaderSlot}>
    <div class="cs-sidebar-section-fold-inner">
        <div
            bind:this={ref}
            {...rest}
            class={["cs-sidebar-section-header", className]}
        >
            {@render children?.()}
        </div>
    </div>
</div>
