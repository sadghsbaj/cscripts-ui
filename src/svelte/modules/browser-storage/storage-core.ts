import { getStoragePrefix, resolveStorageKey, type StorageJsonOptions, type StorageOptions } from "./prefix.ts";

export type StorageKind = "localStorage" | "sessionStorage";

/**
 * Safely retrieves the requested `Storage` instance from `window` without throwing
 * in SSR (`typeof window === "undefined"`) or restricted privacy contexts (`SecurityError`).
 */
export function getNativeStorage(kind: StorageKind): Storage | null {
    try {
        if (typeof window === "undefined") return null;
        return kind === "localStorage" ? window.localStorage : window.sessionStorage;
    } catch {
        return null;
    }
}

export function readStorageItem(kind: StorageKind, key: string, options?: StorageOptions): string | null {
    const storage = getNativeStorage(kind);
    if (!storage) return null;

    const resolvedKey = resolveStorageKey(key, options);
    try {
        return storage.getItem(resolvedKey);
    } catch {
        return null;
    }
}

export function writeStorageItem(kind: StorageKind, key: string, value: string, options?: StorageOptions): boolean {
    const storage = getNativeStorage(kind);
    if (!storage) return false;

    const resolvedKey = resolveStorageKey(key, options);
    try {
        storage.setItem(resolvedKey, value);
        return true;
    } catch {
        return false;
    }
}

export function deleteStorageItem(kind: StorageKind, key: string, options?: StorageOptions): boolean {
    const storage = getNativeStorage(kind);
    if (!storage) return false;

    const resolvedKey = resolveStorageKey(key, options);
    try {
        storage.removeItem(resolvedKey);
        return true;
    } catch {
        return false;
    }
}

export function hasStorageItem(kind: StorageKind, key: string, options?: StorageOptions): boolean {
    return readStorageItem(kind, key, options) !== null;
}

/**
 * Lists keys stored in the target browser storage.
 *
 * When `options?.prefix !== false` and an application prefix is configured, only keys belonging
 * to the current application are returned (with the `"<prefix>:"` namespace stripped).
 */
export function listStorageKeys(kind: StorageKind, options?: StorageOptions): string[] {
    const storage = getNativeStorage(kind);
    if (!storage) return [];

    const usePrefix = options?.prefix ?? true;
    const prefix = getStoragePrefix();
    const namespace = usePrefix && prefix ? `${prefix}:` : "";

    try {
        const result: string[] = [];
        for (let i = 0; i < storage.length; i++) {
            const rawKey = storage.key(i);
            if (rawKey === null) continue;

            if (!namespace) {
                result.push(rawKey);
            } else if (rawKey.startsWith(namespace)) {
                result.push(rawKey.slice(namespace.length));
            }
        }
        return result;
    } catch {
        return [];
    }
}

/**
 * Clears stored items from the target browser storage.
 *
 * Why prefix-scoped clearing is critical for `file://` apps:
 * Calling native `storage.clear()` wipes the entire shared `file://` bucket across all local apps
 * (including global `"cs-theme"` settings). When `options?.prefix !== false` and a prefix is configured,
 * this function removes ONLY the keys matching `"<prefix>:*"`.
 */
export function clearStorageItems(kind: StorageKind, options?: StorageOptions): boolean {
    const storage = getNativeStorage(kind);
    if (!storage) return false;

    const usePrefix = options?.prefix ?? true;
    const prefix = getStoragePrefix();
    const namespace = usePrefix && prefix ? `${prefix}:` : "";

    try {
        if (!namespace) {
            storage.clear();
            return true;
        }

        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
            const rawKey = storage.key(i);
            if (rawKey !== null && rawKey.startsWith(namespace)) {
                keysToRemove.push(rawKey);
            }
        }

        for (const rawKey of keysToRemove) {
            storage.removeItem(rawKey);
        }

        return true;
    } catch {
        return false;
    }
}

export function readStorageJson<T>(kind: StorageKind, key: string, fallback: T, options?: StorageJsonOptions<T>): T {
    const raw = readStorageItem(kind, key, options);
    if (raw === null) return fallback;

    try {
        const parsed: unknown = JSON.parse(raw);
        if (options?.validate && !options.validate(parsed)) {
            return fallback;
        }
        return parsed as T;
    } catch {
        return fallback;
    }
}

export function writeStorageJson<T>(kind: StorageKind, key: string, value: T, options?: StorageOptions): boolean {
    try {
        const serialized = JSON.stringify(value);
        return writeStorageItem(kind, key, serialized, options);
    } catch {
        return false;
    }
}
