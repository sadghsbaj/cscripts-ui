<script lang="ts">
    import "./kbd.internal.css";
    import { KBD_KEYS, type KbdKeyDefinition, type KbdProps } from "./index.ts";
    import { getKbdGroupContext, hasKbdGroupContext } from "./kbd.context.internal.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        symbol,
        display = "auto",
        class: className,
        children,
        ...rest
    }: KbdProps = $props();

    const group = hasKbdGroupContext() ? getKbdGroupContext() : undefined;
    const resolvedVariant = $derived(variant ?? group?.variant);
    const resolvedSize = $derived(size ?? group?.size);

    $effect.pre(() => {
        if (!resolvedVariant || !resolvedSize) {
            throw new Error(
                "<Kbd> requires both `variant` and `size` props when used outside a <KbdGroup>."
            );
        }
    });

    const symbolEntry: KbdKeyDefinition | undefined = $derived(
        !children && symbol ? KBD_KEYS[symbol] : undefined
    );
    const SymbolIcon = $derived(symbolEntry?.icon);
    const showSymbolIcon = $derived(Boolean(SymbolIcon) && display !== "text");
    const showSymbolText = $derived(Boolean(symbolEntry) && (!showSymbolIcon || display === "both"));
    const isIconOnly = $derived(showSymbolIcon && !showSymbolText);
</script>

<kbd
    bind:this={ref}
    {...rest}
    aria-label={rest["aria-label"] ?? symbolEntry?.title}
    class={["cs-kbd", className]}
    data-variant={resolvedVariant}
    data-size={resolvedSize}
    data-icon-only={isIconOnly ? "" : undefined}
>
    {#if children}
        {@render children()}
    {:else if symbolEntry}
        {#if SymbolIcon && showSymbolIcon}
            <SymbolIcon strokeWidth={2.25} aria-hidden="true" class="cs-kbd-icon" />
        {/if}
        {#if showSymbolText}
            <span class="cs-kbd-label">{symbolEntry.text}</span>
        {/if}
    {/if}
</kbd>

<style>
    @layer components.primitive {
        .cs-kbd {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--cs-kbd-gap);
            block-size: var(--cs-kbd-item-height, var(--cs-kbd-height));
            /* Slightly wide floor keeps single-character and icon-only keys from collapsing into circles */
            min-inline-size: var(--cs-kbd-item-min-width, calc(var(--cs-kbd-height) + 4px));
            padding-inline: var(--cs-kbd-item-px, var(--cs-kbd-px));
            vertical-align: middle;
            font-family: var(--cs-font-sans);
            font-size: var(--cs-kbd-font-size);
            font-weight: 500;
            font-variant-numeric: tabular-nums;
            line-height: var(--cs-leading-none);
            text-box-trim: trim-both;
            text-box-edge: cap alphabetic;
            text-box: trim-both cap alphabetic;
            white-space: nowrap;
            user-select: none;
            color: var(--cs-kbd-fg);
            background: var(--cs-kbd-item-bg, var(--cs-kbd-bg));
            box-shadow: var(--cs-kbd-item-shadow, var(--cs-kbd-shadow, none));
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            transition: none;

            &[data-variant="soft"] {
                --cs-kbd-bg: var(--cs-color-base-soft);
                --cs-kbd-fg: var(--cs-color-text-main);
                --cs-kbd-shadow: none;
            }

            &[data-variant="ghost"] {
                --cs-kbd-bg: transparent;
                --cs-kbd-fg: var(--cs-color-text-weak);
                --cs-kbd-shadow: none;
            }

            &[data-variant="keycap"] {
                --cs-kbd-bg: linear-gradient(to bottom, white, var(--cs-color-base-50));
                --cs-kbd-fg: var(--cs-color-text-strong);
                --cs-kbd-shadow:
                    inset 0 1px 0 0 rgb(255 255 255 / 0.9),
                    0 2px 0 0 var(--cs-color-base-300),
                    0 0 0 1px rgb(0 0 0 / 0.08),
                    0 2px 3px -1px rgb(0 0 0 / 0.08);
                /* Compensate for the 2px bottom lip so keycaps align with neighboring text baselines */
                margin-block-end: var(--cs-kbd-item-margin-block-end, 2px);
            }

            :global([data-theme="dark"]) &[data-variant="keycap"] {
                --cs-kbd-bg: linear-gradient(
                    to bottom,
                    color-mix(in oklab, var(--cs-color-base-700) 55%, var(--cs-color-base-800)),
                    var(--cs-color-base-800)
                );
                --cs-kbd-shadow:
                    inset 0 1px 0 0 rgb(255 255 255 / 0.2),
                    inset 0 -1px 0 0 rgb(0 0 0 / 0.25),
                    inset 0 0 0 1px rgb(255 255 255 / 0.07),
                    0 2px 0 0 var(--cs-color-base-950),
                    0 0 0 1px rgb(0 0 0 / 0.45),
                    0 3px 4px -1px rgb(0 0 0 / 0.55);
            }

            & :global(.cs-kbd-icon) {
                flex-shrink: 0;
                inline-size: var(--cs-kbd-icon-size);
                block-size: var(--cs-kbd-icon-size);
            }
        }
    }
</style>
