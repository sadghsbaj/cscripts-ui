<!--
@component
Primary `<main>` content region (`<WorkAppMain />`) inside `<WorkAppFrame />`.

Architectural Notes:
- Flex Growth: Uses `flex: 1 0 auto` so the main content region fills remaining space down to the
  signature on shorter screens while naturally expanding with large scrollable content.
- Overflow Protection: Sets `min-width: 0` to prevent wide nested tables or code blocks from blowing out the horizontal layout.
-->
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
