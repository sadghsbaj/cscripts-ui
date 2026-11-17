import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    CS_TEXT_MORPH_DURATION,
    CS_TEXT_MORPH_EASE,
    TextMorph,
    type TextMorphProps,
    type TextMorphSpringParams,
    type TextMorphValue,
} from "./index.ts";

interface MockAnimation extends Animation {
    triggerFinish: () => void;
}

interface RecordedAnimation {
    options: KeyframeAnimationOptions | number | undefined;
    anim: MockAnimation;
}

interface MatchMediaController {
    mql: MediaQueryList;
    setMatches: (next: boolean) => void;
}

type MountedTextMorph = ReturnType<typeof mount>;

function createMockAnimation(): MockAnimation {
    const anim = {
        currentTime: 0,
        onfinish: null as ((ev: AnimationPlaybackEvent) => void) | null,
        cancel: () => {},
        finish: () => {
            anim.onfinish?.({} as AnimationPlaybackEvent);
        },
        finished: Promise.resolve(),
        triggerFinish: () => {
            anim.onfinish?.({} as AnimationPlaybackEvent);
        },
    };
    return anim as unknown as MockAnimation;
}

function getHost(container: ParentNode): HTMLSpanElement | null {
    return container.querySelector<HTMLSpanElement>(".cs-text-morph-host");
}

function getSrText(host: Element | null): string | null {
    return host?.querySelector("[torph-sr]")?.textContent ?? null;
}

function getActiveItems(host: Element | null): HTMLElement[] {
    if (!host) return [];
    return [...host.querySelectorAll<HTMLElement>(":scope > [torph-item]:not([torph-exiting])")];
}

function getActiveItemsText(host: Element | null): string {
    return getActiveItems(host)
        .map((el) => (el.tagName === "BR" ? "\n" : (el.textContent ?? "")))
        .join("")
        .replaceAll("\u{00A0}", " ");
}

function createMatchMediaMock(initialMatches: boolean): MatchMediaController {
    let matches = initialMatches;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();

    const mql = {
        get matches() {
            return matches;
        },
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn((type: string, cb: EventListenerOrEventListenerObject) => {
            if (type === "change" && typeof cb === "function") {
                listeners.add(cb as (event: MediaQueryListEvent) => void);
            }
        }),
        removeEventListener: vi.fn((type: string, cb: EventListenerOrEventListenerObject) => {
            if (type === "change" && typeof cb === "function") {
                listeners.delete(cb as (event: MediaQueryListEvent) => void);
            }
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;

    return {
        mql,
        setMatches(next: boolean) {
            matches = next;
            for (const listener of listeners) {
                listener({ matches: next, media: mql.media } as MediaQueryListEvent);
            }
        },
    };
}

function mockHostLayoutDimensions(host: HTMLElement, width = 120, height = 24): void {
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
        width,
        height,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    } as DOMRect);

    const origGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
        const style = origGetComputedStyle(el, pseudo);
        if (el === host) {
            return new Proxy(style, {
                get(target, prop) {
                    if (prop === "width") return `${width}px`;
                    if (prop === "height") return `${height}px`;
                    const val = Reflect.get(target, prop, target);
                    return typeof val === "function" ? val.bind(target) : val;
                },
            });
        }
        return style;
    });
}

function spyHostAnimate(host: HTMLElement): RecordedAnimation[] {
    const calls: RecordedAnimation[] = [];
    vi.spyOn(host, "animate").mockImplementation((_keyframes, options) => {
        const anim = createMockAnimation();
        calls.push({ options, anim });
        return anim;
    });
    return calls;
}

interface SegmentAnimateCall {
    exiting: boolean;
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null;
}

function spySegmentAnimate(el: HTMLElement): SegmentAnimateCall[] {
    const calls: SegmentAnimateCall[] = [];
    vi.spyOn(el, "animate").mockImplementation((keyframes) => {
        calls.push({
            exiting: el.hasAttribute("torph-exiting"),
            keyframes,
        });
        return createMockAnimation();
    });
    return calls;
}

describe("TextMorph Svelte 5 Component", () => {
    let container: HTMLDivElement;
    let mountedInstances: MountedTextMorph[];
    let originalAnimateDescriptor: PropertyDescriptor | undefined;
    let originalGetAnimationsDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
        mountedInstances = [];

        originalAnimateDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
        originalGetAnimationsDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");

        if (!originalAnimateDescriptor) {
            Object.defineProperty(Element.prototype, "animate", {
                configurable: true,
                writable: true,
                value: () => createMockAnimation(),
            });
        }
        if (!originalGetAnimationsDescriptor) {
            Object.defineProperty(Element.prototype, "getAnimations", {
                configurable: true,
                writable: true,
                value: () => [],
            });
        }

        vi.spyOn(Element.prototype, "animate").mockImplementation(() => createMockAnimation());
        vi.spyOn(Element.prototype, "getAnimations").mockImplementation(() => []);
    });

    afterEach(() => {
        for (const instance of mountedInstances) {
            unmount(instance);
        }
        container.remove();
        vi.restoreAllMocks();

        if (!originalAnimateDescriptor) {
            delete (Element.prototype as { animate?: unknown }).animate;
        }
        if (!originalGetAnimationsDescriptor) {
            delete (Element.prototype as { getAnimations?: unknown }).getAnimations;
        }
    });

    function mountTracked(props: TextMorphProps, target: HTMLElement = container): MountedTextMorph {
        const instance = mount(TextMorph, {
            target,
            props,
        });
        mountedInstances.push(instance);
        flushSync();
        return instance;
    }

    function unmountTracked(instance: MountedTextMorph): void {
        const index = mountedInstances.indexOf(instance);
        if (index !== -1) {
            mountedInstances.splice(index, 1);
        }
        unmount(instance);
        flushSync();
    }

    test("exports timing and easing constants aligned with motion.css", () => {
        expect(CS_TEXT_MORPH_DURATION).toBe(380);
        expect(CS_TEXT_MORPH_EASE).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    });

    test("renders default span.cs-text-morph root, inner host, single [torph-sr], and updates segments cleanly", () => {
        let text = $state<TextMorphValue>("Hello world");

        mountTracked({
            get text() {
                return text;
            },
        });

        const root = container.querySelector<HTMLSpanElement>("span.cs-text-morph");
        expect(root).not.toBeNull();
        if (!root) return;

        expect(root.tagName).toBe("SPAN");
        expect(root.dataset.animated).toBe("");
        expect(root.dataset.tabular).toBeUndefined();
        expect(root.dataset.debug).toBeUndefined();

        const host = getHost(root);
        expect(host).not.toBeNull();
        if (!host) return;

        expect(host.tagName).toBe("SPAN");
        expect(host.hasAttribute("torph-root")).toBe(true);

        // Single [torph-sr] accessible node and NO duplicate .sr-only node
        expect(root.querySelectorAll("[torph-sr]").length).toBe(1);
        expect(root.querySelector(".sr-only")).toBeNull();
        expect(getSrText(host)).toBe("Hello world");

        const initialItems = getActiveItems(host);
        expect(initialItems.length).toBeGreaterThan(0);
        expect(initialItems.every((item) => item.getAttribute("aria-hidden") === "true")).toBe(true);
        expect(getActiveItemsText(host)).toBe("Hello world");

        // Update text reactively
        text = "Goodbye moon";
        flushSync();

        expect(root.querySelectorAll("[torph-sr]").length).toBe(1);
        expect(getSrText(host)).toBe("Goodbye moon");
        expect(getActiveItemsText(host)).toBe("Goodbye moon");
    });

    test("supports polymorphic `as`, reactive tag switching, $bindable `ref`, `class` merging, and rest forwarding", () => {
        let as = $state<keyof HTMLElementTagNameMap>("h2");
        let ref: HTMLElement | null = null;
        let text = $state("Heading status");

        const instance = mountTracked({
            get as() {
                return as;
            },
            get text() {
                return text;
            },
            class: "custom-heading",
            id: "status-title",
            "aria-live": "polite",
            role: "status",
            "data-testid": "morph-heading",
            get ref() {
                return ref;
            },
            set ref(el: HTMLElement | null) {
                ref = el;
            },
        });

        const h2 = container.querySelector<HTMLHeadingElement>("h2.cs-text-morph");
        expect(h2).not.toBeNull();
        if (!h2) return;

        expect(ref).toBe(h2);
        expect(ref).toBeInstanceOf(HTMLHeadingElement);
        expect(h2.classList.contains("cs-text-morph")).toBe(true);
        expect(h2.classList.contains("custom-heading")).toBe(true);
        expect(h2.getAttribute("id")).toBe("status-title");
        expect(h2.getAttribute("aria-live")).toBe("polite");
        expect(h2.getAttribute("role")).toBe("status");
        expect(h2.dataset.testid).toBe("morph-heading");

        const initialHost = getHost(h2);
        expect(initialHost?.getAttribute("id")).toBeNull();
        expect(initialHost?.getAttribute("aria-live")).toBeNull();
        expect(getSrText(initialHost)).toBe("Heading status");

        // Switch `as` ONLY without changing text: MorphController.attach must replay lastText onto the new element
        as = "p";
        flushSync();

        expect(container.querySelector("h2.cs-text-morph")).toBeNull();
        const p = container.querySelector<HTMLParagraphElement>("p.cs-text-morph");
        expect(p).not.toBeNull();
        if (!p) return;

        expect(ref).toBe(p);
        expect(ref).toBeInstanceOf(HTMLParagraphElement);
        expect(p.getAttribute("id")).toBe("status-title");
        expect(getSrText(getHost(p))).toBe("Heading status");
        expect(getActiveItemsText(getHost(p))).toBe("Heading status");

        // Switch both tag and text together
        as = "h3";
        text = "Subheading status";
        flushSync();

        expect(container.querySelector("p.cs-text-morph")).toBeNull();
        const h3 = container.querySelector<HTMLHeadingElement>("h3.cs-text-morph");
        expect(h3).not.toBeNull();
        if (!h3) return;

        expect(ref).toBe(h3);
        expect(ref).toBeInstanceOf(HTMLHeadingElement);
        expect(h3.getAttribute("id")).toBe("status-title");
        expect(getSrText(getHost(h3))).toBe("Subheading status");

        unmountTracked(instance);
        expect(ref).toBeNull();
    });

    test("formats numeric values with locales & decimals and handles 0 and empty string edge cases", () => {
        let text = $state<TextMorphValue>(1234.5);
        let locales = $state<Intl.LocalesArgument>("de-DE");
        let decimals = $state<number | undefined>(2);

        mountTracked({
            get text() {
                return text;
            },
            get locales() {
                return locales;
            },
            get decimals() {
                return decimals;
            },
        });

        const host = getHost(container);
        expect(getSrText(host)).toBe("1.234,50");
        expect(getActiveItemsText(host)).toBe("1.234,50");
        expect(host?.querySelectorAll('[torph-kind="digit"]:not([torph-exiting])').length).toBe(6);
        expect(host?.querySelectorAll('[torph-kind="symbol"]:not([torph-exiting])').length).toBe(2);

        // Switch locales and decimals reactively
        locales = "en-US";
        decimals = 0;
        flushSync();

        expect(getSrText(host)).toBe("1,235");
        expect(getActiveItemsText(host)).toBe("1,235");

        // Transition to falsy numeric 0
        text = 0;
        flushSync();
        expect(getSrText(host)).toBe("0");
        expect(getActiveItemsText(host)).toBe("0");

        // Transition to empty string "" -> torph uses a zero-width placeholder [torph-id="empty"]
        text = "";
        flushSync();
        expect(getSrText(host)).toBe("");
        expect(host?.querySelector('[torph-id="empty"]')?.textContent).toBe("\u{200B}");

        // Transition back from "" to 0
        text = 0;
        flushSync();
        expect(host?.querySelector('[torph-id="empty"]')).toBeNull();
        expect(getSrText(host)).toBe("0");
        expect(getActiveItemsText(host)).toBe("0");
    });

    test("renders falsy 0 and empty string cleanly on initial mount", () => {
        const zeroContainer = document.createElement("div");
        container.append(zeroContainer);
        mountTracked({ text: 0 }, zeroContainer);

        const zeroHost = getHost(zeroContainer);
        expect(getSrText(zeroHost)).toBe("0");
        expect(getActiveItemsText(zeroHost)).toBe("0");

        let emptyText = $state("");
        const emptyContainer = document.createElement("div");
        container.append(emptyContainer);
        mountTracked(
            {
                get text() {
                    return emptyText;
                },
            },
            emptyContainer
        );

        const emptyHost = getHost(emptyContainer);
        // torph initializes internal data="" so mounting with "" is a no-op until text becomes non-empty
        expect(emptyHost?.textContent).toBe("");
        expect(emptyHost?.querySelector("[torph-sr]")).toBeNull();

        emptyText = "Loaded";
        flushSync();
        expect(getSrText(emptyHost)).toBe("Loaded");
        expect(getActiveItemsText(emptyHost)).toBe("Loaded");

        emptyText = "";
        flushSync();
        expect(getSrText(emptyHost)).toBe("");
        expect(emptyHost?.querySelector('[torph-id="empty"]')?.textContent).toBe("\u{200B}");
    });

    test("supports tabular, debug, and numbers={false} toggles reactively", () => {
        let tabular = $state(false);
        let debug = $state(false);
        let numbers = $state(false);
        let text = $state("Count 42");

        mountTracked({
            get text() {
                return text;
            },
            get tabular() {
                return tabular;
            },
            get debug() {
                return debug;
            },
            get numbers() {
                return numbers;
            },
        });

        const root = container.querySelector<HTMLElement>(".cs-text-morph");
        const host = getHost(container);
        expect(root).not.toBeNull();
        expect(host).not.toBeNull();
        if (!root || !host) return;

        expect(root.dataset.tabular).toBeUndefined();
        expect(root.dataset.debug).toBeUndefined();
        expect(host.hasAttribute("torph-debug")).toBe(false);
        // numbers={false} falls back to non-numeric segments (no [torph-kind])
        expect(host.querySelectorAll("[torph-kind]").length).toBe(0);
        expect(getSrText(host)).toBe("Count 42");

        tabular = true;
        debug = true;
        numbers = true;
        flushSync();

        expect(root.dataset.tabular).toBe("");
        expect(root.dataset.debug).toBe("");
        expect(host.hasAttribute("torph-debug")).toBe(true);
        expect(host.querySelectorAll('[torph-kind="digit"]:not([torph-exiting])').length).toBe(2);

        text = "Count 99";
        flushSync();
        expect(getSrText(host)).toBe("Count 99");
        expect(host.querySelectorAll('[torph-kind="digit"]:not([torph-exiting])').length).toBe(2);
        expect(getActiveItemsText(host)).toBe("Count 99");

        tabular = false;
        debug = false;
        numbers = false;
        flushSync();

        expect(root.dataset.tabular).toBeUndefined();
        expect(root.dataset.debug).toBeUndefined();
        expect(host.hasAttribute("torph-debug")).toBe(false);
        expect(host.querySelectorAll("[torph-kind]:not([torph-exiting])").length).toBe(0);
    });

    test("applies scale(0.95) to exiting non-numeric segments when scale={true} and omits scale when scale={false}", () => {
        let text = $state("Alpha");
        let scale = $state(true);

        mountTracked({
            get text() {
                return text;
            },
            get scale() {
                return scale;
            },
        });

        const host = getHost(container);
        expect(host).not.toBeNull();
        if (!host) return;

        // Default scale={true}: exiting "Alpha" includes scale(0.95)
        const alphaItem = getActiveItems(host)[0];
        expect(alphaItem).toBeDefined();
        if (!alphaItem) return;
        const alphaCalls = spySegmentAnimate(alphaItem);

        text = "Beta";
        flushSync();

        expect(alphaItem.hasAttribute("torph-exiting")).toBe(true);
        expect(
            alphaCalls.some(
                (call) =>
                    call.exiting &&
                    !Array.isArray(call.keyframes) &&
                    call.keyframes !== null &&
                    typeof call.keyframes.transform === "string" &&
                    call.keyframes.transform.includes("scale(0.95)")
            )
        ).toBe(true);

        // Toggle scale={false}: exiting "Beta" omits scale(...)
        scale = false;
        flushSync();

        const betaItem = getActiveItems(host)[0];
        expect(betaItem).toBeDefined();
        if (!betaItem) return;
        const betaCalls = spySegmentAnimate(betaItem);

        text = "Gamma";
        flushSync();

        expect(betaItem.hasAttribute("torph-exiting")).toBe(true);
        const betaTransformCall = betaCalls.find(
            (call) =>
                call.exiting &&
                !Array.isArray(call.keyframes) &&
                call.keyframes !== null &&
                typeof call.keyframes.transform === "string"
        );
        expect(betaTransformCall).toBeDefined();
        expect(String((betaTransformCall?.keyframes as PropertyIndexedKeyframes).transform)).not.toContain("scale(");

        // Toggle back scale={true}: exiting "Gamma" includes scale(0.95) again
        scale = true;
        flushSync();

        const gammaItem = getActiveItems(host)[0];
        expect(gammaItem).toBeDefined();
        if (!gammaItem) return;
        const gammaCalls = spySegmentAnimate(gammaItem);

        text = "Delta";
        flushSync();

        expect(gammaItem.hasAttribute("torph-exiting")).toBe(true);
        expect(
            gammaCalls.some(
                (call) =>
                    call.exiting &&
                    !Array.isArray(call.keyframes) &&
                    call.keyframes !== null &&
                    typeof call.keyframes.transform === "string" &&
                    call.keyframes.transform.includes("scale(0.95)")
            )
        ).toBe(true);
    });

    test("renders plain text when animated={false} and toggles true -> false -> true without duplicate text", () => {
        let animated = $state(false);
        let text = $state("Static label");

        mountTracked({
            get text() {
                return text;
            },
            get animated() {
                return animated;
            },
        });

        const root = container.querySelector<HTMLElement>(".cs-text-morph");
        const host = getHost(container);
        expect(root).not.toBeNull();
        expect(host).not.toBeNull();
        if (!root || !host) return;

        expect(root.dataset.animated).toBeUndefined();
        expect(host.hasAttribute("torph-root")).toBe(false);
        expect(host.querySelector("[torph-sr]")).toBeNull();
        expect(host.querySelector("[torph-item]")).toBeNull();
        expect(host.textContent).toBe("Static label");

        text = "Static updated";
        flushSync();
        expect(host.textContent).toBe("Static updated");

        // Toggle false -> true
        animated = true;
        flushSync();

        expect(root.dataset.animated).toBe("");
        expect(host.hasAttribute("torph-root")).toBe(true);
        expect(host.querySelectorAll("[torph-sr]").length).toBe(1);
        expect(getSrText(host)).toBe("Static updated");
        expect(getActiveItemsText(host)).toBe("Static updated");
        // No leftover plain TextNode directly under host alongside [torph-sr] and [torph-item]
        const directTextNodes = [...host.childNodes].filter(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "") !== ""
        );
        expect(directTextNodes.length).toBe(0);

        // Toggle true -> false -> true with text update
        animated = false;
        text = "Back to static";
        flushSync();

        expect(root.dataset.animated).toBeUndefined();
        expect(host.hasAttribute("torph-root")).toBe(false);
        expect(host.querySelector("[torph-sr]")).toBeNull();
        expect(host.querySelector("[torph-item]")).toBeNull();
        expect(host.textContent).toBe("Back to static");

        animated = true;
        flushSync();

        expect(root.dataset.animated).toBe("");
        expect(host.hasAttribute("torph-root")).toBe(true);
        expect(host.querySelectorAll("[torph-sr]").length).toBe(1);
        expect(getSrText(host)).toBe("Back to static");
        expect(getActiveItemsText(host)).toBe("Back to static");

        // Toggle true -> false without changing text
        animated = false;
        flushSync();

        expect(root.dataset.animated).toBeUndefined();
        expect(host.hasAttribute("torph-root")).toBe(false);
        expect(root.querySelector("[torph-root]")).toBeNull();
        expect(host.querySelector("[torph-sr]")).toBeNull();
        expect(host.querySelector("[torph-item]")).toBeNull();
        expect(host.textContent).toBe("Back to static");
    });

    test("respects prefers-reduced-motion when respectMotionPreference={true} and overrides when false", () => {
        const media = createMatchMediaMock(true);
        vi.spyOn(window, "matchMedia").mockImplementation(() => media.mql);

        let respectMotionPreference = $state(true);
        let text = $state("Reduced motion");

        mountTracked({
            get text() {
                return text;
            },
            get respectMotionPreference() {
                return respectMotionPreference;
            },
        });

        const root = container.querySelector<HTMLElement>(".cs-text-morph");
        const host = getHost(container);
        expect(root).not.toBeNull();
        expect(host).not.toBeNull();
        if (!root || !host) return;

        // When reduced motion is active and respectMotionPreference=true, torph uses plain text mode
        expect(root.dataset.animated).toBe("");
        expect(host.hasAttribute("torph-root")).toBe(false);
        expect(host.querySelector("[torph-sr]")).toBeNull();
        expect(host.textContent).toBe("Reduced motion");

        // Opting out of reduced motion enables torph DOM splitting
        respectMotionPreference = false;
        flushSync();

        expect(host.hasAttribute("torph-root")).toBe(true);
        expect(host.querySelectorAll("[torph-sr]").length).toBe(1);
        expect(getSrText(host)).toBe("Reduced motion");
        expect(getActiveItemsText(host)).toBe("Reduced motion");

        // Re-enabling respectMotionPreference reverts to plain text cleanly
        respectMotionPreference = true;
        text = "Still reduced";
        flushSync();

        expect(host.hasAttribute("torph-root")).toBe(false);
        expect(host.querySelector("[torph-sr]")).toBeNull();
        expect(host.textContent).toBe("Still reduced");

        // Live matchMedia change to false enables animated splitting on next text update
        media.setMatches(false);
        text = "Motion restored";
        flushSync();

        expect(host.hasAttribute("torph-root")).toBe(true);
        expect(getSrText(host)).toBe("Motion restored");
        expect(getActiveItemsText(host)).toBe("Motion restored");
    });

    test("passes duration and ease (CSS string and spring params) to WAAPI animations", () => {
        let text = $state("Alpha");
        let duration = $state(250);
        let ease = $state<string | TextMorphSpringParams>("ease-out");

        mountTracked({
            get text() {
                return text;
            },
            get duration() {
                return duration;
            },
            get ease() {
                return ease;
            },
        });

        const host = getHost(container);
        expect(host).not.toBeNull();
        if (!host) return;

        mockHostLayoutDimensions(host, 80, 20);
        const hostCalls = spyHostAnimate(host);

        text = "Beta";
        flushSync();

        expect(hostCalls.length).toBeGreaterThan(0);
        expect(hostCalls[0]?.options).toMatchObject({
            duration: 250,
            easing: "ease-out",
        });

        // Switch to spring ease (torph computes a linear(...) easing and ignores explicit duration)
        duration = 120;
        ease = { stiffness: 180, damping: 18, mass: 1 };
        flushSync();

        hostCalls.length = 0;
        text = "Gamma";
        flushSync();

        expect(hostCalls.length).toBeGreaterThan(0);
        const springTiming = hostCalls[0]?.options as KeyframeAnimationOptions;
        expect(String(springTiming.easing)).toMatch(/^linear\(/);
        expect(springTiming.duration).not.toBe(120);
    });

    test("passes cursorIndex to align digit segment identities around caret edits", () => {
        let text = $state("123");
        let cursorIndex = $state<number | undefined>(undefined);

        mountTracked({
            get text() {
                return text;
            },
            get cursorIndex() {
                return cursorIndex;
            },
        });

        const host = getHost(container);
        const initialIds = getActiveItems(host).map((el) => el.getAttribute("torph-id"));
        expect(initialIds.length).toBe(3);

        // Insert "9" at index 1 ("123" -> "1923") with caret after "9" (cursorIndex = 2):
        // torph keeps index 0 ("1") and shifts "2","3" right to indices 2,3; index 1 ("9") is new.
        text = "1923";
        cursorIndex = 2;
        flushSync();

        const afterInsertIds = getActiveItems(host).map((el) => el.getAttribute("torph-id"));
        expect(afterInsertIds.length).toBe(4);
        expect(afterInsertIds[0]).toBe(initialIds[0]);
        expect(afterInsertIds[1]).not.toBe(initialIds[1]);
        expect(afterInsertIds[2]).toBe(initialIds[1]);
        expect(afterInsertIds[3]).toBe(initialIds[2]);
    });

    test("fires onanimationsstart / onanimationscancel on zero-rect update and onanimationsfinish when layout dimensions are non-zero", () => {
        const onStart = vi.fn();
        const onFinish = vi.fn();
        const onCancel = vi.fn();
        let text = $state("Idle");

        mountTracked({
            get text() {
                return text;
            },
            onanimationsstart: onStart,
            onanimationsfinish: onFinish,
            onanimationscancel: onCancel,
        });

        // No spurious animation callbacks on initial mount
        expect(onStart).not.toHaveBeenCalled();
        expect(onFinish).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();

        // In happy-dom, zero layout dimensions trigger immediate cancel rather than finish
        text = "Saving";
        flushSync();
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();

        // Mock non-zero host dimensions to exercise full completion path
        const host = getHost(container);
        expect(host).not.toBeNull();
        if (!host) return;

        mockHostLayoutDimensions(host, 120, 24);
        const hostCalls = spyHostAnimate(host);

        text = "Saved";
        flushSync();

        expect(onStart).toHaveBeenCalledTimes(2);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();

        // torph assigns onfinish on the width animation of the root transition
        const completionAnim = hostCalls.findLast((entry) => entry.anim.onfinish !== null)?.anim;
        expect(completionAnim).toBeDefined();
        completionAnim?.triggerFinish();

        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);

        // Rapid update cancels in-flight animation before starting the next one
        hostCalls.length = 0;
        text = "Syncing";
        flushSync();
        expect(onStart).toHaveBeenCalledTimes(3);

        hostCalls.length = 0;
        text = "Synced";
        flushSync();
        expect(onStart).toHaveBeenCalledTimes(4);
        expect(onCancel).toHaveBeenCalledTimes(2);

        const latestCompletionAnim = hostCalls.findLast((entry) => entry.anim.onfinish !== null)?.anim;
        expect(latestCompletionAnim).toBeDefined();
        latestCompletionAnim?.triggerFinish();
        expect(onFinish).toHaveBeenCalledTimes(2);
    });

    test("rebinds animation callbacks without recreating MorphController or duplicating DOM nodes", () => {
        const startA = vi.fn();
        const startB = vi.fn();
        const finishA = vi.fn();
        const finishB = vi.fn();
        let onanimationsstart = $state<(() => void) | undefined>(startA);
        let onanimationsfinish = $state<(() => void) | undefined>(finishA);
        let text = $state("One");

        mountTracked({
            get text() {
                return text;
            },
            get onanimationsstart() {
                return onanimationsstart;
            },
            get onanimationsfinish() {
                return onanimationsfinish;
            },
        });

        const host = getHost(container);
        expect(host).not.toBeNull();
        if (!host) return;

        mockHostLayoutDimensions(host, 100, 20);
        const hostCalls = spyHostAnimate(host);
        const initialSrNode = host.querySelector("[torph-sr]");

        // Reassign callbacks and verify controller is NOT torn down / recreated
        onanimationsstart = startB;
        onanimationsfinish = finishB;
        flushSync();
        expect(host.querySelector("[torph-sr]")).toBe(initialSrNode);

        hostCalls.length = 0;
        text = "Two";
        flushSync();
        hostCalls.findLast((entry) => entry.anim.onfinish !== null)?.anim.triggerFinish();

        expect(startA).not.toHaveBeenCalled();
        expect(finishA).not.toHaveBeenCalled();
        expect(startB).toHaveBeenCalledTimes(1);
        expect(finishB).toHaveBeenCalledTimes(1);

        // Clear callbacks
        onanimationsstart = undefined;
        onanimationsfinish = undefined;
        flushSync();

        hostCalls.length = 0;
        text = "Three";
        flushSync();
        hostCalls.findLast((entry) => entry.anim.onfinish !== null)?.anim.triggerFinish();

        expect(startB).toHaveBeenCalledTimes(1);
        expect(finishB).toHaveBeenCalledTimes(1);
    });

    test("injects <style data-torph='true'> once across instances, cancels animations, and removes style on last unmount", () => {
        expect(document.head.querySelectorAll('style[data-torph="true"]').length).toBe(0);

        const c1 = document.createElement("div");
        const c2 = document.createElement("div");
        container.append(c1, c2);

        const inst1 = mountTracked({ text: "First" }, c1);
        expect(document.head.querySelectorAll('style[data-torph="true"]').length).toBe(1);

        const inst2 = mountTracked({ text: "Second" }, c2);
        expect(document.head.querySelectorAll('style[data-torph="true"]').length).toBe(1);

        const host1 = getHost(c1);
        expect(host1).not.toBeNull();
        if (!host1) return;

        const cancelSpy = vi.fn();
        const getAnimationsSpy = vi.spyOn(host1, "getAnimations").mockImplementation(() => [
            {
                cancel: cancelSpy,
            } as unknown as Animation,
        ]);

        unmountTracked(inst1);
        expect(getAnimationsSpy).toHaveBeenCalled();
        expect(cancelSpy).toHaveBeenCalledTimes(1);
        expect(host1.hasAttribute("torph-root")).toBe(false);
        expect(document.head.querySelectorAll('style[data-torph="true"]').length).toBe(1);

        unmountTracked(inst2);
        expect(document.head.querySelectorAll('style[data-torph="true"]').length).toBe(0);
    });
});
