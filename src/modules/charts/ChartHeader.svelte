<script lang="ts">
    import type { ChartHeaderProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ChartHeaderProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-chart-header", className]}>
    {@render children?.()}
</div>
