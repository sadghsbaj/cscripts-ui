<script lang="ts">
    import type { ContextMenuHeaderProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ContextMenuHeaderProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-context-menu-header", className]}>
    {@render children?.()}
</div>
