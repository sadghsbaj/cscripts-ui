<script lang="ts">
    import { getContextMenuGroupContext, hasContextMenuGroupContext } from "./context-menu.context.internal.ts";
    import type { ContextMenuGroupLabelProps } from "./index.ts";

    let { ref = $bindable(null), id, class: className, children, ...rest }: ContextMenuGroupLabelProps = $props();

    const group = hasContextMenuGroupContext() ? getContextMenuGroupContext() : undefined;
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
    class={["cs-context-menu-group-label", "cs-listbox-group-label", className]}
>
    {@render children?.()}
</div>
