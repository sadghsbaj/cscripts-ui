/**
 * @description Per-instance reactive state and physics controller for `<ButtonMorph />` and `<ButtonMorphItem />`.
 * Manages intrinsic slot dimension caching (`ResizeObserver`), transition shell locking, directional
 * ordering (`forward` / `backward`), accidental double-click protection (`guardDelay`), focus handoff,
 * and hover-aware auto-reset timers.
 */

import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";

import type {
    ButtonMorphContext,
    ButtonMorphDirection,
    ButtonMorphItemState,
    ButtonMorphResetReason,
} from "./index.ts";

export const DEFAULT_GUARD_DELAY_MS = 350;
export const MORPH_TRANSITION_DURATION_MS = 350;

/**
 * Window after a state change in which multi-click follow-ups (`event.detail > 1`) are still swallowed.
 * Real double-clicks often land after `guardDelay` (OS double-click intervals are typically 400-500ms),
 * so the time-based guard alone lets slower double-clicks through to the freshly morphed button.
 */
const MULTI_CLICK_WINDOW_MS = 600;

const INTERACTIVE_CHILD_Selector =
    'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';

export interface ButtonMorphDimensions {
    width: number;
    height: number;
}

/**
 * Resolved visual surface of a button (computed background and shadow), used by the morph shell
 * to interpolate a single continuous body between two buttons instead of cross-fading two surfaces.
 */
export interface ButtonMorphSurface {
    background: string;
    shadow: string;
    /** Superellipse exponent of the button's `corner-shape` (e.g. `1.2`); `null` when it cannot be resolved. */
    corner: number | null;
}

const CORNER_KEYWORD_EXPONENTS: Readonly<Record<string, number>> = {
    bevel: 0,
    round: 1,
    squircle: 2,
    scoop: -1,
};

/**
 * Converts a computed `corner-shape` value to its superellipse exponent so it can be interpolated
 * through a registered `<number>` custom property (`corner-shape` itself is a shorthand, and shorthands
 * containing `var()` are not animated inside `@keyframes`).
 */
function parseCornerShape(value: string): number | null {
    const normalized = value.trim().toLowerCase();

    const keywordExponent = CORNER_KEYWORD_EXPONENTS[normalized];
    if (keywordExponent !== undefined) return keywordExponent;

    const match = /^superellipse\(\s*(-?\d*\.?\d+)\s*\)$/.exec(normalized);
    return match?.[1] === undefined ? null : Number(match[1]);
}

export interface ButtonMorphStateOptions {
    getValue: () => string;
    setValue: (nextValue: string) => void;
    getDefaultValue?: () => string | undefined;
    getGuardDelay?: () => number | undefined;
    getResetTimeout?: () => number | undefined;
    getResetOnOutsideClick?: () => boolean | undefined;
    getResetOnEscape?: () => boolean | undefined;
    onReset?: (reason: ButtonMorphResetReason) => void;
}

/**
 * Reads the untransformed intrinsic layout dimensions of an element.
 * Prefers `offsetWidth` / `offsetHeight` so active CSS `scale` transforms (such as button press squash)
 * never skew layout measurements, while falling back to `getBoundingClientRect()` in virtual DOM environments.
 */
function readElementDimensions(element: HTMLElement): ButtonMorphDimensions | null {
    const offsetW = element.offsetWidth;
    const offsetH = element.offsetHeight;

    if (offsetW > 0 && offsetH > 0) {
        return {
            width: Math.round(offsetW),
            height: Math.round(offsetH),
        };
    }

    const rect = element.getBoundingClientRect();
    const rectW = Math.round(rect.width);
    const rectH = Math.round(rect.height);

    if (rectW > 0 && rectH > 0) {
        return {
            width: rectW,
            height: rectH,
        };
    }

    return null;
}

/**
 * Resolves the primary interactive button element inside a `<ButtonMorphItem />` slot.
 */
function findSlotButtonElement(slotNode: HTMLElement): HTMLElement {
    const firstChild = slotNode.firstElementChild;
    if (firstChild instanceof HTMLElement) {
        return firstChild;
    }
    return slotNode;
}

/**
 * Reads the effective resting surface (background + shadow) of a slot's button.
 *
 * Buttons draw their surface on `::before` (and `ToggleButton` additionally reveals a pressed fill on
 * `::after`), so the values are read from the pseudo-elements. Computed values are fully resolved
 * (`light-dark()`, `color-mix()`), which lets the shell interpolate them without knowing any variant.
 * Returns `null` when styles cannot be resolved (e.g. virtual DOM environments).
 */
function readButtonSurface(slotNode: HTMLElement): ButtonMorphSurface | null {
    if (typeof getComputedStyle !== "function") return null;

    const button = findSlotButtonElement(slotNode);

    try {
        const before = getComputedStyle(button, "::before");
        const after = getComputedStyle(button, "::after");

        const hasPressedFill =
            Boolean(after.backgroundColor) &&
            after.content !== "none" &&
            after.content !== "normal" &&
            Number(after.opacity) >= 0.5;

        const background = hasPressedFill ? after.backgroundColor : before.backgroundColor;
        if (!background) return null;

        // `corner-shape` lives on the button itself (the pseudo-elements inherit it).
        const buttonStyle = getComputedStyle(button);
        const corner =
            typeof buttonStyle.getPropertyValue === "function" ? buttonStyle.getPropertyValue("corner-shape") : "";

        return {
            background,
            shadow: before.boxShadow || "none",
            corner: parseCornerShape(corner),
        };
    } catch {
        return null;
    }
}

/**
 * Resolves the focusable interactive target inside a `<ButtonMorphItem />` slot.
 */
function findFocusableChild(slotNode: HTMLElement): HTMLElement | null {
    const match = slotNode.querySelector<HTMLElement>(INTERACTIVE_CHILD_Selector);
    if (match) {
        return match;
    }
    if (slotNode.firstElementChild instanceof HTMLElement) {
        return slotNode.firstElementChild;
    }
    return null;
}

/**
 * Per-instance reactive state and physics controller for `<ButtonMorph />`.
 *
 * Architectural Notes:
 * - Intrinsic Pre-Measurement: Inactive `<ButtonMorphItem />` slots remain at their natural intrinsic
 *   dimensions (`width: max-content`) while hidden, allowing `ResizeObserver` to cache exact target dimensions
 *   before a state transition begins (zero layout thrashing on click).
 * - Transition Shell Lock: During the `MORPH_TRANSITION_DURATION_MS` window, `isTransitioning` locks both the
 *   outgoing (`exiting`) and incoming (`active`) buttons to `100%` of the morphing container's interpolated
 *   `width` and `height` so their `::before` surfaces and `:focus-visible` outlines remain 100% congruent.
 * - Hover-Aware Auto-Reset: When `resetTimeout` is configured, hovering the morph container pauses the
 *   countdown and resumes on `pointerleave` so the button never snaps back while the user is aiming to click.
 */
export class ButtonMorphManager implements ButtonMorphContext {
    readonly #options: ButtonMorphStateOptions;
    readonly #initialValue: string;

    width: number | null = $state(null);
    height: number | null = $state(null);
    isTransitioning = $state(false);
    isGuarded = $state(false);
    isPointerHovered = $state(false);
    direction: ButtonMorphDirection = $state("forward");
    exitingValue: string | null = $state(null);
    surfaceFrom: ButtonMorphSurface | null = $state(null);
    surfaceTo: ButtonMorphSurface | null = $state(null);

    readonly isMeasured = $derived(this.width !== null && this.height !== null);

    #currentValue: string;
    #rootEl: HTMLElement | null = null;
    #itemOrder: string[] = [];
    readonly #itemNodes: Record<string, HTMLElement | undefined> = {};
    readonly #itemSizes: Record<string, ButtonMorphDimensions | undefined> = {};

    #transitionTimer: ReturnType<typeof setTimeout> | null = null;
    #guardTimer: ReturnType<typeof setTimeout> | null = null;
    #resetTimer: ReturnType<typeof setTimeout> | null = null;
    #lastChangeAt = -Infinity;

    constructor(options: ButtonMorphStateOptions) {
        this.#options = options;
        this.#initialValue = options.getValue();
        this.#currentValue = this.#initialValue;
    }

    get value(): string {
        return this.#options.getValue();
    }

    get defaultValue(): string {
        const explicitDefault = this.#options.getDefaultValue?.();
        if (explicitDefault !== undefined && explicitDefault !== "") {
            return explicitDefault;
        }
        if (this.#initialValue !== "") {
            return this.#initialValue;
        }
        return this.#itemOrder[0] ?? "";
    }

    get guardDelay(): number {
        return Math.max(0, this.#options.getGuardDelay?.() ?? DEFAULT_GUARD_DELAY_MS);
    }

    get resetTimeout(): number {
        return Math.max(0, this.#options.getResetTimeout?.() ?? 0);
    }

    get resetOnOutsideClick(): boolean {
        return Boolean(this.#options.getResetOnOutsideClick?.());
    }

    get resetOnEscape(): boolean {
        return Boolean(this.#options.getResetOnEscape?.());
    }

    get isNonDefaultState(): boolean {
        const resting = this.defaultValue;
        return resting !== "" && this.value !== resting;
    }

    get isOutsideClickActive(): boolean {
        return this.resetOnOutsideClick && this.isNonDefaultState;
    }

    /**
     * Returns the visual lifecycle state (`"active"`, `"exiting"`, or `"inactive"`) for a given item slot.
     */
    getItemState = (itemValue: string): ButtonMorphItemState => {
        if (this.value === itemValue) {
            return "active";
        }
        if (this.isTransitioning && this.exitingValue === itemValue) {
            return "exiting";
        }
        return "inactive";
    };

    /**
     * Whether an item's button is currently stretched to the interpolating shell (`width/height: 100%`).
     * Measurements taken in this window would return the shell size instead of the button's own size.
     */
    #isLockedToShell(itemValue: string): boolean {
        return this.isTransitioning && (this.value === itemValue || this.exitingValue === itemValue);
    }

    /**
     * Measures and caches the intrinsic dimensions of a registered item slot.
     * Applies updated dimensions immediately when the measured item is the currently active state.
     *
     * While an item is locked to the morphing shell its cached size is returned unchanged, so a
     * measurement can never be polluted by the interpolated shell geometry (regardless of what
     * triggered it: attach, `ResizeObserver`, or a reset that flips state and transition in one tick).
     */
    measureItem = (itemValue: string): ButtonMorphDimensions | null => {
        const slotNode = this.#itemNodes[itemValue];
        if (!slotNode) return null;

        if (this.#isLockedToShell(itemValue)) {
            return this.#itemSizes[itemValue] ?? null;
        }

        const targetEl = findSlotButtonElement(slotNode);
        const dims = readElementDimensions(targetEl);
        if (!dims) return null;

        this.#itemSizes[itemValue] = dims;

        if (this.value === itemValue) {
            this.width = dims.width;
            this.height = dims.height;
        }

        return dims;
    };

    /**
     * Resolves the animation direction (`"forward"` or `"backward"`) between two item values
     * based on live DOM order (with registration order fallback).
     */
    #resolveDirection(fromValue: string, toValue: string): ButtonMorphDirection {
        const fromNode = this.#itemNodes[fromValue];
        const toNode = this.#itemNodes[toValue];

        if (fromNode && toNode && fromNode !== toNode) {
            const positionMask = fromNode.compareDocumentPosition(toNode);
            if (positionMask & Node.DOCUMENT_POSITION_PRECEDING) {
                return "backward";
            }
            if (positionMask & Node.DOCUMENT_POSITION_FOLLOWING) {
                return "forward";
            }
        }

        const fromIndex = this.#itemOrder.indexOf(fromValue);
        const toIndex = this.#itemOrder.indexOf(toValue);

        if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex) {
            return "backward";
        }

        return "forward";
    }

    /**
     * Transfers keyboard/DOM focus from the outgoing slot to the newly active slot
     * when focus was inside the outgoing slot at the moment of state transition.
     */
    #transferFocusIfNeeded(fromValue: string, toValue: string): void {
        if (typeof document === "undefined") return;

        const activeEl = document.activeElement;
        if (!(activeEl instanceof HTMLElement)) return;

        const fromNode = this.#itemNodes[fromValue];
        const isFocusInFromNode = Boolean(fromNode && (fromNode === activeEl || fromNode.contains(activeEl)));
        const isFocusInRoot = Boolean(this.#rootEl && this.#rootEl.contains(activeEl));

        if (!isFocusInFromNode && !isFocusInRoot) return;

        const toNode = this.#itemNodes[toValue];
        if (!toNode) return;

        const focusTarget = findFocusableChild(toNode);
        focusTarget?.focus({ preventScroll: true });
    }

    #clearTransitionTimer(): void {
        if (this.#transitionTimer === null) return;
        clearTimeout(this.#transitionTimer);
        this.#transitionTimer = null;
    }

    #clearGuardTimer(): void {
        if (this.#guardTimer === null) return;
        clearTimeout(this.#guardTimer);
        this.#guardTimer = null;
    }

    #clearResetTimer(): void {
        if (this.#resetTimer === null) return;
        clearTimeout(this.#resetTimer);
        this.#resetTimer = null;
    }

    #startTransitionWindow(fromValue: string): void {
        this.#clearTransitionTimer();
        this.exitingValue = fromValue;
        this.isTransitioning = true;

        this.#transitionTimer = setTimeout(() => {
            this.#transitionTimer = null;
            this.isTransitioning = false;
            this.exitingValue = null;

            // Refresh active item measurement after unlocking transition width constraints
            this.measureItem(this.value);
        }, MORPH_TRANSITION_DURATION_MS);
    }

    #startGuardWindow(): void {
        this.#clearGuardTimer();
        const delay = this.guardDelay;

        if (delay <= 0) {
            this.isGuarded = false;
            return;
        }

        this.isGuarded = true;
        this.#guardTimer = setTimeout(() => {
            this.#guardTimer = null;
            this.isGuarded = false;
        }, delay);
    }

    /**
     * Synchronizes the automatic reset countdown timer based on current state, `resetTimeout`, and pointer hover.
     */
    syncResetTimer = (): void => {
        this.#clearResetTimer();

        if (!this.isNonDefaultState) return;

        const timeout = this.resetTimeout;
        if (timeout <= 0 || this.isPointerHovered) return;

        this.#resetTimer = setTimeout(() => {
            this.#resetTimer = null;
            this.reset("timeout");
        }, timeout);
    };

    /**
     * Synchronizes internal morph state, direction, dimensions, focus handoff, guard window,
     * and reset timers whenever `value` changes.
     */
    syncValue = (nextValue: string = this.value): void => {
        const prevValue = this.#currentValue;
        if (nextValue === prevValue) {
            this.syncResetTimer();
            return;
        }

        // Capture fresh intrinsic dimensions before activating transition width locks
        if (!this.isTransitioning) {
            this.measureItem(prevValue);
        }
        const nextDims = this.measureItem(nextValue) ?? this.#itemSizes[nextValue] ?? null;

        this.#currentValue = nextValue;
        this.#lastChangeAt = performance.now();
        this.direction = this.#resolveDirection(prevValue, nextValue);

        // Snapshot both resting surfaces so the shell can morph one continuous body (color + shadow)
        // while the individual button surfaces are hidden for the duration of the transition.
        const fromNode = this.#itemNodes[prevValue];
        const toNode = this.#itemNodes[nextValue];
        this.surfaceFrom = fromNode ? readButtonSurface(fromNode) : null;
        this.surfaceTo = toNode ? readButtonSurface(toNode) : null;

        if (nextDims) {
            this.width = nextDims.width;
            this.height = nextDims.height;
        }

        this.#startTransitionWindow(prevValue);
        this.#startGuardWindow();
        this.#transferFocusIfNeeded(prevValue, nextValue);
        this.syncResetTimer();
    };

    /**
     * Resets the morph state back to `defaultValue` and invokes `onReset` with the given reason.
     * Returns `true` if a reset occurred, or `false` if already in `defaultValue`.
     */
    reset = (reason: ButtonMorphResetReason): boolean => {
        const targetDefault = this.defaultValue;
        if (!targetDefault || this.value === targetDefault) {
            return false;
        }

        this.#clearResetTimer();
        this.#options.setValue(targetDefault);
        this.#options.onReset?.(reason);
        this.syncValue(targetDefault);
        return true;
    };

    /**
     * Outside-click callback compatible with `clickOutside` from `cs/svelte/click-outside`.
     */
    handleOutsideClick = (): void => {
        if (!this.resetOnOutsideClick || !this.isNonDefaultState) return;
        this.reset("outside-click");
    };

    /**
     * Cleans up all active timers on destroy.
     */
    destroy(): void {
        this.#clearTransitionTimer();
        this.#clearGuardTimer();
        this.#clearResetTimer();
        this.isTransitioning = false;
        this.isGuarded = false;
        this.isPointerHovered = false;
        this.exitingValue = null;
    }

    /**
     * Attachment for the `<ButtonMorph />` root container.
     * Manages capture-phase double-click protection (`guardDelay`), hover timer pausing, and `Escape` key resets.
     */
    attachRoot: Attachment<HTMLElement> = (node: HTMLElement) => {
        this.#rootEl = node;

        const handleCaptureClick = (event: MouseEvent): void => {
            // `detail > 1` marks the 2nd+ click of a multi-click sequence. Swallowing those shortly after a
            // morph covers slow double-clicks that arrive after `guardDelay` has already expired.
            // A deliberate second click (`detail === 1`) after the guard window still goes through.
            const isMultiClickFollowUp =
                this.guardDelay > 0 &&
                event.detail > 1 &&
                performance.now() - this.#lastChangeAt < MULTI_CLICK_WINDOW_MS;

            if (!this.isGuarded && !isMultiClickFollowUp) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };

        const handleCaptureKeyDown = (event: KeyboardEvent): void => {
            if (!this.isGuarded || (event.key !== "Enter" && event.key !== " ")) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };

        const handleDocumentKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== "Escape" || event.defaultPrevented) return;
            if (!this.resetOnEscape || !this.isNonDefaultState) return;

            event.preventDefault();
            this.reset("escape");
        };

        const handlePointerEnter = (): void => {
            if (this.isPointerHovered) return;
            this.isPointerHovered = true;
            this.#clearResetTimer();
        };

        const handlePointerLeave = (): void => {
            if (!this.isPointerHovered) return;
            this.isPointerHovered = false;
            this.syncResetTimer();
        };

        node.addEventListener("click", handleCaptureClick, { capture: true });
        node.addEventListener("keydown", handleCaptureKeyDown, { capture: true });
        node.addEventListener("pointerenter", handlePointerEnter);
        node.addEventListener("pointerleave", handlePointerLeave);

        if (typeof document !== "undefined") {
            document.addEventListener("keydown", handleDocumentKeyDown);
        }

        return () => {
            node.removeEventListener("click", handleCaptureClick, { capture: true });
            node.removeEventListener("keydown", handleCaptureKeyDown, { capture: true });
            node.removeEventListener("pointerenter", handlePointerEnter);
            node.removeEventListener("pointerleave", handlePointerLeave);

            if (typeof document !== "undefined") {
                document.removeEventListener("keydown", handleDocumentKeyDown);
            }

            if (this.#rootEl === node) {
                this.#rootEl = null;
            }
            this.destroy();
        };
    };

    /**
     * Attachment for individual `<ButtonMorphItem />` slots.
     * Registers the slot in DOM order and observes its intrinsic button size via `ResizeObserver`.
     *
     * The body runs untracked: attachments re-run whenever a reactive value read inside them changes.
     * Without `untrack`, every `value` change would tear down and re-register all slots, and the
     * re-measure would run against the already shell-locked layout (stale/shell-sized dimensions).
     */
    attachItem =
        (itemValue: string): Attachment<HTMLElement> =>
        (node: HTMLElement) =>
            untrack(() => {
                this.#itemNodes[itemValue] = node;
                if (!this.#itemOrder.includes(itemValue)) {
                    this.#itemOrder.push(itemValue);
                }

                const targetButton = findSlotButtonElement(node);

                let resizeObserver: ResizeObserver | null = null;
                if (typeof ResizeObserver !== "undefined") {
                    resizeObserver = new ResizeObserver(() => {
                        this.measureItem(itemValue);
                    });
                    resizeObserver.observe(targetButton);
                }

                this.measureItem(itemValue);

                return () => {
                    resizeObserver?.disconnect();
                    if (this.#itemNodes[itemValue] === node) {
                        delete this.#itemNodes[itemValue];
                    }
                    this.#itemOrder = this.#itemOrder.filter((v) => v !== itemValue);
                    delete this.#itemSizes[itemValue];
                };
            });
}
