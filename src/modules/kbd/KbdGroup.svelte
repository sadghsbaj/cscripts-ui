<script lang="ts">
    import "./kbd.internal.css";
    import type { KbdGroupProps } from "./index.ts";
    import { setKbdGroupContext } from "./kbd.context.internal.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        class: className,
        children,
        ...rest
    }: KbdGroupProps = $props();

    setKbdGroupContext({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
    });
</script>

<span
    bind:this={ref}
    {...rest}
    class={["cs-kbd-group", className]}
    data-variant={variant}
    data-size={size}
>
    {@render children?.()}
</span>

<style>
    @layer components.primitive {
        .cs-kbd-group {
            display: inline-flex;
            align-items: center;
            gap: var(--cs-kbd-group-gap);
            vertical-align: middle;

            &[data-variant="soft"] {
                block-size: var(--cs-kbd-height);
                padding-inline: var(--cs-kbd-px);
                background: var(--cs-color-base-soft);
                border-radius: var(--cs-radius-full);
                corner-shape: var(--cs-squircle-smooth);
                --cs-kbd-item-height: auto;
                --cs-kbd-item-min-width: 0;
                --cs-kbd-item-px: 0;
                --cs-kbd-item-bg: none;
                --cs-kbd-item-shadow: none;
                --cs-kbd-item-margin-block-end: 0;
            }

            &[data-variant="ghost"] {
                block-size: var(--cs-kbd-height);
                --cs-kbd-item-height: auto;
                --cs-kbd-item-min-width: 0;
                --cs-kbd-item-px: 0;
                --cs-kbd-item-bg: none;
                --cs-kbd-item-shadow: none;
                --cs-kbd-item-margin-block-end: 0;
            }

            &[data-variant="keycap"] {
                /* Compensate for the 2px bottom lip on child keycaps */
                --cs-kbd-separator-offset: 2px;
            }
        }
    }
</style>
