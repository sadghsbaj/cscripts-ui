export {
    configureStoragePrefix,
    getStoragePrefix,
    resolveStorageKey,
    type StorageChangeListener,
    type StorageJsonOptions,
    type StorageOptions,
} from "./prefix.ts";

export {
    clearLocalStorage,
    getLocalStorage,
    getLocalStorageJson,
    hasLocalStorage,
    keysLocalStorage,
    onLocalStorageChange,
    removeLocalStorage,
    setLocalStorage,
    setLocalStorageJson,
} from "./local-storage.ts";

export {
    clearSessionStorage,
    getSessionStorage,
    getSessionStorageJson,
    hasSessionStorage,
    keysSessionStorage,
    removeSessionStorage,
    setSessionStorage,
    setSessionStorageJson,
} from "./session-storage.ts";
