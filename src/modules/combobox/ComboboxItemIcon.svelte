<script lang="ts">
    import type { ComboboxItemIconProps } from "./index.ts";
    import { getComboboxItemContext, hasComboboxItemContext } from "./combobox.context.internal.ts";

    let { icon: Icon, color, class: className, ...rest }: ComboboxItemIconProps = $props();

    const item = hasComboboxItemContext() ? getComboboxItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerIcon(Icon, color);
    });
</script>

<Icon {...rest} {color} aria-hidden="true" class={["cs-combobox-item-icon", "cs-listbox-item-icon", className]} />
