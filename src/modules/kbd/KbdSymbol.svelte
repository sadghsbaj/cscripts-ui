<script lang="ts">
    import { KBD_KEYS, type KbdKeyDefinition, type KbdSymbolProps } from "./index.ts";

    let { symbol, display = "auto", icon: CustomIcon, label }: KbdSymbolProps = $props();

    const entry: KbdKeyDefinition | undefined = $derived(symbol ? KBD_KEYS[symbol] : undefined);
    const Icon = $derived(CustomIcon ?? entry?.icon);
    const showIcon = $derived(Boolean(CustomIcon) || (Boolean(entry?.icon) && display !== "text"));
    const showText = $derived(!CustomIcon && Boolean(entry) && (!showIcon || display === "both"));
    const srOnlyLabel = $derived(CustomIcon ? label : showIcon && !showText ? entry?.title : undefined);
</script>

{#if Icon && showIcon}
    <Icon strokeWidth={2.25} aria-hidden="true" class="cs-kbd-icon" />
{/if}
{#if entry && showText}
    <span class="cs-kbd-label">{entry.text}</span>
{/if}
{#if srOnlyLabel}
    <span class="cs-kbd-sr-only">{srOnlyLabel}</span>
{/if}

<style>
    @layer components.primitive {
        :global(.cs-kbd-icon) {
            flex-shrink: 0;
            inline-size: var(--cs-kbd-icon-size);
            block-size: var(--cs-kbd-icon-size);
        }

        .cs-kbd-label {
            display: inline-block;
        }

        .cs-kbd-sr-only {
            position: absolute;
            inline-size: 1px;
            block-size: 1px;
            overflow: hidden;
            clip-path: inset(50%);
            margin: -1px;
            padding: 0;
            white-space: nowrap;
            border: 0;
        }
    }
</style>
