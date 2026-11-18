export function extractListboxItemLabel<T extends string = string>(
    explicitLabel: string | undefined,
    textElement: HTMLElement | null,
    contentElement: HTMLDivElement | null,
    descriptionElement: HTMLElement | null,
    fallbackValue: T
): string {
    if (explicitLabel !== undefined) {
        return explicitLabel;
    }
    if (textElement) {
        const text = textElement.textContent?.trim();
        if (text) return text;
    }
    if (contentElement) {
        if (!descriptionElement) {
            const text = contentElement.textContent?.trim();
            if (text) return text;
        } else {
            const parts: string[] = [];
            for (const child of contentElement.childNodes) {
                if (
                    child === descriptionElement ||
                    (child instanceof Element && child.contains(descriptionElement))
                ) {
                    continue;
                }
                const part = child.textContent?.trim();
                if (part) parts.push(part);
            }
            const joined = parts.join(" ").trim();
            if (joined) return joined;
        }
    }
    return fallbackValue;
}

export function sortListboxItemsByDomOrder<T extends { element: HTMLElement | null }>(items: T[]): T[] {
    return items.toSorted((a, b) => {
        if (!a.element || !b.element || a.element === b.element) return 0;
        const position = a.element.compareDocumentPosition(b.element);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
    });
}
