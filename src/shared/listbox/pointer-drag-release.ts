const DRAG_DISTANCE_THRESHOLD_PX = 4;
const DRAG_HOLD_THRESHOLD_MS = 180;

export interface PointerDragRelease {
    beginPointerOpen: (clientX: number, clientY: number) => void;
    shouldCommitPointerRelease: (event: PointerEvent) => boolean;
    clearPointerOpen: () => void;
}

export function createPointerDragRelease(getIgnoredElement: () => HTMLElement | null): PointerDragRelease {
    let pointerDragActive = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastPointerOpenAt = 0;

    function handleWindowPointerEnd(): void {
        clearPointerOpen();
    }

    function clearPointerOpen(): void {
        pointerDragActive = false;
        if (typeof window !== "undefined") {
            window.removeEventListener("pointerup", handleWindowPointerEnd);
            window.removeEventListener("pointercancel", handleWindowPointerEnd);
        }
    }

    function beginPointerOpen(clientX: number, clientY: number): void {
        clearPointerOpen();
        pointerDragActive = true;
        pointerStartX = clientX;
        pointerStartY = clientY;
        lastPointerOpenAt = Date.now();

        if (typeof window !== "undefined") {
            window.addEventListener("pointerup", handleWindowPointerEnd, { once: true });
            window.addEventListener("pointercancel", handleWindowPointerEnd, { once: true });
        }
    }

    function shouldCommitPointerRelease(event: PointerEvent): boolean {
        if (!pointerDragActive) return false;
        if (event.pointerType !== "mouse" || event.button !== 0) return false;
        const ignoredElement = getIgnoredElement();
        if (event.target instanceof Node && ignoredElement?.contains(event.target)) return false;

        const distance = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
        const elapsed = Date.now() - lastPointerOpenAt;
        return distance >= DRAG_DISTANCE_THRESHOLD_PX || elapsed >= DRAG_HOLD_THRESHOLD_MS;
    }

    return {
        beginPointerOpen,
        shouldCommitPointerRelease,
        clearPointerOpen,
    };
}
