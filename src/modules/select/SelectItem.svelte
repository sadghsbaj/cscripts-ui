<script lang="ts" generics="T extends string = string">
    import { Check } from "@lucide/svelte";
    import type { Component } from "svelte";

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

    function extractLabel(
        explicitLabel: string | undefined,
        textElement: HTMLElement | null,
        contentElement: HTMLDivElement | null,
        descriptionElement: HTMLElement | null,
        fallbackValue: T
    ): string {
        if (explicitLabel !== undefined) {
            return explicitLabel;
        }
        if (textElement) {
            const text = textElement.textContent?.trim();
            if (text) return text;
        }
        if (contentElement) {
            if (!descriptionElement) {
                const text = contentElement.textContent?.trim();
                if (text) return text;
            } else {
                const parts: string[] = [];
                for (const child of contentElement.childNodes) {
                    if (
                        child === descriptionElement ||
                        (child instanceof Element && child.contains(descriptionElement))
                    ) {
                        continue;
                    }
                    const part = child.textContent?.trim();
                    if (part) parts.push(part);
                }
                const joined = parts.join(" ").trim();
                if (joined) return joined;
            }
        }
        return fallbackValue;
    }

    const resolvedLabel = $derived(extractLabel(label, textEl, contentEl, descriptionEl, value));

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
    class={["cs-select-item", className]}
    data-value={value}
    data-label={resolvedLabel}
    data-selected={isSelected ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    onclick={handleClick}
    onpointerup={handlePointerUp}
    onkeydown={handleKeyDown}
>
    <div class="cs-select-item-inner">
        {#if Icon}
            <Icon aria-hidden="true" class="cs-select-item-icon" />
        {/if}

        <div bind:this={contentEl} class="cs-select-item-content">
            {@render children?.()}
        </div>

        {#if !hideIndicator}
            <span class="cs-select-item-check" aria-hidden="true">
                <Check class="cs-select-item-check-icon" />
            </span>
        {/if}
    </div>
</div>

<style>
    @layer components.composite {
        .cs-select-item {
            position: relative;
            display: flex;
            align-items: center;
            min-height: var(--cs-select-item-min-height);
            padding-inline: var(--cs-select-item-px);
            padding-block: var(--cs-select-item-py);
            color: var(--cs-select-item-fg);
            font-size: var(--cs-select-item-font-size);
            background-color: var(--cs-select-item-bg);
            border-radius: var(--cs-select-item-radius);
            corner-shape: var(--cs-squircle-soft);
            cursor: default;
            user-select: none;
            transition:
                background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                scale var(--cs-dur-press) var(--cs-ease-press);

            /* Optical edge inset for Lucide 2px internal SVG viewBox padding */
            &:has(:global(.cs-select-item-icon)) {
                padding-inline-start: calc(var(--cs-select-item-px) - 2px);
            }

            &[data-selected] {
                .cs-select-item-check {
                    opacity: 1;
                    scale: 1;
                }
            }

            @media (hover: hover) {
                :global(.cs-select-content:not([data-nav="keyboard"])) &:hover:not([data-disabled]) {
                    --cs-select-item-icon-fg: var(--cs-color-text-main);
                    color: var(--cs-select-item-fg-hover);
                    background-color: var(--cs-select-item-bg-hover);
                }
            }

            &:not([data-disabled]):active {
                --cs-select-item-icon-fg: var(--cs-color-text-main);
                color: var(--cs-select-item-fg-hover);
                background-color: var(--cs-select-item-bg-active);
                scale: 0.97;
            }

            &:focus-visible:not([data-disabled]) {
                --cs-select-item-icon-fg: var(--cs-color-text-main);
                color: var(--cs-select-item-fg-hover);
                background-color: var(--cs-select-item-bg-hover);
                outline-offset: -2px;
            }

            :global(.cs-select-content[data-arrow-nav]) &:focus-visible {
                outline: none;
            }

            :global(.cs-select-content[data-nav="keyboard"]) &[data-roving-active]:not([data-disabled]) {
                --cs-select-item-icon-fg: var(--cs-color-text-main);
                color: var(--cs-select-item-fg-hover);
                background-color: var(--cs-select-item-bg-hover);
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-select-item-fg: var(--cs-color-disabled-fg);
                --cs-select-item-description-fg: var(--cs-color-disabled-fg);
                --cs-select-item-icon-fg: var(--cs-color-disabled-fg);
                --cs-select-item-indicator-fg: var(--cs-color-disabled-fg);
                color: var(--cs-color-disabled-fg);
                background-color: transparent;
                cursor: default;
            }
        }

        .cs-select-item-inner {
            display: grid;
            grid-template-columns: minmax(0, 1fr) var(--cs-select-check-size);
            gap: var(--cs-select-item-gap);
            align-items: center;
            width: 100%;
            min-width: 0;

            &:has(> :global(.cs-select-item-icon)) {
                grid-template-columns: auto minmax(0, 1fr) var(--cs-select-check-size);
            }

            &:not(:has(> .cs-select-item-check)) {
                grid-template-columns: minmax(0, 1fr);

                &:has(> :global(.cs-select-item-icon)) {
                    grid-template-columns: auto minmax(0, 1fr);
                }
            }

            &:has(:global(.cs-select-item-description)) {
                align-items: start;

                > :global(.cs-select-item-icon) {
                    margin-block-start: calc((var(--cs-select-item-title-lh) - var(--cs-select-icon-size)) / 2);
                }

                > .cs-select-item-check {
                    margin-block-start: calc((var(--cs-select-item-title-lh) - var(--cs-select-check-size)) / 2);
                }
            }

            > :global(.cs-select-item-icon) {
                flex-shrink: 0;
                width: var(--cs-select-icon-size);
                height: var(--cs-select-icon-size);
                color: var(--cs-select-item-icon-fg);
                stroke-width: 2.25;
                pointer-events: none;
                transition: color var(--cs-dur-effect-fast) var(--cs-ease-effect);
            }
        }

        .cs-select-item-content {
            min-width: 0;
            font-weight: 500;

            &:not(:has(:global(*))) {
                display: block;
                font-weight: 500;
                overflow-x: clip;
                overflow-y: visible;
                text-overflow: ellipsis;
                white-space: nowrap;
                text-box: trim-both cap alphabetic;
            }

            &:has(:global(*)):not(:has(> :global(.cs-select-item-description))) {
                display: flex;
                gap: var(--cs-select-item-gap);
                align-items: center;
                font-weight: 500;

                > :global(:not(.cs-select-item-icon, .cs-select-item-text, .cs-select-item-description)) {
                    flex-shrink: 0;
                }

                &:not(:has(> :global(.cs-select-item-text)))
                    > :global(:not(.cs-select-item-icon, .cs-select-item-text, .cs-select-item-description)) {
                    margin-inline-start: auto;
                }
            }

            &:has(> :global(.cs-select-item-description)) {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                row-gap: 2px;
                column-gap: var(--cs-select-item-gap);
                align-items: start;

                &:has(> :global(.cs-select-item-icon)) {
                    grid-template-columns: auto minmax(0, 1fr);

                    > :global(.cs-select-item-icon) {
                        grid-column: 1;
                        grid-row: 1;
                        margin-block-start: calc((var(--cs-select-item-title-lh) - var(--cs-select-icon-size)) / 2);
                    }

                    > :global(.cs-select-item-text) {
                        grid-column: 2;
                        grid-row: 1;
                    }

                    > :global(.cs-select-item-description) {
                        grid-column: 2;
                        grid-row: 2;
                    }

                    > :global(:not(.cs-select-item-icon, .cs-select-item-text, .cs-select-item-description)) {
                        grid-column: 3;
                        grid-row: 1;
                        align-self: center;
                        flex-shrink: 0;
                    }
                }

                &:not(:has(> :global(.cs-select-item-icon))) {
                    > :global(.cs-select-item-text) {
                        grid-column: 1;
                        grid-row: 1;
                    }

                    > :global(.cs-select-item-description) {
                        grid-column: 1;
                        grid-row: 2;
                    }

                    > :global(:not(.cs-select-item-icon, .cs-select-item-text, .cs-select-item-description)) {
                        grid-column: 2;
                        grid-row: 1;
                        align-self: center;
                        flex-shrink: 0;
                    }
                }
            }
        }

        .cs-select-item-check {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: var(--cs-select-check-size);
            height: var(--cs-select-check-size);
            color: var(--cs-select-item-indicator-fg);
            opacity: 0;
            scale: 0.75;
            pointer-events: none;
            transition:
                opacity var(--cs-dur-effect-fast) var(--cs-ease-effect),
                scale var(--cs-dur-effect-fast) var(--cs-ease-quart-out);

            > :global(.cs-select-item-check-icon) {
                width: 100%;
                height: 100%;
                stroke-width: 2.5;
            }
        }
    }
</style>
