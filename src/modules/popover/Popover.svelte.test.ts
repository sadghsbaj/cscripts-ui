import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, test, vi } from "vitest";

import Popover from "./Popover.svelte";

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
    } as DOMRect;
}

function makeToggleEvent(type: "beforetoggle" | "toggle", newState: "open" | "closed", source: Element): Event {
    const event = new Event(type);
    Object.defineProperties(event, {
        newState: { value: newState },
        oldState: { value: newState === "open" ? "closed" : "open" },
        source: { value: source },
    });
    return event;
}

function makeTransitionEvent(type: "transitionend" | "transitioncancel"): Event {
    return new Event(type, { bubbles: true });
}

describe("Popover.svelte", () => {
    const mounted: Array<Record<string, unknown>> = [];

    afterEach(() => {
        for (const instance of mounted) {
            void unmount(instance);
        }
        mounted.length = 0;
        document.body.replaceChildren();
        vi.restoreAllMocks();
    });

    function setupPopover(props: Record<string, unknown> = {}): {
        anchor: HTMLButtonElement;
        popoverEl: HTMLDivElement;
        setOpenState: (open: boolean) => void;
    } {
        const anchor = document.createElement("button");
        anchor.style.setProperty("anchor-name", "--anchor-pop-test");
        document.body.append(anchor);

        const target = document.createElement("div");
        document.body.append(target);

        const instance = mount(Popover, {
            target,
            props: {
                id: "pop-test",
                placement: "bottom",
                width: "content",
                ...props,
            },
        });
        mounted.push(instance);
        flushSync();

        const popoverEl = target.querySelector<HTMLDivElement>(".cs-popover");
        if (!popoverEl) throw new Error("Expected .cs-popover element");

        let isOpen = false;
        const originalMatches = popoverEl.matches.bind(popoverEl);
        popoverEl.matches = ((selector: string) =>
            selector === ":popover-open" ? isOpen : originalMatches(selector)) as typeof popoverEl.matches;

        return {
            anchor,
            popoverEl,
            setOpenState: (open: boolean) => {
                isOpen = open;
            },
        };
    }

    test("animate={false} omits data-animate, data-ready, and data-resolved-placement", () => {
        const { anchor, popoverEl, setOpenState } = setupPopover({ animate: false });

        vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(makeRect(200, 200, 100, 40));
        vi.spyOn(popoverEl, "getBoundingClientRect").mockReturnValue(makeRect(170, 248, 160, 80));

        expect("animate" in popoverEl.dataset).toBe(false);
        expect("ready" in popoverEl.dataset).toBe(false);
        expect("resolvedPlacement" in popoverEl.dataset).toBe(false);

        popoverEl.dispatchEvent(makeToggleEvent("beforetoggle", "open", anchor));
        setOpenState(true);
        popoverEl.dispatchEvent(makeToggleEvent("toggle", "open", anchor));
        flushSync();

        expect("animate" in popoverEl.dataset).toBe(false);
        expect("ready" in popoverEl.dataset).toBe(false);
        expect("resolvedPlacement" in popoverEl.dataset).toBe(false);

        popoverEl.dispatchEvent(makeToggleEvent("beforetoggle", "closed", anchor));
        setOpenState(false);
        popoverEl.dispatchEvent(makeToggleEvent("toggle", "closed", anchor));
        flushSync();

        expect("ready" in popoverEl.dataset).toBe(false);
        expect("resolvedPlacement" in popoverEl.dataset).toBe(false);
    });

    test("consumer ontoggle and onbeforetoggle props fire alongside internal listeners", () => {
        const events: string[] = [];
        const { anchor, popoverEl, setOpenState } = setupPopover({
            onbeforetoggle: (event: ToggleEvent) => {
                events.push(`before:${event.newState}`);
            },
            ontoggle: (event: ToggleEvent) => {
                events.push(`toggle:${event.newState}`);
            },
        });

        vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(makeRect(200, 200, 100, 40));
        // Positioned above anchor -> flipped to "top"
        vi.spyOn(popoverEl, "getBoundingClientRect").mockReturnValue(makeRect(170, 112, 160, 80));

        popoverEl.dispatchEvent(makeToggleEvent("beforetoggle", "open", anchor));
        setOpenState(true);
        popoverEl.dispatchEvent(makeToggleEvent("toggle", "open", anchor));
        flushSync();

        expect(events).toEqual(["before:open", "toggle:open"]);
        expect(popoverEl.dataset.resolvedPlacement).toBe("top");
        expect("ready" in popoverEl.dataset).toBe(true);

        popoverEl.dispatchEvent(makeToggleEvent("beforetoggle", "closed", anchor));
        setOpenState(false);
        popoverEl.dispatchEvent(makeToggleEvent("toggle", "closed", anchor));
        flushSync();

        expect(events).toEqual(["before:open", "toggle:open", "before:closed", "toggle:closed"]);
        expect("ready" in popoverEl.dataset).toBe(false);
        expect(popoverEl.dataset.resolvedPlacement).toBe("top");

        popoverEl.dispatchEvent(makeTransitionEvent("transitionend"));
        flushSync();
        expect("resolvedPlacement" in popoverEl.dataset).toBe(false);
    });

    test("data-warm and data-instant resolve placement on open and clear immediately on close", () => {
        for (const attr of ["data-warm", "data-instant"] as const) {
            const { anchor, popoverEl, setOpenState } = setupPopover({ [attr]: "" });

            vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(makeRect(200, 200, 100, 40));
            vi.spyOn(popoverEl, "getBoundingClientRect").mockReturnValue(makeRect(170, 248, 160, 80));

            popoverEl.dispatchEvent(makeToggleEvent("beforetoggle", "open", anchor));
            setOpenState(true);
            popoverEl.dispatchEvent(makeToggleEvent("toggle", "open", anchor));
            flushSync();

            expect(popoverEl.dataset.resolvedPlacement).toBe("bottom");

            popoverEl.dispatchEvent(makeToggleEvent("beforetoggle", "closed", anchor));
            setOpenState(false);
            popoverEl.dispatchEvent(makeToggleEvent("toggle", "closed", anchor));
            flushSync();

            expect("resolvedPlacement" in popoverEl.dataset).toBe(false);
            expect("ready" in popoverEl.dataset).toBe(false);
        }
    });
});
