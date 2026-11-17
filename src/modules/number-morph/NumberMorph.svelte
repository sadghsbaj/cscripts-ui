<script lang="ts">
    import NumberFlow, {
        continuous as continuousPlugin,
        type NumberFlowElement,
    } from "@number-flow/svelte";
    import {
        CS_NUMBER_MORPH_OPACITY_TIMING,
        CS_NUMBER_MORPH_SPIN_TIMING,
        CS_NUMBER_MORPH_TRANSFORM_TIMING,
        type NumberMorphProps,
    } from "./index.ts";

    let {
        ref = $bindable(null),
        value,
        locales,
        format,
        prefix,
        suffix,
        trend,
        animated = true,
        digits,
        continuous = false,
        willChange = false,
        respectMotionPreference = true,
        transformTiming = CS_NUMBER_MORPH_TRANSFORM_TIMING,
        spinTiming = CS_NUMBER_MORPH_SPIN_TIMING,
        opacityTiming = CS_NUMBER_MORPH_OPACITY_TIMING,
        onanimationsstart,
        onanimationsfinish,
        class: className,
        ...rest
    }: NumberMorphProps = $props();

    let flowEl = $state<NumberFlowElement | undefined>();
    const plugins = $derived(continuous ? [continuousPlugin] : undefined);

    // Wire Web Component animation events via DOM listeners so consumers use standard Svelte 5 callback props.
    $effect(() => {
        const el = flowEl;
        if (!el || (!onanimationsstart && !onanimationsfinish)) return;

        function handleStart(): void {
            onanimationsstart?.();
        }

        function handleFinish(): void {
            onanimationsfinish?.();
        }

        if (onanimationsstart) {
            el.addEventListener("animationsstart", handleStart);
        }
        if (onanimationsfinish) {
            el.addEventListener("animationsfinish", handleFinish);
        }

        return () => {
            if (onanimationsstart) {
                el.removeEventListener("animationsstart", handleStart);
            }
            if (onanimationsfinish) {
                el.removeEventListener("animationsfinish", handleFinish);
            }
        };
    });
</script>

<span
    bind:this={ref}
    {...rest}
    class={["cs-number-morph", className]}
    data-animated={animated ? "" : undefined}
    data-continuous={continuous ? "" : undefined}
>
    <NumberFlow
        bind:el={flowEl}
        {value}
        {locales}
        {format}
        {prefix}
        {suffix}
        {trend}
        {animated}
        {digits}
        {plugins}
        {willChange}
        {respectMotionPreference}
        {transformTiming}
        {spinTiming}
        {opacityTiming}
    />
</span>

<style>
    @layer components.primitive {
        .cs-number-morph {
            display: inline-flex;
            align-items: baseline;
            font-variant-numeric: tabular-nums;
            --number-flow-char-height: var(--cs-number-morph-char-height, 1em);
            --number-flow-mask-height: var(--cs-number-morph-mask-height, 0.25em);
            --number-flow-mask-width: var(--cs-number-morph-mask-width, 0.5em);

            & :global(::part(prefix)),
            & :global(::part(suffix)) {
                color: var(--cs-number-morph-affix-fg, currentColor);
            }
        }
    }
</style>
