import type { NumberFlowElement } from "@number-flow/svelte";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import NumberMorphGroupTestHost from "./NumberMorphGroupTestHost.internal.svelte";
import {
    CS_NUMBER_MORPH_OPACITY_TIMING,
    CS_NUMBER_MORPH_SPIN_TIMING,
    CS_NUMBER_MORPH_TRANSFORM_TIMING,
    NumberMorph,
    NumberMorphGroup,
    type NumberMorphDigits,
    type NumberMorphFormat,
    type NumberMorphTrend,
} from "./index.ts";

function getFlowText(flowEl: Element | null): string {
    if (!flowEl) return "";
    // @number-flow/svelte renders digits inside shadowRoot; only active items lack [inert].
    if (flowEl.shadowRoot) {
        const parts = flowEl.shadowRoot.querySelectorAll(
            ".digit__num:not([inert]), .symbol__value:not([inert])",
        );
        const text = [...parts]
            .filter((el) => !el.closest("[inert]"))
            .map((el) => el.textContent ?? "")
            .join("");
        if (text) return text.replaceAll(/\s+/g, " ").trim();
    }
    return flowEl.getAttribute("aria-label") ?? flowEl.textContent?.trim() ?? "";
}

describe("NumberMorph Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);

        // happy-dom lacks full WAAPI support; stub Element.prototype.animate for NumberFlow updates.
        vi.spyOn(Element.prototype, "animate").mockImplementation(
            () =>
                ({
                    finished: Promise.resolve(),
                    cancel: () => {},
                    finish: () => {},
                }) as unknown as Animation,
        );
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("exports timing constants aligned with motion.css", () => {
        expect(CS_NUMBER_MORPH_TRANSFORM_TIMING).toEqual({
            duration: 380,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        });
        expect(CS_NUMBER_MORPH_SPIN_TIMING).toEqual({
            duration: 380,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        });
        expect(CS_NUMBER_MORPH_OPACITY_TIMING).toEqual({
            duration: 160,
            easing: "cubic-bezier(0.5, 1, 0.89, 1)",
        });
    });

    test("renders .cs-number-morph root span with data-animated and formatted output in number-flow-svelte", () => {
        let value = $state(1234.5);
        let prefix = $state<string | undefined>("~");
        let suffix = $state<string | undefined>(" total");
        const locales: Intl.LocalesArgument = "en-US";
        let format = $state<NumberMorphFormat | undefined>({
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2,
        });

        const instance = mount(NumberMorph, {
            target: container,
            props: {
                get value() {
                    return value;
                },
                get prefix() {
                    return prefix;
                },
                get suffix() {
                    return suffix;
                },
                get locales() {
                    return locales;
                },
                get format() {
                    return format;
                },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-number-morph");
        expect(root).not.toBeNull();
        expect(root?.tagName).toBe("SPAN");
        expect(root?.hasAttribute("data-animated")).toBe(true);
        expect(root?.dataset.animated).toBe("");
        expect(root?.hasAttribute("data-continuous")).toBe(false);

        const flow = root?.querySelector<NumberFlowElement>("number-flow-svelte") ?? null;
        expect(flow).not.toBeNull();
        expect(flow?.transformTiming).toEqual(CS_NUMBER_MORPH_TRANSFORM_TIMING);
        expect(flow?.spinTiming).toEqual(CS_NUMBER_MORPH_SPIN_TIMING);
        expect(flow?.opacityTiming).toEqual(CS_NUMBER_MORPH_OPACITY_TIMING);
        expect(flow?.respectMotionPreference).toBe(true);
        expect(flow?.hasAttribute("data-will-change")).toBe(false);

        const renderedText = getFlowText(flow);
        expect(renderedText).toContain("1,234.5");
        expect(renderedText).toContain("$");
        expect(renderedText).toContain("~");
        expect(renderedText).toContain("total");

        // Verify reactive update of value & formatting
        value = 99;
        prefix = undefined;
        suffix = "%";
        format = { maximumFractionDigits: 0 };
        flushSync();

        const updatedText = getFlowText(flow);
        expect(updatedText).toContain("99");
        expect(updatedText).toContain("%");
        expect(updatedText).not.toContain("~");

        unmount(instance);
    });

    test("binds ref to the root HTMLSpanElement and forwards class and rest attributes", () => {
        let ref: HTMLSpanElement | null = null;

        const instance = mount(NumberMorph, {
            target: container,
            props: {
                value: 42,
                class: "custom-morph",
                id: "kpi-morph",
                "data-testid": "morph-root",
                "aria-label": "Active users",
                get ref() {
                    return ref;
                },
                set ref(el: HTMLSpanElement | null) {
                    ref = el;
                },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-number-morph");
        expect(root).not.toBeNull();
        expect(ref).toBe(root);
        expect(ref).toBeInstanceOf(HTMLSpanElement);
        expect(root?.classList.contains("cs-number-morph")).toBe(true);
        expect(root?.classList.contains("custom-morph")).toBe(true);
        expect(root?.getAttribute("id")).toBe("kpi-morph");
        expect(root?.dataset.testid).toBe("morph-root");
        expect(root?.getAttribute("aria-label")).toBe("Active users");

        unmount(instance);
        expect(ref).toBeNull();
    });

    test("omits data-animated when animated={false} and toggles reactively", () => {
        let animated = $state(false);

        const instance = mount(NumberMorph, {
            target: container,
            props: {
                value: 100,
                get animated() {
                    return animated;
                },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-number-morph");
        expect(root?.hasAttribute("data-animated")).toBe(false);

        animated = true;
        flushSync();
        expect(root?.hasAttribute("data-animated")).toBe(true);
        expect(root?.dataset.animated).toBe("");

        animated = false;
        flushSync();
        expect(root?.hasAttribute("data-animated")).toBe(false);

        unmount(instance);
    });

    test("supports continuous, digits, trend, and custom timing props across value updates", () => {
        let value = $state(10);
        let continuous = $state(true);
        const digits: NumberMorphDigits = { 1: { max: 5 } };
        const trend: NumberMorphTrend = 1;

        const instance = mount(NumberMorph, {
            target: container,
            props: {
                get value() {
                    return value;
                },
                get continuous() {
                    return continuous;
                },
                digits,
                trend,
                willChange: true,
                respectMotionPreference: false,
                transformTiming: { duration: 250, easing: "ease-out" },
                spinTiming: { duration: 300, easing: "ease-in-out" },
                opacityTiming: { duration: 120, easing: "linear" },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-number-morph");
        const flow = root?.querySelector<NumberFlowElement>("number-flow-svelte") ?? null;
        expect(root?.hasAttribute("data-continuous")).toBe(true);
        expect(flow).not.toBeNull();
        expect(flow?.transformTiming).toEqual({ duration: 250, easing: "ease-out" });
        expect(flow?.spinTiming).toEqual({ duration: 300, easing: "ease-in-out" });
        expect(flow?.opacityTiming).toEqual({ duration: 120, easing: "linear" });
        expect(flow?.trend).toBe(1);
        expect(flow?.respectMotionPreference).toBe(false);
        expect(flow?.hasAttribute("data-will-change")).toBe(true);
        expect(flow?.dataset.willChange).toBe("");
        expect(getFlowText(flow)).toContain("10");

        value = 45;
        flushSync();
        expect(getFlowText(flow)).toContain("45");

        continuous = false;
        value = 59;
        flushSync();
        expect(root?.hasAttribute("data-continuous")).toBe(false);
        expect(getFlowText(flow)).toContain("59");

        unmount(instance);
    });

    test("fires onanimationsstart and onanimationsfinish when events are dispatched on number-flow-svelte", () => {
        const onStart = vi.fn();
        const onFinish = vi.fn();

        const instance = mount(NumberMorph, {
            target: container,
            props: {
                value: 7,
                onanimationsstart: onStart,
                onanimationsfinish: onFinish,
            },
        });
        flushSync();

        const flow = container.querySelector("number-flow-svelte");
        expect(flow).not.toBeNull();

        expect(onStart).not.toHaveBeenCalled();
        expect(onFinish).not.toHaveBeenCalled();

        flow?.dispatchEvent(new CustomEvent("animationsstart"));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();

        flow?.dispatchEvent(new CustomEvent("animationsfinish"));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);

        // Listeners are cleaned up on unmount
        unmount(instance);
        flow?.dispatchEvent(new CustomEvent("animationsstart"));
        flow?.dispatchEvent(new CustomEvent("animationsfinish"));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);
    });

    test("switches locales reactively and handles reassignment and clearing of animation callbacks", () => {
        let locales = $state<Intl.LocalesArgument>("en-US");
        const onStartA = vi.fn();
        const onStartB = vi.fn();
        const onFinishA = vi.fn();
        const onFinishB = vi.fn();
        let onanimationsstart = $state<(() => void) | undefined>(onStartA);
        let onanimationsfinish = $state<(() => void) | undefined>(onFinishA);

        const instance = mount(NumberMorph, {
            target: container,
            props: {
                value: 1234.56,
                get locales() {
                    return locales;
                },
                get onanimationsstart() {
                    return onanimationsstart;
                },
                get onanimationsfinish() {
                    return onanimationsfinish;
                },
            },
        });
        flushSync();

        const flow = container.querySelector<NumberFlowElement>("number-flow-svelte");
        expect(flow).not.toBeNull();
        expect(getFlowText(flow)).toContain("1,234.56");

        locales = "de-DE";
        flushSync();
        expect(getFlowText(flow)).toContain("1.234,56");

        locales = "en-US";
        flushSync();
        expect(getFlowText(flow)).toContain("1,234.56");

        flow?.dispatchEvent(new CustomEvent("animationsstart"));
        flow?.dispatchEvent(new CustomEvent("animationsfinish"));
        expect(onStartA).toHaveBeenCalledTimes(1);
        expect(onFinishA).toHaveBeenCalledTimes(1);

        // Reassign both callbacks
        onanimationsstart = onStartB;
        onanimationsfinish = onFinishB;
        flushSync();

        flow?.dispatchEvent(new CustomEvent("animationsstart"));
        flow?.dispatchEvent(new CustomEvent("animationsfinish"));
        expect(onStartA).toHaveBeenCalledTimes(1);
        expect(onFinishA).toHaveBeenCalledTimes(1);
        expect(onStartB).toHaveBeenCalledTimes(1);
        expect(onFinishB).toHaveBeenCalledTimes(1);

        // Clear both callbacks
        onanimationsstart = undefined;
        onanimationsfinish = undefined;
        flushSync();

        flow?.dispatchEvent(new CustomEvent("animationsstart"));
        flow?.dispatchEvent(new CustomEvent("animationsfinish"));
        expect(onStartA).toHaveBeenCalledTimes(1);
        expect(onStartB).toHaveBeenCalledTimes(1);
        expect(onFinishA).toHaveBeenCalledTimes(1);
        expect(onFinishB).toHaveBeenCalledTimes(1);

        // Re-attach only start callback
        onanimationsstart = onStartB;
        flushSync();

        flow?.dispatchEvent(new CustomEvent("animationsstart"));
        flow?.dispatchEvent(new CustomEvent("animationsfinish"));
        expect(onStartB).toHaveBeenCalledTimes(2);
        expect(onFinishB).toHaveBeenCalledTimes(1);

        unmount(instance);
    });
});

describe("NumberMorphGroup Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);

        vi.spyOn(Element.prototype, "animate").mockImplementation(
            () =>
                ({
                    finished: Promise.resolve(),
                    cancel: () => {},
                    finish: () => {},
                }) as unknown as Animation,
        );
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders .cs-number-morph-group with ref, class, and rest forwarding", () => {
        let ref: HTMLSpanElement | null = null;

        const instance = mount(NumberMorphGroup, {
            target: container,
            props: {
                class: "custom-group",
                id: "kpi-group",
                "data-testid": "morph-group",
                "aria-label": "Metrics group",
                get ref() {
                    return ref;
                },
                set ref(el: HTMLSpanElement | null) {
                    ref = el;
                },
            },
        });
        flushSync();

        const group = container.querySelector<HTMLSpanElement>("span.cs-number-morph-group");
        expect(group).not.toBeNull();
        expect(group?.tagName).toBe("SPAN");
        expect(ref).toBe(group);
        expect(ref).toBeInstanceOf(HTMLSpanElement);
        expect(group?.classList.contains("cs-number-morph-group")).toBe(true);
        expect(group?.classList.contains("custom-group")).toBe(true);
        expect(group?.getAttribute("id")).toBe("kpi-group");
        expect(group?.dataset.testid).toBe("morph-group");
        expect(group?.getAttribute("aria-label")).toBe("Metrics group");

        unmount(instance);
        expect(ref).toBeNull();
    });

    test("renders multiple NumberMorph children inside NumberMorphGroup and updates values", () => {
        let firstValue = $state(12);
        let secondValue = $state(34);
        let groupRef: HTMLSpanElement | null = null;

        const instance = mount(NumberMorphGroupTestHost, {
            target: container,
            props: {
                class: "host-group",
                "data-testid": "group-host",
                get firstValue() {
                    return firstValue;
                },
                get secondValue() {
                    return secondValue;
                },
                get ref() {
                    return groupRef;
                },
                set ref(el: HTMLSpanElement | null) {
                    groupRef = el;
                },
            },
        });
        flushSync();

        const group = container.querySelector<HTMLSpanElement>("span.cs-number-morph-group");
        expect(group).not.toBeNull();
        expect(groupRef).toBe(group);
        expect(group?.classList.contains("host-group")).toBe(true);
        expect(group?.dataset.testid).toBe("group-host");

        const morphs = group?.querySelectorAll<HTMLSpanElement>("span.cs-number-morph");
        expect(morphs?.length).toBe(2);

        const firstFlow =
            group?.querySelector(':scope [data-testid="first-morph"] number-flow-svelte') ?? null;
        const secondFlow =
            group?.querySelector(':scope [data-testid="second-morph"] number-flow-svelte') ?? null;
        expect(getFlowText(firstFlow)).toContain("12");
        expect(getFlowText(secondFlow)).toContain("34");

        firstValue = 128;
        secondValue = 999;
        flushSync();

        expect(getFlowText(firstFlow)).toContain("128");
        expect(getFlowText(secondFlow)).toContain("999");

        unmount(instance);
        expect(groupRef).toBeNull();
    });
});
