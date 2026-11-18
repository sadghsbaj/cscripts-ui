<script lang="ts">
    import type { SelectItemDescriptionProps } from "./index.ts";
    import { getSelectItemContext, hasSelectItemContext } from "./select.context.internal.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SelectItemDescriptionProps = $props();

    const item = hasSelectItemContext() ? getSelectItemContext() : undefined;

    $effect(() => {
        if (!item) return;
        return item.registerDescriptionElement(ref);
    });
</script>

<p bind:this={ref} {...rest} class={["cs-select-item-description", className]}>
    {@render children?.()}
</p>

<style>
    @layer components.composite {
        .cs-select-item-description {
            margin: 0;
            color: var(--cs-select-item-description-fg);
            font-size: var(--cs-text-xs);
            font-weight: 400;
            line-height: var(--cs-leading-snug);
        }
    }
</style>
