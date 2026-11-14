import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    ButtonMorphManager,
    DEFAULT_GUARD_DELAY_MS,
    MORPH_TRANSITION_DURATION_MS,
    type ButtonMorphResetReason,
} from "./index.ts";

function setElementDimensions(element: HTMLElement, width: number, height: number): void {
    Object.defineProperties(element, {
        offsetWidth: {
            configurable: true,
            value: width,
        },
        offsetHeight: {
            configurable: true,
            value: height,
        },
    });
}

describe("ButtonMorphManager (buttonMorphState.svelte.ts)", () => {
    let rootEl: HTMLDivElement;
    let idleSlot: HTMLDivElement;
    let idleBtn: HTMLButtonElement;
    let confirmSlot: HTMLDivElement;
    let confirmBtn: HTMLButtonElement;
    let doneSlot: HTMLDivElement;
    let doneBtn: HTMLButtonElement;

    beforeEach(() => {
        vi.useFakeTimers();

        rootEl = document.createElement("div");

        idleSlot = document.createElement("div");
        idleBtn = document.createElement("button");
        idleBtn.textContent = "Löschen";
        setElementDimensions(idleBtn, 92, 36);
        idleSlot.append(idleBtn);

        confirmSlot = document.createElement("div");
        confirmBtn = document.createElement("button");
        confirmBtn.textContent = "Wirklich löschen?";
        setElementDimensions(confirmBtn, 154, 36);
        confirmSlot.append(confirmBtn);

        doneSlot = document.createElement("div");
        doneBtn = document.createElement("button");
        doneBtn.textContent = "Gelöscht";
        setElementDimensions(doneBtn, 110, 40);
        doneSlot.append(doneBtn);

        rootEl.append(idleSlot, confirmSlot, doneSlot);
        document.body.append(rootEl);
    });

    afterEach(() => {
        rootEl.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function createMorph(guardDelay?: number): {
        morph: ButtonMorphManager;
        setValue: (next: string) => void;
        cleanup: () => void;
    } {
        let current = "idle";
        const morph = new ButtonMorphManager({
            getValue: () => current,
            setValue: (next) => {
                current = next;
            },
            getGuardDelay: guardDelay === undefined ? undefined : () => guardDelay,
        });

        const cleanRoot = morph.attachRoot(rootEl);
        const cleanIdle = morph.attachItem("idle")(idleSlot);
        const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

        return {
            morph,
            setValue: (next) => {
                current = next;
                morph.syncValue();
            },
            cleanup: () => {
                cleanIdle?.();
                cleanConfirm?.();
                cleanRoot?.();
            },
        };
    }

    describe("Initialization, Measurement & Item States", () => {
        test("should initialize with active value, infer defaultValue, and measure active slot dimensions", () => {
            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            expect(morph.value).toBe("idle");
            expect(morph.defaultValue).toBe("idle");
            expect(morph.isNonDefaultState).toBe(false);
            expect(morph.isMeasured).toBe(true);
            expect(morph.width).toBe(92);
            expect(morph.height).toBe(36);

            expect(morph.getItemState("idle")).toBe("active");
            expect(morph.getItemState("confirm")).toBe("inactive");

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });

        test("should fall back to getBoundingClientRect when offsetWidth/offsetHeight are 0", () => {
            const customSlot = document.createElement("div");
            const customBtn = document.createElement("button");
            vi.spyOn(customBtn, "getBoundingClientRect").mockReturnValue({
                width: 128.4,
                height: 44,
                top: 0,
                left: 0,
                right: 128.4,
                bottom: 44,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });
            customSlot.append(customBtn);
            rootEl.append(customSlot);

            const morph = new ButtonMorphManager({
                getValue: () => "custom",
                setValue: () => {},
            });

            const cleanCustom = morph.attachItem("custom")(customSlot);

            expect(morph.width).toBe(128);
            expect(morph.height).toBe(44);
            expect(morph.isMeasured).toBe(true);

            cleanCustom?.();
        });

        test("should respect explicit defaultValue when provided", () => {
            let current = "confirm";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
                getDefaultValue: () => "idle",
            });

            expect(morph.defaultValue).toBe("idle");
            expect(morph.isNonDefaultState).toBe(true);
        });
    });

    describe("Transitions, Direction & Exiting Lifecycle", () => {
        test("should transition forward and backward based on DOM slot order and clear exiting state after duration", () => {
            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);
            const cleanDone = morph.attachItem("done")(doneSlot);

            // 1. Forward morph: idle -> confirm
            current = "confirm";
            morph.syncValue();

            expect(morph.direction).toBe("forward");
            expect(morph.isTransitioning).toBe(true);
            expect(morph.exitingValue).toBe("idle");
            expect(morph.getItemState("idle")).toBe("exiting");
            expect(morph.getItemState("confirm")).toBe("active");
            expect(morph.getItemState("done")).toBe("inactive");
            expect(morph.width).toBe(154);
            expect(morph.height).toBe(36);

            // Advance past transition duration
            vi.advanceTimersByTime(MORPH_TRANSITION_DURATION_MS);

            expect(morph.isTransitioning).toBe(false);
            expect(morph.exitingValue).toBeNull();
            expect(morph.getItemState("idle")).toBe("inactive");
            expect(morph.getItemState("confirm")).toBe("active");

            // 2. Forward morph: confirm -> done (with height change 36 -> 40)
            current = "done";
            morph.syncValue();

            expect(morph.direction).toBe("forward");
            expect(morph.exitingValue).toBe("confirm");
            expect(morph.width).toBe(110);
            expect(morph.height).toBe(40);

            vi.advanceTimersByTime(MORPH_TRANSITION_DURATION_MS);

            // 3. Backward morph: done -> idle
            current = "idle";
            morph.syncValue();

            expect(morph.direction).toBe("backward");
            expect(morph.exitingValue).toBe("done");
            expect(morph.getItemState("done")).toBe("exiting");
            expect(morph.getItemState("idle")).toBe("active");
            expect(morph.width).toBe(92);
            expect(morph.height).toBe(36);

            cleanIdle?.();
            cleanConfirm?.();
            cleanDone?.();
            cleanRoot?.();
        });
    });

    describe("Accidental Double-Click Protection (guardDelay)", () => {
        test("should block click and Enter/Space activation during guardDelay window and allow afterwards", () => {
            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            const onConfirmClick = vi.fn();
            const onConfirmKeyDown = vi.fn();
            confirmBtn.addEventListener("click", onConfirmClick);
            confirmBtn.addEventListener("keydown", onConfirmKeyDown);

            // Trigger transition to "confirm"
            current = "confirm";
            morph.syncValue();

            expect(morph.isGuarded).toBe(true);

            // Attempt immediate accidental double-click and Enter key during guard window
            const guardedClick = new MouseEvent("click", { bubbles: true, cancelable: true });
            confirmBtn.dispatchEvent(guardedClick);

            const guardedEnter = new KeyboardEvent("keydown", {
                key: "Enter",
                bubbles: true,
                cancelable: true,
            });
            confirmBtn.dispatchEvent(guardedEnter);

            expect(guardedClick.defaultPrevented).toBe(true);
            expect(guardedEnter.defaultPrevented).toBe(true);
            expect(onConfirmClick).not.toHaveBeenCalled();
            expect(onConfirmKeyDown).not.toHaveBeenCalled();

            // Advance past default 250ms guardDelay
            vi.advanceTimersByTime(DEFAULT_GUARD_DELAY_MS);
            expect(morph.isGuarded).toBe(false);

            // Now clicks and Enter keys go through normally
            confirmBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            confirmBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

            expect(onConfirmClick).toHaveBeenCalledTimes(1);
            expect(onConfirmKeyDown).toHaveBeenCalledTimes(1);

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });

        test("should skip guard window when guardDelay is set to 0", () => {
            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
                getGuardDelay: () => 0,
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            const onConfirmClick = vi.fn();
            confirmBtn.addEventListener("click", onConfirmClick);

            current = "confirm";
            morph.syncValue();

            expect(morph.isGuarded).toBe(false);

            confirmBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            expect(onConfirmClick).toHaveBeenCalledTimes(1);

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });
    });

    describe("Slow Double-Click Protection (multi-click follow-ups)", () => {
        test("should swallow the 2nd click of a slow double-click after the guard window expired, but not a deliberate later click", () => {
            const { setValue, cleanup } = createMorph();
            const onConfirmClick = vi.fn();
            confirmBtn.addEventListener("click", onConfirmClick);

            setValue("confirm");

            // 400ms later: time guard (250ms) is over, but a real double-click's 2nd click has detail === 2
            vi.advanceTimersByTime(400);
            const doubleClickFollowUp = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 2 });
            confirmBtn.dispatchEvent(doubleClickFollowUp);

            expect(doubleClickFollowUp.defaultPrevented).toBe(true);
            expect(onConfirmClick).not.toHaveBeenCalled();

            // A deliberate single click (detail === 1) in the same window is a new intent and goes through
            confirmBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
            expect(onConfirmClick).toHaveBeenCalledTimes(1);

            cleanup();
        });

        test("should stop swallowing multi-click follow-ups once the multi-click window is over", () => {
            const { setValue, cleanup } = createMorph();
            const onConfirmClick = vi.fn();
            confirmBtn.addEventListener("click", onConfirmClick);

            setValue("confirm");
            vi.advanceTimersByTime(900);

            confirmBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 2 }));
            expect(onConfirmClick).toHaveBeenCalledTimes(1);

            cleanup();
        });

        test("should not swallow multi-click follow-ups when guardDelay is disabled", () => {
            const { setValue, cleanup } = createMorph(0);
            const onConfirmClick = vi.fn();
            confirmBtn.addEventListener("click", onConfirmClick);

            setValue("confirm");
            vi.advanceTimersByTime(400);

            confirmBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 2 }));
            expect(onConfirmClick).toHaveBeenCalledTimes(1);

            cleanup();
        });
    });

    describe("Keyboard Focus Handoff", () => {
        test("should automatically transfer focus to the newly active button when focus was inside the outgoing slot", () => {
            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            idleBtn.focus();
            expect(document.activeElement).toBe(idleBtn);

            current = "confirm";
            morph.syncValue();

            expect(document.activeElement).toBe(confirmBtn);

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });

        test("should NOT steal focus when focus was outside the morph container", () => {
            const externalInput = document.createElement("input");
            document.body.append(externalInput);
            externalInput.focus();

            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            current = "confirm";
            morph.syncValue();

            expect(document.activeElement).toBe(externalInput);

            externalInput.remove();
            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });
    });

    describe("Continuous Morph Surface Snapshot", () => {
        test("should snapshot resolved background and shadow of outgoing and incoming buttons on state change", () => {
            const surfaces = new Map<Element, { bg: string; shadow: string }>([
                [idleBtn, { bg: "rgb(255 0 0 / 0.1)", shadow: "none" }],
                [confirmBtn, { bg: "rgb(255 0 0)", shadow: "0 1px 2px black" }],
            ]);

            vi.spyOn(window, "getComputedStyle").mockImplementation((element: Element, pseudo?: string | null) => {
                const surface = surfaces.get(element);
                return {
                    backgroundColor: surface?.bg ?? "",
                    boxShadow: surface?.shadow ?? "",
                    content: pseudo === "::after" ? "none" : '""',
                    opacity: "1",
                    getPropertyValue: (name: string) =>
                        name === "corner-shape" ? (element === idleBtn ? "superellipse(1.2)" : "superellipse(1.6)") : "",
                } as unknown as CSSStyleDeclaration;
            });

            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            expect(morph.surfaceFrom).toBeNull();
            expect(morph.surfaceTo).toBeNull();

            current = "confirm";
            morph.syncValue();

            expect(morph.surfaceFrom).toEqual({
                background: "rgb(255 0 0 / 0.1)",
                shadow: "none",
                corner: 1.2,
            });
            expect(morph.surfaceTo).toEqual({
                background: "rgb(255 0 0)",
                shadow: "0 1px 2px black",
                corner: 1.6,
            });

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });

        test("should leave surfaces null when computed styles cannot be resolved", () => {
            vi.spyOn(window, "getComputedStyle").mockImplementation(() => {
                throw new Error("unsupported");
            });

            let current = "idle";
            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            current = "confirm";
            morph.syncValue();

            expect(morph.surfaceFrom).toBeNull();
            expect(morph.surfaceTo).toBeNull();

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });
    });

    describe("Auto-Reset (Timeout, Hover Pause, Outside Click & Escape)", () => {
        test("should automatically reset to defaultValue after resetTimeout and pause while pointer is hovered", () => {
            let current = "idle";
            const reasons: ButtonMorphResetReason[] = [];

            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
                getResetTimeout: () => 3000,
                onReset: (reason) => {
                    reasons.push(reason);
                },
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            // Switch to "confirm"
            current = "confirm";
            morph.syncValue();

            // Advance 2000ms, then hover pointer over root
            vi.advanceTimersByTime(2000);
            rootEl.dispatchEvent(new PointerEvent("pointerenter"));
            expect(morph.isPointerHovered).toBe(true);

            // Even after 5000ms while hovered, it must NOT reset under the user's cursor
            vi.advanceTimersByTime(5000);
            expect(current).toBe("confirm");
            expect(reasons).toEqual([]);

            // Pointer leaves -> countdown restarts for 3000ms
            rootEl.dispatchEvent(new PointerEvent("pointerleave"));
            expect(morph.isPointerHovered).toBe(false);

            vi.advanceTimersByTime(2999);
            expect(current).toBe("confirm");

            vi.advanceTimersByTime(1);
            expect(current).toBe("idle");
            expect(morph.value).toBe("idle");
            expect(morph.direction).toBe("backward");
            expect(reasons).toEqual(["timeout"]);

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });

        test("should reset on outside click when resetOnOutsideClick is enabled and in non-default state", () => {
            let current = "idle";
            const onReset = vi.fn();

            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
                getResetOnOutsideClick: () => true,
                onReset,
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            // In default state, outside click listener should be inactive
            expect(morph.isOutsideClickActive).toBe(false);
            morph.handleOutsideClick();
            expect(onReset).not.toHaveBeenCalled();

            // Switch to confirm state
            current = "confirm";
            morph.syncValue();
            expect(morph.isOutsideClickActive).toBe(true);

            morph.handleOutsideClick();
            expect(current).toBe("idle");
            expect(onReset).toHaveBeenCalledWith("outside-click");
            expect(morph.isOutsideClickActive).toBe(false);

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });

        test("should reset on Escape key when resetOnEscape is enabled and in non-default state", () => {
            let current = "idle";
            const onReset = vi.fn();

            const morph = new ButtonMorphManager({
                getValue: () => current,
                setValue: (next) => {
                    current = next;
                },
                getResetOnEscape: () => true,
                onReset,
            });

            const cleanRoot = morph.attachRoot(rootEl);
            const cleanIdle = morph.attachItem("idle")(idleSlot);
            const cleanConfirm = morph.attachItem("confirm")(confirmSlot);

            // Pressing Escape in default state does nothing
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
            expect(onReset).not.toHaveBeenCalled();

            // Switch to confirm state and press Escape
            current = "confirm";
            morph.syncValue();

            const escEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
            document.dispatchEvent(escEvent);

            expect(escEvent.defaultPrevented).toBe(true);
            expect(current).toBe("idle");
            expect(onReset).toHaveBeenCalledWith("escape");

            cleanIdle?.();
            cleanConfirm?.();
            cleanRoot?.();
        });
    });
});
