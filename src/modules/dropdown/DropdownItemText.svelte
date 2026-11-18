<script lang="ts">
    import { getDropdownItemContext, hasDropdownItemContext } from "./dropdown.context.internal.ts";
    import type { DropdownItemTextProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: DropdownItemTextProps = $props();

    const item = hasDropdownItemContext() ? getDropdownItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerTextElement(ref);
    });
</script>

<span bind:this={ref} {...rest} class={["cs-dropdown-item-text", "cs-listbox-item-text", className]}>
    {@render children?.()}
</span>
