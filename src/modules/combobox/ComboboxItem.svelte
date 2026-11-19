<script lang="ts" generics="T extends string = string">
    import type { Component } from "svelte";

    import { extractListboxItemLabel } from "../../shared/listbox/listbox-utils.ts";
    import { CheckboxMark } from "../checkbox/index.ts";
    import type { ComboboxIconComponentProps, ComboboxItemProps } from "./index.ts";
    import { getComboboxContext, setComboboxItemContext } from "./combobox.context.internal.ts";

    let {
        ref = $bindable(null),
        id,
        value,
        label,
        keywords,
        icon: Icon,
        disabled = false,
        hideIndicator = false,
        class: className,
        children,
        onpointerdown,
        onpointermove,
        onpointerup,
        onclick,
        ...rest
    }: ComboboxItemProps<T> = $props();

    const combobox = getComboboxContext<T>();
    const generatedId = $props.id();
    const resolvedId = $derived(id ?? generatedId);

    let contentEl = $state<HTMLDivElement | null>(null);
    let textEl = $state<HTMLElement | null>(null);
    let descriptionEl = $state<HTMLElement | null>(null);
    let childIcon = $state<Component<ComboboxIconComponentProps> | undefined>();
    let childIconColor = $state<string | undefined>();

    setComboboxItemContext({
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
        registerIcon(registeredIcon: Component<ComboboxIconComponentProps>, color?: string): () => void {
            childIcon = registeredIcon;
            childIconColor = color;
            return () => {
                if (childIcon !== registeredIcon) return;
                childIcon = undefined;
                childIconColor = undefined;
            };
        },
    });

    const isSelected = $derived(combobox.isSelected(value));
    const isDisabled = $derived(Boolean(combobox.disabled || disabled));
    const resolvedIcon = $derived(Icon ?? childIcon);
    const resolvedIconColor = $derived(Icon ? undefined : childIconColor);
    const resolvedLabel = $derived(extractListboxItemLabel(label, textEl, contentEl, descriptionEl, value));
    const isVisible = $derived(combobox.isItemVisible(resolvedLabel, value, keywords));
    const isHighlighted = $derived(combobox.isHighlighted(value) && isVisible && !isDisabled);

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerdown?.(event);
        if (event.defaultPrevented || isDisabled) return;
        // Prevent input blur before onclick commits selection.
        event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointermove?.(event);
        if (event.pointerType !== "mouse" || isDisabled || !isVisible) return;
        if (combobox.isKeyboardNav || !isHighlighted) {
            combobox.setHighlightedValue(value, { keyboard: false });
        }
    }

    function handlePointerUp(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerup?.(event);
        if (event.defaultPrevented || isDisabled) return;
        if (!combobox.shouldCommitPointerRelease(event)) return;
        combobox.clearPointerOpen();
        combobox.select(value);
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        combobox.select(value);
    }

    $effect(() => {
        return combobox.registerItem({
            value,
            label: resolvedLabel,
            keywords,
            disabled: isDisabled,
            visible: isVisible,
            id: resolvedId,
            icon: resolvedIcon,
            iconColor: resolvedIconColor,
            element: ref,
        });
    });
</script>

<div
    bind:this={ref}
    {...rest}
    id={resolvedId}
    role="option"
    tabindex={-1}
    aria-selected={isSelected ? "true" : "false"}
    aria-disabled={isDisabled ? "true" : undefined}
    hidden={!isVisible}
    class={["cs-combobox-item", "cs-listbox-item", className]}
    data-value={value}
    data-label={resolvedLabel}
    data-selected={isSelected ? "" : undefined}
    data-highlighted={isHighlighted ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    data-hidden={!isVisible ? "" : undefined}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onclick={handleClick}
>
    <div class="cs-combobox-item-inner cs-listbox-item-inner">
        {#if Icon}
            <Icon aria-hidden="true" class="cs-combobox-item-icon cs-listbox-item-icon" />
        {/if}

        <div bind:this={contentEl} class="cs-combobox-item-content cs-listbox-item-content">
            {@render children?.()}
        </div>

        {#if !hideIndicator}
            <span class="cs-combobox-item-check cs-listbox-item-check" aria-hidden="true">
                <CheckboxMark
                    checked={isSelected}
                    class="cs-combobox-item-check-icon cs-listbox-item-check-icon"
                    stroke-width="3"
                />
            </span>
        {/if}
    </div>
</div>
