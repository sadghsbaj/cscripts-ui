<script lang="ts">
    import { onMount, untrack } from "svelte";

    import type { CollapsibleProps, CollapsibleState } from "./index.ts";

    const fallbackId = $props.id();

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        open = $bindable(false),
        axis = "vertical",
        motion = "slide",
        animate = true,
        collapsedSize,
        fadeMask = false,
        keepMounted = true,
        disabled = false,
        id = fallbackId,
        class: className,
        style: styleAttr,
        children,
        ontransitionend,
        ...rest
    }: CollapsibleProps = $props();

    // Suppress entrance motion when mounted already open; cleared after the first frame.
    let mountedInstant = $state(untrack(() => Boolean(open)));
    let collapsibleState = $state<CollapsibleState>(untrack(() => (open ? "open" : "closed")));
    let domOpen = $state(untrack(() => Boolean(open)));

    const effectiveMotion = $derived(animate ? motion : "none");
    const effectiveKeepMounted = $derived(keepMounted || Boolean(collapsedSize));
    const shouldMount = $derived(effectiveKeepMounted || collapsibleState !== "closed");
    const instant = $derived(mountedInstant || !animate);

    const mergedStyle = $derived.by(() => {
        const collapsed = collapsedSize ? `--cs-collapsible-collapsed-size: ${collapsedSize}` : "";
        if (styleAttr && collapsed) {
            const trimmed = styleAttr.trimEnd();
            const sep = trimmed.endsWith(";") ? " " : "; ";
            return `${trimmed}${sep}${collapsed};`;
        }
        if (collapsed) return `${collapsed};`;
        return styleAttr;
    });

    function prefersReducedMotion(): boolean {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return false;
        }
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function parseCssTimeMs(val: string): number {
        const trimmed = val.trim();
        if (trimmed.endsWith("ms")) return Number(trimmed.slice(0, -2));
        if (trimmed.endsWith("s")) return Number(trimmed.slice(0, -1)) * 1000;
        return 0;
    }

    function getTrackTransitionDurationMs(node: HTMLElement | null): number {
        if (!node || typeof getComputedStyle !== "function") return 0;

        const computed = getComputedStyle(node);
        const rawDuration = computed.transitionDuration;
        if (!rawDuration) return 0;

        const durations = rawDuration.split(",").map((val) => parseCssTimeMs(val));
        const delays = (computed.transitionDelay || "0s").split(",").map((val) => parseCssTimeMs(val));

        let max = 0;
        for (const [i, duration] of durations.entries()) {
            const total = duration + (delays[i % delays.length] ?? 0);
            if (Number.isFinite(total) && total > max) {
                max = total;
            }
        }
        return max;
    }

    let rafId: number | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    function clearPendingTimers(): void {
        if (rafId !== undefined && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(rafId);
            rafId = undefined;
        }
        if (fallbackTimer !== undefined) {
            clearTimeout(fallbackTimer);
            fallbackTimer = undefined;
        }
    }

    function scheduleSettlement(targetOpen: boolean): void {
        const durationMs = getTrackTransitionDurationMs(ref);
        if (durationMs <= 0) {
            collapsibleState = targetOpen ? "open" : "closed";
            return;
        }

        // Safety net if transitionend is swallowed (e.g. ancestor hidden mid-transition).
        fallbackTimer = setTimeout(() => {
            fallbackTimer = undefined;
            if (open === targetOpen) {
                collapsibleState = targetOpen ? "open" : "closed";
            }
        }, durationMs + 50);
    }

    onMount(() => {
        let mountRaf: number | undefined;
        if (mountedInstant) {
            if (typeof requestAnimationFrame === "function") {
                mountRaf = requestAnimationFrame(() => {
                    mountedInstant = false;
                });
            } else {
                mountedInstant = false;
            }
        }

        return () => {
            if (mountRaf !== undefined && typeof cancelAnimationFrame === "function") {
                cancelAnimationFrame(mountRaf);
            }
            clearPendingTimers();
        };
    });

    let prevOpen = untrack(() => Boolean(open));

    $effect(() => {
        const nextOpen = Boolean(open);
        const instantMotion = !animate || motion === "none";

        if (nextOpen === prevOpen) {
            const currentState = untrack(() => collapsibleState);
            if (instantMotion && (currentState === "opening" || currentState === "closing")) {
                clearPendingTimers();
                mountedInstant = false;
                domOpen = nextOpen;
                collapsibleState = nextOpen ? "open" : "closed";
            }
            return;
        }
        prevOpen = nextOpen;

        clearPendingTimers();
        mountedInstant = false;

        if (instantMotion || prefersReducedMotion()) {
            domOpen = nextOpen;
            collapsibleState = nextOpen ? "open" : "closed";
            return;
        }

        if (nextOpen) {
            const needsLazyMount = !effectiveKeepMounted && collapsibleState === "closed";
            collapsibleState = "opening";

            if (needsLazyMount && typeof requestAnimationFrame === "function") {
                // Mount children at 0fr first, then apply data-open on the next frame so the transition has a start state.
                rafId = requestAnimationFrame(() => {
                    rafId = undefined;
                    domOpen = true;
                    scheduleSettlement(true);
                });
            } else {
                domOpen = true;
                scheduleSettlement(true);
            }
            return;
        }

        if (!untrack(() => domOpen)) {
            collapsibleState = "closed";
            return;
        }

        collapsibleState = "closing";
        domOpen = false;
        scheduleSettlement(false);
    });

    function handleTransitionEnd(event: TransitionEvent & { currentTarget: HTMLDivElement }): void {
        ontransitionend?.(event);

        // Ignore bubbled transitions from nested collapsibles or inner opacity/mask transitions.
        if (event.target !== ref) return;

        const expectedProperty = axis === "horizontal" ? "grid-template-columns" : "grid-template-rows";
        if (event.propertyName !== expectedProperty) return;

        clearPendingTimers();
        if (collapsibleState === "opening" && open) {
            collapsibleState = "open";
        } else if (collapsibleState === "closing" && !open) {
            collapsibleState = "closed";
        }
    }
</script>

<div
    bind:this={ref}
    {...rest}
    {id}
    class={["cs-collapsible", className]}
    style={mergedStyle}
    data-open={domOpen ? "" : undefined}
    data-axis={axis}
    data-motion={effectiveMotion}
    data-state={collapsibleState}
    data-instant={instant ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    data-collapsed-size={collapsedSize ? "" : undefined}
    data-fade-mask={fadeMask ? "" : undefined}
    ontransitionend={handleTransitionEnd}
>
    <div class="cs-collapsible-inner" inert={!open && !collapsedSize ? true : undefined}>
        {#if shouldMount}
            {@render children?.()}
        {/if}
    </div>
</div>

<style>
    @layer components.primitive {
        .cs-collapsible {
            --cs-collapsible-dur-enter: var(--cs-dur-240);
            --cs-collapsible-dur-exit: var(--cs-dur-160);
            --cs-collapsible-ease-enter: var(--cs-ease-quart-out);
            --cs-collapsible-ease-exit: var(--cs-ease-exit);
            --cs-collapsible-fade-dur-enter: var(--cs-dur-effect);
            --cs-collapsible-fade-dur-exit: var(--cs-dur-effect-fast);
            --cs-collapsible-swell-distance: 6px;
            --cs-collapsible-swell-scale: 0.985;
            --cs-collapsible-fade-size: 48px;

            display: grid;
            padding: 0;
            border: 0;
            margin: 0;
        }

        /* =========================================================
         * AXES (0fr <-> 1fr)
         * ========================================================= */
        .cs-collapsible[data-axis="vertical"] {
            grid-template-rows: 0fr;
            grid-template-columns: minmax(0, 1fr);
            transition: grid-template-rows var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit);
        }

        .cs-collapsible[data-axis="vertical"][data-open] {
            grid-template-rows: 1fr;
            transition: grid-template-rows var(--cs-collapsible-dur-enter) var(--cs-collapsible-ease-enter);
        }

        .cs-collapsible[data-axis="horizontal"] {
            grid-template-columns: 0fr;
            grid-template-rows: minmax(0, 1fr);
            transition: grid-template-columns var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit);
        }

        .cs-collapsible[data-axis="horizontal"][data-open] {
            grid-template-columns: 1fr;
            transition: grid-template-columns var(--cs-collapsible-dur-enter) var(--cs-collapsible-ease-enter);
        }

        /* =========================================================
         * INNER TRACK
         * ========================================================= */
        .cs-collapsible > .cs-collapsible-inner {
            overflow: clip;
            overflow-clip-margin: 0px;
            min-block-size: 0;
            min-inline-size: 0;
        }

        .cs-collapsible[data-axis="vertical"] > .cs-collapsible-inner {
            min-block-size: var(--cs-collapsible-collapsed-size, 0px);
        }

        .cs-collapsible[data-axis="horizontal"] > .cs-collapsible-inner {
            min-inline-size: var(--cs-collapsible-collapsed-size, 0px);
        }

        /* Allow focus rings on descendants to breathe once settled open. */
        .cs-collapsible[data-state="open"] > .cs-collapsible-inner {
            overflow-clip-margin: 4px;
        }

        .cs-collapsible[data-state="closed"]:not([data-collapsed-size]) > .cs-collapsible-inner {
            visibility: hidden;
        }

        /* =========================================================
         * MOTION PRESETS
         * ========================================================= */
        .cs-collapsible[data-motion="fade"] > .cs-collapsible-inner {
            opacity: 0;
            transition:
                opacity var(--cs-collapsible-fade-dur-exit) var(--cs-collapsible-ease-exit),
                mask-position var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit);
        }

        .cs-collapsible[data-motion="fade"][data-open] > .cs-collapsible-inner {
            opacity: 1;
            transition:
                opacity var(--cs-collapsible-fade-dur-enter) var(--cs-ease-effect),
                mask-position var(--cs-collapsible-dur-enter) var(--cs-collapsible-ease-enter);
        }

        .cs-collapsible[data-motion="swell"] > .cs-collapsible-inner {
            opacity: 0;
            scale: var(--cs-collapsible-swell-scale);
            transition:
                opacity var(--cs-collapsible-fade-dur-exit) var(--cs-collapsible-ease-exit),
                scale var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit),
                translate var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit),
                mask-position var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit);
        }

        .cs-collapsible[data-motion="swell"][data-axis="vertical"] > .cs-collapsible-inner {
            translate: 0 calc(var(--cs-collapsible-swell-distance) * -1);
        }

        .cs-collapsible[data-motion="swell"][data-axis="horizontal"] > .cs-collapsible-inner {
            translate: calc(var(--cs-collapsible-swell-distance) * -1) 0;
        }

        .cs-collapsible[data-motion="swell"][data-open] > .cs-collapsible-inner {
            opacity: 1;
            scale: 1;
            translate: 0 0;
            transition:
                opacity var(--cs-collapsible-fade-dur-enter) var(--cs-ease-effect),
                scale var(--cs-collapsible-dur-enter) var(--cs-collapsible-ease-enter),
                translate var(--cs-collapsible-dur-enter) var(--cs-collapsible-ease-enter),
                mask-position var(--cs-collapsible-dur-enter) var(--cs-collapsible-ease-enter);
        }

        .cs-collapsible[data-motion="none"],
        .cs-collapsible[data-motion="none"] > .cs-collapsible-inner,
        .cs-collapsible[data-instant],
        .cs-collapsible[data-instant] > .cs-collapsible-inner {
            transition: none !important;
        }

        /* =========================================================
         * SURFACE-AGNOSTIC FADE MASK
         * ========================================================= */
        .cs-collapsible[data-fade-mask][data-axis="vertical"] > .cs-collapsible-inner {
            mask-image: linear-gradient(
                to bottom,
                #000 0%,
                #000 calc(100% - var(--cs-collapsible-fade-size)),
                transparent 100%
            );
            mask-size: 100% calc(100% + var(--cs-collapsible-fade-size));
            mask-position: 0 100%;
        }

        .cs-collapsible[data-fade-mask][data-axis="vertical"][data-open] > .cs-collapsible-inner {
            mask-position: 0 0%;
        }

        .cs-collapsible[data-fade-mask][data-axis="horizontal"] > .cs-collapsible-inner {
            mask-image: linear-gradient(
                to right,
                #000 0%,
                #000 calc(100% - var(--cs-collapsible-fade-size)),
                transparent 100%
            );
            mask-size: calc(100% + var(--cs-collapsible-fade-size)) 100%;
            mask-position: 100% 0;
        }

        .cs-collapsible[data-fade-mask][data-axis="horizontal"][data-open] > .cs-collapsible-inner {
            mask-position: 0% 0;
        }

        .cs-collapsible[data-fade-mask][data-motion="slide"] > .cs-collapsible-inner {
            transition: mask-position var(--cs-collapsible-dur-exit) var(--cs-collapsible-ease-exit);
        }

        .cs-collapsible[data-fade-mask][data-motion="slide"][data-open] > .cs-collapsible-inner {
            transition: mask-position var(--cs-collapsible-dur-enter) var(--cs-collapsible-ease-enter);
        }
    }
</style>
