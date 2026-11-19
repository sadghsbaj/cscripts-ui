<script lang="ts">
    import type { WorkAppDocsTableBodyProps } from "./index.ts";

    let { ref = $bindable(null), children, class: className, ...rest }: WorkAppDocsTableBodyProps = $props();
</script>

<tbody {...rest} bind:this={ref} class={["cs-work-app-docs-table-body", className]}>
    {@render children?.()}
</tbody>
