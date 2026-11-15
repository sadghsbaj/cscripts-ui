---
name: BrowserStorage
kind: utility
import: cs/svelte/browser-storage
exports:
  - configureStoragePrefix
  - getStoragePrefix
  - resolveStorageKey
  - getLocalStorage
  - setLocalStorage
  - removeLocalStorage
  - hasLocalStorage
  - keysLocalStorage
  - clearLocalStorage
  - getLocalStorageJson
  - setLocalStorageJson
  - onLocalStorageChange
  - getSessionStorage
  - setSessionStorage
  - removeSessionStorage
  - hasSessionStorage
  - keysSessionStorage
  - clearSessionStorage
  - getSessionStorageJson
  - setSessionStorageJson
  - StorageOptions
  - StorageJsonOptions
  - StorageChangeListener
---

# BrowserStorage

## Overview
SSR-safe, namespaced wrappers around `localStorage` and `sessionStorage` with JSON serialization, runtime type-guard validation, and cross-tab change subscriptions. Designed to prevent key collisions between local `file://` HTML tools that share a single browser storage bucket.

## API

### Prefix Configuration
| Function | Signature | Description |
| :--- | :--- | :--- |
| `configureStoragePrefix` | `(prefix: string) => void` | Sets the app-wide key namespace (trims whitespace and trailing `:`). Call once in `main.ts`. |
| `getStoragePrefix` | `() => string` | Returns the configured prefix (`""` if unconfigured). |
| `resolveStorageKey` | `(key: string, options?: StorageOptions) => string` | Returns `"<prefix>:<key>"` unless `options?.prefix === false` or no prefix is set. |

### `localStorage` & `sessionStorage` Helpers
Both storage backends expose matching functions (`*LocalStorage*` and `*SessionStorage*`):

| Function | Return | Description |
| :--- | :--- | :--- |
| `getLocalStorage(key, options?)` / `getSessionStorage(...)` | `string \| null` | Reads a raw string value. |
| `setLocalStorage(key, value, options?)` / `setSessionStorage(...)` | `boolean` | Writes a raw string; returns `false` on SSR, restricted storage, or quota errors. |
| `removeLocalStorage(key, options?)` / `removeSessionStorage(...)` | `boolean` | Removes the key. |
| `hasLocalStorage(key, options?)` / `hasSessionStorage(...)` | `boolean` | Checks if the key exists. |
| `keysLocalStorage(options?)` / `keysSessionStorage(...)` | `string[]` | Lists keys for the active prefix (with `"<prefix>:"` stripped), or all keys if `{ prefix: false }`. |
| `clearLocalStorage(options?)` / `clearSessionStorage(...)` | `boolean` | Clears only `"<prefix>:*"` keys when a prefix is set (preserving other apps and `"cs-theme"`), or all keys if `{ prefix: false }`. |
| `getLocalStorageJson<T>(key, fallback, options?)` / `getSessionStorageJson(...)` | `T` | Parses JSON and returns `fallback` if missing, invalid JSON, or `options.validate` returns `false`. |
| `setLocalStorageJson<T>(key, value, options?)` / `setSessionStorageJson(...)` | `boolean` | Serializes `value` as JSON and writes it. |
| `onLocalStorageChange(key, listener, options?)` | `() => void` | Subscribes to cross-tab `storage` events for `key`; returns an unsubscribe function. |

### Options Types
- `StorageOptions`: `{ prefix?: boolean }` (`@default true`). Set `prefix: false` only for intentional cross-app global keys (e.g. `"cs-theme"`).
- `StorageJsonOptions<T>`: extends `StorageOptions` with `validate?: (value: unknown) => value is T`.
- `StorageChangeListener`: `(newValue: string | null, oldValue: string | null, event: StorageEvent) => void`.

## Examples

```ts
import {
    configureStoragePrefix,
    getLocalStorageJson,
    onLocalStorageChange,
    setLocalStorageJson,
} from "cs/svelte/browser-storage";

// Call early in app startup (e.g. main.ts)
configureStoragePrefix("my-tool");

interface Filters {
    query: string;
}

const isFilters = (v: unknown): v is Filters =>
    typeof v === "object" && v !== null && typeof (v as Filters).query === "string";

const saved = getLocalStorageJson<Filters>("filters", { query: "" }, { validate: isFilters });
setLocalStorageJson("filters", { query: "oak" });

const unsubscribe = onLocalStorageChange("filters", (next) => {
    console.log("Updated in another tab:", next);
});
```

## Behavior & Quirks
- **Missing prefix warning:** Accessing prefixed storage before calling `configureStoragePrefix(...)` logs a one-time `console.warn` and falls back to the unprefixed key.
- **Global keys:** Use `{ prefix: false }` for shared cross-tool keys so `clearLocalStorage()` in one app never wipes `"cs-theme"` or other apps' data.
- **SSR & quota safety:** All read/write/clear calls guard against `typeof window === "undefined"` and swallow storage exceptions, returning `null`, `false`, `[]`, or `fallback`.
