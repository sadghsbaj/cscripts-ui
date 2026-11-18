<script lang="ts">
    import type { ComboboxItemDescriptionProps } from "./index.ts";
    import { getComboboxItemContext, hasComboboxItemContext } from "./combobox.context.internal.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ComboboxItemDescriptionProps = $props();

    const item = hasComboboxItemContext() ? getComboboxItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerDescriptionElement(ref);
    });
</script>

<p bind:this={ref} {...rest} class={["cs-combobox-item-description", "cs-listbox-item-description", className]}>
    {@render children?.()}
</p>
