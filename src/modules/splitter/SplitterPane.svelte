<script lang="ts">
    import { untrack } from "svelte";
    import { getSplitterContext } from "./splitter.context.ts";
    import type { SplitterExtent, SplitterPaneProps } from "./splitter.types.ts";

    const fallbackId = $props.id();

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        id,
        extent = $bindable(),
        defaultExtent,
        min = "0px",
        max = "100%",
        collapsible = false,
        collapsed = $bindable(false),
        collapsedExtent = "0px",
        collapseThreshold = 0.5,
        onCollapseChange,
        class: className,
        children,
        ...rest
    }: SplitterPaneProps = $props();

    const ctx = getSplitterContext();
    const hasExplicitId = $derived(id !== undefined);
    const resolvedId = $derived(id ?? fallbackId);

    let internalCollapsed = $state(untrack(() => collapsed));
    let lastSolverCollapsed: boolean | undefined;
    let lastSolverExtent: SplitterExtent | undefined;

    const basis = $derived(ctx.getPaneBasis(resolvedId));
    const isInert = $derived(ctx.getPaneInert(resolvedId));

    $effect(() => {
        const paneId = resolvedId;
        const explicit = hasExplicitId;
        return untrack(() =>
            ctx.registerPane({
                id: paneId,
                hasExplicitId: explicit,
                getElement: () => ref,
                getExtentProp: () => extent,
                setExtentProp: (next) => {
                    lastSolverExtent = next;
                    try {
                        extent = next;
                    } catch {
                        // Ignore TypeError when consumer passes a one-way `extent={...}` prop.
                    }
                },
                getDefaultExtent: () => defaultExtent,
                getMin: () => min,
                getMax: () => max,
                getCollapsible: () => collapsible,
                getCollapsed: () => internalCollapsed,
                setCollapsed: (next, fromUser) => {
                    if (internalCollapsed === next) return;
                    lastSolverCollapsed = next;
                    internalCollapsed = next;
                    try {
                        collapsed = next;
                    } catch {
                        // Ignore TypeError when consumer passes a one-way `collapsed={...}` prop.
                    }
                    if (fromUser) {
                        onCollapseChange?.(next);
                    }
                },
                getCollapsedExtent: () => collapsedExtent,
                getCollapseThreshold: () => collapseThreshold,
            }),
        );
    });

    let prevCollapsed = untrack(() => collapsed);
    $effect(() => {
        const paneId = resolvedId;
        const isCollapsed = collapsed;
        if (isCollapsed === prevCollapsed) return;
        prevCollapsed = isCollapsed;
        internalCollapsed = isCollapsed;
        if (isCollapsed === lastSolverCollapsed) {
            lastSolverCollapsed = undefined;
            return;
        }
        lastSolverCollapsed = undefined;
        untrack(() => {
            ctx.notifyPaneCollapsedPropChanged(paneId, isCollapsed);
        });
    });

    let prevExtent = untrack(() => extent);
    $effect(() => {
        const paneId = resolvedId;
        const currentExtent = extent;
        if (currentExtent === undefined || currentExtent === prevExtent) {
            prevExtent = currentExtent;
            return;
        }
        prevExtent = currentExtent;
        if (currentExtent === lastSolverExtent) {
            lastSolverExtent = undefined;
            return;
        }
        lastSolverExtent = undefined;
        untrack(() => {
            ctx.notifyPaneExtentPropChanged(paneId, currentExtent);
        });
    });
</script>

<div
    bind:this={ref}
    id={resolvedId}
    class={["cs-splitter-pane", className]}
    data-collapsed={internalCollapsed ? "" : undefined}
    data-sized={basis !== undefined ? "" : undefined}
    inert={isInert ? true : undefined}
    style:--cs-splitter-pane-basis={basis}
    {...rest}
>
    {@render children?.()}
</div>
