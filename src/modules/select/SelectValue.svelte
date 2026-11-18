<script lang="ts" generics="T extends string = string">
    import { t } from "../../shared/lang.internal.ts";
    import type { SelectSelectedItem, SelectValueProps } from "./index.ts";
    import { getSelectContext } from "./select.context.internal.ts";

    let {
        ref = $bindable(null),
        placeholder = t({ de: "Auswählen…", en: "Select…" }),
        showIcon = true,
        class: className,
        children,
        ...rest
    }: SelectValueProps<T> = $props();

    const select = getSelectContext<T>();

    const resolvedItem = $derived.by((): SelectSelectedItem<T> | undefined => {
        if (select.selectedItem) return select.selectedItem;
        if (select.value !== undefined && select.value !== "") {
            return {
                value: select.value,
                label: String(select.value),
            };
        }
        return undefined;
    });

    const isPlaceholder = $derived(resolvedItem === undefined);
</script>

<span
    bind:this={ref}
    {...rest}
    class={["cs-select-trigger-value", className]}
    data-placeholder={isPlaceholder ? "" : undefined}
>
    {#if children}
        {@render children(resolvedItem)}
    {:else if resolvedItem}
        {#if showIcon && resolvedItem.icon}
            <resolvedItem.icon aria-hidden="true" class="cs-select-trigger-icon" color={resolvedItem.iconColor} />
        {/if}
        <span class="cs-select-trigger-value-label">{resolvedItem.label}</span>
    {:else}
        <span class="cs-select-trigger-value-label">{placeholder}</span>
    {/if}
</span>

<style>
    @layer components.composite {
        .cs-select-trigger-value {
            display: flex;
            flex: 1 1 auto;
            gap: var(--cs-select-trigger-gap);
            align-items: center;
            min-width: 0;
            text-align: start;

            > :global(.cs-select-trigger-icon) {
                flex-shrink: 0;
                width: var(--cs-select-trigger-icon-size);
                height: var(--cs-select-trigger-icon-size);
                color: var(--cs-select-trigger-icon-fg);
                stroke-width: 2.25;
                pointer-events: none;
                transition: color var(--cs-dur-effect) var(--cs-ease-effect);
            }
        }

        .cs-select-trigger-value-label {
            flex: 1 1 auto;
            min-width: 0;
            overflow-x: clip;
            overflow-y: visible;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-box: trim-both cap alphabetic;
        }
    }
</style>
