import type { SidebarViewDirection, SidebarViewInitialFocus } from "./sidebar.types.ts";

export type ResolvedViewDirection = "forward" | "backward";

const FOCUSABLE_SELECTOR =
    'button, [href], input:not([type="hidden"]), select, textarea, [tabindex], [contenteditable]:not([contenteditable="false"]), summary, iframe, audio[controls], video[controls]';

export interface HistoryTransitionResult {
    nextHistory: string[];
    direction: ResolvedViewDirection;
}

/**
 * Resolves navigation direction and updates the view history stack.
 * Navigating back to a previously visited view pops the stack to that entry.
 */
export function resolveViewHistoryTransition(
    history: readonly string[],
    nextValue: string,
    explicitDirection: SidebarViewDirection
): HistoryTransitionResult {
    const currentTop = history.at(-1);
    if (currentTop === nextValue) {
        return {
            nextHistory: [...history],
            direction: explicitDirection === "backward" ? "backward" : "forward",
        };
    }

    const existingIndex = history.lastIndexOf(nextValue);
    if (existingIndex !== -1 && existingIndex < history.length - 1) {
        return {
            nextHistory: history.slice(0, existingIndex + 1),
            direction: explicitDirection === "auto" ? "backward" : explicitDirection,
        };
    }

    return {
        nextHistory: [...history, nextValue],
        direction: explicitDirection === "auto" ? "forward" : explicitDirection,
    };
}

function isElementVisibleForFocus(element: HTMLElement): boolean {
    if (element.hidden || element.getAttribute("aria-hidden") === "true") {
        return false;
    }

    if (typeof element.checkVisibility === "function") {
        return element.checkVisibility({
            checkOpacity: false,
            checkVisibilityCSS: true,
        });
    }

    return element.style.display !== "none" && element.style.visibility !== "hidden";
}

function isFocusableCandidate(element: Element): element is HTMLElement {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest(':disabled, [aria-disabled="true"], [inert]')) return false;

    const tabIndexAttr = element.getAttribute("tabindex");
    if (tabIndexAttr !== null) {
        const parsed = Number(tabIndexAttr);
        if (Number.isNaN(parsed) || parsed < 0) return false;
    }

    return isElementVisibleForFocus(element);
}

/**
 * Resolves the element that should receive keyboard focus inside an incoming view.
 */
export function resolveIncomingViewFocusTarget(
    viewElement: HTMLElement | null,
    initialFocus: SidebarViewInitialFocus = "auto"
): HTMLElement | null {
    if (!viewElement || initialFocus === "none") return null;

    if (typeof initialFocus === "function") {
        const custom = initialFocus();
        return custom && custom.isConnected && !custom.closest("[inert]") ? custom : null;
    }

    if (initialFocus instanceof HTMLElement) {
        return initialFocus.isConnected && !initialFocus.closest("[inert]") ? initialFocus : null;
    }

    const autofocusTarget = viewElement.querySelector<HTMLElement>("[data-autofocus]");
    if (autofocusTarget && isFocusableCandidate(autofocusTarget)) {
        return autofocusTarget;
    }

    const candidates = viewElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    for (const candidate of candidates) {
        if (isFocusableCandidate(candidate)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Checks whether active keyboard focus currently resides inside the given container.
 */
export function isFocusInsideElement(container: HTMLElement | null): boolean {
    if (!container || typeof document === "undefined") return false;
    const active = document.activeElement;
    return active instanceof Node && container.contains(active);
}
