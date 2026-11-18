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

<span bind:this={ref} {...rest} class={["cs-select-item-text", "cs-listbox-item-text", className]}>
    {@render children?.()}
</span>
