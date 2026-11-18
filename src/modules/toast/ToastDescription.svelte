<script lang="ts">
    import type { ToastDescriptionProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ToastDescriptionProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-toast-description", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-toast-description {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: var(--cs-toast-description-lines, 4);
            line-clamp: var(--cs-toast-description-lines, 4);
            overflow: hidden;
            min-inline-size: 0;
            font-size: var(--cs-text-xs);
            font-weight: 400;
            line-height: var(--cs-leading-snug);
            line-height: round(down, calc(var(--cs-text-xs) * var(--cs-leading-snug)), 1px);
            color: var(--cs-color-text-weak);
            overflow-wrap: anywhere;
            word-break: normal;
        }
    }
</style>
