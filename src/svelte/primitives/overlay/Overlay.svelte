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
        /* Styling is intentionally left open for customization */
    }
</style>
