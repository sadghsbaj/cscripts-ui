<script lang="ts">
    import type { SelectItemTextProps } from "./index.ts";
    import { getSelectItemContext, hasSelectItemContext } from "./select.context.internal.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SelectItemTextProps = $props();

    const item = hasSelectItemContext() ? getSelectItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerTextElement(ref);
    });
</script>

<span bind:this={ref} {...rest} class={["cs-select-item-text", className]}>
    {@render children?.()}
</span>

<style>
    @layer components.composite {
        .cs-select-item-text {
            flex: 1 1 auto;
            min-width: 0;
            font-weight: 500;
            overflow-x: clip;
            overflow-y: visible;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-box: trim-both cap alphabetic;

            :global(.cs-select-item:has(.cs-select-item-description)) & {
                overflow: visible;
                text-overflow: clip;
                white-space: normal;
                line-height: var(--cs-select-item-title-lh);
                text-box: normal;
            }
        }
    }
</style>
