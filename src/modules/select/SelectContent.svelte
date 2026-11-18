<script lang="ts">
    import { rovingFocus } from "../focus/index.ts";
    import { Popover } from "../popover/index.ts";
    import { ScrollArea, ScrollAreaContent } from "../scroll-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import type { SelectContentProps } from "./index.ts";
    import { getSelectContext } from "./select.context.internal.ts";

    let {
        ref = $bindable(null),
        id,
        placement = "bottom-start",
        width = "min-anchor",
        offset = "8px",
        maxHeight = "min(320px, 60dvh)",
        scrollbar = "hover",
        animate = true,
        class: className,
        style: styleProp,
        children,
        ontoggle,
        onkeydown,
        onpointermove,
        onpointerdown,
        onfocusout,
        ...rest
    }: SelectContentProps = $props();

    const select = getSelectContext();
    const resolvedId = $derived(id ?? select.listboxId);

    let listRef = $state<HTMLDivElement | null>(null);
    let isPopoverOpen = $state(false);
    let isArrowNav = $state(false);
    let isKeyboardNav = $state(false);

    function handleToggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ontoggle?.(event);
        const isOpen = event.newState === "open";
        isPopoverOpen = isOpen;
        select.syncPopoverOpen(isOpen);
        if (!isOpen) {
            isArrowNav = false;
            isKeyboardNav = false;
        }
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        const preventedBefore = event.defaultPrevented;
        onkeydown?.(event);
        if (!preventedBefore && event.defaultPrevented) return;

        if (event.key === "Tab" && !preventedBefore && !event.defaultPrevented) {
            // Focus trigger synchronously before browser Tab traversal leaves the top-layer popover.
            select.setOpen(false, { restoreFocus: false });
            select.triggerRef?.focus({ preventScroll: true });
            return;
        }

        if (
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            ((!event.shiftKey && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) ||
                (event.key.length === 1 && event.key !== " "))
        ) {
            isArrowNav = true;
            isKeyboardNav = true;
        }
    }

    function handlePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointermove?.(event);
        if (event.pointerType !== "mouse") return;
        if (!isArrowNav && !isKeyboardNav) return;

        isArrowNav = false;
        isKeyboardNav = false;

        // Move focus onto the scroll viewport so clearing data-arrow-nav does not flash :focus-visible on an item.
        if (
            listRef &&
            typeof document !== "undefined" &&
            document.activeElement !== listRef &&
            event.currentTarget.contains(document.activeElement)
        ) {
            listRef.focus({ preventScroll: true });
        }
    }

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerdown?.(event);
        isArrowNav = false;
        isKeyboardNav = false;
    }

    function handleFocusOut(event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onfocusout?.(event);
        const related = event.relatedTarget;
        if (!(related instanceof Node) || !event.currentTarget.contains(related)) {
            isArrowNav = false;
            isKeyboardNav = false;
        }
    }

    $effect(() => {
        if (!ref) {
            isPopoverOpen = false;
        } else {
            try {
                isPopoverOpen = ref.matches(":popover-open");
            } catch {
                isPopoverOpen = false;
            }
        }
        return select.registerContent(ref);
    });

    $effect(() => {
        return select.registerListboxId(id);
    });
</script>

<Popover
    bind:ref
    {...rest}
    id={resolvedId}
    role="listbox"
    aria-labelledby={select.triggerId}
    aria-activedescendant={undefined}
    {placement}
    {width}
    {offset}
    {animate}
    class={["cs-select-content", className]}
    data-size={select.size}
    data-arrow-nav={isArrowNav ? "" : undefined}
    data-nav={isKeyboardNav ? "keyboard" : undefined}
    style={styleProp
        ? `--cs-select-content-max-height: ${maxHeight}; ${styleProp}`
        : `--cs-select-content-max-height: ${maxHeight}`}
    ontoggle={handleToggle}
    onkeydown={handleKeyDown}
    onpointermove={handlePointerMove}
    onpointerdown={handlePointerDown}
    onfocusout={handleFocusOut}
>
    <ScrollArea size="sm" direction="vertical" {scrollbar}>
        <ScrollAreaContent
            bind:ref={listRef}
            tabindex={-1}
            class="cs-select-list"
            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
            {@attach rovingFocus({
                orientation: "vertical",
                loop: false,
                homeEnd: true,
                preventScroll: true,
                items: ".cs-select-item:not([data-disabled])",
                enabled: () => select.open && isPopoverOpen,
                typeahead: {
                    getLabel: (item) => item.dataset.label || item.textContent || "",
                },
                initialActive: (items) => {
                    const selected = items.find((el) => el.getAttribute("aria-selected") === "true");
                    if (selected) return selected;
                    if (select.openFocus === "last") {
                        return items.at(-1) ?? null;
                    }
                    return items.at(0) ?? null;
                },
                onActiveChange: ({ activeItem, reason }) => {
                    if (reason === "init") {
                        isArrowNav = false;
                        isKeyboardNav = false;
                        activeItem.focus({ preventScroll: true });
                        activeItem.scrollIntoView({ block: "nearest" });
                        return;
                    }
                    if (reason === "keyboard") {
                        isArrowNav = true;
                        isKeyboardNav = true;
                        activeItem.scrollIntoView({ block: "nearest" });
                    }
                },
            })}
        >
            {@render children?.()}
        </ScrollAreaContent>
    </ScrollArea>
</Popover>

<style>
    @layer components.composite {
        :global(.cs-select-content) {
            --cs-select-content-bg: var(--cs-color-elevated);
            --cs-select-content-shadow: var(--cs-shadow-floating);
            --cs-select-content-max-height: min(320px, 60dvh);
            --cs-select-content-max-width: 360px;
            --cs-select-list-gap: 2px;
            --cs-select-item-radius: max(
                var(--cs-radius-lg),
                calc(var(--cs-select-content-radius) - var(--cs-select-content-padding))
            );
            --cs-select-item-bg: transparent;
            --cs-select-item-bg-hover: var(--cs-color-base-soft);
            --cs-select-item-bg-active: var(--cs-color-base-soft-hover);
            --cs-select-item-fg: var(--cs-color-text-strong);
            --cs-select-item-fg-hover: var(--cs-color-text-strong);
            --cs-select-item-description-fg: var(--cs-color-text-weak);
            --cs-select-item-icon-fg: var(--cs-color-text-weak);
            --cs-select-item-indicator-fg: var(--cs-color-accent-soft-fg);
            --cs-select-group-label-fg: var(--cs-color-text-weak);
            --cs-select-separator-bg: color-mix(in oklab, var(--cs-color-text-main) 10%, transparent);

            max-inline-size: min(var(--cs-select-content-max-width), calc(100vw - 32px));
            max-block-size: min(var(--cs-select-content-max-height), calc(100dvh - 32px));
            background-color: var(--cs-select-content-bg);
            border-radius: var(--cs-select-content-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-select-content-shadow);
            overflow: hidden;

            &:popover-open {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            /* =========================================================
             * SIZES (xs - xl, concentric panel & item geometry)
             * ========================================================= */
            &[data-size="xs"] {
                --cs-select-content-radius: 14px;
                --cs-select-content-padding: 4px;
                --cs-select-item-px: 8px;
                --cs-select-item-py: 5px;
                --cs-select-item-min-height: 28px;
                --cs-select-item-gap: 6px;
                --cs-select-item-font-size: var(--cs-text-xs);
                --cs-select-item-title-lh: 18px;
                --cs-select-icon-size: 14px;
                --cs-select-check-size: 14px;
                --cs-select-group-gap: 6px;
                --cs-select-group-label-font-size: 11px;
            }

            &[data-size="sm"] {
                --cs-select-content-radius: 14px;
                --cs-select-content-padding: 4px;
                --cs-select-item-px: 8px;
                --cs-select-item-py: 6px;
                --cs-select-item-min-height: 30px;
                --cs-select-item-gap: 6px;
                --cs-select-item-font-size: var(--cs-text-xs);
                --cs-select-item-title-lh: 18px;
                --cs-select-icon-size: 14px;
                --cs-select-check-size: 14px;
                --cs-select-group-gap: 6px;
                --cs-select-group-label-font-size: 11px;
            }

            &[data-size="md"] {
                --cs-select-content-radius: 18px;
                --cs-select-content-padding: 6px;
                --cs-select-item-px: 10px;
                --cs-select-item-py: 7px;
                --cs-select-item-min-height: 34px;
                --cs-select-item-gap: 8px;
                --cs-select-item-font-size: var(--cs-text-sm);
                --cs-select-item-title-lh: 20px;
                --cs-select-icon-size: 16px;
                --cs-select-check-size: 16px;
                --cs-select-group-gap: 10px;
                --cs-select-group-label-font-size: var(--cs-text-xs);
            }

            &[data-size="lg"] {
                --cs-select-content-radius: 18px;
                --cs-select-content-padding: 6px;
                --cs-select-item-px: 12px;
                --cs-select-item-py: 8px;
                --cs-select-item-min-height: 38px;
                --cs-select-item-gap: 8px;
                --cs-select-item-font-size: var(--cs-text-sm);
                --cs-select-item-title-lh: 20px;
                --cs-select-icon-size: 16px;
                --cs-select-check-size: 16px;
                --cs-select-group-gap: 10px;
                --cs-select-group-label-font-size: var(--cs-text-xs);
            }

            &[data-size="xl"] {
                --cs-select-content-radius: 20px;
                --cs-select-content-padding: 6px;
                --cs-select-item-px: 12px;
                --cs-select-item-py: 9px;
                --cs-select-item-min-height: 42px;
                --cs-select-item-gap: 10px;
                --cs-select-item-font-size: var(--cs-text-base);
                --cs-select-item-title-lh: 22px;
                --cs-select-icon-size: 18px;
                --cs-select-check-size: 16px;
                --cs-select-group-gap: 10px;
                --cs-select-group-label-font-size: var(--cs-text-xs);
            }

            > :global(.cs-scroll-area) {
                flex: 1 1 auto;
                min-height: 0;
            }
        }

        :global(.cs-select-list) {
            display: flex;
            flex-direction: column;
            gap: var(--cs-select-list-gap);
            padding: var(--cs-select-content-padding);
            overscroll-behavior: contain;
            scroll-padding-block: calc(var(--cs-select-content-padding) + 16px);

            &:focus {
                outline: none;
            }
        }
    }
</style>
