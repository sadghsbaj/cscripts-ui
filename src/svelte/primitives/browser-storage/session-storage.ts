import type { StorageJsonOptions, StorageOptions } from "./prefix.ts";
import {
    clearStorageItems,
    deleteStorageItem,
    hasStorageItem,
    listStorageKeys,
    readStorageItem,
    readStorageJson,
    writeStorageItem,
    writeStorageJson,
} from "./storage-core.ts";

/**
 * Reads a raw string value from `sessionStorage` (automatically namespaced with the app prefix by default).
 */
export function getSessionStorage(key: string, options?: StorageOptions): string | null {
    return readStorageItem("sessionStorage", key, options);
}

/**
 * Writes a raw string value to `sessionStorage` (automatically namespaced with the app prefix by default).
 * Returns `true` if the write succeeded, or `false` in SSR / restricted / quota-exceeded environments.
 */
export function setSessionStorage(key: string, value: string, options?: StorageOptions): boolean {
    return writeStorageItem("sessionStorage", key, value, options);
}

/**
 * Removes an item from `sessionStorage` (automatically namespaced with the app prefix by default).
 */
export function removeSessionStorage(key: string, options?: StorageOptions): boolean {
    return deleteStorageItem("sessionStorage", key, options);
}

/**
 * Checks whether a key exists in `sessionStorage` (automatically namespaced with the app prefix by default).
 */
export function hasSessionStorage(key: string, options?: StorageOptions): boolean {
    return hasStorageItem("sessionStorage", key, options);
}

/**
 * Returns all keys stored in `sessionStorage` for the current application prefix
 * (with the `"<prefix>:"` namespace stripped), or all keys if `{ prefix: false }` is passed.
 */
export function keysSessionStorage(options?: StorageOptions): string[] {
    return listStorageKeys("sessionStorage", options);
}

/**
 * Clears items from `sessionStorage`.
 * When a prefix is configured and `options?.prefix !== false`, only keys belonging to the
 * current application (`"<prefix>:*"`) are removed.
 */
export function clearSessionStorage(options?: StorageOptions): boolean {
    return clearStorageItems("sessionStorage", options);
}

/**
 * Reads and parses a JSON value from `sessionStorage`, returning `fallback` when the key is missing,
 * contains invalid JSON, or fails the optional `options.validate` type guard.
 */
export function getSessionStorageJson<T>(key: string, fallback: T, options?: StorageJsonOptions<T>): T {
    return readStorageJson("sessionStorage", key, fallback, options);
}

/**
 * Serializes `value` as JSON and writes it to `sessionStorage`.
 */
export function setSessionStorageJson<T>(key: string, value: T, options?: StorageOptions): boolean {
    return writeStorageJson("sessionStorage", key, value, options);
}
