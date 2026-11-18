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

<div bind:this={ref} {...rest} id={resolvedId} role="presentation" class={["cs-select-group-label", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-select-group-label {
            padding-inline: var(--cs-select-item-px);
            padding-block: 4px 2px;
            color: var(--cs-select-group-label-fg);
            font-size: var(--cs-select-group-label-font-size);
            font-weight: 500;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-normal);
            user-select: none;

            :global(.cs-select-group:first-child) > &:first-child {
                padding-block-start: 2px;
            }
        }
    }
</style>
