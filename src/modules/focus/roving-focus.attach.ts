import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import {
    getActiveElement,
    getFocusableElements,
    isElementDisabledOrInert,
    isElementVisible,
} from "./focus-utils.internal.ts";

export type RovingFocusOrientation = "horizontal" | "vertical" | "both";
export type RovingFocusDirection = "ltr" | "rtl" | "auto";
export type RovingFocusItems = string | ((container: HTMLElement) => HTMLElement[]);
export type RovingFocusChangeReason = "keyboard" | "pointer" | "focus" | "init" | "mutation";

export interface RovingFocusChangeEvent {
    activeItem: HTMLElement;
    previousItem: HTMLElement | null;
    container: HTMLElement;
    reason: RovingFocusChangeReason;
}

export interface RovingFocusTypeaheadOptions {
    /** Timeout in milliseconds before the typed character buffer resets. @default 500 */
    timeoutMs?: number;
    /** Custom label resolver per item. Defaults to `data-typeahead-label` / `aria-label` / `textContent`. */
    getLabel?: (item: HTMLElement) => string;
}

export interface RovingFocusOptions {
    /**
     * Enables or disables the roving focus attachment.
     * @default true
     */
    enabled?: boolean | (() => boolean);

    /**
     * Axis of arrow-key navigation.
     */
    orientation: RovingFocusOrientation | (() => RovingFocusOrientation);

    /**
     * Text direction for horizontal arrow keys.
     * `"auto"` reads `getComputedStyle(container).direction`.
     * @default "auto"
     */
    dir?: RovingFocusDirection;

    /**
     * Whether arrow navigation wraps from the last item to the first and vice versa.
     * @default true
     */
    loop?: boolean | (() => boolean);

    /**
     * Enables `Home` (first item) and `End` (last item) navigation.
     * @default true
     */
    homeEnd?: boolean | (() => boolean);

    /**
     * Enables buffered printable-character typeahead matching across managed items.
     * @default false
     */
    typeahead?: boolean | RovingFocusTypeaheadOptions | (() => boolean | RovingFocusTypeaheadOptions);

    /**
     * CSS selector or custom resolver returning candidate items within `container`.
     */
    items?: RovingFocusItems;

    /**
     * Optional selector or resolver to pick the initial `tabindex="0"` item on mount.
     */
    initialActive?: string | ((items: HTMLElement[], container: HTMLElement) => HTMLElement | null);

    /**
     * Passed to `target.focus({ preventScroll })`.
     * @default false
     */
    preventScroll?: boolean;

    /**
     * Fired whenever the active roving item changes.
     */
    onActiveChange?: (event: RovingFocusChangeEvent) => void;
}

const NATIVE_ARROW_INPUT_TYPES = new Set([
    "text",
    "search",
    "email",
    "url",
    "tel",
    "password",
    "number",
    "range",
    "date",
    "datetime-local",
    "month",
    "time",
    "week",
]);

function isTextEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return true;
    }

    if (target instanceof HTMLInputElement) {
        return NATIVE_ARROW_INPUT_TYPES.has(target.type);
    }

    return target.isContentEditable || Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
}

function isRtlDirection(container: HTMLElement, dir: RovingFocusDirection): boolean {
    if (dir === "rtl") {
        return true;
    }
    if (dir === "ltr") {
        return false;
    }
    if (typeof getComputedStyle === "function") {
        return getComputedStyle(container).direction === "rtl";
    }
    return false;
}

function findClosestManagedItem(target: EventTarget | null, items: HTMLElement[]): HTMLElement | null {
    if (!(target instanceof HTMLElement)) {
        return null;
    }

    const itemSet = new Set(items);
    let current: HTMLElement | null = target;
    while (current) {
        if (itemSet.has(current)) {
            return current;
        }
        current = current.parentElement;
    }

    return null;
}

function resolveInitialItem(
    items: HTMLElement[],
    container: HTMLElement,
    initialActive: RovingFocusOptions["initialActive"]
): HTMLElement | null {
    if (items.length === 0) {
        return null;
    }

    if (typeof initialActive === "function") {
        const candidate = initialActive(items, container);
        if (candidate && items.includes(candidate)) {
            return candidate;
        }
    } else if (typeof initialActive === "string") {
        try {
            const matched = items.find((item) => item.matches(initialActive));
            if (matched) {
                return matched;
            }
        } catch {
            // Invalid selector falls back to default resolution
        }
    }

    const existingTabStop = items.find((item) => item.getAttribute("tabindex") === "0");
    return existingTabStop ?? items.at(0) ?? null;
}

function findNearestValidSibling(
    previousItems: HTMLElement[],
    previousActive: HTMLElement | null,
    currentItems: HTMLElement[]
): HTMLElement | null {
    if (currentItems.length === 0) {
        return null;
    }

    if (!previousActive) {
        return currentItems.at(0) ?? null;
    }

    const currentSet = new Set(currentItems);
    const oldIndex = previousItems.indexOf(previousActive);
    if (oldIndex === -1) {
        return currentItems.at(0) ?? null;
    }

    for (let i = oldIndex + 1; i < previousItems.length; i++) {
        const candidate = previousItems[i];
        if (candidate && currentSet.has(candidate)) {
            return candidate;
        }
    }

    for (let i = oldIndex - 1; i >= 0; i--) {
        const candidate = previousItems[i];
        if (candidate && currentSet.has(candidate)) {
            return candidate;
        }
    }

    return currentItems.at(0) ?? null;
}

type NavigationAction = -1 | 1 | "first" | "last";

interface ResolvedTypeaheadConfig {
    timeoutMs: number;
    getLabel: (item: HTMLElement) => string;
}

const DEFAULT_TYPEAHEAD_TIMEOUT_MS = 500;

function defaultGetTypeaheadLabel(item: HTMLElement): string {
    return item.dataset.typeaheadLabel || item.getAttribute("aria-label") || item.textContent || "";
}

function resolveTypeaheadConfig(typeahead: RovingFocusOptions["typeahead"]): ResolvedTypeaheadConfig | null {
    const resolved = resolveGetter(typeahead);
    if (!resolved) {
        return null;
    }

    if (resolved === true) {
        return {
            timeoutMs: DEFAULT_TYPEAHEAD_TIMEOUT_MS,
            getLabel: defaultGetTypeaheadLabel,
        };
    }

    const timeoutMs =
        typeof resolved.timeoutMs === "number" && Number.isFinite(resolved.timeoutMs) && resolved.timeoutMs > 0
            ? resolved.timeoutMs
            : DEFAULT_TYPEAHEAD_TIMEOUT_MS;

    return {
        timeoutMs,
        getLabel: resolved.getLabel ?? defaultGetTypeaheadLabel,
    };
}

function isAllSameChar(value: string): boolean {
    if (value.length === 0) {
        return false;
    }
    const first = value.charAt(0);
    for (let i = 1; i < value.length; i++) {
        if (value.charAt(i) !== first) {
            return false;
        }
    }
    return true;
}

function findPrefixMatch(
    items: HTMLElement[],
    startIndex: number,
    prefix: string,
    getLabel: (item: HTMLElement) => string
): HTMLElement | null {
    const count = items.length;
    if (count === 0 || prefix.length === 0) {
        return null;
    }

    const normalizedStart = ((startIndex % count) + count) % count;
    for (let offset = 0; offset < count; offset++) {
        const candidate = items.at((normalizedStart + offset) % count);
        if (!candidate) {
            continue;
        }
        const label = getLabel(candidate).trim().replaceAll(/\s+/g, " ").toLowerCase();
        if (label.startsWith(prefix)) {
            return candidate;
        }
    }

    return null;
}

function findTypeaheadMatch(
    items: HTMLElement[],
    currentIndex: number,
    buffer: string,
    getLabel: (item: HTMLElement) => string
): HTMLElement | null {
    if (items.length === 0 || buffer.length === 0) {
        return null;
    }

    if (buffer.length > 1) {
        const startIndex = Math.max(currentIndex, 0);
        const exactMatch = findPrefixMatch(items, startIndex, buffer, getLabel);
        if (exactMatch) {
            return exactMatch;
        }

        // Only fall back to single-character cycling when all typed characters match (e.g. "gg")
        if (!isAllSameChar(buffer)) {
            return null;
        }
    }

    const cycleStartIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
    return findPrefixMatch(items, cycleStartIndex, buffer.charAt(0), getLabel);
}

function resolveCurrentIndex(
    target: HTMLElement,
    currentItems: HTMLElement[],
    currentActiveItem: HTMLElement | null
): number {
    const targetItem = findClosestManagedItem(target, currentItems);
    let currentIndex = targetItem ? currentItems.indexOf(targetItem) : -1;
    if (currentIndex === -1 && currentActiveItem) {
        currentIndex = currentItems.indexOf(currentActiveItem);
    }
    return currentIndex;
}

function resolveNextIndex(
    action: NavigationAction,
    currentIndex: number,
    itemCount: number,
    loop: boolean
): number {
    if (action === "first") {
        return 0;
    }
    if (action === "last") {
        return itemCount - 1;
    }
    if (currentIndex === -1) {
        return action === 1 ? 0 : itemCount - 1;
    }
    const rawIndex = currentIndex + action;
    return loop ? (rawIndex + itemCount) % itemCount : Math.max(0, Math.min(itemCount - 1, rawIndex));
}

function getNavigationAction(
    key: string,
    orientation: RovingFocusOrientation,
    isRtl: boolean,
    homeEnd: boolean
): NavigationAction | null {
    if (homeEnd) {
        if (key === "Home") return "first";
        if (key === "End") return "last";
    }

    if (orientation === "horizontal" || orientation === "both") {
        if (key === "ArrowLeft") return isRtl ? 1 : -1;
        if (key === "ArrowRight") return isRtl ? -1 : 1;
    }

    if (orientation === "vertical" || orientation === "both") {
        if (key === "ArrowUp") return -1;
        if (key === "ArrowDown") return 1;
    }

    return null;
}

/**
 * Svelte 5 element attachment implementing the W3C APG roving `tabindex` pattern
 * for composite widgets (toolbars, segmented controls, menus, listboxes, tablists).
 *
 * Maintains a single `tabindex="0"` tab stop, handles arrow and `Home`/`End` navigation,
 * syncs on pointer/focus interaction, and adapts to dynamic DOM mutations.
 */
export function rovingFocus<T extends HTMLElement = HTMLElement>(options: RovingFocusOptions): Attachment<T> {
    const {
        enabled = true,
        orientation,
        dir = "auto",
        loop = true,
        homeEnd = true,
        typeahead = false,
        items,
        initialActive,
        preventScroll = false,
        onActiveChange,
    } = options;

    return (container: T) => {
        if (!(resolveGetter(enabled) ?? true)) {
            return () => {};
        }

        const originalTabIndex = new WeakMap<HTMLElement, string | null>();
        const managedElements = new Set<HTMLElement>();

        let isSyncing = false;
        let isFocusWithin = false;
        let currentActiveItem: HTMLElement | null = null;
        let lastItemsSnapshot: HTMLElement[] = [];
        let typeaheadBuffer = "";
        let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

        const clearTypeahead = (): void => {
            typeaheadBuffer = "";
            delete container.dataset.typeaheadActive;
            if (typeaheadTimer !== null) {
                clearTimeout(typeaheadTimer);
                typeaheadTimer = null;
            }
        };

        container.dataset.rovingFocus = "";

        const recordOriginalTabIndex = (el: HTMLElement): void => {
            if (!originalTabIndex.has(el)) {
                originalTabIndex.set(el, el.getAttribute("tabindex"));
            }
            managedElements.add(el);
        };

        const resolveItems = (): HTMLElement[] => {
            if (typeof items === "function") {
                return items(container).filter(
                    (el): el is HTMLElement =>
                        el instanceof HTMLElement &&
                        container.contains(el) &&
                        el.closest("[data-roving-focus]") === container &&
                        isElementVisible(el) &&
                        !isElementDisabledOrInert(el)
                );
            }

            if (typeof items === "string") {
                try {
                    return [...container.querySelectorAll<HTMLElement>(items)].filter(
                        (el) =>
                            container.contains(el) &&
                            el.closest("[data-roving-focus]") === container &&
                            isElementVisible(el) &&
                            !isElementDisabledOrInert(el)
                    );
                } catch {
                    return [];
                }
            }

            return getFocusableElements(container, { includeNegativeTabIndex: true }).filter(
                (el) =>
                    el.closest("[data-roving-focus]") === container &&
                    isElementVisible(el) &&
                    !isElementDisabledOrInert(el)
            );
        };

        const applyRovingAttributes = (managedItems: HTMLElement[], nextActive: HTMLElement | null): void => {
            isSyncing = true;
            try {
                for (const item of managedItems) {
                    recordOriginalTabIndex(item);
                    if (item === nextActive) {
                        if (item.getAttribute("tabindex") !== "0") {
                            item.setAttribute("tabindex", "0");
                        }
                        if (!("rovingActive" in item.dataset)) {
                            item.dataset.rovingActive = "";
                        }
                    } else {
                        if (item.getAttribute("tabindex") !== "-1") {
                            item.setAttribute("tabindex", "-1");
                        }
                        if ("rovingActive" in item.dataset) {
                            delete item.dataset.rovingActive;
                        }
                    }
                }

                if (
                    currentActiveItem &&
                    currentActiveItem !== nextActive &&
                    "rovingActive" in currentActiveItem.dataset &&
                    (!currentActiveItem.isConnected ||
                        currentActiveItem.closest("[data-roving-focus]") === container)
                ) {
                    delete currentActiveItem.dataset.rovingActive;
                }
            } finally {
                isSyncing = false;
            }
        };

        const setActiveItem = (
            nextActive: HTMLElement | null,
            managedItems: HTMLElement[],
            reason: RovingFocusChangeReason
        ): void => {
            const previousItem = currentActiveItem;
            applyRovingAttributes(managedItems, nextActive);
            currentActiveItem = nextActive;
            lastItemsSnapshot = managedItems;

            if (nextActive && nextActive !== previousItem) {
                onActiveChange?.({
                    activeItem: nextActive,
                    previousItem,
                    container,
                    reason,
                });
            }
        };

        // Initial mount sync
        const initialItems = resolveItems();
        const initialItem = resolveInitialItem(initialItems, container, initialActive);
        const activeElOnMount = getActiveElement();
        if (activeElOnMount && container.contains(activeElOnMount)) {
            isFocusWithin = true;
        }
        setActiveItem(initialItem, initialItems, "init");

        const focusKeyboardItem = (nextItem: HTMLElement, managedItems: HTMLElement[]): void => {
            setActiveItem(nextItem, managedItems, "keyboard");
            if (getActiveElement() !== nextItem) {
                nextItem.focus({ preventScroll });
            }
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) {
                return;
            }

            if (!(event.target instanceof HTMLElement) || event.target.closest("[data-roving-focus]") !== container) {
                return;
            }

            if (isTextEditingTarget(event.target)) {
                return;
            }

            if (!event.shiftKey) {
                const resolvedOrientation = resolveGetter(orientation);
                const resolvedHomeEnd = resolveGetter(homeEnd) ?? true;
                const resolvedLoop = resolveGetter(loop) ?? true;
                const isRtl = isRtlDirection(container, dir);

                const action = getNavigationAction(event.key, resolvedOrientation, isRtl, resolvedHomeEnd);
                if (action !== null) {
                    clearTypeahead();
                    event.preventDefault();

                    const currentItems = resolveItems();
                    if (currentItems.length === 0) {
                        return;
                    }

                    const currentIndex = resolveCurrentIndex(event.target, currentItems, currentActiveItem);
                    const nextIndex = resolveNextIndex(action, currentIndex, currentItems.length, resolvedLoop);

                    const nextItem = currentItems.at(nextIndex);
                    if (!nextItem) {
                        return;
                    }

                    focusKeyboardItem(nextItem, currentItems);
                    return;
                }
            }

            const typeaheadConfig = resolveTypeaheadConfig(typeahead);
            if (!typeaheadConfig) {
                clearTypeahead();
                return;
            }

            if (event.key.length !== 1) {
                return;
            }

            // Preserve Space activation on focused items unless continuing an active multi-char query
            if (typeaheadBuffer.length === 0 && event.key === " ") {
                return;
            }

            const isActiveSpaceQuery = typeaheadBuffer.length > 0 && event.key === " ";
            if (isActiveSpaceQuery) {
                event.preventDefault();
            }

            const currentItems = resolveItems();
            if (currentItems.length === 0) {
                return;
            }

            typeaheadBuffer += event.key.toLowerCase();
            container.dataset.typeaheadActive = "";
            if (typeaheadTimer !== null) {
                clearTimeout(typeaheadTimer);
            }
            typeaheadTimer = setTimeout(() => {
                clearTypeahead();
            }, typeaheadConfig.timeoutMs);

            const currentIndex = resolveCurrentIndex(event.target, currentItems, currentActiveItem);
            const match = findTypeaheadMatch(currentItems, currentIndex, typeaheadBuffer, typeaheadConfig.getLabel);
            if (!match) {
                return;
            }

            event.preventDefault();
            focusKeyboardItem(match, currentItems);
        };

        const handlePointerDown = (event: PointerEvent): void => {
            if (!(event.target instanceof HTMLElement) || event.target.closest("[data-roving-focus]") !== container) {
                return;
            }

            clearTypeahead();
            const currentItems = resolveItems();
            const clickedItem = findClosestManagedItem(event.target, currentItems);
            if (!clickedItem) {
                return;
            }

            isFocusWithin = true;
            if (clickedItem !== currentActiveItem) {
                setActiveItem(clickedItem, currentItems, "pointer");
            }
        };

        const handleFocusIn = (event: FocusEvent): void => {
            if (!(event.target instanceof HTMLElement)) {
                return;
            }

            if (container.contains(event.target)) {
                isFocusWithin = true;
            }

            if (event.target.closest("[data-roving-focus]") !== container) {
                clearTypeahead();
                return;
            }

            const currentItems = resolveItems();
            const focusedItem = findClosestManagedItem(event.target, currentItems);
            if (focusedItem && focusedItem !== currentActiveItem) {
                clearTypeahead();
                setActiveItem(focusedItem, currentItems, "focus");
            }
        };

        const handleFocusOut = (event: FocusEvent): void => {
            const related = event.relatedTarget;
            if (related instanceof Node) {
                if (!container.contains(related)) {
                    isFocusWithin = false;
                    clearTypeahead();
                }
                return;
            }

            // Preserve focus-within when an element blurs because it was removed, disabled, or hidden
            if (
                event.target instanceof HTMLElement &&
                event.target.isConnected &&
                !isElementDisabledOrInert(event.target) &&
                isElementVisible(event.target)
            ) {
                isFocusWithin = false;
                clearTypeahead();
            }
        };

        const observer =
            typeof MutationObserver === "function"
                ? new MutationObserver(() => {
                      if (isSyncing) {
                          return;
                      }

                      const currentItems = resolveItems();
                      if (currentActiveItem && currentItems.includes(currentActiveItem)) {
                          applyRovingAttributes(currentItems, currentActiveItem);
                          lastItemsSnapshot = currentItems;
                          return;
                      }

                      const activeEl = getActiveElement();
                      const hadFocus = isFocusWithin || (activeEl !== null && container.contains(activeEl));
                      const nextActive = findNearestValidSibling(lastItemsSnapshot, currentActiveItem, currentItems);

                      clearTypeahead();
                      setActiveItem(nextActive, currentItems, "mutation");

                      if (hadFocus && nextActive) {
                          if (getActiveElement() !== nextActive) {
                              nextActive.focus({ preventScroll });
                          }
                      } else if (!nextActive) {
                          isFocusWithin = false;
                      }
                  })
                : null;

        observer?.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["disabled", "aria-disabled", "hidden", "inert", "data-roving-focus"],
        });

        container.addEventListener("keydown", handleKeyDown);
        container.addEventListener("pointerdown", handlePointerDown);
        container.addEventListener("focusin", handleFocusIn);
        container.addEventListener("focusout", handleFocusOut);

        return () => {
            clearTypeahead();
            observer?.disconnect();
            container.removeEventListener("keydown", handleKeyDown);
            container.removeEventListener("pointerdown", handlePointerDown);
            container.removeEventListener("focusin", handleFocusIn);
            container.removeEventListener("focusout", handleFocusOut);

            delete container.dataset.rovingFocus;

            for (const el of managedElements) {
                // Skip elements now owned by a still-mounted inner roving container
                if (el.closest("[data-roving-focus]") !== null) {
                    originalTabIndex.delete(el);
                    continue;
                }
                delete el.dataset.rovingActive;
                if (originalTabIndex.has(el)) {
                    const orig = originalTabIndex.get(el) ?? null;
                    originalTabIndex.delete(el);
                    if (orig === null) {
                        el.removeAttribute("tabindex");
                        continue;
                    }
                    el.setAttribute("tabindex", orig);
                }
            }
            managedElements.clear();
        };
    };
}
