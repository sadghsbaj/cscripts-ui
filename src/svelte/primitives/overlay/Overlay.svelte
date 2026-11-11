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
- CSS Hooks: Exposes `data-variant` for zero-specificity styling via `.cs-overlay`.
-->
<script lang="ts">
    import type { OverlayProps } from "./index.ts";
    import { topLayer } from "./top-layer.attach.ts";

    let { variant, class: className, children, onclick, onpointerdown, ...rest }: OverlayProps = $props();

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
    popover="manual"
    {@attach topLayer()}
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
        }

        /* =========================================================
        * VARIANTS
        * ========================================================= */
        .cs-overlay[data-variant="blur"] {
            background-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-950) 12%, transparent),
                color-mix(in oklch, black 65%, transparent)
            );
            backdrop-filter: blur(16px) saturate(160%);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
        }

        .cs-overlay[data-variant="dim"] {
            background-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-950) 28%, transparent),
                color-mix(in oklch, black 65%, transparent)
            );
        }

        .cs-overlay[data-variant="opaque"] {
            background-color: var(--cs-color-elevation-0);
        }

        .cs-overlay[data-variant="transparent"] {
            background-color: transparent;
        }
    }
</style>
