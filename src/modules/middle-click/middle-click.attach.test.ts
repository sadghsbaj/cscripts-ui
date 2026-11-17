import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { middleClick } from "./middle-click.attach";

function press(target: Element, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 1, ...init });
    target.dispatchEvent(event);
    return event;
}

function release(target: Element, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1, ...init });
    target.dispatchEvent(event);
    return event;
}

describe("middleClick Svelte 5 Element Attachment", () => {
    let container: HTMLDivElement;
    let child: HTMLSpanElement;
    let outside: HTMLButtonElement;

    beforeEach(() => {
        container = document.createElement("div");
        child = document.createElement("span");
        outside = document.createElement("button");
        container.append(child);
        document.body.append(container, outside);
    });

    afterEach(() => {
        container.remove();
        outside.remove();
    });

    describe("Lifecycle", () => {
        test("sets data-middle-click and removes it plus listeners on cleanup", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            expect("middleClick" in container.dataset).toBe(true);

            cleanup?.();
            expect("middleClick" in container.dataset).toBe(false);

            press(container);
            release(container);
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe("Detection", () => {
        test("fires with target, event and element after press + release", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(child);
            const event = release(child);

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith({ target: child, event, element: container });

            cleanup?.();
        });

        test("ignores primary and secondary buttons", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            for (const button of [0, 2]) {
                press(container, { button });
                release(container, { button });
            }
            container.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("fires once per click and needs a new press for the next one", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(container);
            release(container);
            release(container);
            expect(handler).toHaveBeenCalledTimes(1);

            press(container);
            release(container);
            expect(handler).toHaveBeenCalledTimes(2);
            cleanup?.();
        });

        test("does not fire when the press started outside the element", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(outside);
            release(container);

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("a different button pressed in between cancels the pending click", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(container);
            press(container, { button: 0 });
            release(container);

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("uses the latest enabled state per event", () => {
            const handler = vi.fn();
            let active = false;
            const cleanup = middleClick({ onMiddleClick: handler, enabled: () => active })(container);

            press(container);
            release(container);
            expect(handler).not.toHaveBeenCalled();

            active = true;
            press(container);
            release(container);
            expect(handler).toHaveBeenCalledTimes(1);
            cleanup?.();
        });

        test("does nothing when enabled is false", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler, enabled: false })(container);

            press(container);
            release(container);

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });
    });

    describe("Modifiers", () => {
        test.each(["ctrlKey", "metaKey", "shiftKey", "altKey"] as const)("skips %s clicks by default", (key) => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(container, { [key]: true });
            release(container, { [key]: true });

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("handles modifier clicks with allowModifiers", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler, allowModifiers: true })(container);

            press(container, { ctrlKey: true });
            release(container, { ctrlKey: true });

            expect(handler).toHaveBeenCalledTimes(1);
            cleanup?.();
        });
    });

    describe("Default prevention", () => {
        test("prevents mousedown and auxclick defaults by default", () => {
            const cleanup = middleClick({ onMiddleClick: vi.fn() })(container);

            expect(press(container).defaultPrevented).toBe(true);
            expect(release(container).defaultPrevented).toBe(true);
            cleanup?.();
        });

        test("keeps defaults with preventDefault: false", () => {
            const cleanup = middleClick({ onMiddleClick: vi.fn(), preventDefault: false })(container);

            expect(press(container).defaultPrevented).toBe(false);
            expect(release(container).defaultPrevented).toBe(false);
            cleanup?.();
        });

        test("never prevents defaults of non-middle buttons", () => {
            const cleanup = middleClick({ onMiddleClick: vi.fn() })(container);

            expect(press(container, { button: 0 }).defaultPrevented).toBe(false);
            expect(press(container, { button: 2 }).defaultPrevented).toBe(false);
            cleanup?.();
        });
    });

    describe("Ignore", () => {
        test("selector keeps native behavior for matching descendants", () => {
            const handler = vi.fn();
            const link = document.createElement("a");
            link.href = "#x";
            const inner = document.createElement("b");
            link.append(inner);
            container.append(link);
            const cleanup = middleClick({ onMiddleClick: handler, ignore: "a[href]" })(container);

            expect(press(inner).defaultPrevented).toBe(false);
            expect(release(inner).defaultPrevented).toBe(false);
            expect(handler).not.toHaveBeenCalled();

            press(child);
            release(child);
            expect(handler).toHaveBeenCalledTimes(1);
            cleanup?.();
        });

        test("predicate receives target and event", () => {
            const handler = vi.fn();
            const ignore = vi.fn((target: Element) => target === child);
            const cleanup = middleClick({ onMiddleClick: handler, ignore })(container);

            press(child);
            release(child);
            expect(handler).not.toHaveBeenCalled();
            expect(ignore).toHaveBeenCalledWith(child, expect.any(MouseEvent));

            press(container);
            release(container);
            expect(handler).toHaveBeenCalledTimes(1);
            cleanup?.();
        });
    });

    describe("Edge cases", () => {
        test("ignore selector only matches inside the attached element", () => {
            const handler = vi.fn();
            const wrapper = document.createElement("section");
            wrapper.className = "outer";
            document.body.append(wrapper);
            wrapper.append(container);
            const cleanup = middleClick({ onMiddleClick: handler, ignore: ".outer" })(container);

            press(child);
            release(child);

            expect(handler).toHaveBeenCalledTimes(1);
            cleanup?.();
            wrapper.remove();
        });

        test("works on SVG elements", () => {
            const handler = vi.fn();
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            svg.append(circle);
            document.body.append(svg);
            const cleanup = middleClick<SVGElement>({ onMiddleClick: handler })(svg);

            press(circle);
            release(circle);

            expect(handler).toHaveBeenCalledWith(expect.objectContaining({ target: circle, element: svg }));
            cleanup?.();
            svg.remove();
        });

        test("cleanup between press and release prevents the call", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(container);
            cleanup?.();
            release(container);

            expect(handler).not.toHaveBeenCalled();
        });

        test("disabled at press time never fires, even if enabled at release", () => {
            const handler = vi.fn();
            let active = false;
            const cleanup = middleClick({ onMiddleClick: handler, enabled: () => active })(container);

            press(container);
            active = true;
            release(container);

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("disabled at release time does not fire", () => {
            const handler = vi.fn();
            let active = true;
            const cleanup = middleClick({ onMiddleClick: handler, enabled: () => active })(container);

            press(container);
            active = false;
            release(container);

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("an ignored press followed by a regular release does not fire", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler, ignore: "span" })(container);

            press(child);
            release(container);

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("a modifier held only at release skips the click", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(container);
            release(container, { ctrlKey: true });

            expect(handler).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("a stale press (released outside) is replaced by the next press", () => {
            const handler = vi.fn();
            const cleanup = middleClick({ onMiddleClick: handler })(container);

            press(container);
            press(container);
            release(container);

            expect(handler).toHaveBeenCalledTimes(1);
            cleanup?.();
        });

        test("does not prevent auxclick defaults of other buttons", () => {
            const cleanup = middleClick({ onMiddleClick: vi.fn() })(container);

            expect(release(container, { button: 2 }).defaultPrevented).toBe(false);
            cleanup?.();
        });
    });
});
