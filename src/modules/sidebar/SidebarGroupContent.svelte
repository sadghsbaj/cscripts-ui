<script lang="ts">
    import { Collapsible } from "../collapsible/index.ts";
    import { getSidebarGroupContext } from "./sidebar.context.ts";
    import type { SidebarGroupContentProps } from "./sidebar.types.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        id,
        class: className,
        style: styleAttr,
        children,
        ...rest
    }: SidebarGroupContentProps = $props();

    const group = getSidebarGroupContext();

    const mergedStyle = $derived.by(() => {
        const depthVar = `--cs-sidebar-depth: ${group.depth}`;
        if (!styleAttr) return `${depthVar};`;
        const trimmed = styleAttr.trimEnd();
        const sep = trimmed.endsWith(";") ? " " : "; ";
        return `${trimmed}${sep}${depthVar};`;
    });
</script>

<Collapsible
    bind:ref
    id={id ?? group.contentId}
    open={group.effectiveOpen}
    axis="vertical"
    motion="slide"
    animate={group.animate}
    keepMounted={group.keepMounted}
    disabled={group.disabled}
    {...rest}
    class={["cs-sidebar-group-content", className]}
    style={mergedStyle}
    data-depth={group.depth}
>
    <div class="cs-sidebar-group-list">
        {@render children?.()}
    </div>
</Collapsible>
