<script lang="ts">
    import type { ModalHeaderProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ModalHeaderProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-modal-header", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-modal-header {
            flex: 0 0 auto;
            display: flex;
            flex-direction: column;
            gap: var(--cs-modal-header-gap);
            min-inline-size: 0;
        }
    }
</style>
