<script lang="ts">
    import {
        getSidebarContext,
        getSidebarGroupContext,
        hasSidebarGroupContext,
        setSidebarGroupContext,
    } from "./sidebar.context.ts";
    import type { SidebarGroupProps } from "./sidebar.types.ts";

    const fallbackId = $props.id();

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        open = $bindable(false),
        onOpenChange,
        disabled = false,
        keepMounted = true,
        animate,
        class: className,
        children,
        ...rest
    }: SidebarGroupProps = $props();

    const sidebar = getSidebarContext();
    const parentGroup = hasSidebarGroupContext() ? getSidebarGroupContext() : null;

    const triggerId = `${fallbackId}-trigger`;
    const contentId = `${fallbackId}-content`;

    const depth = $derived((parentGroup?.depth ?? 0) + 1);
    const isDisabled = $derived(Boolean(disabled || parentGroup?.disabled));
    const effectiveOpen = $derived(Boolean(open) && !sidebar.isRailCollapsed);
    const effectiveAnimate = $derived(animate ?? sidebar.animate);

    function setOpen(next: boolean): void {
        if (isDisabled) return;
        if (Boolean(open) === next) return;
        open = next;
        onOpenChange?.(next);
    }

    function toggle(): void {
        setOpen(!open);
    }

    setSidebarGroupContext({
        get open() {
            return Boolean(open);
        },
        get effectiveOpen() {
            return effectiveOpen;
        },
        get disabled() {
            return isDisabled;
        },
        get keepMounted() {
            return keepMounted;
        },
        get animate() {
            return effectiveAnimate;
        },
        get depth() {
            return depth;
        },
        get triggerId() {
            return triggerId;
        },
        get contentId() {
            return contentId;
        },
        toggle,
        setOpen,
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-sidebar-group", className]}
    data-open={effectiveOpen ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    data-depth={depth}
>
    {@render children?.()}
</div>
