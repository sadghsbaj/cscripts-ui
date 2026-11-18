import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createListboxRegistry } from "./listbox-registry.svelte.ts";
import { extractListboxItemLabel, sortListboxItemsByDomOrder } from "./listbox-utils.ts";

describe("listbox-utils", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
    });

    describe("extractListboxItemLabel", () => {
        test("prefers explicitLabel (including empty string) over DOM content", () => {
            const textEl = document.createElement("span");
            textEl.textContent = "Text Element";
            const contentEl = document.createElement("div");
            contentEl.textContent = "Content Element";

            expect(extractListboxItemLabel("Explicit", textEl, contentEl, null, "fallback")).toBe("Explicit");
            expect(extractListboxItemLabel("", textEl, contentEl, null, "fallback")).toBe("");
        });

        test("uses trimmed textElement when explicitLabel is undefined, falling back to contentElement if textElement is empty", () => {
            const textEl = document.createElement("span");
            textEl.textContent = "  Germany  ";
            const contentEl = document.createElement("div");
            contentEl.textContent = "Content Fallback";

            expect(extractListboxItemLabel(undefined, textEl, contentEl, null, "de")).toBe("Germany");

            textEl.textContent = " ".repeat(3);
            expect(extractListboxItemLabel(undefined, textEl, contentEl, null, "de")).toBe("Content Fallback");
        });

        test("excludes direct and nested descriptionElement text from contentElement", () => {
            const contentEl = document.createElement("div");
            const title = document.createElement("span");
            title.textContent = "Berlin";
            const wrapper = document.createElement("div");
            const desc = document.createElement("p");
            desc.textContent = "Capital city";
            wrapper.append(desc);
            const suffix = document.createElement("span");
            suffix.textContent = "(DE)";
            contentEl.append(title, wrapper, suffix);

            expect(extractListboxItemLabel(undefined, null, contentEl, desc, "berlin")).toBe("Berlin (DE)");
        });

        test("falls back to fallbackValue when all label sources are missing or whitespace-only", () => {
            const contentEl = document.createElement("div");
            const desc = document.createElement("p");
            desc.textContent = "Only description";
            contentEl.append(desc);

            expect(extractListboxItemLabel(undefined, null, contentEl, desc, "fallback-val")).toBe("fallback-val");
            expect(extractListboxItemLabel(undefined, null, null, null, "fallback-val")).toBe("fallback-val");
        });
    });

    describe("sortListboxItemsByDomOrder", () => {
        test("sorts items by document position without mutating the source array", () => {
            const el1 = document.createElement("div");
            const el2 = document.createElement("div");
            const el3 = document.createElement("div");
            container.append(el1, el2, el3);

            const items = [
                { value: "third", element: el3 },
                { value: "first", element: el1 },
                { value: "second", element: el2 },
            ];

            const sorted = sortListboxItemsByDomOrder(items);
            expect(sorted.map((item) => item.value)).toEqual(["first", "second", "third"]);
            expect(items.map((item) => item.value)).toEqual(["third", "first", "second"]);
        });

        test("handles null elements and duplicate element references safely", () => {
            const el = document.createElement("div");
            container.append(el);

            const items = [
                { value: "a", element: null },
                { value: "b", element: el },
                { value: "c", element: el },
            ];

            const sorted = sortListboxItemsByDomOrder(items);
            expect(sorted).toHaveLength(3);
        });
    });

    describe("createListboxRegistry", () => {
        test("registers, retrieves, filters, orders, and unregisters items with identity guard", () => {
            const el1 = document.createElement("div");
            const el2 = document.createElement("div");
            const el3 = document.createElement("div");
            container.append(el1, el2, el3);

            const registry = createListboxRegistry<{ value: string; element: HTMLDivElement | null; enabled: boolean }>();

            const meta3 = { value: "c", element: el3, enabled: true };
            const meta1 = { value: "a", element: el1, enabled: false };
            const meta2 = { value: "b", element: el2, enabled: true };

            const cleanup3 = registry.register(meta3);
            const cleanup1 = registry.register(meta1);
            registry.register(meta2);

            expect(registry.get("a")).toBe(meta1);
            expect(registry.getOrdered().map((item) => item.value)).toEqual(["a", "b", "c"]);
            expect(registry.getOrdered((item) => item.enabled).map((item) => item.value)).toEqual(["b", "c"]);

            // Re-registering same value with a newer meta must not be deleted by stale cleanup
            const meta1Replacement = { value: "a", element: el1, enabled: true };
            const cleanup1Replacement = registry.register(meta1Replacement);
            cleanup1();
            expect(registry.get("a")).toBe(meta1Replacement);

            cleanup1Replacement();
            expect(registry.get("a")).toBeUndefined();

            cleanup3();
            expect(registry.getOrdered().map((item) => item.value)).toEqual(["b"]);
        });
    });
});
