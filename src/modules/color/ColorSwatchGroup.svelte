<script lang="ts">
    import { untrack } from "svelte";

    import {
        getColorPickerContext,
        hasColorPickerContext,
        setColorSwatchGroupContext,
    } from "./color.context.ts";
    import {
        areColorsEquivalent,
        findVerticalGridTarget,
        sortRegisteredSwatches,
        type RegisteredSwatch,
    } from "./color-swatch-group-nav.internal.ts";
    import type { ColorSwatchGroupProps } from "./index.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        value = $bindable<string | undefined>(),
        onValueChange,
        orientation = "both",
        columns,
        disabled = false,
        class: className,
        onkeydown,
        onfocusin,
        onfocusout,
        children,
        ...rest
    }: ColorSwatchGroupProps = $props();

    const pickerCtx = hasColorPickerContext() ? getColorPickerContext() : undefined;

    const resolvedDisabled = $derived(Boolean(disabled || pickerCtx?.disabled));
    const resolvedValue = $derived(value ?? pickerCtx?.value);
    const resolvedColumns = $derived(
        columns !== undefined && Number.isFinite(columns) && columns >= 1 ? Math.floor(columns) : undefined
    );
    const ariaOrientation = $derived(
        orientation === "vertical" ? "vertical" : orientation === "horizontal" ? "horizontal" : undefined
    );

    let registeredItems = $state<RegisteredSwatch[]>([]);
    let focusedElement = $state<HTMLElement | null>(null);

    function isItemDisabled(element: HTMLElement): boolean {
        return element instanceof HTMLButtonElement ? element.disabled : element.hasAttribute("disabled");
    }

    const enabledItems = $derived(
        resolvedDisabled
            ? []
            : registeredItems.filter((item) => item.element.isConnected && !isItemDisabled(item.element))
    );

    function isSelected(swatchColor: string): boolean {
        return areColorsEquivalent(swatchColor, resolvedValue);
    }

    const tabStop = $derived.by<HTMLElement | null>(() => {
        if (enabledItems.length === 0) return null;

        if (focusedElement && enabledItems.some((item) => item.element === focusedElement)) {
            return focusedElement;
        }

        const selectedItem = enabledItems.find((item) => {
            const swatchColor = item.getColor();
            return swatchColor !== undefined && isSelected(swatchColor);
        });
        if (selectedItem) {
            return selectedItem.element;
        }

        return enabledItems[0]?.element ?? null;
    });

    function select(swatchColor: string): void {
        if (resolvedDisabled || pickerCtx?.readonly || isSelected(swatchColor)) return;

        if (pickerCtx) {
            pickerCtx.setString(swatchColor, { commit: true });
        }
        if (value !== undefined || !pickerCtx) {
            value = swatchColor;
        }
        onValueChange?.(swatchColor);
    }

    function registerItem(element: HTMLElement, getColor: () => string | undefined): () => void {
        // Untrack so sibling registrations never re-trigger another swatch's $effect.
        untrack(() => {
            const entry: RegisteredSwatch = { element, getColor };
            registeredItems = sortRegisteredSwatches([
                ...registeredItems.filter((item) => item.element !== element),
                entry,
            ]);
        });

        return () => {
            untrack(() => {
                registeredItems = registeredItems.filter((item) => item.element !== element);
                if (focusedElement === element) {
                    focusedElement = null;
                }
            });
        };
    }

    setColorSwatchGroupContext({
        get orientation() {
            return orientation;
        },
        get disabled() {
            return resolvedDisabled;
        },
        get tabStop() {
            return tabStop;
        },
        isSelected,
        select,
        registerItem,
    });

    function handleFocusIn(event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onfocusin?.(event);
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const matched = enabledItems.find((item) => item.element === target || item.element.contains(target));
        if (matched) {
            focusedElement = matched.element;
        }
    }

    function handleFocusOut(event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onfocusout?.(event);
        const related = event.relatedTarget;
        if (!(related instanceof Node) || !ref?.contains(related)) {
            focusedElement = null;
        }
    }

    function resolveNavigationTarget(
        key: string,
        currentItem: RegisteredSwatch,
        currentIndex: number
    ): RegisteredSwatch | null {
        if (key === "Home") {
            return enabledItems[0] ?? null;
        }
        if (key === "End") {
            return enabledItems.at(-1) ?? null;
        }

        if ((key === "ArrowLeft" || key === "ArrowRight") && (orientation === "horizontal" || orientation === "both")) {
            const isRtl = ref ? getComputedStyle(ref).direction === "rtl" : false;
            const delta = (key === "ArrowRight" ? 1 : -1) * (isRtl ? -1 : 1);
            const nextIndex = (currentIndex + delta + enabledItems.length) % enabledItems.length;
            return enabledItems[nextIndex] ?? null;
        }

        if (key === "ArrowUp" || key === "ArrowDown") {
            if (orientation === "vertical") {
                const delta = key === "ArrowDown" ? 1 : -1;
                const nextIndex = (currentIndex + delta + enabledItems.length) % enabledItems.length;
                return enabledItems[nextIndex] ?? null;
            }
            if (orientation === "both") {
                return findVerticalGridTarget(enabledItems, currentItem, key === "ArrowDown" ? "down" : "up");
            }
        }

        return null;
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || resolvedDisabled || enabledItems.length === 0) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;

        const targetNode = event.target;
        const currentByTarget =
            targetNode instanceof HTMLElement
                ? enabledItems.find((item) => item.element === targetNode || item.element.contains(targetNode))
                : undefined;
        const currentItem =
            currentByTarget ??
            enabledItems.find((item) => item.element === (focusedElement ?? tabStop)) ??
            enabledItems[0];
        if (!currentItem) return;

        const currentIndex = enabledItems.indexOf(currentItem);
        const target = resolveNavigationTarget(event.key, currentItem, currentIndex);
        if (!target) return;

        event.preventDefault();
        focusedElement = target.element;
        target.element.focus();

        const targetColor = target.getColor();
        if (targetColor !== undefined) {
            select(targetColor);
        }
    }
</script>

<div
    bind:this={ref}
    {...rest}
    role="radiogroup"
    aria-orientation={ariaOrientation}
    aria-disabled={resolvedDisabled ? "true" : undefined}
    class={["cs-color-swatch-group", className]}
    data-orientation={orientation}
    data-layout={resolvedColumns ? "grid" : "flex"}
    data-columns={resolvedColumns}
    data-disabled={resolvedDisabled ? "" : undefined}
    style:--cs-color-swatch-group-columns={resolvedColumns}
    onfocusin={handleFocusIn}
    onfocusout={handleFocusOut}
    onkeydown={handleKeyDown}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-color-swatch-group {
            --cs-color-swatch-group-gap: 8px;

            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--cs-color-swatch-group-gap);

            &[data-orientation="vertical"][data-layout="flex"] {
                flex-direction: column;
                align-items: flex-start;
            }

            &[data-layout="grid"] {
                display: grid;
                grid-template-columns: repeat(var(--cs-color-swatch-group-columns), max-content);
                justify-content: start;
                align-items: center;
            }
        }
    }
</style>
