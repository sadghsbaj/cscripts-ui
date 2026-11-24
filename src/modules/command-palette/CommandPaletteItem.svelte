<script lang="ts">
    import { extractListboxItemLabel } from "../../shared/listbox/listbox-utils.ts";
    import {
        getCommandPaletteGroupContext,
        getCommandPalettePageContext,
        getInternalCommandPaletteContext,
        hasCommandPaletteGroupContext,
        hasCommandPalettePageContext,
        setCommandPaletteItemContext,
    } from "./command-palette.context.internal.ts";
    import type { CommandPaletteItemProps } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        value,
        label,
        keywords,
        icon: Icon,
        href,
        negative = false,
        disabled = false,
        closeOnSelect = true,
        onSelect,
        class: className,
        children,
        onpointerdown,
        onpointermove,
        onclick,
        ...rest
    }: CommandPaletteItemProps = $props();

    const palette = getInternalCommandPaletteContext();
    const group = hasCommandPaletteGroupContext() ? getCommandPaletteGroupContext() : undefined;
    const page = hasCommandPalettePageContext() ? getCommandPalettePageContext() : undefined;

    const generatedId = $props.id();
    const resolvedId = $derived(id ?? generatedId);
    const resolvedValue = $derived(value ?? generatedId);

    let contentEl = $state<HTMLDivElement | null>(null);
    let textEl = $state<HTMLElement | null>(null);
    let descriptionEl = $state<HTMLElement | null>(null);

    setCommandPaletteItemContext({
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

    const resolvedLabel = $derived(extractListboxItemLabel(label, textEl, contentEl, descriptionEl, resolvedValue));
    const isVisible = $derived(
        palette.isItemVisible(
            {
                value: resolvedValue,
                label: resolvedLabel,
                keywords,
                groupLabel: group?.label,
            },
            page?.value,
            page?.filter,
            page?.isPrefixPlugin
        )
    );
    const isHighlighted = $derived(palette.isHighlighted(resolvedValue) && isVisible && !disabled);

    function activate(event: MouseEvent | KeyboardEvent): void {
        if (disabled) return;
        const versionBefore = palette.pageMutationVersion;
        onSelect?.(event);
        if (event.defaultPrevented) return;
        // Auto-suppress closing when onSelect navigated the page stack.
        if (palette.pageMutationVersion !== versionBefore) return;
        if (closeOnSelect) {
            void palette.requestClose("select");
        }
    }

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLElement }): void {
        onpointerdown?.(event);
        if (event.defaultPrevented || disabled) return;
        // Prevent input blur before onclick commits the action.
        event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLElement }): void {
        onpointermove?.(event);
        if (event.pointerType !== "mouse" || disabled || !isVisible) return;
        if (palette.isKeyboardNav || !isHighlighted) {
            palette.setHighlightedValue(resolvedValue, { keyboard: false });
        }
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLElement }): void {
        onclick?.(event);
        if (disabled) {
            event.preventDefault();
            return;
        }
        if (event.defaultPrevented) return;
        activate(event);
    }

    $effect(() => {
        return palette.registerItem({
            value: resolvedValue,
            label: resolvedLabel,
            keywords,
            groupLabel: group?.label,
            disabled,
            visible: isVisible,
            id: resolvedId,
            element: ref,
            select: activate,
        });
    });
</script>

<svelte:element
    this={href !== undefined ? "a" : "div"}
    bind:this={ref}
    {...rest}
    id={resolvedId}
    href={href !== undefined && !disabled ? href : undefined}
    role="option"
    tabindex={-1}
    aria-selected={isHighlighted ? "true" : "false"}
    aria-disabled={disabled ? "true" : undefined}
    hidden={!isVisible}
    class={["cs-command-palette-item", "cs-listbox-item", className]}
    data-value={resolvedValue}
    data-highlighted={isHighlighted ? "" : undefined}
    data-negative={negative ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    data-hidden={!isVisible ? "" : undefined}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onclick={handleClick}
>
    <div class="cs-command-palette-item-inner cs-listbox-item-inner">
        {#if Icon}
            <Icon aria-hidden="true" class="cs-command-palette-item-icon cs-listbox-item-icon" />
        {/if}

        <div bind:this={contentEl} class="cs-command-palette-item-content cs-listbox-item-content">
            {@render children?.()}
        </div>
    </div>
</svelte:element>
