<script lang="ts">
    import type { ModalFooterProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ModalFooterProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-modal-footer", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-modal-footer {
            flex: 0 0 auto;
            display: flex;
            flex-wrap: wrap;
            gap: var(--cs-modal-gap);
            align-items: center;
            justify-content: space-between;
            min-inline-size: 0;
        }
    }
</style>
