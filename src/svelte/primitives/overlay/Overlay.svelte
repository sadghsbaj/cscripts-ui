<!--
@component
Fullscreen backdrop surface primitive (`<Overlay />`) promoted to the browser's native Top Layer
via the HTML Popover API (`popover="manual"`). Provides visual isolation, surface tint/blur states,
and safe pointer-dismiss handling for modals, dialogs, sheets, and full-screen takeovers.

Architectural Notes:
- Defaults: Requires explicit `variant` prop (`data-variant`).
  See `../../explanations/component-defaults-and-globals.md`
- Native Top Layer: Automatically promoted to Top Layer via `{@attach topLayer()}` without z-index collisions.
- Dismiss Ergonomics: Pairs `pointerdown` and `click` on the backdrop to prevent accidental closures
  when dragging or selecting text inside child elements.
- Scroll Containment: When `lockScroll` (default `true`) is enabled, traps wheel and touch scroll gestures
  within scrollable overlay descendants, preventing background scroll chaining without document layout shifts.
- CSS Hooks: Exposes `data-variant` for zero-specificity styling via `.cs-overlay`.
-->
<script lang="ts">
    import type { TransitionConfig } from "svelte/transition";

    import { scrollLock } from "../scroll-lock/index.ts";
    import type { OverlayProps } from "./index.ts";
    import { topLayer } from "./top-layer.attach.ts";

    let {
        variant,
        lockScroll = true,
        class: className,
        children,
        onclick,
        onpointerdown,
        ...rest
    }: OverlayProps = $props();

    /* Delays Svelte DOM unmounting by 160ms so native CSS `allow-discrete`
     * and `overlay` exit transitions can fully play out before element removal. */
    function overlayExit(node: HTMLElement): TransitionConfig {
        try {
            if (node.matches?.(":popover-open")) {
                node.hidePopover();
            }
        } catch {
            // Ignore InvalidStateError if already closed or detached
        }

        return {
            duration: 160,
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
    {...rest}
    out:overlayExit
    popover="manual"
    {@attach topLayer()}
    {@attach scrollLock(lockScroll)}
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
            padding: var(--cs-overlay-padding);
            overflow: hidden;

            /* =====================================================
             * CLOSED / EXIT TRANSITION (Fast & Accelerating Out)
             * ===================================================== */
            opacity: 0;
            backdrop-filter: blur(0px) saturate(100%);
            -webkit-backdrop-filter: blur(0px) saturate(100%);
            transition:
                opacity 160ms var(--cs-ease-cubic-in),
                backdrop-filter 160ms var(--cs-ease-quad-in),
                -webkit-backdrop-filter 160ms var(--cs-ease-quad-in),
                display 160ms allow-discrete,
                overlay 160ms allow-discrete;
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
                opacity 220ms var(--cs-ease-expo-out),
                backdrop-filter 420ms var(--cs-spring-morph),
                -webkit-backdrop-filter 420ms var(--cs-spring-morph),
                display 420ms allow-discrete,
                overlay 420ms allow-discrete;
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
                backdrop-filter: blur(16px) saturate(160%);
                -webkit-backdrop-filter: blur(16px) saturate(160%);
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
                backdrop-filter: blur(0px) saturate(100%);
                -webkit-backdrop-filter: blur(0px) saturate(100%);
            }
        }
    }
</style>
