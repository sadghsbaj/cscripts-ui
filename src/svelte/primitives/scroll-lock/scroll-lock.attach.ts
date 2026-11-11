import type { Attachment } from "svelte/attachments";

export interface ScrollLockOptions {
    /**
     * Whether the scroll lock is active.
     * Can be a boolean or a reactive getter function.
     * @default true
     */
    enabled?: boolean | (() => boolean);

    /**
     * Whether to allow scrolling within scrollable child elements (containment mode).
     * When true, only uncontained scroll gestures on the boundary itself or non-scrollable
     * descendants are cancelled.
     * @default true
     */
    allowScrollableChildren?: boolean;

    /**
     * Custom predicate to determine whether an element should be treated as scrollable.
     * Return true to allow scrolling, false to block, or undefined to use default heuristics.
     */
    isScrollable?: (element: HTMLElement) => boolean | undefined;

    /**
     * Whether to toggle `data-scroll-locked` on the container element while active.
     * @default true
     */
    dataAttribute?: boolean;
}

export type ScrollLockSource =
    | boolean
    | ScrollLockOptions
    | (() => boolean | ScrollLockOptions | undefined)
    | undefined;

/**
 * Checks whether an element is currently able to scroll in any direction.
 */
function isScrollableElement(
    element: HTMLElement,
    customPredicate?: (el: HTMLElement) => boolean | undefined
): boolean {
    const customResult = customPredicate?.(element);
    if (typeof customResult === "boolean") {
        return customResult;
    }

    if (element.dataset.scrollable === "true" || element.classList.contains("cs-scroll-area-content")) {
        return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
    }

    if (element.dataset.scrollable === "false") {
        return false;
    }

    // Fast-path: If content fits within client box, it cannot scroll.
    if (element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth) {
        return false;
    }

    if (typeof window === "undefined") {
        return false;
    }

    const { overflowY, overflowX } = window.getComputedStyle(element);
    const canScrollY = (overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight;
    const canScrollX = (overflowX === "auto" || overflowX === "scroll") && element.scrollWidth > element.clientWidth;

    return canScrollY || canScrollX;
}

/**
 * Traverses upwards from `target` to `boundary` to find any scrollable ancestor element.
 */
function hasScrollableAncestor(
    target: Element | null,
    boundary: HTMLElement,
    customPredicate?: (el: HTMLElement) => boolean | undefined
): boolean {
    let current = target;
    while (current && current !== boundary) {
        if (current instanceof HTMLElement && isScrollableElement(current, customPredicate)) {
            return true;
        }
        current = current.parentElement;
    }
    return false;
}

/**
 * Resolves current options from a polymorphic source.
 */
function resolveOptions(source: ScrollLockSource): {
    enabled: boolean;
    allowScrollableChildren: boolean;
    isScrollable?: (element: HTMLElement) => boolean | undefined;
    dataAttribute: boolean;
} {
    const raw = typeof source === "function" ? source() : source;

    if (typeof raw === "boolean") {
        return {
            allowScrollableChildren: true,
            dataAttribute: true,
            enabled: raw,
        };
    }

    if (!raw) {
        return {
            allowScrollableChildren: true,
            dataAttribute: true,
            enabled: true,
        };
    }

    const enabledValue = typeof raw.enabled === "function" ? raw.enabled() : (raw.enabled ?? true);

    return {
        allowScrollableChildren: raw.allowScrollableChildren ?? true,
        dataAttribute: raw.dataAttribute ?? true,
        enabled: enabledValue,
        isScrollable: raw.isScrollable,
    };
}

/**
 * Svelte 5 Element Attachment to prevent uncontained background scrolling.
 *
 * Intercepts `wheel` and `touchmove` events originating on the attached container
 * or non-scrollable descendants without mutating document styles (`overflow: hidden`)
 * or causing layout shifts. Scrollable descendants (e.g. `<ScrollAreaContent />`)
 * continue to scroll freely.
 *
 * @example
 * ```svelte
 * <!-- Default containment on an overlay or dialog -->
 * <div {@attach scrollLock()}>
 *     ...
 * </div>
 *
 * <!-- Boolean shorthand -->
 * <div {@attach scrollLock(isModalOpen)}>
 *     ...
 * </div>
 *
 * <!-- Custom options -->
 * <div {@attach scrollLock({
 *     enabled: () => isMenuOpen,
 *     allowScrollableChildren: true,
 * })}>
 *     ...
 * </div>
 * ```
 */
export function scrollLock(source?: ScrollLockSource): Attachment<HTMLElement> {
    return (node: HTMLElement): (() => void) => {
        function handleWheel(event: WheelEvent): void {
            if (event.defaultPrevented) return;

            const options = resolveOptions(source);
            if (!options.enabled) return;

            const target = event.target instanceof Element ? event.target : null;
            const canScroll = options.allowScrollableChildren && hasScrollableAncestor(target, node, options.isScrollable);

            if (!canScroll) {
                event.preventDefault();
            }
        }

        function handleTouchMove(event: TouchEvent): void {
            if (event.defaultPrevented) return;

            const options = resolveOptions(source);
            if (!options.enabled) return;

            const target = event.target instanceof Element ? event.target : null;
            const canScroll = options.allowScrollableChildren && hasScrollableAncestor(target, node, options.isScrollable);

            if (!canScroll) {
                event.preventDefault();
            }
        }

        const initialOptions = resolveOptions(source);
        if (initialOptions.enabled && initialOptions.dataAttribute) {
            node.dataset.scrollLocked = "";
        }

        node.addEventListener("wheel", handleWheel, { passive: false });
        node.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            node.removeEventListener("wheel", handleWheel);
            node.removeEventListener("touchmove", handleTouchMove);
            delete node.dataset.scrollLocked;
        };
    };
}
