<script lang="ts">
    import type { TabsLabelProps } from "./tabs.types.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: TabsLabelProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-tabs-label", className]}>
    {@render children?.()}
</span>
