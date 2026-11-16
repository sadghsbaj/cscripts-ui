import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import WorkAppSignature from "./WorkAppSignature.svelte";

const openPopovers = new WeakSet<HTMLElement>();
const stubbedElements = new WeakSet<HTMLElement>();

function ensurePopoverStub(el: HTMLElement): HTMLElement {
    if (stubbedElements.has(el)) return el;
    stubbedElements.add(el);

    const originalMatches = el.matches.bind(el);
    el.matches = ((selector: string) =>
        selector === ":popover-open" ? openPopovers.has(el) : originalMatches(selector)) as typeof el.matches;

    Object.defineProperties(el, {
        showPopover: {
            configurable: true,
            value: () => {
                openPopovers.add(el);
            },
        },
        hidePopover: {
            configurable: true,
            value: () => {
                openPopovers.delete(el);
            },
        },
    });

    return el;
}

describe("WorkAppSignature", () => {
    let container: HTMLDivElement;
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        vi.useFakeTimers();

        const origGetById = document.getElementById.bind(document);
        vi.spyOn(document, "getElementById").mockImplementation((id: string) => {
            const el = origGetById(id);
            return el ? ensurePopoverStub(el) : null;
        });

        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(async () => {
        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;

        await Promise.resolve();
        vi.advanceTimersByTime(500);

        container.remove();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    test("swallows clicks without breaking hover tooltip or keyboard focus", () => {
        const parentClickSpy = vi.fn();
        container.addEventListener("click", parentClickSpy);

        const instance = mount(WorkAppSignature, {
            target: container,
            props: { text: "Entwickelt von Colin Schäfer" },
        });
        instances.push(instance);
        flushSync();

        const button = container.querySelector("button");
        expect(button).not.toBeNull();
        expect(button?.type).toBe("button");
        expect(button?.tabIndex).toBe(0);
        expect(button?.getAttribute("aria-label")).toBe("Entwickelt von Colin Schäfer");

        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        button?.dispatchEvent(clickEvent);

        expect(clickEvent.defaultPrevented).toBe(true);
        expect(parentClickSpy).not.toHaveBeenCalled();

        button?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false, pointerType: "mouse" }));
        vi.advanceTimersByTime(450);

        const tooltipId = button?.getAttribute("aria-describedby");
        const tooltipEl = tooltipId ? document.getElementById(tooltipId) : null;
        expect(tooltipEl).not.toBeNull();
        expect(tooltipEl ? openPopovers.has(tooltipEl) : false).toBe(true);
        expect(tooltipEl?.textContent).toContain("Entwickelt von Colin Schäfer");
    });
});
