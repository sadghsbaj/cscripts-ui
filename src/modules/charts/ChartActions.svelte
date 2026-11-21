<script lang="ts">
    import type { ChartActionsProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ChartActionsProps = $props();
</script>

<div bind:this={ref} {...rest} class={["cs-chart-actions", className]}>
    {@render children?.()}
</div>
