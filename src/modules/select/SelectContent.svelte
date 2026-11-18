<script lang="ts">
    import "../../shared/listbox/listbox.css";
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
    class={["cs-select-content", "cs-listbox", className]}
    data-size={select.size}
    data-arrow-nav={isArrowNav ? "" : undefined}
    data-nav={isKeyboardNav ? "keyboard" : undefined}
    style={styleProp
        ? `--cs-listbox-content-max-height: ${maxHeight}; --cs-select-content-max-height: ${maxHeight}; ${styleProp}`
        : `--cs-listbox-content-max-height: ${maxHeight}; --cs-select-content-max-height: ${maxHeight}`}
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
            class="cs-select-list cs-listbox-list"
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
