<script lang="ts">
    import { getScrollAreaContext, type ScrollAreaContentProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ScrollAreaContentProps = $props();

    const scrollArea = getScrollAreaContext();
</script>

<div
    bind:this={ref}
    {...rest}
    {@attach scrollArea.attachContent}
    class={["cs-scroll-area-content", className]}
    data-direction={scrollArea.direction}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area-content {
            -ms-overflow-style: none;
            flex: 1 1 auto;
            width: 100%;
            min-width: 0;
            height: 100%;
            min-height: 0;
            scrollbar-width: none;

            &::-webkit-scrollbar {
                display: none;
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
