<script lang="ts">
    import { ChevronDown } from "@lucide/svelte";
    import type { Attachment } from "svelte/attachments";

    import { popoverTrigger } from "../popover/index.ts";
    import type { SelectTriggerProps } from "./index.ts";
    import { getSelectContext, type SelectRegisteredItem } from "./select.context.internal.ts";
    import SelectValue from "./SelectValue.svelte";

    const TYPEAHEAD_TIMEOUT_MS = 500;

    let {
        ref = $bindable(null),
        id,
        disabled,
        invalid,
        hideIndicator = false,
        class: className,
        children,
        onkeydown,
        onkeyup,
        onblur,
        ...rest
    }: SelectTriggerProps = $props();

    const select = getSelectContext();

    const resolvedId = $derived(id ?? select.triggerId);
    const resolvedDisabled = $derived(Boolean(disabled ?? select.disabled));
    const resolvedInvalid = $derived(Boolean(invalid ?? select.invalid));
    const isPlaceholder = $derived(select.selectedItem === undefined && (select.value === undefined || select.value === ""));

    let typeaheadBuffer = "";
    let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
    let suppressSpaceKeyUp = false;

    function clearTypeahead(): void {
        typeaheadBuffer = "";
        if (typeaheadTimer !== null) {
            clearTimeout(typeaheadTimer);
            typeaheadTimer = null;
        }
    }

    function cleanupTriggerState(): void {
        clearTypeahead();
        suppressSpaceKeyUp = false;
    }

    function isAllSameChar(value: string): boolean {
        if (value.length === 0) return false;
        const first = value.charAt(0);
        for (let i = 1; i < value.length; i++) {
            if (value.charAt(i) !== first) return false;
        }
        return true;
    }

    function findPrefixMatch(
        items: SelectRegisteredItem[],
        startIndex: number,
        prefix: string
    ): SelectRegisteredItem | null {
        const count = items.length;
        if (count === 0 || prefix.length === 0) return null;

        const normalizedStart = ((startIndex % count) + count) % count;
        for (let offset = 0; offset < count; offset++) {
            const candidate = items.at((normalizedStart + offset) % count);
            if (!candidate) continue;
            const label = candidate.label.trim().replaceAll(/\s+/g, " ").toLowerCase();
            if (label.startsWith(prefix)) {
                return candidate;
            }
        }
        return null;
    }

    function findTypeaheadMatch(
        items: SelectRegisteredItem[],
        currentIndex: number,
        buffer: string
    ): SelectRegisteredItem | null {
        if (items.length === 0 || buffer.length === 0) return null;

        if (buffer.length > 1) {
            const startIndex = Math.max(currentIndex, 0);
            const exactMatch = findPrefixMatch(items, startIndex, buffer);
            if (exactMatch) return exactMatch;

            if (!isAllSameChar(buffer)) {
                return null;
            }
        }

        const cycleStartIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
        return findPrefixMatch(items, cycleStartIndex, buffer.charAt(0));
    }

    function handlePointerDown(event: PointerEvent): void {
        suppressSpaceKeyUp = false;
        if (event.pointerType !== "mouse" || event.button !== 0 || resolvedDisabled) return;
        if (!select.open) {
            select.beginPointerOpen(event.clientX, event.clientY);
        } else {
            select.clearPointerOpen();
        }
    }

    const trackPointerOpen: Attachment<HTMLButtonElement> = (node) => {
        node.addEventListener("pointerdown", handlePointerDown);
        return () => {
            node.removeEventListener("pointerdown", handlePointerDown);
        };
    };

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || resolvedDisabled) return;

        if (select.open) {
            if (event.key === "Escape") {
                event.preventDefault();
                select.setOpen(false, { restoreFocus: true });
            }
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            clearTypeahead();
            select.setOpen(true, { openFocus: "selected" });
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            clearTypeahead();
            select.setOpen(true, { openFocus: "last" });
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            clearTypeahead();
            select.setOpen(true, { openFocus: "selected" });
            return;
        }

        if (event.key === " " && typeaheadBuffer.length === 0) {
            event.preventDefault();
            clearTypeahead();
            suppressSpaceKeyUp = true;
            select.setOpen(true, { openFocus: "selected" });
            return;
        }

        if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || event.key.length !== 1) {
            return;
        }

        if (event.key === " ") {
            event.preventDefault();
            suppressSpaceKeyUp = true;
        }

        typeaheadBuffer += event.key.toLowerCase();
        if (typeaheadTimer !== null) {
            clearTimeout(typeaheadTimer);
        }
        typeaheadTimer = setTimeout(() => {
            typeaheadBuffer = "";
            typeaheadTimer = null;
        }, TYPEAHEAD_TIMEOUT_MS);

        const orderedItems = select.getOrderedEnabledItems();
        if (orderedItems.length === 0) return;

        const currentIndex =
            select.value !== undefined ? orderedItems.findIndex((item) => item.value === select.value) : -1;
        const match = findTypeaheadMatch(orderedItems, currentIndex, typeaheadBuffer);
        if (match) {
            event.preventDefault();
            select.selectWithoutToggle(match.value);
        }
    }

    function handleKeyUp(event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onkeyup?.(event);
        if (event.key === " " && suppressSpaceKeyUp) {
            suppressSpaceKeyUp = false;
            event.preventDefault();
        }
    }

    function handleBlur(event: FocusEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onblur?.(event);
        clearTypeahead();
    }

    $effect(() => {
        return select.registerTrigger(ref);
    });

    $effect(() => {
        return select.registerTriggerId(id ?? undefined);
    });

    $effect(() => {
        return cleanupTriggerState;
    });
</script>

<button
    bind:this={ref}
    {...rest}
    type="button"
    id={resolvedId}
    role="combobox"
    aria-haspopup="listbox"
    aria-expanded={select.open ? "true" : "false"}
    aria-controls={select.listboxId}
    aria-invalid={resolvedInvalid ? "true" : undefined}
    aria-required={select.required ? "true" : undefined}
    disabled={resolvedDisabled}
    class={["cs-select-trigger", className]}
    data-variant={select.variant}
    data-size={select.size}
    data-state={select.open ? "open" : "closed"}
    data-placeholder={isPlaceholder ? "" : undefined}
    data-invalid={resolvedInvalid ? "" : undefined}
    data-disabled={resolvedDisabled ? "" : undefined}
    {@attach trackPointerOpen}
    {@attach popoverTrigger({
        target: select.listboxId,
        triggerOn: "pointerdown",
        enabled: () => !resolvedDisabled,
    })}
    onkeydown={handleKeyDown}
    onkeyup={handleKeyUp}
    onblur={handleBlur}
>
    {#if children}
        {@render children()}
    {:else}
        <SelectValue />
    {/if}

    {#if !hideIndicator}
        <ChevronDown aria-hidden="true" class="cs-select-trigger-chevron" />
    {/if}
</button>

<style>
    @layer components.composite {
        .cs-select-trigger {
            --cs-select-trigger-fg: var(--cs-color-text-strong);
            --cs-select-trigger-placeholder-fg: var(--cs-color-text-weak);
            --cs-select-trigger-icon-fg: var(--cs-color-text-weak);
            --cs-select-trigger-indicator-fg: var(--cs-color-text-weak);
            --cs-select-trigger-shadow: none;
            --cs-select-trigger-shadow-hover: var(--cs-select-trigger-shadow);
            --cs-select-trigger-ring-shadow: inset 0 0 0 0px transparent;

            position: relative;
            display: inline-flex;
            gap: var(--cs-select-trigger-gap);
            align-items: center;
            height: var(--cs-select-trigger-height);
            padding-inline-start: var(--cs-select-trigger-px);
            padding-inline-end: var(--cs-select-trigger-px);
            color: var(--cs-select-trigger-fg);
            font-size: var(--cs-select-trigger-font-size);
            font-weight: 500;
            line-height: 1;
            background-color: var(--cs-select-trigger-bg);
            border: none;
            border-radius: var(--cs-select-trigger-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-select-trigger-shadow);
            cursor: default;
            user-select: none;
            transition:
                background-color var(--cs-dur-120) var(--cs-ease-quart-out),
                box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);

            &::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 1;
                border-radius: inherit;
                corner-shape: inherit;
                box-shadow: var(--cs-select-trigger-ring-shadow);
                transition: box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);
                pointer-events: none;
            }

            /* Optical edge compensation for Lucide 2px internal SVG viewBox padding */
            &:has(> :global(.cs-select-trigger-value:first-child > .cs-select-trigger-icon:first-child)),
            &:has(> :global(.cs-select-trigger-icon:first-child)) {
                padding-inline-start: calc(var(--cs-select-trigger-px) - 2px);
            }

            &:has(> :global(.cs-select-trigger-chevron:last-child)) {
                padding-inline-end: calc(var(--cs-select-trigger-px) - 2px);
            }

            /* =========================================================
             * SIZES (xs - xl, matching TextInput & Button heights 28-44px 1:1)
             * ========================================================= */
            &[data-size="xs"] {
                --cs-select-trigger-height: 28px;
                --cs-select-trigger-font-size: var(--cs-text-xs);
                --cs-select-trigger-radius: 9px;
                --cs-select-trigger-px: 8px;
                --cs-select-trigger-gap: 6px;
                --cs-select-trigger-icon-size: 14px;
            }

            &[data-size="sm"] {
                --cs-select-trigger-height: 32px;
                --cs-select-trigger-font-size: var(--cs-text-xs);
                --cs-select-trigger-radius: 10px;
                --cs-select-trigger-px: 10px;
                --cs-select-trigger-gap: 6px;
                --cs-select-trigger-icon-size: 14px;
            }

            &[data-size="md"] {
                --cs-select-trigger-height: 36px;
                --cs-select-trigger-font-size: var(--cs-text-sm);
                --cs-select-trigger-radius: 12px;
                --cs-select-trigger-px: 12px;
                --cs-select-trigger-gap: 8px;
                --cs-select-trigger-icon-size: 16px;
            }

            &[data-size="lg"] {
                --cs-select-trigger-height: 40px;
                --cs-select-trigger-font-size: var(--cs-text-sm);
                --cs-select-trigger-radius: 13px;
                --cs-select-trigger-px: 14px;
                --cs-select-trigger-gap: 8px;
                --cs-select-trigger-icon-size: 16px;
            }

            &[data-size="xl"] {
                --cs-select-trigger-height: 44px;
                --cs-select-trigger-font-size: var(--cs-text-base);
                --cs-select-trigger-radius: 14px;
                --cs-select-trigger-px: 16px;
                --cs-select-trigger-gap: 10px;
                --cs-select-trigger-icon-size: 18px;
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="soft"] {
                --cs-select-trigger-bg: var(--cs-color-base-soft);
                --cs-select-trigger-bg-hover: var(--cs-color-base-soft-hover);
                --cs-select-trigger-shadow: none;
            }

            &[data-variant="elevated"] {
                --cs-select-trigger-bg: var(--cs-color-elevated);
                --cs-select-trigger-bg-hover: var(--cs-color-elevated-hover);
                --cs-select-trigger-shadow: var(--cs-shadow-elevated);
                --cs-select-trigger-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            /* =========================================================
             * STATES
             * ========================================================= */
            &[data-placeholder] {
                --cs-select-trigger-fg: var(--cs-select-trigger-placeholder-fg);
                font-weight: 400;
            }

            @media (hover: hover) {
                &:hover:not(:disabled, [data-disabled]) {
                    --cs-select-trigger-indicator-fg: var(--cs-color-text-strong);
                    background-color: var(--cs-select-trigger-bg-hover);
                    box-shadow: var(--cs-select-trigger-shadow-hover);
                }
            }

            &:is([data-state="open"], [aria-expanded="true"]):not(:disabled, [data-disabled]) {
                --cs-select-trigger-indicator-fg: var(--cs-color-text-strong);
                background-color: var(--cs-select-trigger-bg-hover);
                box-shadow: var(--cs-select-trigger-shadow-hover);

                > :global(.cs-select-trigger-chevron) {
                    rotate: 180deg;
                    transition:
                        rotate var(--cs-dur-200) var(--cs-ease-quart-out),
                        color var(--cs-dur-effect) var(--cs-ease-effect);
                }
            }

            &:active:not(:disabled, [data-disabled]) {
                box-shadow: var(--cs-select-trigger-shadow);
            }

            &[data-invalid]:not(:disabled, [data-disabled]) {
                --cs-select-trigger-icon-fg: var(--cs-color-negative-soft-fg);
                --cs-select-trigger-indicator-fg: var(--cs-color-negative-soft-fg);
                --cs-select-trigger-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);
            }

            &:is(:disabled, [data-disabled]) {
                --cs-disabled-opacity: 1;
                --cs-select-trigger-fg: var(--cs-color-disabled-fg);
                --cs-select-trigger-placeholder-fg: var(--cs-color-disabled-fg);
                --cs-select-trigger-icon-fg: var(--cs-color-disabled-fg);
                --cs-select-trigger-indicator-fg: var(--cs-color-disabled-fg);
                --cs-select-trigger-ring-shadow: inset 0 0 0 0px transparent;
                cursor: default;

                &[data-variant="soft"] {
                    --cs-select-trigger-bg: var(--cs-color-disabled-bg);
                    --cs-select-trigger-bg-hover: var(--cs-color-disabled-bg);
                    --cs-select-trigger-shadow: none;
                    --cs-select-trigger-shadow-hover: none;
                }

                &[data-variant="elevated"] {
                    --cs-select-trigger-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-select-trigger-bg-hover: var(--cs-color-disabled-bg-elevated);
                    --cs-select-trigger-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                    --cs-select-trigger-shadow-hover: 0 0 0 1px var(--cs-color-disabled-border);
                }
            }

            > :global(.cs-select-trigger-chevron) {
                flex-shrink: 0;
                width: var(--cs-select-trigger-icon-size);
                height: var(--cs-select-trigger-icon-size);
                color: var(--cs-select-trigger-indicator-fg);
                stroke-width: 2.25;
                pointer-events: none;
                rotate: 0deg;
                transition:
                    rotate var(--cs-dur-exit-md) var(--cs-ease-exit),
                    color var(--cs-dur-effect) var(--cs-ease-effect);
            }
        }
    }
</style>
