<script lang="ts">
    import { NumberFlowGroup } from "@number-flow/svelte";
    import type { NumberMorphGroupProps } from "./index.ts";

    let {
        ref = $bindable(null),
        class: className,
        children,
        ...rest
    }: NumberMorphGroupProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-number-morph-group", className]}>
    <NumberFlowGroup>
        {@render children?.()}
    </NumberFlowGroup>
</span>

<style>
    @layer components.primitive {
        .cs-number-morph-group {
            display: inline-flex;
            align-items: baseline;
        }
    }
</style>
