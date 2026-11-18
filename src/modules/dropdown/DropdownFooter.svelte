<script lang="ts">
    import type { DropdownFooterProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: DropdownFooterProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-dropdown-footer", className]}>
    {@render children?.()}
</div>
