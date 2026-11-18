<script lang="ts">
    import type { SelectSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, ...rest }: SelectSeparatorProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    role="separator"
    aria-orientation="horizontal"
    class={["cs-select-separator", className]}
></div>

<style>
    @layer components.composite {
        .cs-select-separator {
            flex-shrink: 0;
            height: 1px;
            margin-block: 4px;
            margin-inline: var(--cs-select-item-px);
            background-color: var(--cs-select-separator-bg);
        }
    }
</style>
