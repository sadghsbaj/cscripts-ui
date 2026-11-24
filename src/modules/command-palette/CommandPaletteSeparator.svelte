<script lang="ts">
    import type { CommandPaletteSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, ...rest }: CommandPaletteSeparatorProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    role="separator"
    aria-orientation="horizontal"
    class={["cs-command-palette-separator", "cs-listbox-separator", className]}
></div>
