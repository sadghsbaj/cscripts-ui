import type { PopoverPlacement } from ".";

type PrimarySide = "top" | "bottom" | "left" | "right";
type Alignment = "start" | "end";

function flipSide(side: PrimarySide): PrimarySide {
    switch (side) {
        case "top": {
            return "bottom";
        }
        case "bottom": {
            return "top";
        }
        case "left": {
            return "right";
        }
        case "right": {
            return "left";
        }
    }
}

function hasAnchorName(el: HTMLElement, anchorName: string): boolean {
    const inline = el.style.getPropertyValue("anchor-name");
    if (
        inline
            .split(",")
            .map((token) => token.trim())
            .includes(anchorName)
    ) {
        return true;
    }

    const computed = getComputedStyle(el).getPropertyValue("anchor-name");
    return computed
        .split(",")
        .map((token) => token.trim())
        .includes(anchorName);
}

export function findAnchorElement(
    popoverEl: HTMLElement,
    id: string,
    source?: Element | null,
): HTMLElement | null {
    const anchorName = `--anchor-${id}`;
    if (source instanceof HTMLElement && hasAnchorName(source, anchorName)) {
        return source;
    }

    const root = popoverEl.getRootNode();
    if (!("querySelectorAll" in root)) return null;

    const parent = root as ParentNode;
    let candidates: NodeListOf<HTMLElement>;
    try {
        candidates = parent.querySelectorAll<HTMLElement>(`[style*="--anchor-${CSS.escape(id)}"]`);
    } catch {
        // happy-dom's SelectorParser rejects escaped quotes inside attribute strings.
        candidates = parent.querySelectorAll<HTMLElement>("[style]");
    }
    for (const candidate of candidates) {
        if (hasAnchorName(candidate, anchorName)) {
            return candidate;
        }
    }

    return null;
}

export function resolvePopoverPlacement(
    placement: PopoverPlacement,
    anchorRect: DOMRectReadOnly,
    popoverRect: DOMRectReadOnly,
): PopoverPlacement {
    if (popoverRect.width === 0 && popoverRect.height === 0) return placement;
    if (
        anchorRect.width === 0 &&
        anchorRect.height === 0 &&
        anchorRect.top === 0 &&
        anchorRect.left === 0
    ) {
        return placement;
    }

    const [rawSide, rawAlign] = placement.split("-") as [PrimarySide, Alignment | undefined];

    // Center-to-center comparison handles 0x0 anchors (e.g. context menus) and small overlaps.
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const popoverCenterX = popoverRect.left + popoverRect.width / 2;
    const popoverCenterY = popoverRect.top + popoverRect.height / 2;

    const primaryFlipped =
        (rawSide === "top" && popoverCenterY > anchorCenterY) ||
        (rawSide === "bottom" && popoverCenterY < anchorCenterY) ||
        (rawSide === "left" && popoverCenterX > anchorCenterX) ||
        (rawSide === "right" && popoverCenterX < anchorCenterX);

    const resolvedSide = primaryFlipped ? flipSide(rawSide) : rawSide;
    if (!rawAlign) return resolvedSide;

    let resolvedAlign: Alignment = rawAlign;
    const tolerance = 1;

    if (resolvedSide === "top" || resolvedSide === "bottom") {
        if (
            rawAlign === "start" &&
            popoverRect.right <= anchorRect.right + tolerance &&
            popoverRect.left < anchorRect.left - tolerance
        ) {
            resolvedAlign = "end";
        } else if (
            rawAlign === "end" &&
            popoverRect.left >= anchorRect.left - tolerance &&
            popoverRect.right > anchorRect.right + tolerance
        ) {
            resolvedAlign = "start";
        }
    } else if (
        rawAlign === "start" &&
        popoverRect.bottom <= anchorRect.bottom + tolerance &&
        popoverRect.top < anchorRect.top - tolerance
    ) {
        resolvedAlign = "end";
    } else if (
        rawAlign === "end" &&
        popoverRect.top >= anchorRect.top - tolerance &&
        popoverRect.bottom > anchorRect.bottom + tolerance
    ) {
        resolvedAlign = "start";
    }

    return `${resolvedSide}-${resolvedAlign}`;
}
