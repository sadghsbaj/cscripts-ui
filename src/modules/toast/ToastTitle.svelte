<script lang="ts">
    import type { ToastTitleProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ToastTitleProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-toast-title", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-toast-title {
            min-inline-size: 0;
            font-size: var(--cs-text-sm);
            font-weight: 600;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-tight);
            color: var(--cs-color-text-strong);
            overflow-wrap: anywhere;
            word-break: normal;
        }
    }
</style>
