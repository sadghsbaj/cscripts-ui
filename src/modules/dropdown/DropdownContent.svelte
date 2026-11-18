<script lang="ts">
    import type { Attachment } from "svelte/attachments";

    import "../../shared/listbox/listbox.css";
    import "./dropdown.css";
    import { rovingFocus } from "../focus/index.ts";
    import { Popover } from "../popover/index.ts";
    import { ScrollArea, ScrollAreaContent } from "../scroll-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import { getDropdownContext } from "./dropdown.context.internal.ts";
    import type { DropdownContentProps } from "./index.ts";

    const INTERACTIVE_CUSTOM_WIDGET_SELECTOR =
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), button, a[href], summary, [role="switch"], [role="slider"], [role="spinbutton"], [role="checkbox"], [role="radio"], [role="textbox"], [role="combobox"], [role="listbox"]';

    let {
        ref = $bindable(null),
        id,
        placement = "bottom-start",
        width = "content",
        offset = "8px",
        maxHeight = "min(320px, 60dvh)",
        scrollbar = "hover",
        animate = true,
        header,
        footer,
        class: className,
        style: styleProp,
        children,
        ontoggle,
        onkeydown,
        onpointermove,
        onpointerdown,
        onfocusout,
        ...rest
    }: DropdownContentProps = $props();

    const dropdown = getDropdownContext();
    const resolvedId = $derived(id ?? dropdown.menuId);

    let listRef = $state<HTMLDivElement | null>(null);
    let isPopoverOpen = $state(false);
    let isArrowNav = $state(false);
    let isKeyboardNav = $state(false);

    function isInteractiveCustomWidget(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;
        if (target.closest(".cs-dropdown-item")) return false;
        return target.closest(INTERACTIVE_CUSTOM_WIDGET_SELECTOR) !== null;
    }

    function handleCustomWidgetKeyDown(event: KeyboardEvent): void {
        if (isInteractiveCustomWidget(event.target)) {
            event.stopImmediatePropagation();
        }
    }

    // Prevent rovingFocus (registered on the same ScrollAreaContent node) from hijacking keys inside custom widgets.
    const guardCustomWidgetKeys: Attachment<HTMLElement> = (node) => {
        node.addEventListener("keydown", handleCustomWidgetKeyDown);
        return () => {
            node.removeEventListener("keydown", handleCustomWidgetKeyDown);
        };
    };

    function handleToggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ontoggle?.(event);
        const isOpen = event.newState === "open";
        isPopoverOpen = isOpen;
        dropdown.syncPopoverOpen(isOpen);
        if (!isOpen) {
            isArrowNav = false;
            isKeyboardNav = false;
        }
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        const preventedBefore = event.defaultPrevented;
        onkeydown?.(event);
        if (!preventedBefore && event.defaultPrevented) return;

        if (isInteractiveCustomWidget(event.target)) return;

        if (event.key === "Tab" && !preventedBefore && !event.defaultPrevented) {
            if (event.target instanceof Element && event.target.closest(".cs-dropdown-item")) {
                // Focus trigger synchronously before browser Tab traversal leaves the top-layer popover.
                dropdown.setOpen(false, { restoreFocus: false });
                dropdown.triggerRef?.focus({ preventScroll: true });
            }
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
        if (related instanceof Node && !event.currentTarget.contains(related) && dropdown.open) {
            dropdown.setOpen(false, { restoreFocus: false });
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
        return dropdown.registerContent(ref);
    });

    $effect(() => {
        return dropdown.registerMenuId(id);
    });
</script>

<Popover
    bind:ref
    {...rest}
    id={resolvedId}
    role="menu"
    aria-labelledby={dropdown.triggerId}
    {placement}
    {width}
    {offset}
    {animate}
    class={["cs-dropdown-content", "cs-listbox", className]}
    data-size={dropdown.size}
    data-arrow-nav={isArrowNav ? "" : undefined}
    data-nav={isKeyboardNav ? "keyboard" : undefined}
    style={styleProp
        ? `--cs-listbox-content-max-height: ${maxHeight}; --cs-dropdown-content-max-height: ${maxHeight}; ${styleProp}`
        : `--cs-listbox-content-max-height: ${maxHeight}; --cs-dropdown-content-max-height: ${maxHeight}`}
    ontoggle={handleToggle}
    onkeydown={handleKeyDown}
    onpointermove={handlePointerMove}
    onpointerdown={handlePointerDown}
    onfocusout={handleFocusOut}
>
    {@render header?.()}

    <ScrollArea size="sm" direction="vertical" {scrollbar}>
        <ScrollAreaContent
            bind:ref={listRef}
            tabindex={-1}
            class="cs-dropdown-list cs-listbox-list"
            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
            {@attach guardCustomWidgetKeys}
            {@attach rovingFocus({
                orientation: "vertical",
                loop: true,
                homeEnd: true,
                preventScroll: true,
                items: ".cs-dropdown-item:not([data-disabled])",
                enabled: () => dropdown.open && isPopoverOpen,
                typeahead: {
                    getLabel: (item) => item.dataset.typeaheadLabel || item.dataset.label || item.textContent || "",
                },
                initialActive: (items) => {
                    if (dropdown.openFocus === "last") {
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

    {@render footer?.()}
</Popover>
