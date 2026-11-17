<script lang="ts">
    import type { TransitionConfig } from "svelte/transition";

    import { scrollLock } from "../scroll-lock/index.ts";
    import type { OverlayProps } from "./index.ts";
    import { topLayer } from "./top-layer.attach.ts";

    let {
        ref = $bindable(null),
        variant,
        lockScroll = true,
        class: className,
        children,
        onclick,
        onpointerdown,
        ...rest
    }: OverlayProps = $props();

    function getMaxTransitionDurationMs(node: HTMLElement): number {
        if (typeof getComputedStyle !== "function") return 0;

        const raw = getComputedStyle(node).transitionDuration;
        if (!raw) return 0;

        let max = 0;
        for (const part of raw.split(",")) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            let ms = NaN;
            if (trimmed.endsWith("ms")) {
                ms = Number(trimmed.slice(0, -2));
            } else if (trimmed.endsWith("s")) {
                ms = Number(trimmed.slice(0, -1)) * 1000;
            }
            if (Number.isFinite(ms) && ms > max) {
                max = ms;
            }
        }
        return max;
    }

    let isExiting = false;

    /* Delays Svelte DOM unmounting to match the CSS exit transition duration
     * so native `allow-discrete` and `overlay` exit transitions can play out.
     * Computed after hidePopover() so base .cs-overlay exit rules apply. */
    function overlayExit(node: HTMLElement): TransitionConfig {
        isExiting = true;

        try {
            if (node.matches?.(":popover-open")) {
                node.hidePopover();
            }
        } catch {
            // Ignore InvalidStateError if already closed or detached
        }

        return {
            duration: getMaxTransitionDurationMs(node),
        };
    }

    /* Tracks VisualViewport shifts (e.g. mobile on-screen keyboard opening)
     * so the overlay's safe area shrinks without jumping its fixed backdrop. */
    function trackVisualViewport(node: HTMLElement): () => void {
        const vv = typeof window !== "undefined" ? window.visualViewport : null;
        if (!vv) return () => {};

        let lastTop = 0;
        let lastBottom = 0;

        function update(): void {
            if (isExiting || !vv || vv.scale > 1.01) return;

            const layoutHeight = node.clientHeight || window.innerHeight;
            const rawTop = Math.max(0, Math.round(vv.offsetTop));
            const rawBottom = Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop));
            const nextTop = rawTop <= 1 ? 0 : rawTop;
            const nextBottom = rawBottom <= 1 ? 0 : rawBottom;

            if (nextTop !== lastTop) {
                lastTop = nextTop;
                if (nextTop > 0) {
                    node.style.setProperty("--cs-overlay-inset-top", `${nextTop}px`);
                } else {
                    node.style.removeProperty("--cs-overlay-inset-top");
                }
            }

            if (nextBottom !== lastBottom) {
                lastBottom = nextBottom;
                if (nextBottom > 0) {
                    node.style.setProperty("--cs-overlay-inset-bottom", `${nextBottom}px`);
                } else {
                    node.style.removeProperty("--cs-overlay-inset-bottom");
                }
            }
        }

        update();
        /* eslint-disable unicorn/prefer-observer-apis -- VisualViewport is not an Element; resize and scroll events are the only Web API for tracking visual viewport geometry */
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
        window.addEventListener("resize", update);
        /* eslint-enable unicorn/prefer-observer-apis */

        return () => {
            vv.removeEventListener("resize", update);
            vv.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
            node.style.removeProperty("--cs-overlay-inset-top");
            node.style.removeProperty("--cs-overlay-inset-bottom");
        };
    }

    let isBackdropPointerDown = false;

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerdown?.(event);
        if (event.defaultPrevented) return;
        isBackdropPointerDown = event.target === event.currentTarget;
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        const wasBackdrop = isBackdropPointerDown && event.target === event.currentTarget;
        isBackdropPointerDown = false;

        if (wasBackdrop) {
            onclick?.(event);
        }
    }
</script>

<div
    bind:this={ref}
    {...rest}
    out:overlayExit
    popover="manual"
    {@attach topLayer()}
    {@attach scrollLock({ enabled: () => lockScroll })}
    {@attach trackVisualViewport}
    onpointerdown={handlePointerDown}
    onclick={handleClick}
    class={["cs-overlay", className]}
    data-variant={variant}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        /* Exposed on :root so external controls (e.g. floating close buttons)
         * or child panels can align to the overlay's exact viewport boundaries. */
        :root {
            --cs-overlay-padding: clamp(1rem, 0.5rem + 2dvmin, 2rem);
        }

        .cs-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100dvw;

            /* Override user-agent stylesheet limits for [popover], which otherwise enforce
             * `max-width: calc(100% - 2em)` and `max-height: calc(100% - 2em)`.
             * Base box resets (margin, border) are globally provided by reset.css. */
            max-width: none;
            height: 100dvh;
            max-height: none;
            padding-block-start: calc(var(--cs-overlay-padding) + var(--cs-overlay-inset-top, 0px));
            padding-block-end: calc(var(--cs-overlay-padding) + var(--cs-overlay-inset-bottom, 0px));
            padding-inline: var(--cs-overlay-padding);
            overflow: hidden;

            /* =====================================================
             * CLOSED / EXIT TRANSITION (Fast & Accelerating Out)
             * ===================================================== */
            opacity: 0;
            -webkit-backdrop-filter: blur(0px) saturate(100%);
            backdrop-filter: blur(0px) saturate(100%);
            transition:
                opacity var(--cs-dur-exit-lg) var(--cs-ease-exit),
                backdrop-filter var(--cs-dur-exit-lg) var(--cs-ease-exit),
                -webkit-backdrop-filter var(--cs-dur-exit-lg) var(--cs-ease-exit),
                padding-block-start var(--cs-dur-exit-lg) var(--cs-ease-exit),
                padding-block-end var(--cs-dur-exit-lg) var(--cs-ease-exit),
                display var(--cs-dur-exit-lg) allow-discrete,
                overlay var(--cs-dur-exit-lg) allow-discrete;
            overscroll-behavior: contain;

            &[data-scroll-locked] {
                touch-action: none;

                & > :global(*) {
                    touch-action: auto;
                }
            }
        }

        /* =========================================================
         * OPEN TRANSITION (Explosive Launch + Viscous Optical Settle)
         * ========================================================= */
        .cs-overlay:popover-open {
            opacity: 1;
            transition:
                opacity var(--cs-dur-enter-sm) var(--cs-ease-effect),
                backdrop-filter var(--cs-dur-enter-lg) var(--cs-ease-quart-out),
                -webkit-backdrop-filter var(--cs-dur-enter-lg) var(--cs-ease-quart-out),
                padding-block-start var(--cs-dur-280) var(--cs-ease-quart-out),
                padding-block-end var(--cs-dur-280) var(--cs-ease-quart-out),
                display var(--cs-dur-enter-lg) allow-discrete,
                overlay var(--cs-dur-enter-lg) allow-discrete;
        }

        /* =========================================================
         * VARIANTS
         * ========================================================= */
        .cs-overlay[data-variant="blur"] {
            background-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-950) 12%, transparent),
                color-mix(in oklch, black 65%, transparent)
            );

            &:popover-open {
                -webkit-backdrop-filter: blur(16px) saturate(160%);
                backdrop-filter: blur(16px) saturate(160%);
            }
        }

        .cs-overlay[data-variant="dim"] {
            background-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-950) 28%, transparent),
                color-mix(in oklch, black 65%, transparent)
            );
        }

        .cs-overlay[data-variant="solid"] {
            background-color: var(--cs-color-canvas);
        }

        .cs-overlay[data-variant="transparent"] {
            background-color: transparent;
        }

        /* =========================================================
         * ENTRY KEYFRAME (Initial state before transition)
         * Must be placed after variants so cascade order wins.
         * ========================================================= */
        @starting-style {
            .cs-overlay:popover-open,
            .cs-overlay[data-variant="blur"]:popover-open {
                opacity: 0;
                -webkit-backdrop-filter: blur(0px) saturate(100%);
                backdrop-filter: blur(0px) saturate(100%);
            }
        }
    }
</style>
