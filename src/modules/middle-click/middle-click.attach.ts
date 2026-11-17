import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";

const MIDDLE_BUTTON = 1;

export interface MiddleClickDetail {
    /** The innermost element that received the click. */
    target: Element;
    event: MouseEvent;
    /** The element the attachment is bound to. */
    element: HTMLElement | SVGElement;
}

export type MiddleClickHandler = (detail: MiddleClickDetail) => void;

export type MiddleClickIgnore = string | ((target: Element, event: MouseEvent) => boolean);

export interface MiddleClickOptions {
    /**
     * Callback fired after a complete middle click (press and release) on the element.
     */
    onMiddleClick: MiddleClickHandler;

    /**
     * Whether middle click handling is currently active. Evaluated on every event.
     * @default true
     */
    enabled?: boolean | (() => boolean);

    /**
     * Suppresses browser defaults of the middle button (autoscroll, opening links in a new tab, paste on Linux).
     * Only applies to handled clicks; ignored targets keep their native behavior.
     * @default true
     */
    preventDefault?: boolean;

    /**
     * CSS selector or predicate for descendants that keep their native middle click behavior (e.g. `"a[href]"`).
     */
    ignore?: MiddleClickIgnore;

    /**
     * Also handle clicks while Ctrl, Meta, Shift or Alt is held.
     * @default false
     */
    allowModifiers?: boolean;
}

function hasModifier(event: MouseEvent): boolean {
    return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
}

function isIgnored(
    ignore: MiddleClickIgnore | undefined,
    target: Element,
    event: MouseEvent,
    element: Element
): boolean {
    if (!ignore) return false;
    if (typeof ignore !== "string") return ignore(target, event);
    // closest() walks past the attached element; only matches inside it count.
    const match = target.closest(ignore);
    return match !== null && element.contains(match);
}

function shouldHandle(
    event: Event,
    options: MiddleClickOptions,
    element: Element
): event is MouseEvent & { target: Element } {
    if (!(event instanceof MouseEvent) || event.button !== MIDDLE_BUTTON) return false;
    if (!(event.target instanceof Element)) return false;
    if (!options.allowModifiers && hasModifier(event)) return false;
    if (!(resolveGetter(options.enabled) ?? true)) return false;
    return !isIgnored(options.ignore, event.target, event, element);
}

/**
 * Svelte 5 Element Attachment that reacts to a middle mouse button click (wheel click).
 *
 * - Listens to `auxclick` (the only click event fired for non-primary buttons) and requires the
 *   matching `mousedown` to start on the element, so dragging in from outside never triggers.
 * - Prevents the native autoscroll on `mousedown` and the default action on `auxclick` unless disabled.
 * - Leaves modifier-clicks (Ctrl/Meta/Shift/Alt) alone by default; they usually carry browser meaning.
 *
 * @example
 * ```svelte
 * <div {@attach middleClick({ onMiddleClick: () => closeTab(id) })}>Tab</div>
 * ```
 */
export function middleClick<T extends HTMLElement | SVGElement = HTMLElement>(
    options: MiddleClickOptions
): Attachment<T> {
    return (node: T) => {
        let pressed = false;

        const handleMouseDown = (event: Event): void => {
            // Any other button invalidates a pending middle press (chorded buttons).
            pressed = false;
            if (!shouldHandle(event, options, node)) return;
            pressed = true;
            // mousedown (not pointerdown) is what cancels the browser autoscroll.
            if (options.preventDefault ?? true) event.preventDefault();
        };

        const handleAuxClick = (event: Event): void => {
            const wasPressed = pressed;
            pressed = false;
            if (!wasPressed || !shouldHandle(event, options, node)) return;
            if (options.preventDefault ?? true) event.preventDefault();
            options.onMiddleClick({ target: event.target, event, element: node });
        };

        node.dataset.middleClick = "";
        node.addEventListener("mousedown", handleMouseDown);
        node.addEventListener("auxclick", handleAuxClick);

        return () => {
            node.removeEventListener("mousedown", handleMouseDown);
            node.removeEventListener("auxclick", handleAuxClick);
            delete node.dataset.middleClick;
        };
    };
}
