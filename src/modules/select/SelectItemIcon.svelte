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

<Icon {...rest} {color} aria-hidden="true" class={["cs-select-item-icon", className]} />

<style>
    @layer components.composite {
        :global(.cs-select-item-icon) {
            flex-shrink: 0;
            width: var(--cs-select-icon-size);
            height: var(--cs-select-icon-size);
            color: var(--cs-select-item-icon-fg);
            stroke-width: 2.25;
            pointer-events: none;
            transition: color var(--cs-dur-effect-fast) var(--cs-ease-effect);
        }
    }
</style>
