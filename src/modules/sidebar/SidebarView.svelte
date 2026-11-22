<script lang="ts">
    import { getSidebarViewsContext } from "./sidebar.context.ts";
    import type { SidebarViewProps } from "./sidebar.types.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        value,
        label,
        initialFocus = "auto",
        class: className,
        ontransitionend,
        children,
        ...rest
    }: SidebarViewProps = $props();

    const views = getSidebarViewsContext();

    const viewState = $derived(views.getViewState(value));
    const shouldRender = $derived(views.shouldRenderView(value));
    const isActive = $derived(views.activeValue === value);
    // Keep the outgoing view non-inert until SidebarViews completes focus handoff to the incoming view.
    const isViewInert = $derived(
        !isActive && !(views.pendingFocusHandoff && viewState === "exiting")
    );

    $effect(() => {
        if (!shouldRender) return;
        return views.registerView(value, {
            getElement: () => ref,
            getInitialFocus: () => initialFocus,
        });
    });

    $effect(() => {
        if (!isActive || !views.pendingFocusHandoff || !ref) return;
        views.completeFocusHandoff(value);
    });

    function handleTransitionEnd(
        event: TransitionEvent & { currentTarget: EventTarget & HTMLDivElement }
    ): void {
        ontransitionend?.(event);
        if (event.target !== ref) return;
        if (event.propertyName === "translate" || event.propertyName === "opacity") {
            views.notifyViewTransitionEnd(value);
        }
    }
</script>

{#if shouldRender}
    <div
        bind:this={ref}
        {...rest}
        role={label ? "region" : rest.role}
        aria-label={label ?? rest["aria-label"]}
        aria-hidden={!isActive ? "true" : undefined}
        inert={isViewInert ? true : undefined}
        class={["cs-sidebar-view", className]}
        data-value={value}
        data-view-state={viewState}
        data-active={isActive ? "" : undefined}
        ontransitionend={handleTransitionEnd}
    >
        {@render children?.()}
    </div>
{/if}
