<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { setSidebarViewsContext, type SidebarViewRegistration, type SidebarViewStageState } from "./sidebar.context.ts";
    import {
        isFocusInsideElement,
        resolveIncomingViewFocusTarget,
        resolveViewHistoryTransition,
        type ResolvedViewDirection,
    } from "./sidebar-views.internal.ts";
    import type { SidebarViewsProps } from "./sidebar.types.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        value = $bindable(),
        onValueChange,
        transition = "slide",
        direction = "auto",
        keepMounted = false,
        animate = true,
        class: className,
        children,
        ...rest
    }: SidebarViewsProps = $props();

    const viewRegistry = new SvelteMap<string, SidebarViewRegistration>();
    let history: string[] = untrack(() => [value]);

    let ready = $state(false);
    let activeValue = $state(untrack(() => value));
    let outgoingValue = $state<string | null>(null);
    let enteringValue = $state<string | null>(null);
    let resolvedDirection = $state<ResolvedViewDirection>("forward");
    let pendingFocusHandoff = $state(false);

    let enterRaf: number | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    function clearTimers(): void {
        if (enterRaf !== undefined && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(enterRaf);
            enterRaf = undefined;
        }
        if (exitTimer !== undefined) {
            clearTimeout(exitTimer);
            exitTimer = undefined;
        }
    }

    function prefersReducedMotion(): boolean {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return false;
        }
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function getViewState(viewValue: string): SidebarViewStageState {
        if (viewValue === activeValue) {
            return enteringValue === viewValue ? "entering" : "active";
        }
        if (viewValue === outgoingValue) {
            return "exiting";
        }
        return "idle";
    }

    function shouldRenderView(viewValue: string): boolean {
        if (keepMounted) return true;
        return viewValue === activeValue || viewValue === outgoingValue;
    }

    function registerView(viewValue: string, registration: SidebarViewRegistration): () => void {
        viewRegistry.set(viewValue, registration);
        return () => {
            if (viewRegistry.get(viewValue) === registration) {
                viewRegistry.delete(viewValue);
            }
        };
    }

    function notifyViewTransitionEnd(viewValue: string): void {
        if (outgoingValue !== viewValue) return;
        if (exitTimer !== undefined) {
            clearTimeout(exitTimer);
            exitTimer = undefined;
        }
        outgoingValue = null;
    }

    function completeFocusHandoff(viewValue: string): void {
        if (!pendingFocusHandoff || viewValue !== activeValue) return;

        const incomingReg = viewRegistry.get(viewValue);
        const incomingEl = incomingReg?.getElement() ?? null;
        if (!incomingEl || incomingEl.hasAttribute("inert")) return;

        const initialFocus = incomingReg?.getInitialFocus() ?? "auto";
        const target = resolveIncomingViewFocusTarget(incomingEl, initialFocus);
        if (target) {
            target.focus({ preventScroll: true });
        } else if (initialFocus !== "none") {
            if (!incomingEl.hasAttribute("tabindex")) {
                incomingEl.setAttribute("tabindex", "-1");
            }
            incomingEl.focus({ preventScroll: true });
        }

        pendingFocusHandoff = false;
    }

    setSidebarViewsContext({
        get activeValue() {
            return activeValue;
        },
        get outgoingValue() {
            return outgoingValue;
        },
        get transition() {
            return transition;
        },
        get direction() {
            return resolvedDirection;
        },
        get animate() {
            return animate;
        },
        get keepMounted() {
            return keepMounted;
        },
        get ready() {
            return ready;
        },
        get pendingFocusHandoff() {
            return pendingFocusHandoff;
        },
        getViewState,
        shouldRenderView,
        registerView,
        notifyViewTransitionEnd,
        completeFocusHandoff,
    });

    onMount(() => {
        let mountRaf: number | undefined;
        let mountTimer: ReturnType<typeof setTimeout> | undefined;

        if (typeof requestAnimationFrame === "function") {
            mountRaf = requestAnimationFrame(() => {
                ready = true;
            });
        } else {
            mountTimer = setTimeout(() => {
                ready = true;
            }, 0);
        }

        return () => {
            if (mountRaf !== undefined && typeof cancelAnimationFrame === "function") {
                cancelAnimationFrame(mountRaf);
            }
            if (mountTimer !== undefined) {
                clearTimeout(mountTimer);
            }
            clearTimers();
        };
    });

    let prevValue = untrack(() => value);

    $effect.pre(() => {
        const nextValue = value;
        if (nextValue === prevValue) return;

        const oldValue = prevValue;
        prevValue = nextValue;
        onValueChange?.(nextValue);

        const outgoingEl = viewRegistry.get(oldValue)?.getElement() ?? null;
        const hadFocus = isFocusInsideElement(outgoingEl ?? ref);

        const resolved = resolveViewHistoryTransition(history, nextValue, direction);
        history = resolved.nextHistory;
        resolvedDirection = resolved.direction;

        clearTimers();

        const shouldAnimate =
            ready && animate && transition !== "none" && !prefersReducedMotion();

        activeValue = nextValue;
        pendingFocusHandoff = hadFocus;

        if (!shouldAnimate) {
            outgoingValue = null;
            enteringValue = null;
            return;
        }

        outgoingValue = oldValue;
        enteringValue = nextValue;

        if (typeof requestAnimationFrame === "function") {
            enterRaf = requestAnimationFrame(() => {
                enterRaf = undefined;
                enteringValue = null;
            });
        } else {
            enteringValue = null;
        }

        exitTimer = setTimeout(() => {
            exitTimer = undefined;
            if (outgoingValue === oldValue) {
                outgoingValue = null;
            }
        }, 210);
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-sidebar-views", className]}
    data-transition={transition}
    data-direction={resolvedDirection}
    data-animate={animate && ready && transition !== "none" ? "" : undefined}
>
    {@render children?.()}
</div>
