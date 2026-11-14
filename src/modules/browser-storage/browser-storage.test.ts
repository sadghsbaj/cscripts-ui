import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    clearLocalStorage,
    clearSessionStorage,
    configureStoragePrefix,
    getLocalStorage,
    getLocalStorageJson,
    getSessionStorage,
    getSessionStorageJson,
    getStoragePrefix,
    hasLocalStorage,
    hasSessionStorage,
    keysLocalStorage,
    keysSessionStorage,
    onLocalStorageChange,
    removeLocalStorage,
    removeSessionStorage,
    resolveStorageKey,
    setLocalStorage,
    setLocalStorageJson,
    setSessionStorage,
    setSessionStorageJson,
} from "./index.ts";

const isValidCounter = (v: unknown): v is { count: number } =>
    typeof v === "object" && v !== null && "count" in v && typeof v.count === "number";

describe("cs/svelte/browser-storage", () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
        configureStoragePrefix("test-app");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("prefix configuration & resolution", () => {
        it("normalizes prefix whitespace and trailing colons", () => {
            configureStoragePrefix("  wood-analyzer::  ");
            expect(getStoragePrefix()).toBe("wood-analyzer");
            expect(resolveStorageKey("filter")).toBe("wood-analyzer:filter");
        });

        it("bypasses the prefix when { prefix: false } is passed", () => {
            configureStoragePrefix("wood-analyzer");
            expect(resolveStorageKey("cs-theme", { prefix: false })).toBe("cs-theme");
        });

        it("warns once when accessing prefixed storage with an empty prefix", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            configureStoragePrefix("");

            expect(resolveStorageKey("draft")).toBe("draft");
            expect(resolveStorageKey("second-key")).toBe("second-key");
            expect(warnSpy).toHaveBeenCalledTimes(1);

            // Accessing with { prefix: false } never warns even if prefix is empty
            warnSpy.mockClear();
            configureStoragePrefix("");
            expect(resolveStorageKey("cs-theme", { prefix: false })).toBe("cs-theme");
            expect(warnSpy).not.toHaveBeenCalled();
        });
    });

    describe("localStorage operations", () => {
        it("stores, reads, checks, and removes prefixed keys", () => {
            expect(hasLocalStorage("view")).toBe(false);
            expect(setLocalStorage("view", "table")).toBe(true);

            // Underlying native key is namespaced
            expect(window.localStorage.getItem("test-app:view")).toBe("table");
            expect(window.localStorage.getItem("view")).toBeNull();

            expect(hasLocalStorage("view")).toBe(true);
            expect(getLocalStorage("view")).toBe("table");

            expect(removeLocalStorage("view")).toBe(true);
            expect(hasLocalStorage("view")).toBe(false);
            expect(getLocalStorage("view")).toBeNull();
        });

        it("supports unprefixed shared keys via { prefix: false }", () => {
            setLocalStorage("cs-theme", "dark", { prefix: false });

            expect(window.localStorage.getItem("cs-theme")).toBe("dark");
            expect(window.localStorage.getItem("test-app:cs-theme")).toBeNull();
            expect(getLocalStorage("cs-theme", { prefix: false })).toBe("dark");
        });

        it("isolates keysLocalStorage and clearLocalStorage to the active app prefix", () => {
            setLocalStorage("plant", "neumarkt");
            setLocalStorage("sort", "asc");
            setLocalStorage("cs-theme", "dark", { prefix: false });
            window.localStorage.setItem("other-app:plant", "baruth");

            expect(keysLocalStorage().toSorted((a, b) => a.localeCompare(b))).toEqual(["plant", "sort"]);

            // Clearing only wipes keys belonging to "test-app:*"
            expect(clearLocalStorage()).toBe(true);
            expect(keysLocalStorage()).toEqual([]);
            expect(getLocalStorage("cs-theme", { prefix: false })).toBe("dark");
            expect(window.localStorage.getItem("other-app:plant")).toBe("baruth");
        });

        it("serializes and parses JSON with fallback and runtime validation", () => {
            const fallback = { count: 0 };
            expect(getLocalStorageJson("counter", fallback)).toEqual(fallback);

            expect(setLocalStorageJson("counter", { count: 42 })).toBe(true);
            expect(getLocalStorageJson("counter", fallback)).toEqual({ count: 42 });

            // Invalid JSON falls back safely without throwing
            window.localStorage.setItem("test-app:corrupt", "{not-valid-json");
            expect(getLocalStorageJson("corrupt", fallback)).toEqual(fallback);

            // Runtime type guard validation
            window.localStorage.setItem("test-app:wrong-shape", JSON.stringify({ count: "wrong" }));
            expect(
                getLocalStorageJson("wrong-shape", fallback, {
                    validate: isValidCounter,
                })
            ).toEqual(fallback);
        });

        it("filters cross-tab storage events via onLocalStorageChange", () => {
            const received: Array<{ newValue: string | null; oldValue: string | null }> = [];
            const unsubscribe = onLocalStorageChange("active-tab", (newValue, oldValue) => {
                received.push({ newValue, oldValue });
            });

            // Unrelated key should be ignored
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "other-app:active-tab",
                    oldValue: "a",
                    newValue: "b",
                    storageArea: window.localStorage,
                })
            );
            expect(received).toHaveLength(0);

            // Matching prefixed key triggers listener
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "test-app:active-tab",
                    oldValue: "overview",
                    newValue: "details",
                    storageArea: window.localStorage,
                })
            );
            expect(received).toEqual([{ oldValue: "overview", newValue: "details" }]);

            unsubscribe();

            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: "test-app:active-tab",
                    oldValue: "details",
                    newValue: "settings",
                    storageArea: window.localStorage,
                })
            );
            expect(received).toHaveLength(1);
        });
    });

    describe("sessionStorage operations", () => {
        it("stores, reads, lists, and clears prefixed session keys", () => {
            expect(hasSessionStorage("step")).toBe(false);
            expect(setSessionStorage("step", "2")).toBe(true);
            expect(window.sessionStorage.getItem("test-app:step")).toBe("2");
            expect(getSessionStorage("step")).toBe("2");
            expect(keysSessionStorage()).toEqual(["step"]);

            expect(setSessionStorageJson("wizard", { completed: true })).toBe(true);
            expect(getSessionStorageJson("wizard", { completed: false })).toEqual({ completed: true });

            expect(removeSessionStorage("step")).toBe(true);
            expect(hasSessionStorage("step")).toBe(false);

            expect(clearSessionStorage()).toBe(true);
            expect(keysSessionStorage()).toEqual([]);
        });
    });
});
