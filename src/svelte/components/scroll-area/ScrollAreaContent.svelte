<!--
@component
Scrollable viewport (`<ScrollAreaContent />`) inside `<ScrollArea />`.

Architectural Notes:
- Native Scroll Mechanics: Uses native browser overflow scrolling while hiding system
  scrollbars (`scrollbar-width: none` / `::-webkit-scrollbar`), preserving hardware-accelerated
  momentum, touch gestures, keyboard navigation, and `scrollIntoView` behavior.
- Attachment Forwarding: Spreads `{...rest}` directly onto the scrolling viewport element so
  attachments like `{@attach scrollFade(...)}` mask only the scrolling content without clipping
  the parent `<ScrollArea />` overlay scrollbars.
-->
<script lang="ts">
    import { getScrollAreaContext, type ScrollAreaContentProps } from "./index.ts";

    let { class: className, children, ...rest }: ScrollAreaContentProps = $props();

    const scrollArea = getScrollAreaContext();
</script>

<div
    {...rest}
    {@attach scrollArea.attachContent}
    class={["cs-scroll-area-content", className]}
    data-direction={scrollArea.direction}
    data-overshoot={scrollArea.overshoot ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area-content {
            flex: 1 1 auto;
            min-width: 0;
            min-height: 0;
            width: 100%;
            height: 100%;
            scrollbar-width: none;
            -ms-overflow-style: none;

            &::-webkit-scrollbar {
                display: none;
            }

            &[data-overshoot] {
                overscroll-behavior: contain;
            }

            &[data-direction="vertical"] {
                overflow-x: hidden;
                overflow-y: auto;
            }

            &[data-direction="horizontal"] {
                overflow-x: auto;
                overflow-y: hidden;
            }

            &[data-direction="both"] {
                overflow: auto;
            }
        }
    }
</style>
