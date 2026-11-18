<script lang="ts" generics="T extends string = string">
    import { Check } from "@lucide/svelte";
    import type { Component } from "svelte";

    import { extractListboxItemLabel } from "../../shared/listbox/listbox-utils.ts";
    import type { SelectIconComponentProps, SelectItemProps } from "./index.ts";
    import { getSelectContext, setSelectItemContext } from "./select.context.internal.ts";

    let {
        ref = $bindable(null),
        value,
        label,
        icon: Icon,
        disabled = false,
        hideIndicator = false,
        class: className,
        children,
        onclick,
        onpointerup,
        onkeydown,
        ...rest
    }: SelectItemProps<T> = $props();

    const select = getSelectContext<T>();

    let contentEl = $state<HTMLDivElement | null>(null);
    let textEl = $state<HTMLElement | null>(null);
    let descriptionEl = $state<HTMLElement | null>(null);
    let childIcon = $state<Component<SelectIconComponentProps> | undefined>();
    let childIconColor = $state<string | undefined>();

    setSelectItemContext({
        registerTextElement(el: HTMLElement | null): () => void {
            textEl = el;
            return () => {
                if (textEl === el) {
                    textEl = null;
                }
            };
        },
        registerDescriptionElement(el: HTMLElement | null): () => void {
            descriptionEl = el;
            return () => {
                if (descriptionEl === el) {
                    descriptionEl = null;
                }
            };
        },
        registerIcon(registeredIcon: Component<SelectIconComponentProps>, color?: string): () => void {
            childIcon = registeredIcon;
            childIconColor = color;
            return () => {
                if (childIcon !== registeredIcon) return;
                childIcon = undefined;
                childIconColor = undefined;
            };
        },
    });

    const isSelected = $derived(select.isSelected(value));
    const isDisabled = $derived(Boolean(select.disabled || disabled));
    const resolvedIcon = $derived(Icon ?? childIcon);
    const resolvedIconColor = $derived(Icon ? undefined : childIconColor);

    const resolvedLabel = $derived(extractListboxItemLabel(label, textEl, contentEl, descriptionEl, value));

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        select.select(value);
    }

    function handlePointerUp(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerup?.(event);
        if (event.defaultPrevented || isDisabled) return;
        if (!select.shouldCommitPointerRelease(event)) return;
        select.clearPointerOpen();
        select.select(value);
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || isDisabled) return;
        if (
            event.key === " " &&
            event.currentTarget.closest("[data-roving-focus]")?.hasAttribute("data-typeahead-active")
        ) {
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            select.select(value);
        }
    }

    $effect(() => {
        return select.registerItem({
            value,
            label: resolvedLabel,
            disabled: isDisabled,
            icon: resolvedIcon,
            iconColor: resolvedIconColor,
            element: ref,
        });
    });
</script>

<div
    bind:this={ref}
    {...rest}
    role="option"
    tabindex={-1}
    aria-selected={isSelected ? "true" : "false"}
    aria-disabled={isDisabled ? "true" : undefined}
    class={["cs-select-item", "cs-listbox-item", className]}
    data-value={value}
    data-label={resolvedLabel}
    data-selected={isSelected ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    onclick={handleClick}
    onpointerup={handlePointerUp}
    onkeydown={handleKeyDown}
>
    <div class="cs-select-item-inner cs-listbox-item-inner">
        {#if Icon}
            <Icon aria-hidden="true" class="cs-select-item-icon cs-listbox-item-icon" />
        {/if}

        <div bind:this={contentEl} class="cs-select-item-content cs-listbox-item-content">
            {@render children?.()}
        </div>

        {#if !hideIndicator}
            <span class="cs-select-item-check cs-listbox-item-check" aria-hidden="true">
                <Check class="cs-select-item-check-icon cs-listbox-item-check-icon" />
            </span>
        {/if}
    </div>
</div>
