<script lang="ts">
    import { untrack } from "svelte";
    import { MorphController, type TextMorphOptions } from "torph";

    import { CS_TEXT_MORPH_DUR, CS_TEXT_MORPH_EASE, type TextMorphProps } from "./index.ts";

    let {
        ref = $bindable(null),
        as = "span",
        text,
        locales,
        decimals,
        cursorIndex,
        numbers = true,
        scale = true,
        tabular = false,
        animated = true,
        respectMotionPreference = true,
        duration = CS_TEXT_MORPH_DUR,
        ease = CS_TEXT_MORPH_EASE,
        debug = false,
        onanimationsstart,
        onanimationsfinish,
        onanimationscancel,
        class: className,
        ...rest
    }: TextMorphProps = $props();

    let morphEl = $state<HTMLSpanElement | undefined>();
    const controller = new MorphController();

    // Wrap callbacks so updated handler references never force MorphController re-creation.
    const options = $derived<Omit<TextMorphOptions, "element">>({
        locale: locales,
        decimals,
        numbers,
        scale,
        disabled: !animated,
        respectReducedMotion: respectMotionPreference,
        duration,
        ease,
        debug,
        onAnimationStart: () => onanimationsstart?.(),
        onAnimationComplete: () => onanimationsfinish?.(),
        onAnimationCancel: () => onanimationscancel?.(),
    });

    const configKey = $derived(MorphController.serializeConfig(options));

    $effect(() => {
        const el = morphEl;
        void configKey;
        if (!el) return;

        // Clear residual plain TextNode left by torph's disabled mode so re-attaching never duplicates text.
        el.textContent = "";
        controller.attach(
            el,
            untrack(() => options)
        );

        return () => {
            controller.destroy();
            el.textContent = "";
        };
    });

    $effect(() => {
        controller.update(text, cursorIndex);
    });
</script>

<svelte:element
    this={as}
    bind:this={ref}
    {...rest}
    class={["cs-text-morph", className]}
    data-animated={animated ? "" : undefined}
    data-tabular={tabular ? "" : undefined}
    data-debug={debug ? "" : undefined}
>
    <span class="cs-text-morph-host" bind:this={morphEl}></span>
</svelte:element>

<style>
    @layer components.primitive {
        .cs-text-morph {
            display: inline-flex;
            align-items: baseline;

            &[data-tabular] {
                font-variant-numeric: tabular-nums;
            }
        }

        .cs-text-morph-host {
            text-align: inherit;
            white-space: nowrap;
        }
    }
</style>
