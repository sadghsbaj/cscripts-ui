<script lang="ts">
    import type { WorkAppMainProps } from "./index.ts";

    let { children, class: className, ...rest }: WorkAppMainProps = $props();
</script>

<main {...rest} class={["cs-work-app-main", className]}>
    {@render children?.()}
</main>

<style>
    @layer components.primitive {
        .cs-work-app-main {
            display: flex;
            flex: 1 0 auto;
            flex-direction: column;
            gap: 24px;
            min-width: 0;
        }
    }
</style>
