import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createPointerDragRelease } from "./pointer-drag-release.ts";

function createPointerEvent(
    type: "pointerup" | "pointercancel",
    init: PointerEventInit & { target?: EventTarget } = {}
): PointerEvent {
    const { target, ...pointerInit } = init;
    const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        button: 0,
        clientX: 0,
        clientY: 0,
        ...pointerInit,
    });
    if (target) {
        Object.defineProperty(event, "target", { value: target, configurable: true });
    }
    return event;
}

describe("createPointerDragRelease", () => {
    let container: HTMLDivElement;
    let ignoredElement: HTMLDivElement;
    let ignoredChild: HTMLSpanElement;
    let outsideElement: HTMLDivElement;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        container = document.createElement("div");
        ignoredElement = document.createElement("div");
        ignoredChild = document.createElement("span");
        ignoredElement.append(ignoredChild);
        outsideElement = document.createElement("div");
        container.append(ignoredElement, outsideElement);
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.useRealTimers();
    });

    test("returns false before beginPointerOpen and after clearPointerOpen", () => {
        const drag = createPointerDragRelease(() => ignoredElement);
        const event = createPointerEvent("pointerup", { clientX: 50, clientY: 50, target: outsideElement });

        expect(drag.shouldCommitPointerRelease(event)).toBe(false);

        drag.beginPointerOpen(0, 0);
        expect(drag.shouldCommitPointerRelease(event)).toBe(true);

        drag.clearPointerOpen();
        expect(drag.shouldCommitPointerRelease(event)).toBe(false);
    });

    test("commits when drag distance >= 4px or hold duration >= 180ms, and rejects short quick releases", () => {
        const drag = createPointerDragRelease(() => ignoredElement);

        drag.beginPointerOpen(10, 20);
        vi.advanceTimersByTime(179);
        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 13, clientY: 20, target: outsideElement })
            )
        ).toBe(false);

        // Distance = hypot(3, 3) ~= 4.24 >= 4
        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 13, clientY: 23, target: outsideElement })
            )
        ).toBe(true);

        // Hold duration = 180ms with 0px movement
        vi.advanceTimersByTime(1);
        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 10, clientY: 20, target: outsideElement })
            )
        ).toBe(true);
    });

    test("guards non-mouse pointerType, non-primary button, and ignored element targets", () => {
        const drag = createPointerDragRelease(() => ignoredElement);
        drag.beginPointerOpen(0, 0);
        vi.advanceTimersByTime(200);

        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", {
                    pointerType: "touch",
                    clientX: 50,
                    clientY: 50,
                    target: outsideElement,
                })
            )
        ).toBe(false);

        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { button: 2, clientX: 50, clientY: 50, target: outsideElement })
            )
        ).toBe(false);

        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 50, clientY: 50, target: ignoredElement })
            )
        ).toBe(false);

        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 50, clientY: 50, target: ignoredChild })
            )
        ).toBe(false);

        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 50, clientY: 50, target: outsideElement })
            )
        ).toBe(true);
    });

    test("clears active drag state on window pointerup and pointercancel", () => {
        const drag = createPointerDragRelease(() => ignoredElement);

        drag.beginPointerOpen(0, 0);
        vi.advanceTimersByTime(200);
        window.dispatchEvent(createPointerEvent("pointerup", { clientX: 50, clientY: 50 }));
        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 50, clientY: 50, target: outsideElement })
            )
        ).toBe(false);

        drag.beginPointerOpen(0, 0);
        vi.advanceTimersByTime(200);
        window.dispatchEvent(createPointerEvent("pointercancel"));
        expect(
            drag.shouldCommitPointerRelease(
                createPointerEvent("pointerup", { clientX: 50, clientY: 50, target: outsideElement })
            )
        ).toBe(false);
    });
});
