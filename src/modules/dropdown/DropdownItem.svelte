<script lang="ts">
    import { extractListboxItemLabel } from "../../shared/listbox/listbox-utils.ts";
    import { getDropdownContext, setDropdownItemContext } from "./dropdown.context.internal.ts";
    import type { DropdownItemProps } from "./index.ts";

    let {
        ref = $bindable(null),
        href,
        icon: Icon,
        label,
        negative = false,
        disabled = false,
        closeOnSelect = true,
        onSelect,
        class: className,
        children,
        onclick,
        onpointerup,
        onkeydown,
        ...rest
    }: DropdownItemProps = $props();

    const dropdown = getDropdownContext();

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

    const isDisabled = $derived(Boolean(dropdown.disabled || disabled));
    const resolvedLabel = $derived(extractListboxItemLabel(label, textEl, contentEl, descriptionEl, ""));

    function activate(event: MouseEvent | KeyboardEvent): void {
        onSelect?.(event);
        if (event.defaultPrevented) return;
        if (closeOnSelect) {
            dropdown.setOpen(false, { restoreFocus: true });
        }
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLElement }): void {
        onclick?.(event);
        if (isDisabled) {
            event.preventDefault();
            return;
        }
        if (event.defaultPrevented) return;
        activate(event);
    }

    function handlePointerUp(event: PointerEvent & { currentTarget: EventTarget & HTMLElement }): void {
        onpointerup?.(event);
        if (event.defaultPrevented || isDisabled) return;
        if (!dropdown.shouldCommitPointerRelease(event)) return;
        dropdown.clearPointerOpen();
        if (href !== undefined && ref instanceof HTMLAnchorElement) {
            ref.click();
            return;
        }
        activate(event);
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || isDisabled) return;
        if (
            event.key === " " &&
            event.currentTarget.closest("[data-roving-focus]")?.hasAttribute("data-typeahead-active")
        ) {
            return;
        }
        if (event.key === "Enter" && href !== undefined) {
            // Native anchor Enter triggers click; avoid firing onSelect twice.
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            activate(event);
            event.preventDefault();
        }
    }
</script>

<svelte:element
    this={href !== undefined ? "a" : "div"}
    bind:this={ref}
    {...rest}
    href={href !== undefined && !isDisabled ? href : undefined}
    role="menuitem"
    tabindex={-1}
    aria-disabled={isDisabled ? "true" : undefined}
    class={["cs-dropdown-item", "cs-listbox-item", className]}
    data-typeahead-label={resolvedLabel || undefined}
    data-negative={negative ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    onclick={handleClick}
    onpointerup={handlePointerUp}
    onkeydown={handleKeyDown}
>
    <div class="cs-dropdown-item-inner cs-listbox-item-inner">
        {#if Icon}
            <Icon aria-hidden="true" class="cs-dropdown-item-icon cs-listbox-item-icon" />
        {/if}

        <div bind:this={contentEl} class="cs-dropdown-item-content cs-listbox-item-content">
            {@render children?.()}
        </div>
    </div>
</svelte:element>
