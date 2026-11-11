import type { Attachment } from "svelte/attachments";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { popoverTrigger as baseTrigger, type PopoverTriggerOptions } from "./popover.attach";

const activeCleanups: Array<() => void> = [];

/** Tracks every attachment so window level listeners never leak into other tests. */
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
function createPopover(id: string): PopoverStub {
    const el = document.createElement("div") as PopoverStub;
    el.id = id;

    let open = false;
    el.togglePopover = vi.fn(() => true);
    el.hidePopover = vi.fn(() => {
        open = false;
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

function click(node: HTMLElement): MouseEvent {
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    node.dispatchEvent(event);
    return event;
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
        for (const cleanup of activeCleanups) cleanup();
        activeCleanups.length = 0;
        trigger.remove();
        popover.remove();
        vi.useRealTimers();
    });

    describe("Shared anchor wiring", () => {
        test.each([{ mode: "auto" as const }, { mode: "manual" as const }, { mode: "hint" as const }])(
            "sets anchor-name for mode $mode and removes it on cleanup",
            ({ mode }) => {
                const cleanup = popoverTrigger({ target: "pop", mode })(trigger);

                expect(trigger.style.getPropertyValue("anchor-name")).toBe("--anchor-pop");

                if (typeof cleanup === "function") cleanup();
                expect(trigger.style.getPropertyValue("anchor-name")).toBe("");
            }
        );

        test("defaults to auto mode when no mode is given", () => {
            popoverTrigger({ target: "pop" })(trigger);

            expect(trigger.getAttribute("popovertarget")).toBe("pop");
            expect(trigger.hasAttribute("interestfor")).toBe(false);
        });
    });

    describe("Manual mode", () => {
        test("only anchors and never wires attributes or listeners", () => {
            popoverTrigger({ target: "pop", mode: "manual" })(trigger);

            expect(trigger.hasAttribute("popovertarget")).toBe(false);
            expect(trigger.hasAttribute("interestfor")).toBe(false);

            pointerDown(trigger);
            click(trigger);
            expect(popover.togglePopover).not.toHaveBeenCalled();
        });
    });

    describe("Auto mode (toggle)", () => {
        test("sets popovertarget and removes it on cleanup", () => {
            const cleanup = popoverTrigger({ target: "pop" })(trigger);
            expect(trigger.getAttribute("popovertarget")).toBe("pop");

            if (typeof cleanup === "function") cleanup();
            expect(trigger.hasAttribute("popovertarget")).toBe(false);
        });

        test("toggles immediately on primary mouse pointerdown with the trigger as source", () => {
            popoverTrigger({ target: "pop" })(trigger);

            pointerDown(trigger);

            expect(popover.togglePopover).toHaveBeenCalledTimes(1);
            expect(popover.togglePopover).toHaveBeenCalledWith({ source: trigger });
        });

        test("swallows the click that follows a handled pointerdown to avoid a double toggle", () => {
            popoverTrigger({ target: "pop" })(trigger);
            const bubbleListener = vi.fn();
            trigger.addEventListener("click", bubbleListener);

            pointerDown(trigger);
            const first = click(trigger);

            expect(first.defaultPrevented).toBe(true);
            expect(bubbleListener).not.toHaveBeenCalled();

            // The suppression is one-shot: a keyboard click afterwards passes through.
            const second = click(trigger);
            expect(second.defaultPrevented).toBe(false);
            expect(bubbleListener).toHaveBeenCalledTimes(1);
        });

        test("clears suppression when the pointer is released without a click", () => {
            popoverTrigger({ target: "pop" })(trigger);
            const bubbleListener = vi.fn();
            trigger.addEventListener("click", bubbleListener);

            pointerDown(trigger);
            window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
            vi.runAllTimers();

            click(trigger);
            expect(bubbleListener).toHaveBeenCalledTimes(1);
        });

        test.each([{ pointerType: "touch" }, { pointerType: "pen" }])(
            "ignores $pointerType pointerdown so scrolling and native click keep working",
            ({ pointerType }) => {
                popoverTrigger({ target: "pop" })(trigger);

                pointerDown(trigger, { pointerType });
                const event = click(trigger);

                expect(popover.togglePopover).not.toHaveBeenCalled();
                expect(event.defaultPrevented).toBe(false);
            }
        );

        test("ignores non primary mouse buttons", () => {
            popoverTrigger({ target: "pop" })(trigger);

            pointerDown(trigger, { button: 2 });

            expect(popover.togglePopover).not.toHaveBeenCalled();
        });

        test("respects disabled and aria-disabled triggers", () => {
            popoverTrigger({ target: "pop" })(trigger);

            trigger.setAttribute("aria-disabled", "true");
            pointerDown(trigger);
            trigger.removeAttribute("aria-disabled");

            trigger.setAttribute("disabled", "");
            pointerDown(trigger);

            expect(popover.togglePopover).not.toHaveBeenCalled();
        });

        test("does nothing when the target element does not exist", () => {
            popoverTrigger({ target: "missing" })(trigger);

            expect(() => pointerDown(trigger)).not.toThrow();
            expect(click(trigger).defaultPrevented).toBe(false);
        });

        test("triggerOn click leaves activation to the native click path", () => {
            popoverTrigger({ target: "pop", triggerOn: "click" })(trigger);

            pointerDown(trigger);

            expect(popover.togglePopover).not.toHaveBeenCalled();
            expect(trigger.getAttribute("popovertarget")).toBe("pop");
        });

        test("removes all listeners on cleanup", () => {
            const cleanup = popoverTrigger({ target: "pop" })(trigger);
            if (typeof cleanup === "function") cleanup();

            pointerDown(trigger);

            expect(popover.togglePopover).not.toHaveBeenCalled();
        });
    });

    describe("Hint mode", () => {
        test("arms interestfor with the default delay", () => {
            popoverTrigger({ target: "pop", mode: "hint" })(trigger);

            expect(trigger.getAttribute("interestfor")).toBe("pop");
            expect(trigger.style.getPropertyValue("interest-delay")).toBe("400ms 150ms");
            expect(trigger.hasAttribute("popovertarget")).toBe(false);
        });

        test("applies a custom delay", () => {
            popoverTrigger({ target: "pop", mode: "hint", delay: "1s 50ms" })(trigger);

            expect(trigger.style.getPropertyValue("interest-delay")).toBe("1s 50ms");
        });

        test("never toggles on pointerdown", () => {
            popoverTrigger({ target: "pop", mode: "hint" })(trigger);

            pointerDown(trigger);

            expect(popover.togglePopover).not.toHaveBeenCalled();
        });

        test("removes everything on cleanup", () => {
            const cleanup = popoverTrigger({ target: "pop", mode: "hint" })(trigger);
            if (typeof cleanup === "function") cleanup();

            expect(trigger.hasAttribute("interestfor")).toBe(false);
            expect(trigger.style.getPropertyValue("interest-delay")).toBe("");
            expect(trigger.style.getPropertyValue("anchor-name")).toBe("");
        });

        describe("Focus restoration guard", () => {
            test("disarms when focus is not keyboard driven and the pointer is away", () => {
                stubPseudo(trigger, { focusVisible: false, hover: false });
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);

                trigger.dispatchEvent(new FocusEvent("focusin"));

                expect(trigger.hasAttribute("interestfor")).toBe(false);
            });

            test("stays armed for non keyboard focus while the pointer hovers the trigger", () => {
                stubPseudo(trigger, { focusVisible: false, hover: true });
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);

                trigger.dispatchEvent(new FocusEvent("focusin"));

                expect(trigger.getAttribute("interestfor")).toBe("pop");
            });

            test("stays armed for keyboard focus (:focus-visible)", () => {
                stubPseudo(trigger, { focusVisible: true });
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);

                trigger.dispatchEvent(new FocusEvent("focusin"));

                expect(trigger.getAttribute("interestfor")).toBe("pop");
            });

            test("re-arms on pointerenter, pointerleave and focusout", () => {
                stubPseudo(trigger, { focusVisible: false, hover: false });
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);

                for (const type of ["pointerenter", "pointerleave", "focusout"]) {
                    trigger.dispatchEvent(new FocusEvent("focusin"));
                    expect(trigger.hasAttribute("interestfor")).toBe(false);

                    trigger.dispatchEvent(new Event(type));
                    expect(trigger.getAttribute("interestfor")).toBe("pop");
                }
            });

            test("keeps the disarmed state across an attachment re-run", async () => {
                stubPseudo(trigger, { focusVisible: false, hover: false });
                const attach = popoverTrigger({ target: "pop", mode: "hint" });

                const cleanup = attach(trigger);
                trigger.dispatchEvent(new FocusEvent("focusin"));
                if (typeof cleanup === "function") cleanup();

                attach(trigger);
                await Promise.resolve();

                expect(trigger.hasAttribute("interestfor")).toBe(false);
            });

            test("forgets the disarmed state after a real teardown", async () => {
                stubPseudo(trigger, { focusVisible: false, hover: false });
                const attach = popoverTrigger({ target: "pop", mode: "hint" });

                const cleanup = attach(trigger);
                trigger.dispatchEvent(new FocusEvent("focusin"));
                if (typeof cleanup === "function") cleanup();
                await Promise.resolve();

                attach(trigger);

                expect(trigger.getAttribute("interestfor")).toBe("pop");
            });
        });

        describe("Dismissal", () => {
            test("pointerdown hides an open popover and disarms the trigger", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);

                pointerDown(trigger, { pointerType: "touch" });

                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
                expect(trigger.hasAttribute("interestfor")).toBe(false);
            });

            test("pointerdown on a closed popover only disarms", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);

                pointerDown(trigger);

                expect(popover.hidePopover).not.toHaveBeenCalled();
                expect(trigger.hasAttribute("interestfor")).toBe(false);
            });

            test.each([{ key: "Enter" }, { key: " " }])("dismisses on key '$key'", ({ key }) => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);

                trigger.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            });

            test("ignores unrelated keys", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);

                trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));

                expect(popover.hidePopover).not.toHaveBeenCalled();
                expect(trigger.getAttribute("interestfor")).toBe("pop");
            });

            test("dismissOnPress false keeps pointer and key presses from dismissing", () => {
                popoverTrigger({ target: "pop", mode: "hint", dismissOnPress: false })(trigger);
                popover.setOpen(true);

                pointerDown(trigger);
                trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

                expect(popover.hidePopover).not.toHaveBeenCalled();
                expect(trigger.getAttribute("interestfor")).toBe("pop");
            });

            test("scrolling elsewhere dismisses an open popover", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);

                document.body.dispatchEvent(new Event("scroll"));

                expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            });

            test("scrolling inside the popover keeps it open", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);
                const inner = document.createElement("div");
                popover.append(inner);

                inner.dispatchEvent(new Event("scroll"));

                expect(popover.hidePopover).not.toHaveBeenCalled();
            });

            test("scrolling does nothing while the popover is closed", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);

                document.body.dispatchEvent(new Event("scroll"));

                expect(popover.hidePopover).not.toHaveBeenCalled();
                expect(trigger.getAttribute("interestfor")).toBe("pop");
            });

            test("resolves the target lazily when it is rendered after the trigger", () => {
                popoverTrigger({ target: "late", mode: "hint" })(trigger);
                const late = createPopover("late");
                late.setOpen(true);

                pointerDown(trigger);

                expect(late.hidePopover).toHaveBeenCalledTimes(1);
                late.remove();
            });

            test("stops listening after cleanup", () => {
                const cleanup = popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                if (typeof cleanup === "function") cleanup();
                popover.setOpen(true);

                pointerDown(trigger);
                document.body.dispatchEvent(new Event("scroll"));

                expect(popover.hidePopover).not.toHaveBeenCalled();
            });
        });

        describe("Warmup phase", () => {
            test("opens instantly when entering shortly after a dismissal", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);
                pointerDown(trigger);

                vi.advanceTimersByTime(100);
                trigger.dispatchEvent(new Event("pointerenter"));

                expect(trigger.style.getPropertyValue("interest-delay")).toBe("0ms 150ms");
            });

            test("is shared between different triggers", () => {
                const other = document.createElement("button");
                document.body.append(other);
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popoverTrigger({ target: "pop", mode: "hint", delay: "500ms 80ms" })(other);

                popover.setOpen(true);
                pointerDown(trigger);
                other.dispatchEvent(new Event("pointerenter"));

                expect(other.style.getPropertyValue("interest-delay")).toBe("0ms 80ms");
                other.remove();
            });

            test("restores the full delay once the warmup window has passed", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);
                pointerDown(trigger);

                vi.advanceTimersByTime(301);
                trigger.dispatchEvent(new Event("pointerenter"));

                expect(trigger.style.getPropertyValue("interest-delay")).toBe("400ms 150ms");
            });

            test("pointerleave resets the delay and records an open popover as just closed", () => {
                popoverTrigger({ target: "pop", mode: "hint" })(trigger);
                popover.setOpen(true);

                trigger.dispatchEvent(new Event("pointerleave"));
                expect(trigger.style.getPropertyValue("interest-delay")).toBe("400ms 150ms");

                trigger.dispatchEvent(new Event("pointerenter"));
                expect(trigger.style.getPropertyValue("interest-delay")).toBe("0ms 150ms");
            });
        });
    });
});
