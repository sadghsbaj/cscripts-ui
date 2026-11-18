<script lang="ts">
    import type { ComboboxGroupLabelProps } from "./index.ts";
    import { getComboboxGroupContext, hasComboboxGroupContext } from "./combobox.context.internal.ts";

    let { ref = $bindable(null), id, class: className, children, ...rest }: ComboboxGroupLabelProps = $props();

    const group = hasComboboxGroupContext() ? getComboboxGroupContext() : undefined;
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
    class={["cs-combobox-group-label", "cs-listbox-group-label", className]}
>
    {@render children?.()}
</div>
