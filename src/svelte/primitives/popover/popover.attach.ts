/**
 * @description Svelte 5 DOM attachment that wires trigger elements to `<Popover />` surfaces.
 * It is the single source of truth for all trigger behavior (the `tooltip` attachment is built on top of it).
 *
 * Modes:
 * - `auto` (default): Native `popovertarget` toggle. With `triggerOn: "pointerdown"` (default) mouse users
 *   open instantly on press while touch and keyboard keep the native click path (preserves touch scrolling).
 * - `manual`: Anchor wiring only. The consumer opens and closes the popover imperatively.
 * - `hint`: Hover and focus driven via native `interestfor`, hardened against unintended opens:
 *   - Programmatic focus restoration (e.g. switching OS windows after a click) never opens the popover,
 *     only pointer hover or keyboard focus (`:focus-visible`) does.
 *   - Dismisses on press, `Enter` / `Space` and scrolling, and re-arms on pointer leave or blur.
 *   - Shares a global warmup window so adjacent triggers open instantly after one closed.
 */

import type { Attachment } from "svelte/attachments";

export type PopoverTriggerOptions =
    | {
          target: string;
          mode?: "auto";
          /**
           * Interaction event used to open/toggle the popover:
           * - "pointerdown": Opens immediately on mouse down for desktop (ideal for menus, selects, split-buttons),
           *   falling back gracefully to click on touch to preserve touch scrolling.
           * - "click": Standard activation on pointerup / click release.
           * @default "pointerdown"
           */
          triggerOn?: "pointerdown" | "click";
      }
    | {
          target: string;
          mode: "manual";
          triggerOn?: never;
      }
    | {
          target: string;
          mode: "hint";
          triggerOn?: never;
          /**
           * Native `interest-delay` shorthand: `"<open> <close>"`.
           * @default "400ms 150ms"
           */
          delay?: string;
          /**
           * Whether pressing the trigger (pointer or `Enter` / `Space`) dismisses the popover.
           * @default true
           */
          dismissOnPress?: boolean;
      };

type HintOptions = Extract<PopoverTriggerOptions, { mode: "hint" }>;

const DEFAULT_HINT_DELAY = "400ms 150ms";
const DEFAULT_HINT_CLOSE_DELAY = "150ms";
const HINT_WARMUP_WINDOW_MS = 300;

/**
 * Triggers whose `interestfor` was withdrawn. Module-level on purpose: attachments re-run when reactive
 * state changes, and a re-run must not re-arm a trigger that was dismissed or focused by the pointer.
 */
const disarmedTriggers = new WeakSet<HTMLElement>();

/** Timestamp of the last hint dismissal, shared by all hint triggers for the warmup phase. */
let lastHintCloseTimestamp = 0;

function isPopoverOpen(element: HTMLElement | null): boolean {
    if (!element) return false;

    try {
        return element.matches(":popover-open");
    } catch {
        // Browsers without Popover API support throw on the unknown pseudo-class.
        return false;
    }
}

function bindToggle(node: HTMLElement, target: string, triggerOn: "pointerdown" | "click"): () => void {
    node.setAttribute("popovertarget", target);

    if (triggerOn !== "pointerdown") {
        return () => node.removeAttribute("popovertarget");
    }

    let suppressNextClick = false;

    function onPointerDown(event: PointerEvent): void {
        // Only the primary mouse button. Touch contacts rely on click to preserve page scrolling.
        if (event.pointerType !== "mouse" || event.button !== 0) return;

        if (node.hasAttribute("disabled") || node.getAttribute("aria-disabled") === "true") return;

        const popoverEl = document.getElementById(target);
        if (!popoverEl || typeof popoverEl.togglePopover !== "function") return;

        popoverEl.togglePopover({ source: node });

        // The click on mouse release would toggle the native `popovertarget` a second time.
        suppressNextClick = true;
    }

    function onClick(event: MouseEvent): void {
        if (!suppressNextClick) return;

        suppressNextClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    // Releasing outside the trigger emits no click, so the flag must not leak into the next interaction.
    function resetSuppression(): void {
        if (!suppressNextClick) return;

        setTimeout(() => {
            suppressNextClick = false;
        }, 0);
    }

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("click", onClick, { capture: true });
    window.addEventListener("pointerup", resetSuppression);
    window.addEventListener("pointercancel", resetSuppression);

    return () => {
        node.removeAttribute("popovertarget");
        node.removeEventListener("pointerdown", onPointerDown);
        node.removeEventListener("click", onClick, { capture: true });
        window.removeEventListener("pointerup", resetSuppression);
        window.removeEventListener("pointercancel", resetSuppression);
    };
}

function bindHint(node: HTMLElement, options: HintOptions): () => void {
    const { target, delay = DEFAULT_HINT_DELAY, dismissOnPress = true } = options;
    const closeDelay = delay.split(" ", 2)[1] ?? DEFAULT_HINT_CLOSE_DELAY;

    function getTarget(): HTMLElement | null {
        return document.getElementById(target);
    }

    function arm(): void {
        disarmedTriggers.delete(node);
        if (!node.hasAttribute("interestfor")) {
            node.setAttribute("interestfor", target);
        }
    }

    function disarm(): void {
        disarmedTriggers.add(node);
        node.removeAttribute("interestfor");
    }

    function applyWarmup(): void {
        const isWarm = Date.now() - lastHintCloseTimestamp < HINT_WARMUP_WINDOW_MS;
        node.style.setProperty("interest-delay", isWarm ? `0ms ${closeDelay}` : delay);
    }

    function dismiss(): void {
        const targetEl = getTarget();
        if (isPopoverOpen(targetEl)) {
            targetEl?.hidePopover();
            lastHintCloseTimestamp = Date.now();
        }
        disarm();
    }

    function restore(): void {
        if (isPopoverOpen(getTarget())) {
            lastHintCloseTimestamp = Date.now();
        }
        arm();
        node.style.setProperty("interest-delay", delay);
    }

    function handlePointerEnter(): void {
        arm();
        applyWarmup();
    }

    function handleFocusIn(): void {
        // Native `interestfor` reacts to any DOM focus, including programmatic focus restoration when
        // switching OS windows after a pointer click. Only keyboard-driven focus (`:focus-visible`) or an
        // actively hovered trigger may keep it armed.
        if (!node.matches(":focus-visible")) {
            if (!node.matches(":hover")) disarm();
            return;
        }

        arm();
        applyWarmup();
    }

    function handleKeyDown(event: KeyboardEvent): void {
        if (event.key === "Enter" || event.key === " ") dismiss();
    }

    function handleScroll(event: Event): void {
        const targetEl = getTarget();
        if (!isPopoverOpen(targetEl)) return;

        // Scrolling inside the popover itself must not close it.
        if (event.target instanceof Node && targetEl?.contains(event.target)) return;

        dismiss();
    }

    node.style.setProperty("interest-delay", delay);
    if (!disarmedTriggers.has(node)) {
        node.setAttribute("interestfor", target);
    }

    node.addEventListener("pointerenter", handlePointerEnter);
    node.addEventListener("focusin", handleFocusIn);
    node.addEventListener("pointerleave", restore);
    node.addEventListener("focusout", restore);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    if (dismissOnPress) {
        node.addEventListener("pointerdown", dismiss);
        node.addEventListener("keydown", handleKeyDown);
    }

    return () => {
        node.removeEventListener("pointerenter", handlePointerEnter);
        node.removeEventListener("focusin", handleFocusIn);
        node.removeEventListener("pointerleave", restore);
        node.removeEventListener("focusout", restore);
        window.removeEventListener("scroll", handleScroll, { capture: true });
        node.removeEventListener("pointerdown", dismiss);
        node.removeEventListener("keydown", handleKeyDown);

        node.removeAttribute("interestfor");
        node.style.removeProperty("interest-delay");

        // An immediate re-run (reactive update) re-applies the anchor synchronously and keeps the disarmed
        // state. Only a real teardown forgets it.
        queueMicrotask(() => {
            if (node.style.getPropertyValue("anchor-name")) return;
            disarmedTriggers.delete(node);
        });
    };
}

export function popoverTrigger(options: PopoverTriggerOptions): Attachment<HTMLElement> {
    return (node) => {
        node.style.setProperty("anchor-name", `--anchor-${options.target}`);

        let unbind: (() => void) | undefined;
        if (options.mode === "hint") {
            unbind = bindHint(node, options);
        } else if (options.mode !== "manual") {
            unbind = bindToggle(node, options.target, options.triggerOn ?? "pointerdown");
        }

        return () => {
            unbind?.();
            node.style.removeProperty("anchor-name");
        };
    };
}
