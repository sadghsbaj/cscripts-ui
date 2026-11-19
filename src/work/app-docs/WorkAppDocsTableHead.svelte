<script lang="ts">
    import type { WorkAppDocsTableHeadProps } from "./index.ts";

    let { ref = $bindable(null), children, class: className, ...rest }: WorkAppDocsTableHeadProps = $props();
</script>

<thead {...rest} bind:this={ref} class={["cs-work-app-docs-table-head", className]}>
    {@render children?.()}
</thead>
