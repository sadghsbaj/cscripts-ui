<script lang="ts" generics="T extends string = string">
    import { extractListboxItemLabel } from "../../shared/listbox/listbox-utils.ts";
    import {
        getDropdownContext,
        getDropdownRadioGroupContext,
        setDropdownItemContext,
    } from "./dropdown.context.internal.ts";
    import type { DropdownRadioItemProps } from "./index.ts";

    let {
        ref = $bindable(null),
        value,
        icon: Icon,
        label,
        disabled = false,
        closeOnSelect = false,
        onSelect,
        class: className,
        children,
        onclick,
        onpointerup,
        onkeydown,
        ...rest
    }: DropdownRadioItemProps<T> = $props();

    const dropdown = getDropdownContext();
    const radioGroup = getDropdownRadioGroupContext<T>();

    let contentEl = $state<HTMLDivElement | null>(null);
    let textEl = $state<HTMLElement | null>(null);
    let descriptionEl = $state<HTMLElement | null>(null);

    setDropdownItemContext({
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
    });

    const isChecked = $derived(radioGroup.value === value);
    const isDisabled = $derived(Boolean(dropdown.disabled || disabled));
    const resolvedLabel = $derived(extractListboxItemLabel(label, textEl, contentEl, descriptionEl, value));

    function selectItem(event: MouseEvent | KeyboardEvent): void {
        onSelect?.(event);
        if (event.defaultPrevented) return;
        radioGroup.selectValue(value);
        if (closeOnSelect) {
            dropdown.setOpen(false, { restoreFocus: true });
        }
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        selectItem(event);
    }

    function handlePointerUp(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerup?.(event);
        if (event.defaultPrevented || isDisabled) return;
        if (!dropdown.shouldCommitPointerRelease(event)) return;
        dropdown.clearPointerOpen();
        selectItem(event);
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
            selectItem(event);
            event.preventDefault();
        }
    }
</script>

<div
    bind:this={ref}
    {...rest}
    role="menuitemradio"
    tabindex={-1}
    aria-checked={isChecked ? "true" : "false"}
    aria-disabled={isDisabled ? "true" : undefined}
    class={["cs-dropdown-item", "cs-listbox-item", className]}
    data-value={value}
    data-typeahead-label={resolvedLabel || undefined}
    data-checked={isChecked ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    onclick={handleClick}
    onpointerup={handlePointerUp}
    onkeydown={handleKeyDown}
>
    <div class="cs-dropdown-item-inner cs-listbox-item-inner">
        <span class="cs-dropdown-item-indicator cs-listbox-item-indicator" aria-hidden="true">
            <span class="cs-dropdown-item-radio-dot"></span>
        </span>

        <div bind:this={contentEl} class="cs-dropdown-item-content cs-listbox-item-content">
            {#if Icon}
                <Icon aria-hidden="true" class="cs-dropdown-item-icon cs-listbox-item-icon" />
            {/if}

            {@render children?.()}
        </div>
    </div>
</div>
