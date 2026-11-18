<script lang="ts">
    import type { SelectGroupLabelProps } from "./index.ts";
    import { getSelectGroupContext, hasSelectGroupContext } from "./select.context.internal.ts";

    let { ref = $bindable(null), id, class: className, children, ...rest }: SelectGroupLabelProps = $props();

    const group = hasSelectGroupContext() ? getSelectGroupContext() : undefined;
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
    class={["cs-select-group-label", "cs-listbox-group-label", className]}
>
    {@render children?.()}
</div>
