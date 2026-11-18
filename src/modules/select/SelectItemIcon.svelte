<script lang="ts">
    import type { SelectItemIconProps } from "./index.ts";
    import { getSelectItemContext, hasSelectItemContext } from "./select.context.internal.ts";

    let { icon: Icon, color, class: className, ...rest }: SelectItemIconProps = $props();

    const item = hasSelectItemContext() ? getSelectItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerIcon(Icon, color);
    });
</script>

<Icon {...rest} {color} aria-hidden="true" class={["cs-select-item-icon", "cs-listbox-item-icon", className]} />
