<script lang="ts">
    import { untrack } from "svelte";
    import { t } from "../../shared/lang.internal.ts";
    import { getSplitterContext } from "./splitter.context.ts";
    import type { SplitterHandleProps } from "./splitter.types.ts";

    const handleId = $props.id();

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        variant,
        size,
        disabled = false,
        keyboardStep = "16px",
        keyboardStepLarge = "64px",
        doubleClickAction = "reset",
        label,
        class: className,
        children,
        onpointerdown,
        onpointermove,
        onpointerup,
        onpointercancel,
        onkeydown,
        ondblclick,
        ...rest
    }: SplitterHandleProps = $props();

    const ctx = getSplitterContext();

    const effectiveVariant = $derived(variant ?? ctx.variant);
    const effectiveSize = $derived(size ?? ctx.size);
    const isDisabled = $derived(disabled || ctx.disabled);
    const isDragging = $derived(ctx.draggingHandleId === handleId);
    const aria = $derived(ctx.getHandleAria(handleId));
    const resolvedLabel = $derived(
        label ??
            t({
                de: "Größe der Bereiche anpassen",
                en: "Resize panes",
            }),
    );

    let activePointerId: number | null = null;

    $effect(() => {
        return untrack(() =>
            ctx.registerHandle({
                id: handleId,
                getElement: () => ref,
            }),
        );
    });

    function getClientPos(event: PointerEvent): number {
        return ctx.orientation === "horizontal" ? event.clientX : event.clientY;
    }

    function handlePointerDown(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointerdown?.(event);
        if (event.defaultPrevented || isDisabled || event.button !== 0) return;

        event.stopPropagation();
        event.preventDefault();
        activePointerId = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        ctx.startDrag(handleId, getClientPos(event));
    }

    function handlePointerMove(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointermove?.(event);
        if (activePointerId !== event.pointerId || !isDragging) return;
        event.stopPropagation();
        ctx.updateDrag(handleId, getClientPos(event));
    }

    function finishPointerDrag(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        if (activePointerId !== event.pointerId) return;
        event.stopPropagation();
        activePointerId = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        ctx.endDrag(handleId);
    }

    function handlePointerUp(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointerup?.(event);
        finishPointerDrag(event);
    }

    function handlePointerCancel(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointercancel?.(event);
        finishPointerDrag(event);
    }

    function handleKeyDown(
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onkeydown?.(event);
        if (event.defaultPrevented || isDisabled) return;

        const step = event.shiftKey ? keyboardStepLarge : keyboardStep;
        const isHorizontal = ctx.orientation === "horizontal";

        if ((isHorizontal && event.key === "ArrowLeft") || (!isHorizontal && event.key === "ArrowUp")) {
            event.preventDefault();
            event.stopPropagation();
            ctx.stepHandle(handleId, -1, step);
            return;
        }

        if (
            (isHorizontal && event.key === "ArrowRight") ||
            (!isHorizontal && event.key === "ArrowDown")
        ) {
            event.preventDefault();
            event.stopPropagation();
            ctx.stepHandle(handleId, 1, step);
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            event.stopPropagation();
            ctx.jumpHandle(handleId, "min");
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            event.stopPropagation();
            ctx.jumpHandle(handleId, "max");
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            ctx.toggleAdjacentCollapse(handleId);
        }
    }

    function handleDoubleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        ondblclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        event.stopPropagation();
        ctx.doubleClickHandle(handleId, doubleClickAction);
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    bind:this={ref}
    class={["cs-splitter-handle", className]}
    role="separator"
    tabindex={isDisabled ? -1 : 0}
    aria-orientation={ctx.orientation === "horizontal" ? "vertical" : "horizontal"}
    aria-controls={aria.prevPaneId}
    aria-valuenow={aria.valuenow}
    aria-valuemin={aria.valuemin}
    aria-valuemax={aria.valuemax}
    aria-label={resolvedLabel}
    aria-disabled={isDisabled ? "true" : undefined}
    data-orientation={ctx.orientation}
    data-variant={effectiveVariant}
    data-size={effectiveSize}
    data-dragging={isDragging ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerCancel}
    onkeydown={handleKeyDown}
    ondblclick={handleDoubleClick}
    {...rest}
>
    {#if children}
        {@render children({ dragging: isDragging, orientation: ctx.orientation })}
    {:else}
        <span class="cs-splitter-handle-pill" aria-hidden="true"></span>
    {/if}
</div>
