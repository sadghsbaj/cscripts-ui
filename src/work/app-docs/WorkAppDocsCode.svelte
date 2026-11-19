<script lang="ts">
    import type { WorkAppDocsCodeProps } from "./index.ts";

    let { ref = $bindable(null), children, class: className, ...rest }: WorkAppDocsCodeProps = $props();
</script>

<code {...rest} bind:this={ref} class={["cs-work-app-docs-code", className]}>
    {@render children?.()}
</code>

<style>
    @layer components.composite {
        .cs-work-app-docs-code {
            padding: 2px 6px;
            border-radius: 5px;
            corner-shape: var(--cs-squircle-soft);
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-strong);
            font-family: var(--cs-font-mono);
            font-size: 13px;
            font-weight: 500;
        }
    }
</style>
