<script lang="ts">
    import type { ChipLabelProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ChipLabelProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-chip-label", className]}>
    {@render children?.()}
</span>

<style>
    @layer components.primitive {
        .cs-chip-label {
            min-inline-size: 0;
            overflow-x: clip;
            overflow-y: visible;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-box-trim: trim-both;
            text-box-edge: cap alphabetic;
            text-box: trim-both cap alphabetic;
        }
    }
</style>
