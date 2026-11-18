<script lang="ts">
    import type { DropdownItemShortcutProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: DropdownItemShortcutProps = $props();
</script>

<span bind:this={ref} {...rest} aria-hidden="true" class={["cs-dropdown-item-shortcut", className]}>
    {@render children?.()}
</span>
