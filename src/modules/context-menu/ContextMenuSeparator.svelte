<script lang="ts">
    import type { ContextMenuSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, ...rest }: ContextMenuSeparatorProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    role="separator"
    aria-orientation="horizontal"
    class={["cs-context-menu-separator", "cs-listbox-separator", className]}
></div>
