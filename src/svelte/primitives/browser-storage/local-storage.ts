import {
    resolveStorageKey,
    type StorageChangeListener,
    type StorageJsonOptions,
    type StorageOptions,
} from "./prefix.ts";
import {
    clearStorageItems,
    deleteStorageItem,
    getNativeStorage,
    hasStorageItem,
    listStorageKeys,
    readStorageItem,
    readStorageJson,
    writeStorageItem,
    writeStorageJson,
} from "./storage-core.ts";

/**
 * Reads a raw string value from `localStorage` (automatically namespaced with the app prefix by default).
 */
export function getLocalStorage(key: string, options?: StorageOptions): string | null {
    return readStorageItem("localStorage", key, options);
}

/**
 * Writes a raw string value to `localStorage` (automatically namespaced with the app prefix by default).
 * Returns `true` if the write succeeded, or `false` in SSR / restricted / quota-exceeded environments.
 */
export function setLocalStorage(key: string, value: string, options?: StorageOptions): boolean {
    return writeStorageItem("localStorage", key, value, options);
}

/**
 * Removes an item from `localStorage` (automatically namespaced with the app prefix by default).
 */
export function removeLocalStorage(key: string, options?: StorageOptions): boolean {
    return deleteStorageItem("localStorage", key, options);
}

/**
 * Checks whether a key exists in `localStorage` (automatically namespaced with the app prefix by default).
 */
export function hasLocalStorage(key: string, options?: StorageOptions): boolean {
    return hasStorageItem("localStorage", key, options);
}

/**
 * Returns all keys stored in `localStorage` for the current application prefix
 * (with the `"<prefix>:"` namespace stripped), or all keys if `{ prefix: false }` is passed.
 */
export function keysLocalStorage(options?: StorageOptions): string[] {
    return listStorageKeys("localStorage", options);
}

/**
 * Clears items from `localStorage`.
 * When a prefix is configured and `options?.prefix !== false`, only keys belonging to the
 * current application (`"<prefix>:*"`) are removed so other local `file://` apps and `"cs-theme"` stay intact.
 */
export function clearLocalStorage(options?: StorageOptions): boolean {
    return clearStorageItems("localStorage", options);
}

/**
 * Reads and parses a JSON value from `localStorage`, returning `fallback` when the key is missing,
 * contains invalid JSON, or fails the optional `options.validate` type guard.
 */
export function getLocalStorageJson<T>(key: string, fallback: T, options?: StorageJsonOptions<T>): T {
    return readStorageJson("localStorage", key, fallback, options);
}

/**
 * Serializes `value` as JSON and writes it to `localStorage`.
 */
export function setLocalStorageJson<T>(key: string, value: T, options?: StorageOptions): boolean {
    return writeStorageJson("localStorage", key, value, options);
}

/**
 * Subscribes to cross-tab / cross-window `storage` events for a specific `localStorage` key
 * (automatically resolving the application prefix unless `{ prefix: false }` is passed).
 *
 * @returns An unsubscribe cleanup function that removes the `window` event listener.
 */
export function onLocalStorageChange(
    key: string,
    listener: StorageChangeListener,
    options?: StorageOptions
): () => void {
    if (typeof window === "undefined") {
        return () => {};
    }

    const handler = (event: StorageEvent): void => {
        const resolvedKey = resolveStorageKey(key, options);
        const isTargetKey = event.key === resolvedKey || event.key === null;
        const nativeLocal = getNativeStorage("localStorage");
        const isTargetStorage = !event.storageArea || event.storageArea === nativeLocal;
        if (!isTargetKey || !isTargetStorage) return;

        listener(event.newValue, event.oldValue, event);
    };

    window.addEventListener("storage", handler);
    return () => {
        window.removeEventListener("storage", handler);
    };
}
