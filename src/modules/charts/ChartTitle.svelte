<script lang="ts">
    import type { ChartTitleProps } from "./index.ts";

    let { ref = $bindable(null), as = "h3", class: className, children, ...rest }: ChartTitleProps = $props();
</script>

<svelte:element this={as} bind:this={ref} {...rest} class={["cs-chart-title", className]}>
    {@render children?.()}
</svelte:element>
