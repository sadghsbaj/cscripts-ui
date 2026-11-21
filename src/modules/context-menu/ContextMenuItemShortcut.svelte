<script lang="ts">
    import type { ContextMenuItemShortcutProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ContextMenuItemShortcutProps = $props();
</script>

<span bind:this={ref} {...rest} aria-hidden="true" class={["cs-context-menu-item-shortcut", className]}>
    {@render children?.()}
</span>
