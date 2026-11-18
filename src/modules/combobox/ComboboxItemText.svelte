<script lang="ts">
    import type { ComboboxItemTextProps } from "./index.ts";
    import { getComboboxItemContext, hasComboboxItemContext } from "./combobox.context.internal.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ComboboxItemTextProps = $props();

    const item = hasComboboxItemContext() ? getComboboxItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerTextElement(ref);
    });
</script>

<span bind:this={ref} {...rest} class={["cs-combobox-item-text", "cs-listbox-item-text", className]}>
    {@render children?.()}
</span>
