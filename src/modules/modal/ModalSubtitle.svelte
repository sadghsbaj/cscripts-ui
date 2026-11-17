<script lang="ts">
    import type { ModalSubtitleProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ModalSubtitleProps = $props();
</script>

<p bind:this={ref} {...rest} class={["cs-modal-subtitle", className]}>
    {@render children?.()}
</p>

<style>
    @layer components.composite {
        .cs-modal-subtitle {
            margin: 0;
            min-inline-size: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            font-weight: 500;
            line-height: var(--cs-leading-tight);
        }
    }
</style>
