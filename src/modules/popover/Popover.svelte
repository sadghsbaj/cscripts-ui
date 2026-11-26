<script lang="ts">
    import { type PopoverPlacement, type PopoverProps } from ".";
    import { findAnchorElement, resolvePopoverPlacement } from "./placement-flip.internal";

    let {
        ref = $bindable(null),
        id,
        placement,
        width,
        offset = "8px",
        popover = "auto",
        animate = true,
        class: className,
        children,
        ...rest
    }: PopoverProps = $props();

    let resolvedPlacement = $state<PopoverPlacement | undefined>();
    let ready = $state(false);

    function isPopoverOpen(element: HTMLElement | null): boolean {
        if (!element) return false;
        try {
            return element.matches(":popover-open");
        } catch {
            return false;
        }
    }

    function measurePlacement(el: HTMLElement, source?: Element | null): void {
        const anchorEl = findAnchorElement(el, id, source);
        if (!anchorEl) return;
        resolvedPlacement = resolvePopoverPlacement(
            placement,
            anchorEl.getBoundingClientRect(),
            el.getBoundingClientRect(),
        );
    }

    $effect(() => {
        if (animate && isPopoverOpen(ref)) {
            ready = true;
        }
    });

    $effect(() => {
        if (!ref) return;
        const el: HTMLDivElement = ref;

        function onBeforeToggle(event: Event): void {
            const toggleEvent = event as ToggleEvent;
            if (toggleEvent.newState === "open") {
                // Safety net: never start a fresh open with stale placement from an interrupted exit.
                resolvedPlacement = undefined;
                return;
            }
            if (!animate || toggleEvent.newState !== "closed") return;
            // Re-measure while :popover-open is still active so exit transitions follow scroll/resize flips.
            measurePlacement(el, toggleEvent.source);
        }

        function onToggle(event: Event): void {
            const toggleEvent = event as ToggleEvent;
            if (toggleEvent.newState === "open") {
                if (!animate) return;
                measurePlacement(el, toggleEvent.source);
                ready = true;
                return;
            }
            if (toggleEvent.newState === "closed") {
                ready = false;
                if (!animate || "instant" in el.dataset || "warm" in el.dataset) {
                    resolvedPlacement = undefined;
                }
            }
        }

        function onTransitionDone(event: Event): void {
            if (event.target !== el) return;
            if (!isPopoverOpen(el)) {
                resolvedPlacement = undefined;
            }
        }

        el.addEventListener("beforetoggle", onBeforeToggle);
        el.addEventListener("toggle", onToggle);
        el.addEventListener("transitionend", onTransitionDone);
        el.addEventListener("transitioncancel", onTransitionDone);
        return () => {
            el.removeEventListener("beforetoggle", onBeforeToggle);
            el.removeEventListener("toggle", onToggle);
            el.removeEventListener("transitionend", onTransitionDone);
            el.removeEventListener("transitioncancel", onTransitionDone);
        };
    });
</script>

<div
    bind:this={ref}
    {...rest}
    {id}
    {popover}
    class={["cs-popover", className]}
    data-width={width}
    data-placement={placement}
    data-resolved-placement={resolvedPlacement}
    data-ready={ready ? "" : undefined}
    data-animate={animate ? "" : undefined}
    style:--cs-popover-anchor={`--anchor-${id}`}
    style:--cs-popover-offset={offset}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-popover {
            /* Spatial unit vectors (-1 | 0 | 1) pointing toward the trigger anchor.
            * Consumed by built-in [data-animate] or custom composite transitions (e.g. Tooltip). */
            --cs-popover-dir-x: 0;
            --cs-popover-dir-y: 1;
            --cs-popover-origin: bottom center;

            position-anchor: var(--cs-popover-anchor);
            position-visibility: anchor-visible;
            position: fixed;
            inset: auto;
            margin: 0;
            max-inline-size: calc(100vw - 32px);
            max-block-size: calc(100vh - 32px);
            overflow: auto;
            transform-origin: var(--cs-popover-origin);
        }

        .cs-popover:not(:popover-open) {
            pointer-events: none;
        }

        /* =========================================================
        * WIDTHS
        * ========================================================= */
        .cs-popover[data-width="content"] {
            inline-size: max-content;
        }

        .cs-popover[data-width="anchor"] {
            inline-size: anchor-size(inline);
        }

        .cs-popover[data-width="min-anchor"] {
            inline-size: max-content;
            min-inline-size: anchor-size(inline);
        }

        /* =========================================================
        * PLACEMENTS
        * ========================================================= */

        /* TOP */
        .cs-popover[data-placement^="top"] {
            margin-block-end: var(--cs-popover-offset);
        }

        .cs-popover:is([data-resolved-placement^="top"], [data-placement^="top"]:not([data-resolved-placement])) {
            --cs-popover-dir-x: 0;
            --cs-popover-dir-y: 1;
        }

        .cs-popover[data-placement="top"] {
            position-area: block-start;
            position-try-fallbacks: flip-block;
        }

        .cs-popover:is([data-resolved-placement="top"], [data-placement="top"]:not([data-resolved-placement])) {
            --cs-popover-origin: bottom center;
        }

        .cs-popover[data-placement="top-start"] {
            position-area: block-start span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover:is(
            [data-resolved-placement="top-start"],
            [data-placement="top-start"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: bottom left;
        }

        .cs-popover[data-placement="top-end"] {
            position-area: block-start span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover:is(
            [data-resolved-placement="top-end"],
            [data-placement="top-end"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: bottom right;
        }

        /* BOTTOM */
        .cs-popover[data-placement^="bottom"] {
            margin-block-start: var(--cs-popover-offset);
        }

        .cs-popover:is(
            [data-resolved-placement^="bottom"],
            [data-placement^="bottom"]:not([data-resolved-placement])
        ) {
            --cs-popover-dir-x: 0;
            --cs-popover-dir-y: -1;
        }

        .cs-popover[data-placement="bottom"] {
            position-area: block-end;
            position-try-fallbacks: flip-block;
        }

        .cs-popover:is([data-resolved-placement="bottom"], [data-placement="bottom"]:not([data-resolved-placement])) {
            --cs-popover-origin: top center;
        }

        .cs-popover[data-placement="bottom-start"] {
            position-area: block-end span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover:is(
            [data-resolved-placement="bottom-start"],
            [data-placement="bottom-start"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: top left;
        }

        .cs-popover[data-placement="bottom-end"] {
            position-area: block-end span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover:is(
            [data-resolved-placement="bottom-end"],
            [data-placement="bottom-end"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: top right;
        }

        /* LEFT */
        .cs-popover[data-placement^="left"] {
            margin-inline-end: var(--cs-popover-offset);
        }

        .cs-popover:is([data-resolved-placement^="left"], [data-placement^="left"]:not([data-resolved-placement])) {
            --cs-popover-dir-x: 1;
            --cs-popover-dir-y: 0;
        }

        .cs-popover[data-placement="left"] {
            position-area: inline-start;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover:is([data-resolved-placement="left"], [data-placement="left"]:not([data-resolved-placement])) {
            --cs-popover-origin: center right;
        }

        .cs-popover[data-placement="left-start"] {
            position-area: inline-start span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover:is(
            [data-resolved-placement="left-start"],
            [data-placement="left-start"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: top right;
        }

        .cs-popover[data-placement="left-end"] {
            position-area: inline-start span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover:is(
            [data-resolved-placement="left-end"],
            [data-placement="left-end"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: bottom right;
        }

        /* RIGHT */
        .cs-popover[data-placement^="right"] {
            margin-inline-start: var(--cs-popover-offset);
        }

        .cs-popover:is([data-resolved-placement^="right"], [data-placement^="right"]:not([data-resolved-placement])) {
            --cs-popover-dir-x: -1;
            --cs-popover-dir-y: 0;
        }

        .cs-popover[data-placement="right"] {
            position-area: inline-end;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover:is([data-resolved-placement="right"], [data-placement="right"]:not([data-resolved-placement])) {
            --cs-popover-origin: center left;
        }

        .cs-popover[data-placement="right-start"] {
            position-area: inline-end span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover:is(
            [data-resolved-placement="right-start"],
            [data-placement="right-start"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: top left;
        }

        .cs-popover[data-placement="right-end"] {
            position-area: inline-end span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover:is(
            [data-resolved-placement="right-end"],
            [data-placement="right-end"]:not([data-resolved-placement])
        ) {
            --cs-popover-origin: bottom left;
        }

        /* =========================================================
        * MOTION (`animate = true` by default)
        * Tuned by default for medium/large floating surfaces (menus, pickers).
        * Micro-surfaces (like Tooltip) can override `--cs-popover-anim-*` tokens.
        * ========================================================= */
        .cs-popover[data-animate] {
            /* Tunable motion tokens (Default = rich menu/picker physics) */
            --cs-popover-distance: var(--cs-popover-anim-distance, 8px);
            --cs-popover-scale-start: var(--cs-popover-anim-scale-start, 0.9);
            --cs-popover-scale-exit: var(--cs-popover-anim-scale-exit, 0.95);
            --cs-popover-blur-start: var(--cs-popover-anim-blur-start, 3.5px);
            --cs-popover-blur-exit: var(--cs-popover-anim-blur-exit, 2px);
            --cs-popover-dur-in: var(--cs-popover-anim-dur-in, var(--cs-dur-enter-md));
            --cs-popover-dur-fade-in: var(--cs-popover-anim-dur-fade-in, var(--cs-dur-effect));
            --cs-popover-dur-blur-in: var(--cs-popover-anim-dur-blur-in, calc(var(--cs-dur-enter-md) * 0.5));
            --cs-popover-dur-out: var(--cs-popover-anim-dur-out, var(--cs-dur-exit-md));

            opacity: 0;
            filter: blur(var(--cs-popover-blur-exit));
            translate: calc(var(--cs-popover-dir-x) * var(--cs-popover-distance) * 0.5)
                calc(var(--cs-popover-dir-y) * var(--cs-popover-distance) * 0.5);
            scale: var(--cs-popover-scale-exit);

            transition:
                opacity var(--cs-popover-dur-out) var(--cs-ease-exit),
                scale var(--cs-popover-dur-out) var(--cs-ease-exit),
                translate var(--cs-popover-dur-out) var(--cs-ease-exit),
                filter calc(var(--cs-popover-dur-out) * 0.8) var(--cs-ease-exit),
                display var(--cs-popover-dur-out) allow-discrete,
                overlay var(--cs-popover-dur-out) allow-discrete;
        }

        .cs-popover[data-animate]:popover-open {
            opacity: 1;
            filter: none;
            translate: 0 0;
            scale: 1;
        }

        /* Hide on the initial top-layer frame until toggle measures resolvedPlacement and sets data-ready. */
        .cs-popover[data-animate]:popover-open:not([data-ready]):not([data-warm]):not([data-instant]) {
            opacity: 0;
            pointer-events: none;
            transition: none;
        }

        .cs-popover[data-animate][data-ready]:popover-open:not([data-warm]):not([data-instant]) {
            animation:
                cs-popover-enter var(--cs-popover-dur-in) var(--cs-ease-enter) both,
                cs-popover-fade-in var(--cs-popover-dur-fade-in) var(--cs-ease-effect) both,
                cs-popover-blur-in var(--cs-popover-dur-blur-in) var(--cs-ease-effect) both;
        }

        .cs-popover[data-animate][data-warm]:popover-open,
        .cs-popover[data-animate][data-instant] {
            --cs-popover-dur-in: 0s;
            --cs-popover-dur-fade-in: 0s;
            --cs-popover-dur-blur-in: 0s;
            --cs-popover-dur-out: 0s;
            animation: none !important;
            transition: none !important;
        }

        @keyframes cs-popover-enter {
            from {
                translate: calc(var(--cs-popover-dir-x) * var(--cs-popover-distance))
                    calc(var(--cs-popover-dir-y) * var(--cs-popover-distance));
                scale: var(--cs-popover-scale-start);
            }
            to {
                translate: 0 0;
                scale: 1;
            }
        }

        @keyframes cs-popover-fade-in {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes cs-popover-blur-in {
            from {
                filter: blur(var(--cs-popover-blur-start));
            }
            to {
                filter: blur(0px);
            }
        }
    }
</style>
