<script lang="ts">
    import NumberMorph from "./NumberMorph.svelte";
    import NumberMorphGroup from "./NumberMorphGroup.svelte";

    let {
        ref = $bindable(null),
        firstValue = 12,
        secondValue = 34,
        class: className,
        ...rest
    }: {
        [key: string]: unknown;
        ref?: HTMLSpanElement | null;
        firstValue?: number;
        secondValue?: number;
        class?: string;
    } = $props();
</script>

<NumberMorphGroup bind:ref class={className} {...rest}>
    <NumberMorph value={firstValue} data-testid="first-morph" />
    <NumberMorph value={secondValue} data-testid="second-morph" />
</NumberMorphGroup>
