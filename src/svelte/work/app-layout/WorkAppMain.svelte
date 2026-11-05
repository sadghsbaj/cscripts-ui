<!--
@component
Primary `<main>` content region (`<WorkAppMain />`) inside `<WorkAppFrame />`.

Architectural Notes:
- Flex-Safe Scrolling: Combines `flex: 1` with `min-height: 0` so nested scrollable
  panels, tables, or lists can shrink and scroll internally without overflowing the viewport.
-->
<script lang="ts">
    import type { WorkAppMainProps } from "./index";

    let { children, class: className, ...rest }: WorkAppMainProps = $props();
</script>

<main {...rest} class={["cs-work-app-main", className]}>
    {@render children?.()}
</main>

<style>
    @layer components {
        .cs-work-app-main {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 24px;
            height: 100%;
            min-height: 0;
        }
    }
</style>
