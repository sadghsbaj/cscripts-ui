<script lang="ts">
    import type { DropdownHeaderProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: DropdownHeaderProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-dropdown-header", className]}>
    {@render children?.()}
</div>
