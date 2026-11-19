<script lang="ts">
    import type { WorkAppDocsCardGridProps } from "./index.ts";

    let { ref = $bindable(null), children, class: className, ...rest }: WorkAppDocsCardGridProps = $props();
</script>

<div {...rest} bind:this={ref} class={["cs-work-app-docs-card-grid", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-work-app-docs-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            margin-block: 20px;
        }
    }
</style>
