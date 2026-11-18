<script lang="ts">
    import { getDropdownItemContext, hasDropdownItemContext } from "./dropdown.context.internal.ts";
    import type { DropdownItemDescriptionProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: DropdownItemDescriptionProps = $props();

    const item = hasDropdownItemContext() ? getDropdownItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerDescriptionElement(ref);
    });
</script>

<p bind:this={ref} {...rest} class={["cs-dropdown-item-description", "cs-listbox-item-description", className]}>
    {@render children?.()}
</p>
