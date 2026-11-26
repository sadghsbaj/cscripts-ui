<script lang="ts">
    import "../../shared/listbox/listbox.css";
    import { Popover } from "../popover/index.ts";
    import { clickOutside } from "../click-outside/index.ts";
    import { ScrollArea, ScrollAreaContent } from "../scroll-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import type { ComboboxContentProps } from "./index.ts";
    import { getComboboxContext } from "./combobox.context.internal.ts";

    let {
        ref = $bindable(null),
        id,
        placement = "bottom-start",
        width = "min-anchor",
        offset = "8px",
        maxHeight = "min(320px, 60dvh)",
        scrollbar = "hover",
        animate = true,
        popover = "manual",
        class: className,
        style: styleProp,
        children,
        ontoggle,
        onpointermove,
        onpointerdown,
        ...rest
    }: ComboboxContentProps = $props();

    const combobox = getComboboxContext();
    const resolvedId = $derived(id ?? combobox.listboxId);

    function handleToggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ontoggle?.(event);
        combobox.syncPopoverOpen(event.newState === "open");
    }

    function handlePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointermove?.(event);
        if (event.pointerType !== "mouse") return;
        if (combobox.isKeyboardNav) {
            combobox.setKeyboardNav(false);
        }
    }

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerdown?.(event);
        if (event.pointerType === "mouse" && combobox.isKeyboardNav) {
            combobox.setKeyboardNav(false);
        }
        if (event.defaultPrevented) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
        // Prevent ScrollAreaContent (tabindex=-1) from stealing focus from ComboboxInput on padding clicks.
        event.preventDefault();
    }

    $effect(() => {
        return combobox.registerContent(ref);
    });

    $effect(() => {
        return combobox.registerListboxId(id);
    });

    $effect(() => {
        if (!combobox.open || typeof window === "undefined") return;

        function handleWindowKeyDown(event: KeyboardEvent): void {
            if (event.defaultPrevented || event.isComposing || event.key !== "Escape") return;
            if (!combobox.open) return;
            // Capture on window so Escape closes the combobox before document-capture focus traps (e.g. Modal) and stops propagation to ComboboxInput.
            event.preventDefault();
            event.stopPropagation();
            combobox.setOpen(false);
            if (!combobox.allowCustomValue) {
                combobox.handleInputBlur();
            }
        }

        window.addEventListener("keydown", handleWindowKeyDown, { capture: true });
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
        };
    });
</script>

<Popover
    bind:ref
    {...rest}
    id={resolvedId}
    role="listbox"
    aria-labelledby={combobox.inputId}
    {placement}
    {width}
    {offset}
    {popover}
    {animate}
    class={["cs-combobox-content", "cs-listbox", className]}
    data-size={combobox.size}
    data-nav={combobox.isKeyboardNav ? "keyboard" : undefined}
    style={styleProp
        ? `--cs-listbox-content-max-height: ${maxHeight}; --cs-combobox-content-max-height: ${maxHeight}; ${styleProp}`
        : `--cs-listbox-content-max-height: ${maxHeight}; --cs-combobox-content-max-height: ${maxHeight}`}
    ontoggle={handleToggle}
    onpointermove={handlePointerMove}
    onpointerdown={handlePointerDown}
    {@attach clickOutside({
        enabled: () => combobox.open,
        ignore: () => combobox.controlRef,
        onOutsideClick: () => {
            if (!combobox.open) return;
            combobox.setOpen(false);
            combobox.handleInputBlur();
        },
    })}
>
    <ScrollArea size="sm" direction="vertical" {scrollbar}>
        <ScrollAreaContent
            tabindex={-1}
            class="cs-combobox-list cs-listbox-list"
            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
        >
            {@render children?.()}
        </ScrollAreaContent>
    </ScrollArea>
</Popover>
