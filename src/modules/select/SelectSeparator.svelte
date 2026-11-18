<script lang="ts">
    import type { SelectSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, ...rest }: SelectSeparatorProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    role="separator"
    aria-orientation="horizontal"
    class={["cs-select-separator", "cs-listbox-separator", className]}
></div>
