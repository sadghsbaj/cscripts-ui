/**
 * Immutably moves an item within an array from `fromIndex` to `toIndex`.
 */
export function arrayMove<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
    const length = items.length;
    if (length === 0 || fromIndex < 0 || fromIndex >= length) {
        return [...items];
    }

    const clampedTo = Math.max(0, Math.min(toIndex, length - 1));
    if (fromIndex === clampedTo) {
        return [...items];
    }

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    if (moved === undefined && !(fromIndex in items)) {
        return next;
    }

    next.splice(clampedTo, 0, moved as T);
    return next;
}

/**
 * Immutably transfers an item from `source[fromIndex]` into `target` at `toIndex`.
 */
export function arrayTransfer<T>(
    source: readonly T[],
    target: readonly T[],
    fromIndex: number,
    toIndex: number,
): { source: T[]; target: T[] } {
    if (fromIndex < 0 || fromIndex >= source.length) {
        return { source: [...source], target: [...target] };
    }

    const nextSource = [...source];
    const nextTarget = [...target];
    const [moved] = nextSource.splice(fromIndex, 1);
    const clampedTo = Math.max(0, Math.min(toIndex, nextTarget.length));

    nextTarget.splice(clampedTo, 0, moved as T);
    return { source: nextSource, target: nextTarget };
}
