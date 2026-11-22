<script lang="ts">
    import { Collapsible } from "../collapsible/index.ts";
    import { getSidebarContext, hasSidebarContext } from "./sidebar.context.ts";
    import { setSidebarSectionContext } from "./sidebar-context.internal.ts";
    import type { SidebarSectionProps } from "./sidebar.types.ts";

    const fallbackId = $props.id();

    let {
        ref = $bindable<HTMLElement | null>(null),
        collapsible = false,
        open = $bindable(true),
        onOpenChange,
        animate,
        class: className,
        children,
        ...rest
    }: SidebarSectionProps = $props();

    const sidebar = hasSidebarContext() ? getSidebarContext() : null;
    const contentId = `${fallbackId}-content`;

    let labelId = $state<string | undefined>();
    let headerSlotRef = $state<HTMLDivElement | null>(null);

    const effectiveAnimate = $derived(animate ?? sidebar?.animate ?? true);

    function toggle(): void {
        if (!collapsible) return;
        const next = !open;
        open = next;
        onOpenChange?.(next);
    }

    setSidebarSectionContext({
        get collapsible() {
            return collapsible;
        },
        get open() {
            return Boolean(open);
        },
        get contentId() {
            return contentId;
        },
        get animate() {
            return effectiveAnimate;
        },
        toggle,
        registerLabelId(id: string): () => void {
            labelId = id;
            return () => {
                if (labelId === id) {
                    labelId = undefined;
                }
            };
        },
        getHeaderSlot(): HTMLDivElement | null {
            return headerSlotRef;
        },
    });
</script>

{#if collapsible}
    <section
        bind:this={ref}
        {...rest}
        aria-labelledby={rest["aria-labelledby"] ?? labelId}
        class={["cs-sidebar-section", className]}
        data-collapsible=""
        data-open={open ? "" : undefined}
    >
        <div bind:this={headerSlotRef} class="cs-sidebar-section-header-slot"></div>
        <Collapsible
            id={contentId}
            class="cs-sidebar-section-content"
            open={Boolean(open)}
            axis="vertical"
            motion="slide"
            animate={effectiveAnimate}
            keepMounted={true}
        >
            <div class="cs-sidebar-section-items">
                {@render children?.()}
            </div>
        </Collapsible>
    </section>
{:else}
    <section
        bind:this={ref}
        {...rest}
        aria-labelledby={rest["aria-labelledby"] ?? labelId}
        class={["cs-sidebar-section", className]}
    >
        {@render children?.()}
    </section>
{/if}
