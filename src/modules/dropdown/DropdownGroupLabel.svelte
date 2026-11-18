<script lang="ts">
    import { getDropdownGroupContext, hasDropdownGroupContext } from "./dropdown.context.internal.ts";
    import type { DropdownGroupLabelProps } from "./index.ts";

    let { ref = $bindable(null), id, class: className, children, ...rest }: DropdownGroupLabelProps = $props();

    const group = hasDropdownGroupContext() ? getDropdownGroupContext() : undefined;
    const generatedId = $props.id();
    const resolvedId = $derived(id ?? generatedId);

    $effect(() => {
        if (!group) return;
        return group.registerLabel(resolvedId);
    });
</script>

<div
    bind:this={ref}
    {...rest}
    id={resolvedId}
    role="presentation"
    class={["cs-dropdown-group-label", "cs-listbox-group-label", className]}
>
    {@render children?.()}
</div>
