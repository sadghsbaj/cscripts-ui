<script lang="ts">
    import type { DropdownSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, ...rest }: DropdownSeparatorProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    role="separator"
    aria-orientation="horizontal"
    class={["cs-dropdown-separator", "cs-listbox-separator", className]}
></div>
