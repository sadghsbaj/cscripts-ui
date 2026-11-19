import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";

type MaybeGetter<T> = T | (() => T);

type PopoverTriggerBaseOptions = {
    target: string;
    /**
     * Optional element (or getter) to receive the CSS `--anchor-<target>` anchor-name
     * instead of the trigger element itself.
     */
    anchor?: MaybeGetter<HTMLElement | null | undefined>;
    /**
     * Whether the trigger attachment is active.
     * @default true
     */
    enabled?: MaybeGetter<boolean>;
};

export type PopoverTriggerOptions = PopoverTriggerBaseOptions &
    (
        | {
              /**
               * Interaction event used to open/toggle the popover:
               * - "pointerdown": Opens immediately on mouse down for desktop (ideal for menus, selects, split-buttons),
               *   falling back gracefully to click on touch to preserve touch scrolling.
               * - "click": Standard activation on pointerup / click release.
               */
              triggerOn: "pointerdown" | "click";
              delay?: never;
              dismissOnPress?: never;
          }
        | {
              triggerOn: "hover";
              /**
               * Open and close delays in milliseconds: `[openMs, closeMs]`.
               * @default [400, 150]
               */
              delay?: [number, number];
              /**
               * Whether pressing the trigger (pointer or `Enter` / `Space`) dismisses the popover.
               * @default true
               */
              dismissOnPress?: boolean;
          }
        | {
              triggerOn: "manual";
              delay?: never;
              dismissOnPress?: never;
          }
    );

type HoverOptions = Extract<PopoverTriggerOptions, { triggerOn: "hover" }>;

type PopoverElement = HTMLElement & {
    showPopover: (options?: { source?: HTMLElement }) => void;
    hidePopover: () => void;
    togglePopover: (options?: boolean | { source?: HTMLElement; force?: boolean }) => boolean;
};

interface ActiveHoverEntry {
    node: HTMLElement;
    popoverEl: PopoverElement;
    closeImmediate: (instant?: boolean) => void;
}

const DEFAULT_HOVER_DELAY: readonly [number, number] = [400, 150];
const HOVER_WARMUP_WINDOW_MS = 300;
const DISABLED_OR_INERT_SELECTOR = ':disabled, [aria-disabled="true"], [inert]';

/**
 * Triggers whose hover open was suppressed (e.g. pointer focus or explicit press dismissal).
 * Module-level so reactive attachment re-runs do not re-arm a dismissed trigger.
 */
const disarmedTriggers = new WeakSet<HTMLElement>();

let isHoverWarm = false;
let hoverCooldownTimer: ReturnType<typeof setTimeout> | undefined;
let activeHoverEntry: ActiveHoverEntry | null = null;
let documentEscapeBound = false;

function isTriggerDisabled(node: HTMLElement): boolean {
    return node.closest(DISABLED_OR_INERT_SELECTOR) !== null;
}

function parseAnchorNames(node: HTMLElement): string[] {
    const raw = node.style.getPropertyValue("anchor-name");
    if (!raw) return [];
    return raw
        .split(",")
        .map((token) => token.trim())
        .filter((token) => token.length > 0 && token !== "none");
}

function getTargetPopover(target: string): PopoverElement | null {
    if (typeof document === "undefined") return null;
    const element = document.getElementById(target);
    if (!element || !element.hasAttribute("popover")) return null;
    return element as PopoverElement;
}

function isPopoverOpen(element: HTMLElement | null): boolean {
    if (!element) return false;

    try {
        return element.matches(":popover-open");
    } catch {
        // Browsers without Popover API support throw on the unknown pseudo-class.
        return false;
    }
}

function isPointerHovering(node: HTMLElement, popoverEl: HTMLElement | null): boolean {
    try {
        if (node.matches(":hover")) return true;
        if (popoverEl?.matches(":hover")) return true;
    } catch {
        // Ignore environments that do not evaluate :hover.
    }
    return false;
}

function sanitizeDelayMs(value: unknown, fallback: number): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return fallback;
    }
    return value;
}

function resolveHoverDelay(delay?: [number, number]): [number, number] {
    if (!Array.isArray(delay)) {
        return [DEFAULT_HOVER_DELAY[0], DEFAULT_HOVER_DELAY[1]];
    }
    return [
        sanitizeDelayMs(delay[0], DEFAULT_HOVER_DELAY[0]),
        sanitizeDelayMs(delay[1], DEFAULT_HOVER_DELAY[1]),
    ];
}

function markHoverWarm(): void {
    clearTimeout(hoverCooldownTimer);
    hoverCooldownTimer = undefined;
    isHoverWarm = true;
}

function scheduleHoverCooldown(): void {
    clearTimeout(hoverCooldownTimer);
    hoverCooldownTimer = setTimeout(() => {
        hoverCooldownTimer = undefined;
        isHoverWarm = false;
    }, HOVER_WARMUP_WINDOW_MS);
}

function clearHoverWarm(): void {
    clearTimeout(hoverCooldownTimer);
    hoverCooldownTimer = undefined;
    isHoverWarm = false;
}

function handleDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !activeHoverEntry) return;
    const entry = activeHoverEntry;
    clearHoverWarm();
    entry.closeImmediate(false);
}

function syncDocumentEscapeListener(): void {
    if (typeof document === "undefined") return;

    if (activeHoverEntry && !documentEscapeBound) {
        document.addEventListener("keydown", handleDocumentKeyDown);
        documentEscapeBound = true;
    } else if (!activeHoverEntry && documentEscapeBound) {
        document.removeEventListener("keydown", handleDocumentKeyDown);
        documentEscapeBound = false;
    }
}

function bindToggle(node: HTMLElement, target: string, triggerOn: "pointerdown" | "click"): () => void {
    node.setAttribute("popovertarget", target);

    let suppressNextClick = false;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    function onPointerDown(event: PointerEvent): void {
        // Only the primary mouse button. Touch contacts rely on click to preserve page scrolling.
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        if (isTriggerDisabled(node)) return;

        const popoverEl = getTargetPopover(target);
        if (!popoverEl || typeof popoverEl.togglePopover !== "function") return;

        popoverEl.togglePopover({ source: node });

        // The click on mouse release would toggle the native `popovertarget` a second time.
        suppressNextClick = true;
    }

    function onClickCapture(event: MouseEvent): void {
        if (isTriggerDisabled(node)) {
            suppressNextClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        if (!suppressNextClick) return;

        suppressNextClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    // Releasing outside the trigger emits no click, so the flag must not leak into the next interaction.
    function resetSuppression(): void {
        if (!suppressNextClick) return;

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            resetTimer = undefined;
            suppressNextClick = false;
        }, 0);
    }

    node.addEventListener("click", onClickCapture, { capture: true });

    if (triggerOn === "pointerdown") {
        node.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointerup", resetSuppression);
        window.addEventListener("pointercancel", resetSuppression);
    }

    return () => {
        clearTimeout(resetTimer);
        node.removeAttribute("popovertarget");
        node.removeEventListener("click", onClickCapture, { capture: true });

        if (triggerOn === "pointerdown") {
            node.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointerup", resetSuppression);
            window.removeEventListener("pointercancel", resetSuppression);
        }
    };
}

function bindHover(node: HTMLElement, options: HoverOptions, anchorEl: HTMLElement = node): () => void {
    const { target, dismissOnPress = true } = options;
    const [openDelayMs, closeDelayMs] = resolveHoverDelay(options.delay);

    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let instantCleanupTimer: ReturnType<typeof setTimeout> | undefined;
    let boundPopoverEl: PopoverElement | null = null;
    let isCleanedUp = false;

    function clearOpenTimer(): void {
        if (openTimer === undefined) return;
        clearTimeout(openTimer);
        openTimer = undefined;
    }

    function clearCloseTimer(): void {
        if (closeTimer === undefined) return;
        clearTimeout(closeTimer);
        closeTimer = undefined;
    }

    function clearTimers(): void {
        clearOpenTimer();
        clearCloseTimer();
    }

    function handlePopoverPointerEnter(): void {
        clearCloseTimer();
    }

    function handlePopoverPointerLeave(event: PointerEvent): void {
        const popoverEl = boundPopoverEl;
        if (!popoverEl) return;

        const related = event.relatedTarget;
        if (related instanceof Node && (node.contains(related) || popoverEl.contains(related))) {
            return;
        }

        scheduleClose();
    }

    function handlePopoverFocusOut(event: FocusEvent): void {
        const popoverEl = boundPopoverEl;
        if (!popoverEl) return;

        const related = event.relatedTarget;
        if (related instanceof Node && (node.contains(related) || popoverEl.contains(related))) {
            return;
        }

        if (!isPointerHovering(node, popoverEl)) {
            scheduleClose();
        }
    }

    function handlePopoverToggle(event: Event): void {
        const popoverEl = boundPopoverEl;
        if (!popoverEl) return;

        const newState = (event as { newState?: string }).newState;
        if (newState !== "closed") return;

        clearTimeout(instantCleanupTimer);
        instantCleanupTimer = undefined;
        delete popoverEl.dataset.warm;
        delete popoverEl.dataset.instant;
        unbindPopoverListeners();

        if (activeHoverEntry?.node === node) {
            activeHoverEntry = null;
            syncDocumentEscapeListener();
        }
    }

    function bindPopoverListeners(popoverEl: PopoverElement): void {
        if (boundPopoverEl === popoverEl) return;
        unbindPopoverListeners();

        boundPopoverEl = popoverEl;
        popoverEl.addEventListener("pointerenter", handlePopoverPointerEnter);
        popoverEl.addEventListener("pointerleave", handlePopoverPointerLeave);
        popoverEl.addEventListener("focusout", handlePopoverFocusOut);
        popoverEl.addEventListener("toggle", handlePopoverToggle);
    }

    function unbindPopoverListeners(): void {
        if (!boundPopoverEl) return;

        boundPopoverEl.removeEventListener("pointerenter", handlePopoverPointerEnter);
        boundPopoverEl.removeEventListener("pointerleave", handlePopoverPointerLeave);
        boundPopoverEl.removeEventListener("focusout", handlePopoverFocusOut);
        boundPopoverEl.removeEventListener("toggle", handlePopoverToggle);
        boundPopoverEl = null;
    }

    function closeNow(instant = false, skipCooldown = false): void {
        clearTimers();
        const popoverEl = boundPopoverEl ?? getTargetPopover(target);

        if (popoverEl) {
            delete popoverEl.dataset.warm;
            if (instant) {
                popoverEl.dataset.instant = "";
                clearTimeout(instantCleanupTimer);
                // Allow hidePopover() to observe [data-instant] before removing it when no toggle event fires.
                instantCleanupTimer = setTimeout(() => {
                    instantCleanupTimer = undefined;
                    delete popoverEl.dataset.instant;
                }, 0);
            } else {
                clearTimeout(instantCleanupTimer);
                instantCleanupTimer = undefined;
                delete popoverEl.dataset.instant;
            }

            if (isPopoverOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
                popoverEl.hidePopover();
            }
        }

        unbindPopoverListeners();

        if (activeHoverEntry?.node === node) {
            activeHoverEntry = null;
            syncDocumentEscapeListener();
        }

        if (!skipCooldown) {
            scheduleHoverCooldown();
        }
    }

    function openNow(): void {
        clearTimers();
        if (isCleanedUp || isTriggerDisabled(node) || disarmedTriggers.has(node)) return;

        const popoverEl = getTargetPopover(target);
        if (!popoverEl || typeof popoverEl.showPopover !== "function") return;

        if (activeHoverEntry && activeHoverEntry.popoverEl !== popoverEl) {
            activeHoverEntry.closeImmediate(true);
        }

        const warm = isHoverWarm;
        markHoverWarm();

        clearTimeout(instantCleanupTimer);
        instantCleanupTimer = undefined;
        delete popoverEl.dataset.instant;

        if (warm) {
            popoverEl.dataset.warm = "";
        } else {
            delete popoverEl.dataset.warm;
        }

        bindPopoverListeners(popoverEl);

        if (!isPopoverOpen(popoverEl)) {
            popoverEl.showPopover({ source: node });
        }

        activeHoverEntry = {
            node,
            popoverEl,
            closeImmediate: (instant = false) => closeNow(instant, true),
        };
        syncDocumentEscapeListener();
    }

    function scheduleOpen(): void {
        clearCloseTimer();
        const currentPopover = getTargetPopover(target);
        if (isPopoverOpen(currentPopover)) {
            if (currentPopover) bindPopoverListeners(currentPopover);
            markHoverWarm();
            return;
        }

        if (isHoverWarm) {
            openNow();
            return;
        }

        clearOpenTimer();
        openTimer = setTimeout(() => {
            openTimer = undefined;
            openNow();
        }, openDelayMs);
    }

    function scheduleClose(): void {
        clearOpenTimer();
        clearCloseTimer();
        closeTimer = setTimeout(() => {
            closeTimer = undefined;
            closeNow(false, false);
        }, closeDelayMs);
    }

    function dismiss(): void {
        clearHoverWarm();
        disarmedTriggers.add(node);
        closeNow(false, true);
    }

    function handlePointerEnter(event: PointerEvent): void {
        if (event.pointerType === "touch") return;
        if (isTriggerDisabled(node)) return;

        disarmedTriggers.delete(node);
        scheduleOpen();
    }

    function handlePointerLeave(event: PointerEvent): void {
        clearOpenTimer();
        disarmedTriggers.delete(node);

        const popoverEl = getTargetPopover(target);
        if (event.relatedTarget instanceof Node && popoverEl?.contains(event.relatedTarget)) {
            return;
        }

        if (isPopoverOpen(popoverEl)) {
            scheduleClose();
        }
    }

    function handleFocusIn(): void {
        if (isTriggerDisabled(node)) return;

        // Ignore programmatic or pointer-driven focus restoration; only keyboard focus-visible opens.
        if (!node.matches(":focus-visible")) {
            if (!node.matches(":hover")) {
                disarmedTriggers.add(node);
            }
            return;
        }

        if (disarmedTriggers.has(node)) return;
        scheduleOpen();
    }

    function handleFocusOut(event: FocusEvent): void {
        disarmedTriggers.delete(node);
        clearOpenTimer();

        const popoverEl = getTargetPopover(target);
        const related = event.relatedTarget;
        if (related instanceof Node && (node.contains(related) || popoverEl?.contains(related))) {
            return;
        }

        if (isPopoverOpen(popoverEl) && !isPointerHovering(node, popoverEl)) {
            scheduleClose();
        }
    }

    function handlePointerDown(): void {
        if (isTriggerDisabled(node)) return;
        dismiss();
    }

    function handleKeyDown(event: KeyboardEvent): void {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (isTriggerDisabled(node)) return;
        dismiss();
    }

    function handleScroll(event: Event): void {
        const popoverEl = getTargetPopover(target);
        if (!isPopoverOpen(popoverEl)) return;

        // Scrolling inside the popover itself must not close it.
        if (event.target instanceof Node && popoverEl?.contains(event.target)) return;

        clearHoverWarm();
        closeNow(false, true);
    }

    node.addEventListener("pointerenter", handlePointerEnter);
    node.addEventListener("pointerleave", handlePointerLeave);
    node.addEventListener("focusin", handleFocusIn);
    node.addEventListener("focusout", handleFocusOut);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    if (dismissOnPress) {
        node.addEventListener("pointerdown", handlePointerDown);
        node.addEventListener("keydown", handleKeyDown);
    }

    return () => {
        if (isCleanedUp) return;
        isCleanedUp = true;

        clearTimers();
        clearTimeout(instantCleanupTimer);
        instantCleanupTimer = undefined;

        node.removeEventListener("pointerenter", handlePointerEnter);
        node.removeEventListener("pointerleave", handlePointerLeave);
        node.removeEventListener("focusin", handleFocusIn);
        node.removeEventListener("focusout", handleFocusOut);
        node.removeEventListener("pointerdown", handlePointerDown);
        node.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("scroll", handleScroll, { capture: true });

        const openPopover = boundPopoverEl ?? getTargetPopover(target);
        if (activeHoverEntry?.node === node || isPopoverOpen(openPopover)) {
            closeNow(false, true);
            clearHoverWarm();
        } else {
            unbindPopoverListeners();
        }

        // An immediate re-run (reactive update) re-applies the anchor synchronously and keeps the disarmed
        // state. Only a real teardown forgets it.
        queueMicrotask(() => {
            if (parseAnchorNames(anchorEl).includes(`--anchor-${target}`)) return;
            disarmedTriggers.delete(node);
        });
    };
}

export function popoverTrigger(options: PopoverTriggerOptions): Attachment<HTMLElement> {
    return (node) => {
        if (!(resolveGetter(options.enabled) ?? true)) {
            return () => {};
        }

        const anchorEl = (options.anchor ? resolveGetter(options.anchor) : null) ?? node;
        const anchorName = `--anchor-${options.target}`;
        const existingTokens = parseAnchorNames(anchorEl);
        if (!existingTokens.includes(anchorName)) {
            existingTokens.push(anchorName);
            anchorEl.style.setProperty("anchor-name", existingTokens.join(", "));
        }

        let unbind: (() => void) | undefined;
        if (options.triggerOn === "hover") {
            unbind = bindHover(node, options, anchorEl);
        } else if (options.triggerOn !== "manual") {
            unbind = bindToggle(node, options.target, options.triggerOn);
        }

        return () => {
            unbind?.();
            const remainingTokens = parseAnchorNames(anchorEl).filter((token) => token !== anchorName);
            if (remainingTokens.length > 0) {
                anchorEl.style.setProperty("anchor-name", remainingTokens.join(", "));
            } else {
                anchorEl.style.removeProperty("anchor-name");
            }
        };
    };
}
