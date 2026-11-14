/**
 * Resolves a value or zero-argument getter function to its underlying value.
 */
export function resolveGetter<T>(value: T | (() => T)): T {
    return typeof value === "function" ? (value as () => T)() : value;
}
