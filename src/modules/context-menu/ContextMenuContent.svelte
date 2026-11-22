<script lang="ts">
    import type { Attachment } from "svelte/attachments";

    import "../../shared/listbox/listbox.css";
    import "./context-menu.css";
    import { t } from "../../shared/lang.internal.ts";
    import { rovingFocus } from "../focus/index.ts";
    import { Popover } from "../popover/index.ts";
    import { ScrollArea, ScrollAreaContent } from "../scroll-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import { getContextMenuContext } from "./context-menu.context.internal.ts";
    import type { ContextMenuContentProps } from "./index.ts";

    const INTERACTIVE_CUSTOM_WIDGET_SELECTOR =
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), button, a[href], summary, [role="switch"], [role="slider"], [role="spinbutton"], [role="checkbox"], [role="radio"], [role="textbox"], [role="combobox"], [role="listbox"]';

    let {
        ref = $bindable(null),
        id,
        placement = "bottom-start",
        offset = "2px",
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
        oncontextmenu,
        ...rest
    }: ContextMenuContentProps = $props();

    const contextMenu = getContextMenuContext();
    const resolvedId = $derived(id ?? contextMenu.menuId);
    const resolvedAriaLabel = $derived(
        rest["aria-labelledby"] ? undefined : (rest["aria-label"] ?? t({ de: "Kontextmenü", en: "Context menu" }))
    );

    let anchorRef = $state<HTMLSpanElement | null>(null);
    let listRef = $state<HTMLDivElement | null>(null);
    let isPopoverOpen = $state(false);
    let isArrowNav = $state(false);
    let isKeyboardNav = $state(false);
    let lastHandledSequence = 0;

    function isInteractiveCustomWidget(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;
        if (target.closest(".cs-context-menu-item")) return false;
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

    function focusInitialForOrigin(): void {
        if (contextMenu.openOrigin === "keyboard") {
            isArrowNav = true;
            isKeyboardNav = true;
            const firstItem = listRef?.querySelector<HTMLElement>(".cs-context-menu-item:not([data-disabled])");
            if (firstItem) {
                firstItem.focus({ preventScroll: true });
                firstItem.scrollIntoView({ block: "nearest" });
            } else {
                listRef?.focus({ preventScroll: true });
            }
            return;
        }

        isArrowNav = false;
        isKeyboardNav = false;
        listRef?.focus({ preventScroll: true });
    }

    function handleToggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ontoggle?.(event);
        const isOpen = event.newState === "open";
        isPopoverOpen = isOpen;
        contextMenu.syncPopoverOpen(isOpen);
        if (isOpen) {
            lastHandledSequence = contextMenu.openSequence;
            focusInitialForOrigin();
        } else {
            isArrowNav = false;
            isKeyboardNav = false;
        }
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        const preventedBefore = event.defaultPrevented;
        onkeydown?.(event);
        if (!preventedBefore && event.defaultPrevented) return;

        if (event.key === "Escape" && !preventedBefore && !event.defaultPrevented) {
            event.preventDefault();
            contextMenu.setOpen(false, { restoreFocus: true });
            return;
        }

        if (isInteractiveCustomWidget(event.target)) return;

        if (event.key === "Tab" && !preventedBefore && !event.defaultPrevented) {
            if (event.target instanceof Element && event.target.closest(".cs-context-menu-item")) {
                // Restore focus synchronously before browser Tab traversal leaves the top-layer popover.
                contextMenu.setOpen(false, { restoreFocus: true });
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
        if (related instanceof Node && !event.currentTarget.contains(related) && contextMenu.open) {
            contextMenu.setOpen(false, { restoreFocus: false });
        }
    }

    function handleContextMenu(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        oncontextmenu?.(event);
        if (!event.defaultPrevented) {
            event.preventDefault();
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
        return contextMenu.registerContent(ref);
    });

    $effect(() => {
        return contextMenu.registerAnchor(anchorRef);
    });

    $effect(() => {
        return contextMenu.registerMenuId(id);
    });

    // Re-sync initial focus when repositioned while already open.
    $effect(() => {
        const seq = contextMenu.openSequence;
        if (!isPopoverOpen || seq === lastHandledSequence) return;
        lastHandledSequence = seq;
        focusInitialForOrigin();
    });
</script>

<span
    bind:this={anchorRef}
    class="cs-context-menu-anchor"
    aria-hidden="true"
    style:anchor-name={`--anchor-${resolvedId}`}
    style:left={`${contextMenu.anchorX}px`}
    style:top={`${contextMenu.anchorY}px`}
></span>

<Popover
    bind:ref
    {...rest}
    id={resolvedId}
    role="menu"
    aria-label={resolvedAriaLabel}
    {placement}
    width="content"
    {offset}
    {animate}
    class={["cs-context-menu-content", "cs-listbox", className]}
    data-size={contextMenu.size}
    data-arrow-nav={isArrowNav ? "" : undefined}
    data-nav={isKeyboardNav ? "keyboard" : undefined}
    data-instant={contextMenu.isInstantReposition ? "" : undefined}
    style={styleProp
        ? `--cs-listbox-content-max-height: ${maxHeight}; --cs-context-menu-content-max-height: ${maxHeight}; ${styleProp}`
        : `--cs-listbox-content-max-height: ${maxHeight}; --cs-context-menu-content-max-height: ${maxHeight}`}
    ontoggle={handleToggle}
    onkeydown={handleKeyDown}
    onpointermove={handlePointerMove}
    onpointerdown={handlePointerDown}
    onfocusout={handleFocusOut}
    oncontextmenu={handleContextMenu}
>
    {@render header?.()}

    <ScrollArea size="sm" direction="vertical" {scrollbar}>
        <ScrollAreaContent
            bind:ref={listRef}
            tabindex={-1}
            class="cs-context-menu-list cs-listbox-list"
            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
            {@attach guardCustomWidgetKeys}
            {@attach rovingFocus({
                orientation: "vertical",
                loop: true,
                homeEnd: true,
                preventScroll: true,
                items: ".cs-context-menu-item:not([data-disabled])",
                enabled: () => contextMenu.open && isPopoverOpen,
                typeahead: {
                    getLabel: (item) => item.dataset.typeaheadLabel || item.dataset.label || item.textContent || "",
                },
                initialActive: (items) => items.at(0) ?? null,
                onActiveChange: ({ activeItem, reason }) => {
                    if (reason === "init") {
                        if (contextMenu.openOrigin === "keyboard") {
                            isArrowNav = true;
                            isKeyboardNav = true;
                            activeItem.focus({ preventScroll: true });
                            activeItem.scrollIntoView({ block: "nearest" });
                        } else {
                            // Keep focus on listRef so item 0 is not pre-highlighted on right-click.
                            isArrowNav = false;
                            isKeyboardNav = false;
                            listRef?.focus({ preventScroll: true });
                        }
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
