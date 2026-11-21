<script lang="ts">
    import type { ContextMenuFooterProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ContextMenuFooterProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-context-menu-footer", className]}>
    {@render children?.()}
</div>
