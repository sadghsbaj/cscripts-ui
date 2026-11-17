import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
    PROGRESS_APPEARANCES,
    PROGRESS_COLORS,
    PROGRESS_ORIENTATIONS,
    PROGRESS_SIZES,
    PROGRESS_VARIANTS,
    Progress,
    type ProgressAppearance,
    type ProgressColor,
    type ProgressOrientation,
    type ProgressSize,
    type ProgressVariant,
} from "./index.ts";

function requireElement<T extends HTMLElement>(
    parent: ParentNode,
    selector: string,
    ctor: new () => T,
): T {
    const el = parent.querySelector(selector);
    if (!(el instanceof ctor)) {
        throw new TypeError(`Expected ${selector} to be an instance of ${ctor.name}`);
    }
    return el;
}

describe("Progress Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
    });

    describe("Exports, Defaults & Attributes", () => {
        test("exports canonical option lists", () => {
            expect(PROGRESS_APPEARANCES).toEqual(["bar", "dashed", "dotted"]);
            expect(PROGRESS_VARIANTS).toEqual(["soft", "elevated"]);
            expect(PROGRESS_COLORS).toEqual(["base", "accent", "positive", "caution", "negative"]);
            expect(PROGRESS_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
            expect(PROGRESS_ORIENTATIONS).toEqual(["horizontal", "vertical"]);
        });

        test("applies required props, defaults (color='accent', orientation='horizontal'), and data-* attributes", () => {
            const instance = mount(Progress, {
                target: container,
                props: {
                    appearance: "bar",
                    variant: "soft",
                    size: "md",
                    value: 35,
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>(".cs-progress");
            expect(root).not.toBeNull();
            expect(root?.tagName).toBe("DIV");
            expect(root?.dataset.appearance).toBe("bar");
            expect(root?.dataset.variant).toBe("soft");
            expect(root?.dataset.color).toBe("accent");
            expect(root?.dataset.size).toBe("md");
            expect(root?.dataset.orientation).toBe("horizontal");
            expect(root?.hasAttribute("data-indeterminate")).toBe(false);

            unmount(instance);
        });

        test("updates data-* attributes reactively for variant, color, size, and orientation", () => {
            let appearance = $state<ProgressAppearance>("bar");
            let variant = $state<ProgressVariant>("soft");
            let color = $state<ProgressColor>("base");
            let size = $state<ProgressSize>("xs");
            let orientation = $state<ProgressOrientation>("horizontal");

            const instance = mount(Progress, {
                target: container,
                props: {
                    get appearance() {
                        return appearance;
                    },
                    get variant() {
                        return variant;
                    },
                    get color() {
                        return color;
                    },
                    get size() {
                        return size;
                    },
                    get orientation() {
                        return orientation;
                    },
                    value: 50,
                },
            });
            flushSync();

            const root = requireElement(container, ".cs-progress", HTMLDivElement);
            expect(root.dataset.variant).toBe("soft");
            expect(root.dataset.color).toBe("base");
            expect(root.dataset.size).toBe("xs");
            expect(root.dataset.orientation).toBe("horizontal");

            appearance = "dotted";
            variant = "elevated";
            color = "negative";
            size = "xl";
            orientation = "vertical";
            flushSync();

            expect(root.dataset.appearance).toBe("dotted");
            expect(root.dataset.variant).toBe("elevated");
            expect(root.dataset.color).toBe("negative");
            expect(root.dataset.size).toBe("xl");
            expect(root.dataset.orientation).toBe("vertical");

            unmount(instance);
        });

        test("binds ref to root HTMLDivElement and clears on unmount", () => {
            let ref: HTMLDivElement | null = null;

            const instance = mount(Progress, {
                target: container,
                props: {
                    appearance: "bar",
                    variant: "soft",
                    size: "sm",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>(".cs-progress");
            expect(ref).toBeInstanceOf(HTMLDivElement);
            expect(ref).toBe(root);

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("merges custom classes and forwards rest attributes while enforcing role='progressbar'", () => {
            const instance = mount(Progress, {
                target: container,
                props: {
                    appearance: "bar",
                    variant: "elevated",
                    size: "lg",
                    value: 60,
                    class: "custom-progress",
                    id: "upload-progress",
                    "aria-label": "Upload progress",
                    "aria-valuetext": "60 percent",
                    ...({ role: "status" } as Record<string, unknown>),
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>(".cs-progress");
            expect(root?.classList.contains("cs-progress")).toBe(true);
            expect(root?.classList.contains("custom-progress")).toBe(true);
            expect(root?.id).toBe("upload-progress");
            expect(root?.getAttribute("aria-label")).toBe("Upload progress");
            expect(root?.getAttribute("aria-valuetext")).toBe("60 percent");
            expect(root?.getAttribute("role")).toBe("progressbar");

            unmount(instance);
        });
    });

    describe("ARIA & Determinate / Indeterminate Modes", () => {
        test("emits clamped aria-valuenow, aria-valuemin, aria-valuemax in determinate mode and omits aria-orientation", () => {
            let value = $state<number | null | undefined>(42);
            const min = $state(10);
            const max = $state(110);
            let orientation = $state<ProgressOrientation>("horizontal");

            const instance = mount(Progress, {
                target: container,
                props: {
                    appearance: "bar",
                    variant: "soft",
                    size: "md",
                    get value() {
                        return value;
                    },
                    get min() {
                        return min;
                    },
                    get max() {
                        return max;
                    },
                    get orientation() {
                        return orientation;
                    },
                },
            });
            flushSync();

            const root = requireElement(container, ".cs-progress", HTMLDivElement);
            expect(root.getAttribute("role")).toBe("progressbar");
            expect(root.getAttribute("aria-valuenow")).toBe("42");
            expect(root.getAttribute("aria-valuemin")).toBe("10");
            expect(root.getAttribute("aria-valuemax")).toBe("110");
            expect(root.hasAttribute("aria-orientation")).toBe(false);

            value = 999;
            orientation = "vertical";
            flushSync();

            expect(root.getAttribute("aria-valuenow")).toBe("110");
            expect(root.hasAttribute("aria-orientation")).toBe(false);

            unmount(instance);
        });

        test("omits aria-valuenow/min/max and sets data-indeterminate for undefined, null, and non-finite values", () => {
            let value = $state<number | null | undefined>(undefined);

            const instance = mount(Progress, {
                target: container,
                props: {
                    appearance: "bar",
                    variant: "soft",
                    size: "md",
                    get value() {
                        return value;
                    },
                },
            });
            flushSync();

            const root = requireElement(container, ".cs-progress", HTMLDivElement);
            const assertIndeterminate = (): void => {
                expect(root.dataset.indeterminate !== undefined).toBe(true);
                expect(root.hasAttribute("aria-valuenow")).toBe(false);
                expect(root.hasAttribute("aria-valuemin")).toBe(false);
                expect(root.hasAttribute("aria-valuemax")).toBe(false);
            };

            assertIndeterminate();

            value = null;
            flushSync();
            assertIndeterminate();

            value = NaN;
            flushSync();
            assertIndeterminate();

            value = 50;
            flushSync();
            expect(root.dataset.indeterminate !== undefined).toBe(false);
            expect(root.getAttribute("aria-valuenow")).toBe("50");
            expect(root.getAttribute("aria-valuemin")).toBe("0");
            expect(root.getAttribute("aria-valuemax")).toBe("100");

            unmount(instance);
        });
    });

    describe("Appearances, Segments & Stagger Choreography", () => {
        test("bar appearance renders .cs-progress-fill with aria-hidden and updates --cs-progress-ratio", () => {
            let value = $state<number | null>(25);

            const instance = mount(Progress, {
                target: container,
                props: {
                    appearance: "bar",
                    variant: "soft",
                    size: "md",
                    get value() {
                        return value;
                    },
                },
            });
            flushSync();

            const root = requireElement(container, ".cs-progress", HTMLDivElement);
            const fill = root.querySelector<HTMLDivElement>(".cs-progress-fill");
            expect(fill).not.toBeNull();
            expect(fill?.getAttribute("aria-hidden")).toBe("true");
            expect(root.querySelectorAll(".cs-progress-segment")).toHaveLength(0);
            expect(root.style.getPropertyValue("--cs-progress-ratio")).toBe("0.25");
            expect(root.style.getPropertyValue("--cs-progress-segments")).toBe("");

            value = null;
            flushSync();
            expect(root.style.getPropertyValue("--cs-progress-ratio")).toBe("");

            unmount(instance);
        });

        test("dashed (5) and dotted (10) render default segments and respect segments override", () => {
            let appearance = $state<ProgressAppearance>("dashed");
            let segments = $state<number | undefined>(undefined);

            const instance = mount(Progress, {
                target: container,
                props: {
                    get appearance() {
                        return appearance;
                    },
                    get segments() {
                        return segments;
                    },
                    variant: "soft",
                    size: "md",
                    value: 50,
                },
            });
            flushSync();

            const root = requireElement(container, ".cs-progress", HTMLDivElement);
            expect(root.querySelector(".cs-progress-fill")).toBeNull();
            expect(root.querySelectorAll(".cs-progress-segment")).toHaveLength(5);
            expect(root.style.getPropertyValue("--cs-progress-segments")).toBe("5");

            const firstSeg = requireElement(root, ".cs-progress-segment", HTMLSpanElement);
            expect(firstSeg.getAttribute("aria-hidden")).toBe("true");
            expect(firstSeg.style.getPropertyValue("--cs-progress-index")).toBe("0");

            appearance = "dotted";
            flushSync();
            expect(root.querySelectorAll(".cs-progress-segment")).toHaveLength(10);
            expect(root.style.getPropertyValue("--cs-progress-segments")).toBe("10");

            segments = 7;
            flushSync();
            expect(root.querySelectorAll(".cs-progress-segment")).toHaveLength(7);
            expect(root.style.getPropertyValue("--cs-progress-segments")).toBe("7");

            unmount(instance);
        });

        test("computes data-active, data-activating, and stagger CSS variables across forward, backward, no-op, and indeterminate transitions", () => {
            let value = $state<number | null>(40);

            const instance = mount(Progress, {
                target: container,
                props: {
                    appearance: "dashed",
                    variant: "soft",
                    size: "md",
                    get value() {
                        return value;
                    },
                },
            });
            flushSync();

            const root = requireElement(container, ".cs-progress", HTMLDivElement);
            const getSegments = (): HTMLSpanElement[] => [
                ...root.querySelectorAll<HTMLSpanElement>(".cs-progress-segment"),
            ];

            // Initial mount at 40% (2/5 active): no mount stagger animation
            expect(getSegments().map((el) => el.dataset.active !== undefined)).toEqual([
                true,
                true,
                false,
                false,
                false,
            ]);
            expect(getSegments().every((el) => el.dataset.activating === undefined)).toBe(true);
            expect(root.style.getPropertyValue("--cs-progress-stagger-step")).toBe("");
            expect(getSegments().map((el) => el.style.getPropertyValue("--cs-progress-stagger"))).toEqual([
                "0",
                "0",
                "0",
                "0",
                "0",
            ]);

            // Forward: 40% -> 80% (2 -> 4 active)
            value = 80;
            flushSync();
            expect(getSegments().map((el) => el.dataset.active !== undefined)).toEqual([
                true,
                true,
                true,
                true,
                false,
            ]);
            expect(getSegments().map((el) => el.dataset.activating !== undefined)).toEqual([
                false,
                false,
                true,
                true,
                false,
            ]);
            expect(root.style.getPropertyValue("--cs-progress-stagger-step")).toBe("35ms");
            expect(getSegments().map((el) => el.style.getPropertyValue("--cs-progress-stagger"))).toEqual([
                "0",
                "0",
                "0",
                "1",
                "0",
            ]);

            // Backward: 80% -> 40% (4 -> 2 active)
            value = 40;
            flushSync();
            expect(getSegments().map((el) => el.dataset.active !== undefined)).toEqual([
                true,
                true,
                false,
                false,
                false,
            ]);
            expect(getSegments().every((el) => el.dataset.activating === undefined)).toBe(true);
            expect(root.style.getPropertyValue("--cs-progress-stagger-step")).toBe("35ms");
            expect(getSegments().map((el) => el.style.getPropertyValue("--cs-progress-stagger"))).toEqual([
                "0",
                "0",
                "1",
                "0",
                "0",
            ]);

            // Same active count (40% -> 42%, still 2 active): no stagger
            value = 42;
            flushSync();
            expect(root.style.getPropertyValue("--cs-progress-stagger-step")).toBe("");
            expect(getSegments().every((el) => el.dataset.activating === undefined)).toBe(true);

            // Determinate -> Indeterminate -> Determinate (resets prevActiveCount to 0)
            value = null;
            flushSync();
            expect(getSegments().every((el) => el.dataset.active === undefined)).toBe(true);
            expect(getSegments().every((el) => el.dataset.activating === undefined)).toBe(true);
            expect(root.style.getPropertyValue("--cs-progress-stagger-step")).toBe("");

            value = 60;
            flushSync();
            expect(getSegments().map((el) => el.dataset.active !== undefined)).toEqual([
                true,
                true,
                true,
                false,
                false,
            ]);
            expect(getSegments().map((el) => el.dataset.activating !== undefined)).toEqual([
                true,
                true,
                true,
                false,
                false,
            ]);
            expect(root.style.getPropertyValue("--cs-progress-stagger-step")).toBe("35ms");
            expect(getSegments().map((el) => el.style.getPropertyValue("--cs-progress-stagger"))).toEqual([
                "0",
                "1",
                "2",
                "0",
                "0",
            ]);

            unmount(instance);
        });
    });
});
