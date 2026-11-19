<script lang="ts">
    import type { WorkAppDocsTableRowProps } from "./index.ts";

    let { ref = $bindable(null), children, class: className, ...rest }: WorkAppDocsTableRowProps = $props();
</script>

<tr {...rest} bind:this={ref} class={["cs-work-app-docs-table-row", className]}>
    {@render children?.()}
</tr>
