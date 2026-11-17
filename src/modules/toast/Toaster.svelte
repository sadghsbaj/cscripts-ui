<script lang="ts">
    import { onDestroy, untrack } from "svelte";
    import type { Attachment } from "svelte/attachments";
    import { SvelteSet } from "svelte/reactivity";

    import { t } from "../../shared/lang.internal.ts";
    import { middleClick } from "../middle-click/index.ts";
    import { topLayer } from "../overlay/index.ts";
    import type { ToasterProps } from "./index.ts";
    import { toastState } from "./toast-state.svelte.ts";
    import Toast from "./Toast.svelte";
    import ToastAction from "./ToastAction.svelte";
    import ToastClose from "./ToastClose.svelte";
    import ToastDescription from "./ToastDescription.svelte";
    import ToastIcon from "./ToastIcon.svelte";
    import ToastTitle from "./ToastTitle.svelte";

    interface TimerEntry {
        timeoutId?: ReturnType<typeof setTimeout>;
        remaining: number;
        startedAt: number;
        version: number;
        duration: number;
    }

    function prefersReducedMotion(): boolean {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return false;
        }
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    let {
        ref = $bindable(null),
        placement = "bottom-right",
        duration = 4000,
        maxVisible = 3,
        gap = 12,
        offset,
        ariaLabel,
        class: className,
        ...rest
    }: ToasterProps = $props();

    let listRef = $state<HTMLOListElement | null>(null);
    let expanded = $state(false);
    let pointerInside = $state(false);
    let interacting = $state(false);
    let focusWithin = $state(false);
    let swipingId = $state<string | null>(null);
    let swipeStartY = 0;
    let swipeLastY = 0;
    let swipeLastTime = 0;
    let swipeVelocity = 0;
    let swipeY = $state(0);

    // Non-reactive bookkeeping so timer updates never re-trigger $effect loops
    const timerEntries: Record<string, TimerEntry> = {};
    const removalTimers: Record<string, ReturnType<typeof setTimeout>> = {};
    const lastPositions: Record<string, { index: number; offset: number }> = {};
    const swipedOutIds = new SvelteSet<string>();

    const lift = $derived(placement.startsWith("top-") ? 1 : -1);
    const resolvedOffset = $derived(typeof offset === "number" ? `${offset}px` : offset);
    const paused = $derived(expanded || interacting || focusWithin);
    const activeToasts = $derived(toastState.toasts.filter((item) => !item.removed));

    // Fall back to the previous front toast's height on frame 0 so rear toasts never collapse to 0px
    const frontToastHeight = $derived.by(() => {
        const first = activeToasts[0];
        if (!first) {
            return 0;
        }
        const second = activeToasts[1];
        return toastState.heights[first.id] ?? (second ? toastState.heights[second.id] : undefined) ?? 0;
    });

    const activePositions = $derived.by(() => {
        const map: Record<string, { index: number; offset: number }> = {};
        let offset = 0;
        for (const [index, item] of activeToasts.entries()) {
            map[item.id] = { index, offset };
            offset += (toastState.heights[item.id] ?? 0) + gap;
        }
        return map;
    });

    // Include exiting toasts until DOM removal so the hover hit-box never shrinks out from under the cursor mid-exit
    const expandedHeight = $derived.by(() => {
        if (toastState.toasts.length === 0) {
            return 0;
        }
        let total = 0;
        for (const item of toastState.toasts) {
            total += (toastState.heights[item.id] ?? 0) + gap;
        }
        return Math.max(0, total - gap);
    });

    function getStackPosition(id: string, removed: boolean): { index: number; offset: number } {
        if (!removed) {
            return activePositions[id] ?? lastPositions[id] ?? { index: 0, offset: 0 };
        }
        return lastPositions[id] ?? { index: 0, offset: 0 };
    }

    function mountToast(id: string, getUpdatedAt: () => number): Attachment<HTMLLIElement> {
        return (node: HTMLLIElement) => {
            const rect = node.getBoundingClientRect();
            if (rect.height > 0) {
                toastState.setHeight(id, Math.round(rect.height));
            }

            // Re-measure synchronously on content updates without letting CSS height transitions corrupt the stored height
            let isFirstRun = true;
            $effect(() => {
                getUpdatedAt();
                if (isFirstRun) {
                    isFirstRun = false;
                    return;
                }
                const prevTransition = node.style.transition;
                node.style.transition = "none";
                node.style.height = "auto";
                const nextHeight = Math.round(node.getBoundingClientRect().height);
                node.style.height = "";
                node.style.transition = prevTransition;
                if (nextHeight > 0) {
                    toastState.setHeight(id, nextHeight);
                }
            });

            // Double rAF guarantees the off-screen start frame paints before transitioning in
            let raf1 = 0;
            let raf2 = 0;
            if (typeof requestAnimationFrame === "function") {
                raf1 = requestAnimationFrame(() => {
                    raf2 = requestAnimationFrame(() => {
                        toastState.markMounted(id);
                    });
                });
            } else {
                toastState.markMounted(id);
            }

            return () => {
                if (typeof cancelAnimationFrame !== "function") {
                    return;
                }
                cancelAnimationFrame(raf1);
                cancelAnimationFrame(raf2);
            };
        };
    }

    function handlePointerEnter(event: PointerEvent): void {
        if (event.pointerType === "touch") {
            return;
        }
        pointerInside = true;
        expanded = true;
    }

    function handlePointerLeave(event: PointerEvent): void {
        if (event.pointerType === "touch") {
            return;
        }
        pointerInside = false;
        if (focusWithin) {
            return;
        }
        expanded = false;
    }

    function handleFocusIn(event: FocusEvent): void {
        if (!(event.target instanceof Element)) {
            return;
        }
        try {
            if (!event.target.matches(":focus-visible")) {
                return;
            }
        } catch {
            return;
        }
        focusWithin = true;
        expanded = true;
    }

    function handleFocusOut(event: FocusEvent): void {
        if (event.relatedTarget instanceof Node && listRef?.contains(event.relatedTarget)) {
            return;
        }
        focusWithin = false;
        if (!pointerInside) {
            expanded = false;
        }
    }

    function handleItemPointerDown(id: string, dismissible: boolean, removed: boolean, event: PointerEvent): void {
        if (!dismissible || removed || event.button !== 0) {
            return;
        }
        if (
            event.target instanceof Element &&
            event.target.closest("button, a, input, select, textarea, [role='button']")
        ) {
            return;
        }
        const now = event.timeStamp > 0 ? event.timeStamp : performance.now();
        swipingId = id;
        swipeStartY = event.clientY;
        swipeLastY = event.clientY;
        swipeLastTime = now;
        swipeVelocity = 0;
        swipeY = 0;
        interacting = true;
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        }
    }

    function handleItemPointerMove(id: string, event: PointerEvent): void {
        if (swipingId !== id) {
            return;
        }
        const now = event.timeStamp > 0 ? event.timeStamp : performance.now();
        const dt = now - swipeLastTime;
        if (dt > 100) {
            swipeVelocity = 0;
        } else if (dt > 0) {
            const stepDismissDelta = (event.clientY - swipeLastY) * -lift;
            swipeVelocity = stepDismissDelta / dt;
        }
        swipeLastY = event.clientY;
        swipeLastTime = now;

        const deltaY = event.clientY - swipeStartY;
        const dismissDelta = deltaY * -lift;
        swipeY = dismissDelta > 0 ? deltaY : 0;
    }

    function finishSwipe(id: string, shouldCheckDismiss: boolean, event?: PointerEvent): void {
        if (swipingId !== id) {
            return;
        }
        const now = event && event.timeStamp > 0 ? event.timeStamp : performance.now();
        const velocity = now - swipeLastTime > 100 ? 0 : swipeVelocity;
        const dismissDelta = swipeY * -lift;
        swipingId = null;
        swipeLastY = 0;
        swipeLastTime = 0;
        swipeVelocity = 0;
        interacting = false;

        if (shouldCheckDismiss && (dismissDelta >= 28 || (dismissDelta >= 12 && velocity >= 0.3))) {
            swipedOutIds.add(id);
            toastState.dismiss(id);
        } else {
            swipeY = 0;
        }
    }

    function handleItemKeyDown(id: string, dismissible: boolean, removed: boolean, event: KeyboardEvent): void {
        if (event.key !== "Escape" || !dismissible || removed) {
            return;
        }
        event.stopPropagation();
        toastState.dismiss(id);
    }

    // Cache last active stack positions outside $derived so exiting toasts retain their slot
    $effect(() => {
        for (const [id, pos] of Object.entries(activePositions)) {
            lastPositions[id] = pos;
        }
    });

    // Schedule DOM removal after exit transition (or immediately for reduced motion)
    $effect(() => {
        const currentIds: Record<string, true> = {};
        for (const item of toastState.toasts) {
            currentIds[item.id] = true;
            if (item.removed && removalTimers[item.id] === undefined) {
                if (prefersReducedMotion()) {
                    swipedOutIds.delete(item.id);
                    queueMicrotask(() => {
                        delete lastPositions[item.id];
                        toastState.remove(item.id);
                    });
                } else {
                    // Buffer slightly past the 320ms transition so DOM removal never races sibling transform frames
                    const delay = swipedOutIds.has(item.id) ? 200 : 350;
                    removalTimers[item.id] = setTimeout(() => {
                        delete removalTimers[item.id];
                        swipedOutIds.delete(item.id);
                        delete lastPositions[item.id];
                        toastState.remove(item.id);
                    }, delay);
                }
            } else if (!item.removed && removalTimers[item.id] !== undefined) {
                clearTimeout(removalTimers[item.id]);
                delete removalTimers[item.id];
                swipedOutIds.delete(item.id);
            }
        }

        for (const [id, timer] of Object.entries(removalTimers)) {
            if (currentIds[id]) {
                continue;
            }
            clearTimeout(timer);
            delete removalTimers[id];
            swipedOutIds.delete(id);
            delete lastPositions[id];
        }

        if (toastState.toasts.length === 0) {
            expanded = false;
            pointerInside = false;
            interacting = false;
            focusWithin = false;
            swipingId = null;
            swipeLastY = 0;
            swipeLastTime = 0;
            swipeVelocity = 0;
            swipeY = 0;
        } else if (
            untrack(() => focusWithin) &&
            typeof document !== "undefined" &&
            !untrack(() => listRef)?.contains(document.activeElement)
        ) {
            focusWithin = false;
            if (!untrack(() => pointerInside)) {
                expanded = false;
            }
        }
    });

    // Manage auto-dismiss timers with pause/resume preserving remaining time
    $effect(() => {
        const isPaused = paused;
        const defaultDuration = duration;
        const activeIds: Record<string, true> = {};

        for (const item of activeToasts) {
            activeIds[item.id] = true;
            const resolvedDuration = item.duration ?? defaultDuration;
            const existing = timerEntries[item.id];

            if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
                if (existing?.timeoutId !== undefined) {
                    clearTimeout(existing.timeoutId);
                }
                delete timerEntries[item.id];
                continue;
            }

            if (!existing || existing.version !== item.updatedAt || existing.duration !== resolvedDuration) {
                if (existing?.timeoutId !== undefined) {
                    clearTimeout(existing.timeoutId);
                }
                timerEntries[item.id] = {
                    remaining: resolvedDuration,
                    startedAt: Date.now(),
                    version: item.updatedAt,
                    duration: resolvedDuration,
                };
            }
        }

        for (const [id, entry] of Object.entries(timerEntries)) {
            if (activeIds[id]) {
                continue;
            }
            if (entry.timeoutId !== undefined) {
                clearTimeout(entry.timeoutId);
            }
            delete timerEntries[id];
        }

        for (const [id, entry] of Object.entries(timerEntries)) {
            if (isPaused) {
                if (entry.timeoutId !== undefined) {
                    clearTimeout(entry.timeoutId);
                    entry.timeoutId = undefined;
                    entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
                }
            } else if (entry.timeoutId === undefined) {
                entry.startedAt = Date.now();
                entry.timeoutId = setTimeout(() => {
                    delete timerEntries[id];
                    toastState.autoClose(id);
                }, entry.remaining);
            }
        }
    });

    onDestroy(() => {
        for (const entry of Object.values(timerEntries)) {
            if (entry.timeoutId !== undefined) {
                clearTimeout(entry.timeoutId);
            }
        }
        for (const timer of Object.values(removalTimers)) {
            clearTimeout(timer);
        }
    });
</script>

<section
    bind:this={ref}
    aria-label={ariaLabel ?? t({ de: "Benachrichtigungen", en: "Notifications" })}
    {...rest}
    popover="manual"
    class={["cs-toaster", className]}
    data-placement={placement}
    data-expanded={expanded ? "" : undefined}
    style:--cs-toast-gap={`${gap}px`}
    style:--cs-toast-lift={lift}
    style:--cs-toast-viewport-offset={resolvedOffset}
    style:--cs-toast-front-height={`${frontToastHeight}px`}
    {@attach topLayer({ enabled: () => toastState.toasts.length > 0 })}
>
    <ol
        bind:this={listRef}
        class="cs-toaster-list"
        data-expanded={expanded && activeToasts.length > 0 ? "" : undefined}
        style:--cs-toaster-expanded-height={expanded && activeToasts.length > 0 ? `${expandedHeight}px` : undefined}
        onpointerenter={handlePointerEnter}
        onpointerleave={handlePointerLeave}
        onfocusin={handleFocusIn}
        onfocusout={handleFocusOut}
    >
        {#each toastState.toasts as item (item.id)}
            {const pos = $derived(getStackPosition(item.id, item.removed))}
            {const isSwiping = $derived(swipingId === item.id)}
            {const isSwipedOut = $derived(swipedOutIds.has(item.id))}
            {const isFront = $derived(!item.removed && pos.index === 0)}
            {const isVisible = $derived(!item.removed && pos.index < maxVisible)}
            {const initialHeight = $derived(toastState.heights[item.id])}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li
                class="cs-toast-item"
                data-mounted={item.mounted ? "" : undefined}
                data-front={isFront ? "" : undefined}
                data-visible={isVisible ? "" : undefined}
                data-expanded={expanded ? "" : undefined}
                data-removed={item.removed ? "" : undefined}
                data-exit-in-place={item.removed && expanded && pos.index > 0 && !isSwipedOut ? "" : undefined}
                data-swiping={isSwiping ? "" : undefined}
                data-swipe-out={isSwipedOut ? "" : undefined}
                style:--cs-toast-index={pos.index}
                style:--cs-toast-offset={`${pos.offset}px`}
                style:--cs-toast-initial-height={initialHeight !== undefined ? `${initialHeight}px` : "auto"}
                style:--cs-toast-swipe-y={isSwiping ? `${swipeY}px` : "0px"}
                style:z-index={item.removed && pos.index > 0 ? 0 : toastState.toasts.length - pos.index}
                {@attach mountToast(item.id, () => item.updatedAt)}
                {@attach middleClick({
                    enabled: () => item.dismissible && !item.removed,
                    onMiddleClick: () => toastState.dismiss(item.id),
                    ignore: "a[href], button:not(.cs-toast-close), input, textarea, select, [role='button']:not(.cs-toast-close)",
                })}
                onpointerdown={(e) => handleItemPointerDown(item.id, item.dismissible, item.removed, e)}
                onpointermove={(e) => handleItemPointerMove(item.id, e)}
                onpointerup={(e) => finishSwipe(item.id, true, e)}
                onpointercancel={(e) => finishSwipe(item.id, false, e)}
                onkeydown={(e) => handleItemKeyDown(item.id, item.dismissible, item.removed, e)}
            >
                {#if item.render}
                    {@render item.render({
                        id: item.id,
                        color: item.color,
                        dismissible: item.dismissible,
                        dismiss: () => toastState.dismiss(item.id),
                    })}
                {:else}
                    <Toast
                        color={item.color}
                        dismissible={item.dismissible}
                        onDismiss={() => toastState.dismiss(item.id)}
                    >
                        {#if item.icon !== false}
                            <ToastIcon icon={item.icon} />
                        {/if}
                        {#if item.title}
                            <ToastTitle>{item.title}</ToastTitle>
                        {/if}
                        {#if item.description}
                            <ToastDescription>{item.description}</ToastDescription>
                        {/if}
                        {#if item.action}
                            <ToastAction variant={item.action.variant} onclick={item.action.onClick}>
                                {item.action.label}
                            </ToastAction>
                        {/if}
                        {#if item.dismissible}
                            <ToastClose />
                        {/if}
                    </Toast>
                {/if}
            </li>
        {/each}
    </ol>
</section>

<style>
    @layer components.composite {
        .cs-toaster {
            --cs-toast-width: 356px;
            --cs-toast-viewport-offset: 24px;
            --cs-toast-gap: 12px;
            --cs-toast-dur: var(--cs-dur-320);
            --cs-toast-ease: var(--cs-ease-expo-out);

            /* Reset user-agent [popover] defaults so Top-Layer host stays transparent & pass-through */
            position: fixed;
            inset: auto;
            margin: 0;
            padding: 0;
            border: 0;
            max-inline-size: none;
            max-block-size: none;
            overflow: visible;
            background: transparent;
            pointer-events: none;
            inline-size: var(--cs-toast-width);

            &[data-placement="bottom-right"] {
                inset-block-end: var(--cs-toast-viewport-offset);
                inset-inline-end: var(--cs-toast-viewport-offset);
            }

            &[data-placement="bottom-center"] {
                inset-block-end: var(--cs-toast-viewport-offset);
                inset-inline-start: 50%;
                translate: -50% 0;
            }

            &[data-placement="bottom-left"] {
                inset-block-end: var(--cs-toast-viewport-offset);
                inset-inline-start: var(--cs-toast-viewport-offset);
            }

            &[data-placement="top-right"] {
                inset-block-start: var(--cs-toast-viewport-offset);
                inset-inline-end: var(--cs-toast-viewport-offset);
            }

            &[data-placement="top-center"] {
                inset-block-start: var(--cs-toast-viewport-offset);
                inset-inline-start: 50%;
                translate: -50% 0;
            }

            &[data-placement="top-left"] {
                inset-block-start: var(--cs-toast-viewport-offset);
                inset-inline-start: var(--cs-toast-viewport-offset);
            }

            @media (max-width: 639px) {
                --cs-toast-viewport-offset: 16px;

                inline-size: calc(100vw - 2 * var(--cs-toast-viewport-offset));

                &[data-placement^="bottom-"] {
                    inset-inline: var(--cs-toast-viewport-offset);
                    translate: none;
                }

                &[data-placement^="top-"] {
                    inset-inline: var(--cs-toast-viewport-offset);
                    translate: none;
                }
            }
        }

        .cs-toaster-list {
            position: relative;
            margin: 0;
            padding: 0;
            list-style: none;
            inline-size: 100%;
            pointer-events: none;

            &[data-expanded] {
                block-size: var(--cs-toaster-expanded-height);
                pointer-events: auto;
            }
        }

        .cs-toast-item {
            --cs-toast-scale: calc(1 - var(--cs-toast-index, 0) * 0.05);

            position: absolute;
            inset-inline: 0;
            inline-size: 100%;
            pointer-events: auto;
            touch-action: none;
            will-change: transform;
            opacity: 0;
            transform: translateY(calc(var(--cs-toast-lift) * -100%));
            transition:
                transform var(--cs-toast-dur) var(--cs-toast-ease),
                opacity var(--cs-toast-dur) var(--cs-toast-ease),
                height var(--cs-toast-dur) var(--cs-toast-ease),
                box-shadow var(--cs-dur-200) var(--cs-ease-quad-out);

            /* Anchor to bottom edge for bottom-* placements, top edge for top-* placements */
            .cs-toaster[data-placement^="bottom-"] & {
                inset-block-end: 0;
                transform-origin: bottom center;
            }

            .cs-toaster[data-placement^="top-"] & {
                inset-block-start: 0;
                transform-origin: top center;
            }

            /* Mounted front toast */
            &[data-mounted] {
                opacity: 1;
                transform: translateY(0);
            }

            &[data-mounted][data-front] {
                height: var(--cs-toast-initial-height);
            }

            /* Collapsed rear toasts */
            &[data-mounted]:not([data-expanded]):not([data-front]) {
                height: var(--cs-toast-front-height);
                transform: translateY(calc(var(--cs-toast-lift) * var(--cs-toast-gap) * var(--cs-toast-index)))
                    scale(var(--cs-toast-scale));

                > :global(.cs-toast > *) {
                    opacity: 0;
                    transition: opacity var(--cs-dur-240) var(--cs-ease-quad-out);
                }
            }

            &[data-mounted] > :global(.cs-toast > *) {
                transition: opacity var(--cs-dur-240) var(--cs-ease-quad-out);
            }

            /* Expanded stack */
            &[data-mounted][data-expanded] {
                height: var(--cs-toast-initial-height);
                transform: translateY(calc(var(--cs-toast-lift) * var(--cs-toast-offset)));

                /* Invisible hover bridge across gaps so slow pointer movement never collapses the stack */
                &::after {
                    content: "";
                    position: absolute;
                    inset-inline: 0;
                    block-size: calc(var(--cs-toast-gap) + 2px);
                }
            }

            .cs-toaster[data-placement^="bottom-"] &[data-mounted][data-expanded]::after {
                inset-block-end: 100%;
            }

            .cs-toaster[data-placement^="top-"] &[data-mounted][data-expanded]::after {
                inset-block-start: 100%;
            }

            /* Overflow toasts beyond maxVisible */
            &:not([data-visible]) {
                opacity: 0;
                pointer-events: none;
            }

            /* Live pointer swipe tracking */
            &[data-swiping] {
                user-select: none;
                transition: none;
                opacity: clamp(0.45, calc(1 - max(0px, var(--cs-toast-swipe-y) * var(--cs-toast-lift) * -1) / 80px), 1);
                transform: translateY(var(--cs-toast-swipe-y));
            }

            &[data-mounted][data-expanded][data-swiping] {
                transform: translateY(calc(var(--cs-toast-lift) * var(--cs-toast-offset) + var(--cs-toast-swipe-y)));
            }

            /* Standard exit animation */
            &[data-removed] {
                pointer-events: none;
                opacity: 0;
                transform: translateY(calc(var(--cs-toast-lift) * -100%));
            }

            &[data-expanded][data-removed]:not([data-exit-in-place]) {
                transform: translateY(
                    calc(var(--cs-toast-lift) * var(--cs-toast-offset) - var(--cs-toast-lift) * 100%)
                );
            }

            &[data-expanded][data-removed][data-exit-in-place] {
                opacity: 0;
                transform: translateY(calc(var(--cs-toast-lift) * var(--cs-toast-offset))) scale(0.96);
            }

            /* Swipe-out completion */
            &[data-swipe-out] {
                pointer-events: none;
                opacity: 0;
                transform: translateY(calc(var(--cs-toast-lift) * -100%));
                transition:
                    transform var(--cs-dur-200) var(--cs-ease-quad-out),
                    opacity var(--cs-dur-200) var(--cs-ease-quad-out);
            }

            &[data-expanded][data-swipe-out] {
                transform: translateY(
                    calc(var(--cs-toast-lift) * var(--cs-toast-offset) - var(--cs-toast-lift) * 100%)
                );
            }
        }
    }
</style>
