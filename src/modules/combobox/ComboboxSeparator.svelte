<script lang="ts">
    import type { ComboboxSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, ...rest }: ComboboxSeparatorProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    role="separator"
    aria-orientation="horizontal"
    class={["cs-combobox-separator", "cs-listbox-separator", className]}
></div>
