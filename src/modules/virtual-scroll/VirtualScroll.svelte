<script lang="ts" generics="T = unknown">
    import { type VirtualScrollProps } from "./index.ts";
    import { createVirtualScroll } from "./virtual-scroll.svelte.ts";

    let {
        ref = $bindable(null),
        listRef = $bindable(null),
        controller = $bindable(null),
        items,
        as = "div",
        role,
        listClass,
        estimateSize,
        fixed = false,
        orientation = "vertical",
        overscan = 5,
        gap,
        lanes = 1,
        scrollTarget = "element",
        getItemKey,
        initialViewportSize = 0,
        initialRenderCount = 0,
        onRangeChange,
        class: className,
        children,
        ...rest
    }: VirtualScrollProps<T> = $props();

    // Wrap options as getters so reactive prop updates flow into the controller
    const virtual = createVirtualScroll({
        count: () => items.length,
        estimateSize: (index) => (typeof estimateSize === "function" ? estimateSize(index) : estimateSize),
        fixed: () => fixed,
        orientation: () => orientation,
        overscan: () => overscan,
        gap: () => gap,
        lanes: () => lanes,
        scrollTarget: () => scrollTarget,
        get getItemKey() {
            return getItemKey;
        },
        get initialViewportSize() {
            return initialViewportSize;
        },
        get initialRenderCount() {
            return initialRenderCount;
        },
        onRangeChange: (range) => onRangeChange?.(range),
    });

    $effect(() => {
        if (controller !== virtual) {
            controller = virtual;
        }
    });

    const activeController = $derived(controller ?? virtual);
    const itemTag = $derived(as === "ul" || as === "ol" ? "li" : "div");
</script>

<div
    bind:this={ref}
    {...rest}
    {@attach activeController.attachViewport}
    class={["cs-virtual-scroll", className]}
    data-orientation={orientation}
    data-scroll-target={scrollTarget}
    data-scrolling={activeController.isScrolling ? "" : undefined}
>
    <svelte:element
        this={as}
        bind:this={listRef}
        {@attach activeController.attachList}
        {role}
        class={["cs-virtual-scroll-list", listClass]}
    >
        {#each activeController.items as item (item.key)}
            <svelte:element
                this={itemTag}
                {@attach activeController.attachItem(item.index)}
                class="cs-virtual-scroll-item"
            >
                {@render children(items[item.index] as T, item.index)}
            </svelte:element>
        {/each}
    </svelte:element>
</div>

<style>
    @layer components.composite {
        .cs-virtual-scroll {
            position: relative;
            overflow-anchor: none;

            &[data-scroll-target="element"][data-orientation="vertical"] {
                overflow-x: hidden;
                overflow-y: auto;
            }

            &[data-scroll-target="element"][data-orientation="horizontal"] {
                overflow-x: auto;
                overflow-y: hidden;
            }
        }

        .cs-virtual-scroll-list {
            overflow-anchor: none;
        }
    }
</style>
