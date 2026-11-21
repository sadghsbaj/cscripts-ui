<script lang="ts">
    import type { ChartDescriptionProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ChartDescriptionProps = $props();
</script>

<p bind:this={ref} {...rest} class={["cs-chart-description", className]}>
    {@render children?.()}
</p>
