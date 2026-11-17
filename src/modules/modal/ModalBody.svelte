<script lang="ts">
    import type { ModalBodyProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ModalBodyProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-modal-body", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-modal-body {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: var(--cs-modal-gap);
            min-inline-size: 0;
            min-block-size: 0;
            color: var(--cs-color-text-main);
        }
    }
</style>
