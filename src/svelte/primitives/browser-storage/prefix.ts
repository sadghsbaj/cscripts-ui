export interface StorageOptions {
    /**
     * Whether to namespace the key with the application prefix configured via `configureStoragePrefix()`.
     *
     * Set to `false` only for global cross-application keys that intentionally synchronize across
     * all local `file://` HTML tools (such as `"cs-theme"` or `"cs-pfleiderer-boot-last-ts"`).
     *
     * @default true
     */
    prefix?: boolean;
}

export interface StorageJsonOptions<T> extends StorageOptions {
    /**
     * Optional runtime type guard to validate the parsed JSON value before returning it.
     * When validation returns `false`, `fallback` is returned instead.
     */
    validate?: (value: unknown) => value is T;
}

export type StorageChangeListener = (newValue: string | null, oldValue: string | null, event: StorageEvent) => void;

let appStoragePrefix = "";
let hasWarnedMissingPrefix = false;

/**
 * Normalizes a raw prefix string by trimming whitespace and stripping trailing colons
 * so both `"my-app"` and `"my-app:"` produce `"my-app:<key>"`.
 */
function normalizePrefix(rawPrefix: string): string {
    return rawPrefix.trim().replace(/:+$/, "");
}

/**
 * Sets the application-wide storage key prefix for `localStorage` and `sessionStorage`.
 *
 * Why this is mandatory:
 * Local HTML applications opened via `file://` in Chromium/Edge share a single global
 * browser storage bucket. Configuring a unique prefix in `main.ts` prevents accidental
 * key collisions between independent local tools.
 */
export function configureStoragePrefix(prefix: string): void {
    appStoragePrefix = normalizePrefix(prefix);
    hasWarnedMissingPrefix = false;
}

/**
 * Returns the currently configured application storage prefix (`""` if unconfigured).
 */
export function getStoragePrefix(): string {
    return appStoragePrefix;
}

/**
 * Resolves the final browser storage key, applying the configured application prefix
 * unless `options?.prefix === false` is explicitly specified.
 */
export function resolveStorageKey(key: string, options?: StorageOptions): string {
    const usePrefix = options?.prefix ?? true;
    if (!usePrefix) {
        return key;
    }

    if (!appStoragePrefix) {
        if (!hasWarnedMissingPrefix) {
            hasWarnedMissingPrefix = true;
            console.warn(
                `[cs/svelte/browser-storage] Storage key "${key}" accessed before configuring a non-empty prefix. Call configureStoragePrefix("your-app-id") in main.ts to prevent file:// storage collisions.`
            );
        }
        return key;
    }

    return `${appStoragePrefix}:${key}`;
}
