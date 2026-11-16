import { Check } from "@lucide/svelte";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { BADGE_COLORS, BADGE_SIZES, BADGE_VARIANTS, Badge, BadgeIcon } from "./index.ts";
import BadgeTestHost from "./BadgeTestHost.internal.svelte";

describe("Badge Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
    });

    test("renders span root with data attributes, cs-badge class, and forwards rest attributes", () => {
        const instance = mount(Badge, {
            target: container,
            props: {
                variant: "solid",
                color: "accent",
                size: "sm",
                class: "custom-badge",
                "aria-label": "Status badge",
                role: "status",
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-badge");
        expect(root).not.toBeNull();
        expect(root?.tagName).toBe("SPAN");
        expect(root?.classList.contains("cs-badge")).toBe(true);
        expect(root?.classList.contains("custom-badge")).toBe(true);
        expect(root?.dataset.variant).toBe("solid");
        expect(root?.dataset.color).toBe("accent");
        expect(root?.dataset.size).toBe("sm");
        expect(root?.getAttribute("aria-label")).toBe("Status badge");
        expect(root?.getAttribute("role")).toBe("status");
        expect(root?.hasAttribute("data-icon-only")).toBe(false);

        unmount(instance);
    });

    test("exports canonical variant, color, and size option lists", () => {
        expect(BADGE_VARIANTS).toEqual(["soft", "solid", "dot"]);
        expect(BADGE_COLORS).toEqual(["base", "accent", "positive", "caution", "negative"]);
        expect(BADGE_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
    });

    test("binds ref to the root span element", () => {
        let ref: HTMLSpanElement | null = null;

        const instance = mount(Badge, {
            target: container,
            props: {
                variant: "soft",
                color: "base",
                size: "md",
                get ref() {
                    return ref;
                },
                set ref(el: HTMLSpanElement | null) {
                    ref = el;
                },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-badge");
        expect(ref).toBe(root);

        unmount(instance);
        expect(ref).toBeNull();
    });

    test("renders .cs-badge-dot with aria-hidden='true' only when variant is dot", () => {
        let variant = $state<"dot" | "soft" | "solid">("dot");

        const instance = mount(Badge, {
            target: container,
            props: {
                get variant() {
                    return variant;
                },
                color: "positive",
                size: "md",
            },
        });
        flushSync();

        const dot = container.querySelector<HTMLSpanElement>(".cs-badge-dot");
        expect(dot).not.toBeNull();
        expect(dot?.getAttribute("aria-hidden")).toBe("true");

        variant = "soft";
        flushSync();
        expect(container.querySelector(".cs-badge-dot")).toBeNull();

        variant = "solid";
        flushSync();
        expect(container.querySelector(".cs-badge-dot")).toBeNull();

        unmount(instance);
    });

    test("sets data-icon-only='' when iconOnly is true and omits it when false", () => {
        let iconOnly = $state(true);

        const instance = mount(Badge, {
            target: container,
            props: {
                variant: "soft",
                color: "base",
                size: "md",
                get iconOnly() {
                    return iconOnly;
                },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-badge");
        expect(root?.dataset.iconOnly).toBe("");

        iconOnly = false;
        flushSync();
        expect(root?.hasAttribute("data-icon-only")).toBe(false);

        unmount(instance);
    });

    test("renders BadgeLabel and BadgeIcon with context-calibrated strokeWidth and explicit override", () => {
        let variant = $state<"soft" | "solid">("soft");
        let size = $state<"xs" | "sm" | "md">("sm");
        let strokeWidth = $state<number | undefined>(undefined);
        let labelRef: HTMLSpanElement | null = null;

        const instance = mount(BadgeTestHost, {
            target: container,
            props: {
                get variant() {
                    return variant;
                },
                color: "accent",
                get size() {
                    return size;
                },
                label: "Verified",
                get strokeWidth() {
                    return strokeWidth;
                },
                get labelRef() {
                    return labelRef;
                },
                set labelRef(el: HTMLSpanElement | null) {
                    labelRef = el;
                },
            },
        });
        flushSync();

        const label = container.querySelector<HTMLSpanElement>(".cs-badge-label");
        expect(label).not.toBeNull();
        expect(label?.textContent).toBe("Verified");
        expect(labelRef).toBe(label);

        const icon = container.querySelector<SVGElement>(".cs-badge-icon");
        expect(icon).not.toBeNull();
        expect(icon?.getAttribute("aria-hidden")).toBe("true");
        expect(icon?.getAttribute("stroke-width")).toBe("2.25");

        // solid + xs/sm calibrates strokeWidth to 2.5
        variant = "solid";
        flushSync();
        expect(icon?.getAttribute("stroke-width")).toBe("2.5");

        size = "xs";
        flushSync();
        expect(icon?.getAttribute("stroke-width")).toBe("2.5");

        // solid + md returns to 2.25
        size = "md";
        flushSync();
        expect(icon?.getAttribute("stroke-width")).toBe("2.25");

        // explicit strokeWidth overrides context calibration
        size = "xs";
        strokeWidth = 1.75;
        flushSync();
        expect(icon?.getAttribute("stroke-width")).toBe("1.75");

        unmount(instance);
    });

    test("BadgeIcon defaults strokeWidth to 2.25 when rendered outside Badge context", () => {
        const instance = mount(BadgeIcon, {
            target: container,
            props: {
                icon: Check,
            },
        });
        flushSync();

        const icon = container.querySelector<SVGElement>(".cs-badge-icon");
        expect(icon).not.toBeNull();
        expect(icon?.getAttribute("aria-hidden")).toBe("true");
        expect(icon?.getAttribute("stroke-width")).toBe("2.25");

        unmount(instance);
    });
});
