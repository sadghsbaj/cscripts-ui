import type { Attachment } from "svelte/attachments";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { popoverTrigger as baseTrigger, type PopoverTriggerOptions } from "./popover.attach";

const activeCleanups: Array<() => void> = [];

/** Tracks every attachment so window/document level listeners never leak into other tests. */
function popoverTrigger(options: PopoverTriggerOptions): Attachment<HTMLElement> {
    const attachment = baseTrigger(options);
    return (node) => {
        const cleanup = attachment(node);
        if (typeof cleanup === "function") activeCleanups.push(cleanup);
        return cleanup;
    };
}

type PopoverStub = HTMLDivElement & { setOpen: (open: boolean) => void };

/** Overrides `matches` while keeping the real implementation for every other selector. */
function stubMatches(el: HTMLElement, resolve: (selector: string) => boolean | undefined): void {
    const original = el.matches.bind(el);
    el.matches = ((selector: string): boolean => resolve(selector) ?? original(selector)) as typeof el.matches;
}

/** happy-dom lacks the Popover API and `:popover-open`, so both are stubbed on the element. */
function createPopover(id: string, popoverAttr: "auto" | "manual" = "auto"): PopoverStub {
    const el = document.createElement("div") as PopoverStub;
    el.id = id;
    el.setAttribute("popover", popoverAttr);

    let open = false;
    el.showPopover = vi.fn(() => {
        open = true;
    });
    el.hidePopover = vi.fn(() => {
        open = false;
    });
    el.togglePopover = vi.fn((options?: boolean | { source?: HTMLElement; force?: boolean }) => {
        if (typeof options === "boolean") {
            open = options;
        } else if (options && typeof options.force === "boolean") {
            open = options.force;
        } else {
            open = !open;
        }
        return open;
    });
    el.setOpen = (value) => {
        open = value;
    };

    stubMatches(el, (selector) => (selector === ":popover-open" ? open : undefined));

    document.body.append(el);
    return el;
}

/** Stubs pseudo-classes happy-dom cannot evaluate (`:focus-visible`, `:hover`). */
function stubPseudo(node: HTMLElement, state: { focusVisible?: boolean; hover?: boolean }): void {
    const overrides: Record<string, boolean> = {
        ":focus-visible": state.focusVisible ?? false,
        ":hover": state.hover ?? false,
    };
    stubMatches(node, (selector) => overrides[selector]);
}

function pointerDown(node: HTMLElement, init: PointerEventInit = {}): PointerEvent {
    const event = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        button: 0,
        ...init,
    });
    node.dispatchEvent(event);
    return event;
}

function pointerEnter(node: HTMLElement, init: PointerEventInit = {}): PointerEvent {
    const event = new PointerEvent("pointerenter", {
        bubbles: false,
        pointerType: "mouse",
        ...init,
    });
    node.dispatchEvent(event);
    return event;
}

function pointerLeave(node: HTMLElement, init: PointerEventInit = {}): PointerEvent {
    const event = new PointerEvent("pointerleave", {
        bubbles: false,
        pointerType: "mouse",
        ...init,
    });
    node.dispatchEvent(event);
    return event;
}

function click(node: HTMLElement): MouseEvent {
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    node.dispatchEvent(event);
    return event;
}

function dispatchToggle(popoverEl: HTMLElement, newState: "open" | "closed"): void {
    const event = new Event("toggle");
    Object.assign(event, { newState });
    popoverEl.dispatchEvent(event);
}

describe("popoverTrigger Svelte 5 Element Attachment", () => {
    let trigger: HTMLButtonElement;
    let popover: PopoverStub;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        trigger = document.createElement("button");
        document.body.append(trigger);
        popover = createPopover("pop");
    });

    afterEach(() => {
        // Dispatch Escape while any active hover entry is still mounted so module-level warmup resets.
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        for (const cleanup of activeCleanups) cleanup();
        activeCleanups.length = 0;

        vi.advanceTimersByTime(500);

        document.body.replaceChildren();
        vi.useRealTimers();
    });

    describe("Shared anchor wiring & enabled state", () => {
        test.each([
            { triggerOn: "pointerdown" as const },
            { triggerOn: "click" as const },
            { triggerOn: "hover" as const },
            { triggerOn: "manual" as const },
        ])("sets anchor-name for triggerOn=$triggerOn and removes it on cleanup", ({ triggerOn }) => {
            const cleanup = popoverTrigger({ target: "pop", triggerOn })(trigger);

            expect(trigger.style.getPropertyValue("anchor-name")).toBe("--anchor-pop");

            if (typeof cleanup === "function") cleanup();
            expect(trigger.style.getPropertyValue("anchor-name")).toBe("");
        });

        test("defaults to triggerOn 'pointerdown' when omitted", () => {
            popoverTrigger({ target: "pop" })(trigger);

            expect(trigger.getAttribute("popovertarget")).toBe("pop");
            expect(trigger.hasAttribute("interestfor")).toBe(false);

            pointerDown(trigger);
            expect(popover.togglePopover).toHaveBeenCalledTimes(1);
            expect(popover.togglePopover).toHaveBeenCalledWith({ source: trigger });
        });

        test("enabled: false wires nothing and returns a no-op cleanup", () => {
            const cleanup = popoverTrigger({ target: "pop", enabled: false })(trigger);

            expect(trigger.style.getPropertyValue("anchor-name")).toBe("");
            expect(trigger.hasAttribute("popovertarget")).toBe(false);

            pointerDown(trigger);
            expect(popover.togglePopover).not.toHaveBeenCalled();

            expect(() => {
                if (typeof cleanup === "function") cleanup();
            }).not.toThrow();
        });

        test("reactive enabled: () => boolean toggles wiring cleanly across re-runs", () => {
            let active = true;
            const attach = popoverTrigger({ target: "pop", enabled: () => active });

            const cleanup1 = attach(trigger);
            expect(trigger.style.getPropertyValue("anchor-name")).toBe("--anchor-pop");
            expect(trigger.getAttribute("popovertarget")).toBe("pop");

            active = false;
            if (typeof cleanup1 === "function") cleanup1();
            const cleanup2 = attach(trigger);

            expect(trigger.style.getPropertyValue("anchor-name")).toBe("");
            expect(trigger.hasAttribute("popovertarget")).toBe(false);
            pointerDown(trigger);
            expect(popover.togglePopover).not.toHaveBeenCalled();

            active = true;
            if (typeof cleanup2 === "function") cleanup2();
            attach(trigger);

            expect(trigger.style.getPropertyValue("anchor-name")).toBe("--anchor-pop");
            expect(trigger.getAttribute("popovertarget")).toBe("pop");
            pointerDown(trigger);
            expect(popover.togglePopover).toHaveBeenCalledTimes(1);
        });
    });

    describe("Manual mode", () => {
        test("only sets anchor-name and never attaches attributes or listeners", () => {
            popoverTrigger({ target: "pop", triggerOn: "manual" })(trigger);

            expect(trigger.style.getPropertyValue("anchor-name")).toBe("--anchor-pop");
            expect(trigger.hasAttribute("popovertarget")).toBe(false);
            expect(trigger.hasAttribute("interestfor")).toBe(false);

            pointerDown(trigger);
            click(trigger);
            pointerEnter(trigger);
            trigger.dispatchEvent(new FocusEvent("focusin"));
            trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            vi.advanceTimersByTime(500);
            document.body.dispatchEvent(new Event("scroll"));

            expect(popover.togglePopover).not.toHaveBeenCalled();
            expect(popover.showPopover).not.toHaveBeenCalled();
            expect(popover.hidePopover).not.toHaveBeenCalled();
        });
    });

    describe("Pointerdown & Click modes", () => {
        test("sets popovertarget and removes it on cleanup", () => {
            const cleanup = popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);
            expect(trigger.getAttribute("popovertarget")).toBe("pop");

            if (typeof cleanup === "function") cleanup();
            expect(trigger.hasAttribute("popovertarget")).toBe(false);
        });

        test("pointerdown mode toggles immediately on primary mouse pointerdown with { source: trigger }", () => {
            popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);

            pointerDown(trigger);

            expect(popover.togglePopover).toHaveBeenCalledTimes(1);
            expect(popover.togglePopover).toHaveBeenCalledWith({ source: trigger });
        });

        test("pointerdown mode swallows the subsequent click without blocking a later keyboard click", () => {
            popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);
            const bubbleListener = vi.fn();
            trigger.addEventListener("click", bubbleListener);

            pointerDown(trigger);
            const first = click(trigger);

            expect(first.defaultPrevented).toBe(true);
            expect(bubbleListener).not.toHaveBeenCalled();

            // One-shot suppression must not block a subsequent keyboard click.
            const second = click(trigger);
            expect(second.defaultPrevented).toBe(false);
            expect(bubbleListener).toHaveBeenCalledTimes(1);
        });

        test.each([{ eventType: "pointerup" }, { eventType: "pointercancel" }])(
            "resets click suppression on window $eventType when pointer is released outside trigger",
            ({ eventType }) => {
                popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);
                const bubbleListener = vi.fn();
                trigger.addEventListener("click", bubbleListener);

                pointerDown(trigger);
                window.dispatchEvent(new PointerEvent(eventType, { bubbles: true }));
                vi.runAllTimers();

                const nextClick = click(trigger);
                expect(nextClick.defaultPrevented).toBe(false);
                expect(bubbleListener).toHaveBeenCalledTimes(1);
            }
        );

        test.each([{ pointerType: "touch" }, { pointerType: "pen" }])(
            "ignores $pointerType pointerdown so scrolling and native click keep working",
            ({ pointerType }) => {
                popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);

                pointerDown(trigger, { pointerType });
                const event = click(trigger);

                expect(popover.togglePopover).not.toHaveBeenCalled();
                expect(event.defaultPrevented).toBe(false);
            }
        );

        test.each([{ button: 1 }, { button: 2 }])("ignores non-primary mouse button $button", ({ button }) => {
            popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);

            pointerDown(trigger, { button });

            expect(popover.togglePopover).not.toHaveBeenCalled();
        });

        test("ignores disabled, aria-disabled, and inert triggers (including ancestors) in pointerdown mode", () => {
            const wrapper = document.createElement("div");
            document.body.append(wrapper);
            wrapper.append(trigger);

            popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);
            const bubbleListener = vi.fn();
            trigger.addEventListener("click", bubbleListener);

            // Native :disabled
            trigger.setAttribute("disabled", "");
            pointerDown(trigger);
            trigger.removeAttribute("disabled");

            // [aria-disabled="true"] on trigger
            trigger.setAttribute("aria-disabled", "true");
            pointerDown(trigger);
            expect(click(trigger).defaultPrevented).toBe(true);
            trigger.removeAttribute("aria-disabled");

            // [inert] on ancestor
            wrapper.setAttribute("inert", "");
            pointerDown(trigger);
            expect(click(trigger).defaultPrevented).toBe(true);
            wrapper.removeAttribute("inert");

            expect(popover.togglePopover).not.toHaveBeenCalled();
            expect(bubbleListener).not.toHaveBeenCalled();
            wrapper.remove();
        });

        test("does nothing when the target element does not exist", () => {
            popoverTrigger({ target: "missing", triggerOn: "pointerdown" })(trigger);

            expect(() => pointerDown(trigger)).not.toThrow();
            expect(click(trigger).defaultPrevented).toBe(false);
        });

        test("click mode leaves activation to native popovertarget click and blocks aria-disabled / inert", () => {
            popoverTrigger({ target: "pop", triggerOn: "click" })(trigger);
            const bubbleListener = vi.fn();
            trigger.addEventListener("click", bubbleListener);

            expect(trigger.getAttribute("popovertarget")).toBe("pop");

            // pointerdown does not toggle in click mode
            pointerDown(trigger);
            expect(popover.togglePopover).not.toHaveBeenCalled();

            // Enabled click passes through to native popovertarget
            const enabledClick = click(trigger);
            expect(enabledClick.defaultPrevented).toBe(false);
            expect(bubbleListener).toHaveBeenCalledTimes(1);

            // aria-disabled="true" blocks capture click
            trigger.setAttribute("aria-disabled", "true");
            const disabledClick = click(trigger);
            expect(disabledClick.defaultPrevented).toBe(true);
            expect(bubbleListener).toHaveBeenCalledTimes(1);
            trigger.removeAttribute("aria-disabled");

            // [inert] blocks capture click
            trigger.setAttribute("inert", "");
            const inertClick = click(trigger);
            expect(inertClick.defaultPrevented).toBe(true);
            expect(bubbleListener).toHaveBeenCalledTimes(1);
        });

        test("removes all listeners on cleanup", () => {
            const cleanup = popoverTrigger({ target: "pop", triggerOn: "pointerdown" })(trigger);
            if (typeof cleanup === "function") cleanup();

            pointerDown(trigger);
            expect(popover.togglePopover).not.toHaveBeenCalled();
            expect(trigger.hasAttribute("popovertarget")).toBe(false);
        });
    });

    describe("Hover mode", () => {
        describe("Timers & delays", () => {
            test("respects default [400, 150] open and close delays", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                expect(trigger.hasAttribute("popovertarget")).toBe(false);
                expect(trigger.hasAttribute("interestfor")).toBe(false);

                pointerEnter(trigger);
                vi.advanceTimersByTime(399);
                expect(popover.showPopover).not.toHaveBeenCalled();

                vi.advanceTimersByTime(1);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);
                expect(popover.showPopover).toHaveBeenCalledWith({ source: trigger });

                pointerLeave(trigger);
                vi.advanceTimersByTime(149);
                expect(popover.hidePopover).not.toHaveBeenCalled();

                vi.advanceTimersByTime(1);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            });

            test("respects custom [openMs, closeMs] tuples including 0ms delays", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover", delay: [600, 80] })(trigger);

                pointerEnter(trigger);
                vi.advanceTimersByTime(599);
                expect(popover.showPopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(1);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);

                pointerLeave(trigger);
                vi.advanceTimersByTime(79);
                expect(popover.hidePopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(1);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);

                // Wait out 300ms warmup cooldown before testing 0ms cold delay
                vi.advanceTimersByTime(301);

                const triggerZero = document.createElement("button");
                document.body.append(triggerZero);
                const popZero = createPopover("pop-zero", "manual");
                popoverTrigger({ target: "pop-zero", triggerOn: "hover", delay: [0, 0] })(triggerZero);

                pointerEnter(triggerZero);
                vi.advanceTimersByTime(0);
                expect(popZero.showPopover).toHaveBeenCalledTimes(1);

                pointerLeave(triggerZero);
                vi.advanceTimersByTime(0);
                expect(popZero.hidePopover).toHaveBeenCalledTimes(1);

                triggerZero.remove();
                popZero.remove();
            });

            test("falls back to default [400, 150] for negative or non-finite delay values", () => {
                popoverTrigger({
                    target: "pop",
                    triggerOn: "hover",
                    delay: [-10, NaN],
                })(trigger);

                pointerEnter(trigger);
                vi.advanceTimersByTime(399);
                expect(popover.showPopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(1);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);

                pointerLeave(trigger);
                vi.advanceTimersByTime(149);
                expect(popover.hidePopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(1);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            });

            test("cancels pending open if pointerleave occurs before openDelayMs elapses", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                pointerEnter(trigger);
                vi.advanceTimersByTime(200);
                pointerLeave(trigger);
                vi.advanceTimersByTime(400);

                expect(popover.showPopover).not.toHaveBeenCalled();
            });
        });

        describe("Safe pointer bridge", () => {
            test("moving pointer from trigger to open popover keeps it open", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                const inner = document.createElement("span");
                popover.append(inner);

                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);

                // Direct bridge via relatedTarget inside popover
                pointerLeave(trigger, { relatedTarget: inner });
                vi.advanceTimersByTime(300);
                expect(popover.hidePopover).not.toHaveBeenCalled();

                // Even if pointerleave had null relatedTarget, entering popover cancels closeTimer
                pointerLeave(trigger, { relatedTarget: null });
                vi.advanceTimersByTime(100);
                pointerEnter(popover);
                vi.advanceTimersByTime(200);
                expect(popover.hidePopover).not.toHaveBeenCalled();
            });

            test("leaving popover closes after closeDelayMs, but moving back to trigger cancels closeTimer", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                const triggerChild = document.createElement("span");
                trigger.append(triggerChild);

                pointerEnter(trigger);
                vi.advanceTimersByTime(400);

                // Leave popover back to trigger child -> stays open
                pointerLeave(popover, { relatedTarget: triggerChild });
                vi.advanceTimersByTime(200);
                expect(popover.hidePopover).not.toHaveBeenCalled();

                // Leave popover outside -> schedules close, then re-enter trigger before 150ms -> cancels close
                pointerLeave(popover, { relatedTarget: document.body });
                vi.advanceTimersByTime(100);
                pointerEnter(trigger);
                vi.advanceTimersByTime(200);
                expect(popover.hidePopover).not.toHaveBeenCalled();

                // Leave trigger outside -> closes after 150ms
                pointerLeave(trigger, { relatedTarget: document.body });
                vi.advanceTimersByTime(149);
                expect(popover.hidePopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(1);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            });
        });

        describe("Focus-visible hardening", () => {
            test("ignores non-:focus-visible focusin when not hovered and disarms trigger", () => {
                stubPseudo(trigger, { focusVisible: false, hover: false });
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).not.toHaveBeenCalled();

                // Remains disarmed even if :focus-visible becomes true before re-arm
                stubPseudo(trigger, { focusVisible: true, hover: false });
                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).not.toHaveBeenCalled();
            });

            test("does not disarm on non-:focus-visible focusin while :hover is true", () => {
                stubPseudo(trigger, { focusVisible: false, hover: true });
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                trigger.dispatchEvent(new FocusEvent("focusin"));

                // Trigger is still armed when :focus-visible fires later
                stubPseudo(trigger, { focusVisible: true, hover: false });
                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);
            });

            test("opens after openDelayMs when :focus-visible is true", () => {
                stubPseudo(trigger, { focusVisible: true, hover: false });
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(399);
                expect(popover.showPopover).not.toHaveBeenCalled();

                vi.advanceTimersByTime(1);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);
            });

            test("re-arms on pointerenter, pointerleave, and focusout", () => {
                stubPseudo(trigger, { focusVisible: false, hover: false });
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                for (const rearm of [
                    () => pointerEnter(trigger),
                    () => pointerLeave(trigger),
                    () => trigger.dispatchEvent(new FocusEvent("focusout")),
                ]) {
                    stubPseudo(trigger, { focusVisible: false, hover: false });
                    trigger.dispatchEvent(new FocusEvent("focusin")); // disarms

                    rearm();
                    vi.advanceTimersByTime(400);
                    if (popover.matches(":popover-open")) {
                        popover.setOpen(false);
                    }
                    (popover.showPopover as ReturnType<typeof vi.fn>).mockClear();

                    stubPseudo(trigger, { focusVisible: true, hover: false });
                    trigger.dispatchEvent(new FocusEvent("focusin"));
                    vi.advanceTimersByTime(400);
                    expect(popover.showPopover).toHaveBeenCalledTimes(1);

                    popover.setOpen(false);
                    (popover.showPopover as ReturnType<typeof vi.fn>).mockClear();
                }
            });

            test("preserves disarmed state across reactive attachment re-runs and forgets on real teardown", async () => {
                stubPseudo(trigger, { focusVisible: false, hover: false });
                const attach = popoverTrigger({ target: "pop", triggerOn: "hover" });

                // Disarm, then immediately re-run attachment (simulates Svelte 5 reactive update)
                const cleanup1 = attach(trigger);
                trigger.dispatchEvent(new FocusEvent("focusin"));
                if (typeof cleanup1 === "function") cleanup1();

                const cleanup2 = attach(trigger);
                await Promise.resolve();

                stubPseudo(trigger, { focusVisible: true, hover: false });
                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).not.toHaveBeenCalled();

                // Real teardown (cleanup without re-attaching before microtask) forgets disarmed state
                if (typeof cleanup2 === "function") cleanup2();
                await Promise.resolve();

                attach(trigger);
                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);
            });

            test("focusout keeps open when moving focus into popover and closes otherwise", () => {
                stubPseudo(trigger, { focusVisible: true, hover: false });
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                const innerBtn = document.createElement("button");
                popover.append(innerBtn);

                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);

                // Focus moves from trigger to inner button -> stays open
                trigger.dispatchEvent(new FocusEvent("focusout", { relatedTarget: innerBtn }));
                vi.advanceTimersByTime(200);
                expect(popover.hidePopover).not.toHaveBeenCalled();

                // Focus leaves popover to outside -> closes after 150ms
                popover.dispatchEvent(new FocusEvent("focusout", { relatedTarget: document.body }));
                vi.advanceTimersByTime(150);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            });
        });

        describe("Touch & disabled guards", () => {
            test("ignores touch pointerenter", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                pointerEnter(trigger, { pointerType: "touch" });
                vi.advanceTimersByTime(500);

                expect(popover.showPopover).not.toHaveBeenCalled();
            });

            test("ignores pointerenter and focusin on disabled, aria-disabled, and inert triggers", () => {
                stubPseudo(trigger, { focusVisible: true, hover: false });
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                for (const attr of ["disabled", "aria-disabled", "inert"] as const) {
                    trigger.setAttribute(attr, attr === "aria-disabled" ? "true" : "");
                    pointerEnter(trigger);
                    trigger.dispatchEvent(new FocusEvent("focusin"));
                    vi.advanceTimersByTime(500);
                    trigger.removeAttribute(attr);
                }

                expect(popover.showPopover).not.toHaveBeenCalled();
            });
        });

        describe("Dismissal", () => {
            test("dismissOnPress: true (default) hides open popover and disarms on pointerdown and Enter/Space", () => {
                stubPseudo(trigger, { focusVisible: true, hover: false });
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);

                // Pointerdown dismissal
                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                expect(popover.matches(":popover-open")).toBe(true);

                pointerDown(trigger);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);

                // Trigger is disarmed until next re-arm
                trigger.dispatchEvent(new FocusEvent("focusin"));
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);

                // Re-arm and open, then dismiss with Enter and Space
                for (const key of ["Enter", " "]) {
                    pointerEnter(trigger);
                    vi.advanceTimersByTime(400);
                    expect(popover.matches(":popover-open")).toBe(true);

                    trigger.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
                    expect(popover.matches(":popover-open")).toBe(false);
                }
            });

            test("ignores unrelated keys", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                pointerEnter(trigger);
                vi.advanceTimersByTime(400);

                trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
                expect(popover.hidePopover).not.toHaveBeenCalled();
            });

            test("dismissOnPress: false keeps open on pointerdown and Enter/Space", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover", dismissOnPress: false })(trigger);
                pointerEnter(trigger);
                vi.advanceTimersByTime(400);

                pointerDown(trigger);
                trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                trigger.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

                expect(popover.hidePopover).not.toHaveBeenCalled();
            });

            test("Escape key on document dismisses open hover popover without stopping propagation", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                pointerEnter(trigger);
                vi.advanceTimersByTime(400);

                const siblingListener = vi.fn();
                document.body.addEventListener("keydown", siblingListener);

                const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
                const stopPropSpy = vi.spyOn(esc, "stopPropagation");
                const stopImmSpy = vi.spyOn(esc, "stopImmediatePropagation");
                document.body.dispatchEvent(esc);

                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
                expect(stopPropSpy).not.toHaveBeenCalled();
                expect(stopImmSpy).not.toHaveBeenCalled();
                expect(siblingListener).toHaveBeenCalledTimes(1);

                document.body.removeEventListener("keydown", siblingListener);
            });

            test("window scroll dismisses open hover popover unless scrolling inside the popover", () => {
                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                const inner = document.createElement("div");
                popover.append(inner);

                pointerEnter(trigger);
                vi.advanceTimersByTime(400);

                // Scrolling inside the popover keeps it open
                inner.dispatchEvent(new Event("scroll", { bubbles: false }));
                expect(popover.hidePopover).not.toHaveBeenCalled();

                // Scrolling outside dismisses it
                document.body.dispatchEvent(new Event("scroll", { bubbles: false }));
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            });

            test("unmounting / cleaning up an active hover trigger closes its open popover and resets warmup", () => {
                const trigger2 = document.createElement("button");
                document.body.append(trigger2);
                const popover2 = createPopover("pop2", "manual");
                popoverTrigger({ target: "pop2", triggerOn: "hover" })(trigger2);

                const cleanup = popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                expect(popover.matches(":popover-open")).toBe(true);

                if (typeof cleanup === "function") cleanup();

                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
                expect(popover.matches(":popover-open")).toBe(false);

                // Warmup must be cleared so the next hover trigger opens cold (not at 0ms)
                pointerEnter(trigger2);
                expect(popover2.showPopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(400);
                expect(popover2.showPopover).toHaveBeenCalledTimes(1);
                expect("warm" in popover2.dataset).toBe(false);
            });

            test("reactive enabled toggling to false while open closes the hover popover and clears warmup", () => {
                const trigger2 = document.createElement("button");
                document.body.append(trigger2);
                const popover2 = createPopover("pop2", "manual");
                popoverTrigger({ target: "pop2", triggerOn: "hover" })(trigger2);

                let enabled = true;
                const attach = popoverTrigger({ target: "pop", triggerOn: "hover", enabled: () => enabled });
                const cleanup = attach(trigger);

                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                expect(popover.matches(":popover-open")).toBe(true);

                enabled = false;
                if (typeof cleanup === "function") cleanup();
                attach(trigger);

                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
                expect(popover.matches(":popover-open")).toBe(false);
                expect(trigger.style.getPropertyValue("anchor-name")).toBe("");

                pointerEnter(trigger2);
                expect(popover2.showPopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(400);
                expect(popover2.showPopover).toHaveBeenCalledTimes(1);
                expect("warm" in popover2.dataset).toBe(false);
            });

            test("ignores target elements without a popover attribute", () => {
                const nonPopover = document.createElement("div");
                nonPopover.id = "not-a-popover";
                nonPopover.showPopover = vi.fn(() => {
                    throw new DOMException("Not supported", "NotSupportedError");
                });
                nonPopover.togglePopover = vi.fn(() => {
                    throw new DOMException("Not supported", "NotSupportedError");
                });
                document.body.append(nonPopover);

                popoverTrigger({ target: "not-a-popover" })(trigger);
                expect(() => pointerDown(trigger)).not.toThrow();
                expect(nonPopover.togglePopover).not.toHaveBeenCalled();

                const hoverTrigger = document.createElement("button");
                document.body.append(hoverTrigger);
                popoverTrigger({ target: "not-a-popover", triggerOn: "hover" })(hoverTrigger);
                expect(() => {
                    pointerEnter(hoverTrigger);
                    vi.advanceTimersByTime(400);
                }).not.toThrow();
                expect(nonPopover.showPopover).not.toHaveBeenCalled();
            });

            test("resolves late-mounted target lazily at interaction time", () => {
                popoverTrigger({ target: "late", triggerOn: "hover" })(trigger);
                const late = createPopover("late", "manual");

                pointerEnter(trigger);
                vi.advanceTimersByTime(400);

                expect(late.showPopover).toHaveBeenCalledTimes(1);
                late.remove();
            });
        });

        describe("Warmup & cross-trigger coordination", () => {
            test("cold open does not set data-warm; moving to a second trigger while warm opens at 0ms with data-warm and closes first with data-instant", () => {
                const trigger2 = document.createElement("button");
                document.body.append(trigger2);
                const popover2 = createPopover("pop2", "manual");

                // Also have an open popover="auto" popover that must NOT be closed by hover coordination
                const autoTrigger = document.createElement("button");
                document.body.append(autoTrigger);
                const autoPopover = createPopover("auto-pop", "auto");
                popoverTrigger({ target: "auto-pop", triggerOn: "pointerdown" })(autoTrigger);
                pointerDown(autoTrigger);
                expect(autoPopover.matches(":popover-open")).toBe(true);

                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                popoverTrigger({ target: "pop2", triggerOn: "hover" })(trigger2);

                // Cold open of trigger 1
                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);
                expect("warm" in popover.dataset).toBe(false);

                // Move to trigger 2 while warm -> opens immediately at 0ms with data-warm=""
                pointerLeave(trigger);
                pointerEnter(trigger2);

                expect(popover2.showPopover).toHaveBeenCalledTimes(1);
                expect(popover2.dataset.warm).toBe("");
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
                expect(popover.dataset.instant).toBe("");
                expect(autoPopover.hidePopover).not.toHaveBeenCalled();
                expect(autoPopover.matches(":popover-open")).toBe(true);

                // 0ms cleanup timer removes data-instant on the replaced popover; toggle closed cleans up data-warm on active popover2
                vi.advanceTimersByTime(0);
                expect("instant" in popover.dataset).toBe(false);

                dispatchToggle(popover2, "closed");
                expect("warm" in popover2.dataset).toBe(false);

                trigger2.remove();
                popover2.remove();
                autoTrigger.remove();
                autoPopover.remove();
            });

            test("normal close starts 300ms cooldown; after 301ms the next open is cold again", () => {
                const trigger2 = document.createElement("button");
                document.body.append(trigger2);
                const popover2 = createPopover("pop2", "manual");

                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                popoverTrigger({ target: "pop2", triggerOn: "hover" })(trigger2);

                // Open 1 cold, then leave and let closeTimer (150ms) close it
                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                pointerLeave(trigger);
                vi.advanceTimersByTime(150);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);

                // At 299ms into cooldown, warmup is still active
                vi.advanceTimersByTime(299);
                pointerEnter(trigger2);
                expect(popover2.showPopover).toHaveBeenCalledTimes(1);
                expect(popover2.dataset.warm).toBe("");

                // Close 2 normally and wait 301ms -> warmup expires
                pointerLeave(trigger2);
                vi.advanceTimersByTime(150);
                vi.advanceTimersByTime(301);

                // Next open is cold (requires 400ms and has no data-warm)
                pointerEnter(trigger);
                expect(popover.showPopover).toHaveBeenCalledTimes(1);
                vi.advanceTimersByTime(400);
                expect(popover.showPopover).toHaveBeenCalledTimes(2);
                expect("warm" in popover.dataset).toBe(false);

                trigger2.remove();
                popover2.remove();
            });

            test.each([
                {
                    name: "dismissOnPress",
                    dismiss: (t: HTMLElement) => pointerDown(t),
                },
                {
                    name: "Escape",
                    dismiss: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
                },
                {
                    name: "scroll",
                    dismiss: () => document.body.dispatchEvent(new Event("scroll")),
                },
            ])("explicit dismissal via $name resets warmup immediately", ({ dismiss }) => {
                const trigger2 = document.createElement("button");
                document.body.append(trigger2);
                const popover2 = createPopover("pop2", "manual");

                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                popoverTrigger({ target: "pop2", triggerOn: "hover" })(trigger2);

                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                expect(popover.matches(":popover-open")).toBe(true);

                dismiss(trigger);
                expect(popover.hidePopover).toHaveBeenCalledTimes(1);

                // Immediate hover on trigger2 must be cold (not 0ms, no data-warm)
                pointerEnter(trigger2);
                expect(popover2.showPopover).not.toHaveBeenCalled();
                vi.advanceTimersByTime(400);
                expect(popover2.showPopover).toHaveBeenCalledTimes(1);
                expect("warm" in popover2.dataset).toBe(false);

                trigger2.remove();
                popover2.remove();
            });

            test("cleans up data-instant after 0ms fallback if no toggle event fires", () => {
                const trigger2 = document.createElement("button");
                document.body.append(trigger2);
                const popover2 = createPopover("pop2", "manual");

                popoverTrigger({ target: "pop", triggerOn: "hover" })(trigger);
                popoverTrigger({ target: "pop2", triggerOn: "hover" })(trigger2);

                pointerEnter(trigger);
                vi.advanceTimersByTime(400);
                pointerLeave(trigger);
                pointerEnter(trigger2);

                expect(popover.dataset.instant).toBe("");
                vi.advanceTimersByTime(0);
                expect("instant" in popover.dataset).toBe(false);

                trigger2.remove();
                popover2.remove();
            });
        });
    });
});
