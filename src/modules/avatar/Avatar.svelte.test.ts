import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { resolveAvatarHue } from "./avatar-utils.internal.ts";
import AvatarTestHost, { type TestAvatarItemConfig } from "./AvatarTestHost.internal.svelte";
import {
    AVATAR_COLORS,
    AVATAR_PATTERNS,
    AVATAR_SIZES,
    AVATAR_STATUSES,
    AVATAR_VARIANTS,
    Avatar,
    type AvatarColor,
    type AvatarPattern,
    type AvatarRef,
    type AvatarSize,
    type AvatarStatus,
    type AvatarVariant,
} from "./index.ts";

function getRequired<T extends Element>(parent: ParentNode, selector: string): T {
    const el = parent.querySelector<T>(selector);
    if (!el) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return el;
}

describe("Avatar & AvatarGroup Svelte 5 Components", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("1. Exports & Required Props Contract", () => {
        test("exports canonical variant, size, color, pattern, and status option lists", () => {
            expect(AVATAR_VARIANTS).toEqual(["soft", "solid"]);
            expect(AVATAR_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
            expect(AVATAR_COLORS).toEqual(["auto", "base", "accent", "positive", "caution", "negative"]);
            expect(AVATAR_PATTERNS).toEqual(["diagonal", "none"]);
            expect(AVATAR_STATUSES).toEqual(["online", "busy", "away", "offline"]);
        });

        test("throws in $effect.pre when variant or size is missing outside AvatarGroup", () => {
            expect(() => {
                const instance = mount(Avatar, {
                    target: container,
                    props: { size: "md" },
                });
                flushSync();
                unmount(instance);
            }).toThrow("<Avatar> requires both `variant` and `size`");

            expect(() => {
                const instance = mount(Avatar, {
                    target: container,
                    props: { variant: "soft" },
                });
                flushSync();
                unmount(instance);
            }).toThrow("<Avatar> requires both `variant` and `size`");

            expect(() => {
                const instance = mount(Avatar, {
                    target: container,
                    props: {},
                });
                flushSync();
                unmount(instance);
            }).toThrow("<Avatar> requires both `variant` and `size`");
        });
    });

    describe("2. Polymorphic Rendering & Precedence", () => {
        test("renders static <span> by default without data-interactive", () => {
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    name: "Ada Lovelace",
                },
            });
            flushSync();

            const root = getRequired<HTMLSpanElement>(container, ".cs-avatar");
            expect(root.tagName).toBe("SPAN");
            expect(root.dataset.interactive).toBeUndefined();

            unmount(instance);
        });

        test("renders <button type='button'> when onclick is provided and enforces type='button'", () => {
            const onClick = vi.fn();
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "solid",
                    size: "md",
                    name: "Ada Lovelace",
                    onclick: onClick,
                    type: "submit",
                },
            });
            flushSync();

            const button = getRequired<HTMLButtonElement>(container, "button.cs-avatar");
            expect(button.getAttribute("type")).toBe("button");
            expect(button.dataset.interactive).toBe("");
            expect(button.hasAttribute("role")).toBe(false);

            button.click();
            expect(onClick).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("renders <a> when href is provided, and href takes precedence over onclick", () => {
            const onClick = vi.fn((event: MouseEvent) => {
                event.preventDefault();
            });
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    name: "Ada Lovelace",
                    href: "/users/ada",
                    onclick: onClick,
                },
            });
            flushSync();

            const anchor = getRequired<HTMLAnchorElement>(container, "a.cs-avatar");
            expect(container.querySelector("button.cs-avatar")).toBeNull();
            expect(anchor.getAttribute("href")).toBe("/users/ada");
            expect(anchor.dataset.interactive).toBe("");
            expect(anchor.hasAttribute("role")).toBe(false);

            anchor.click();
            expect(onClick).toHaveBeenCalledTimes(1);

            unmount(instance);
        });
    });

    describe("3. Accessibility & Semantics", () => {
        test("static span with name sets role='img' and derived aria-label (+ localized status)", () => {
            const state = $state<{ status?: AvatarStatus }>({ status: undefined });
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    name: "Ada Lovelace",
                    get status() {
                        return state.status;
                    },
                },
            });
            flushSync();

            const root = getRequired<HTMLSpanElement>(container, "span.cs-avatar");
            const surface = getRequired<HTMLSpanElement>(root, ".cs-avatar-surface");
            expect(root.getAttribute("role")).toBe("img");
            expect(root.getAttribute("aria-label")).toBe("Ada Lovelace");
            expect(root.hasAttribute("aria-hidden")).toBe(false);
            expect(surface.getAttribute("aria-hidden")).toBe("true");

            state.status = "online";
            flushSync();
            expect(root.getAttribute("aria-label")).toBe("Ada Lovelace, online");
            const statusDot = getRequired<HTMLSpanElement>(root, ".cs-avatar-status");
            expect(statusDot.getAttribute("aria-hidden")).toBe("true");

            state.status = "busy";
            flushSync();
            expect(root.getAttribute("aria-label")).toBe("Ada Lovelace, busy");

            unmount(instance);
        });

        test("static span without name, aria-label, aria-labelledby, or children is decorative (aria-hidden='true', no role)", () => {
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                },
            });
            flushSync();

            const root = getRequired<HTMLSpanElement>(container, "span.cs-avatar");
            expect(root.getAttribute("aria-hidden")).toBe("true");
            expect(root.hasAttribute("role")).toBe(false);
            expect(root.hasAttribute("aria-label")).toBe(false);

            unmount(instance);
        });

        test("explicit aria-label, aria-labelledby, and aria-hidden='true' override defaults on static span", () => {
            const state = $state<{
                ariaLabel?: string;
                ariaLabelledby?: string;
                ariaHidden?: "true";
            }>({
                ariaLabel: "Custom Label",
            });

            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    name: "Ada Lovelace",
                    get "aria-label"() {
                        return state.ariaLabel;
                    },
                    get "aria-labelledby"() {
                        return state.ariaLabelledby;
                    },
                    get "aria-hidden"() {
                        return state.ariaHidden;
                    },
                },
            });
            flushSync();

            const root = getRequired<HTMLSpanElement>(container, "span.cs-avatar");
            expect(root.getAttribute("role")).toBe("img");
            expect(root.getAttribute("aria-label")).toBe("Custom Label");

            state.ariaLabel = undefined;
            state.ariaLabelledby = "external-name-id";
            flushSync();
            expect(root.getAttribute("role")).toBe("img");
            expect(root.getAttribute("aria-labelledby")).toBe("external-name-id");
            expect(root.hasAttribute("aria-label")).toBe(false);

            state.ariaLabelledby = undefined;
            state.ariaHidden = "true";
            flushSync();
            expect(root.hasAttribute("role")).toBe(false);
            expect(root.getAttribute("aria-hidden")).toBe("true");

            unmount(instance);
        });

        test("interactive <button> and <a> derive aria-label from name + status and honor explicit overrides", () => {
            const state = $state<{
                href?: string;
                status?: AvatarStatus;
                ariaLabel?: string;
            }>({
                href: undefined,
                status: "online",
                ariaLabel: undefined,
            });

            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    name: "Ada Lovelace",
                    onclick: vi.fn(),
                    get href() {
                        return state.href;
                    },
                    get status() {
                        return state.status;
                    },
                    get "aria-label"() {
                        return state.ariaLabel;
                    },
                },
            });
            flushSync();

            const button = getRequired<HTMLButtonElement>(container, "button.cs-avatar");
            expect(button.getAttribute("aria-label")).toBe("Ada Lovelace, online");

            state.ariaLabel = "Open Ada profile";
            flushSync();
            expect(button.getAttribute("aria-label")).toBe("Open Ada profile");

            state.ariaLabel = undefined;
            state.href = "/users/ada";
            state.status = "away";
            flushSync();
            const anchor = getRequired<HTMLAnchorElement>(container, "a.cs-avatar");
            expect(anchor.getAttribute("aria-label")).toBe("Ada Lovelace, away");

            unmount(instance);
        });
    });

    describe("4. Disabled Behavior (Button & Anchor)", () => {
        test("disabled <button> sets native disabled, data-disabled, and blocks click", () => {
            const onClick = vi.fn();
            const state = $state({ disabled: true });

            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "solid",
                    size: "md",
                    name: "Ada",
                    onclick: onClick,
                    get disabled() {
                        return state.disabled;
                    },
                },
            });
            flushSync();

            const button = getRequired<HTMLButtonElement>(container, "button.cs-avatar");
            expect(button.disabled).toBe(true);
            expect(button.dataset.disabled).toBe("");

            button.click();
            expect(onClick).not.toHaveBeenCalled();

            state.disabled = false;
            flushSync();
            expect(button.disabled).toBe(false);
            expect(button.dataset.disabled).toBeUndefined();

            button.click();
            expect(onClick).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("disabled <a> sets aria-disabled='true', tabindex=-1, data-disabled, and prevents click + propagation", () => {
            const onClick = vi.fn();
            const bodyClick = vi.fn();
            document.body.addEventListener("click", bodyClick);

            const state = $state({ disabled: true });
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    name: "Ada",
                    href: "/users/ada",
                    onclick: onClick,
                    get disabled() {
                        return state.disabled;
                    },
                },
            });
            flushSync();

            const anchor = getRequired<HTMLAnchorElement>(container, "a.cs-avatar");
            expect(anchor.getAttribute("aria-disabled")).toBe("true");
            expect(anchor.getAttribute("tabindex")).toBe("-1");
            expect(anchor.dataset.disabled).toBe("");

            const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
            anchor.dispatchEvent(clickEvent);
            expect(clickEvent.defaultPrevented).toBe(true);
            expect(onClick).not.toHaveBeenCalled();
            expect(bodyClick).not.toHaveBeenCalled();

            state.disabled = false;
            flushSync();
            expect(anchor.hasAttribute("aria-disabled")).toBe(false);
            expect(anchor.hasAttribute("tabindex")).toBe(false);
            expect(anchor.dataset.disabled).toBeUndefined();

            const enabledEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
            anchor.dispatchEvent(enabledEvent);
            expect(onClick).toHaveBeenCalledTimes(1);

            document.body.removeEventListener("click", bodyClick);
            unmount(instance);
        });
    });

    describe("5. Deterministic Hue, Color, Pattern & data-* Attributes", () => {
        test("sets --cs-avatar-hue when color='auto' with name/seed, seed overrides name, and falls back to base without either", () => {
            const state = $state<{
                name?: string;
                seed?: string;
                color: AvatarColor;
                pattern?: AvatarPattern;
                style?: string;
            }>({
                name: "Ada Lovelace",
                seed: undefined,
                color: "auto",
                pattern: undefined,
                style: "opacity: 0.9;",
            });

            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get name() {
                        return state.name;
                    },
                    get seed() {
                        return state.seed;
                    },
                    get color() {
                        return state.color;
                    },
                    get pattern() {
                        return state.pattern;
                    },
                    get style() {
                        return state.style;
                    },
                },
            });
            flushSync();

            const root = getRequired<HTMLSpanElement>(container, ".cs-avatar");
            const nameHue = resolveAvatarHue("Ada Lovelace");
            expect(root.dataset.color).toBe("auto");
            expect(root.dataset.pattern).toBe("diagonal");
            expect(root.getAttribute("style")).toContain(`--cs-avatar-hue: ${nameHue};`);
            expect(root.getAttribute("style")).toContain("opacity: 0.9;");

            // seed overrides name
            state.seed = "usr_999";
            flushSync();
            const seedHue = resolveAvatarHue("usr_999");
            expect(root.dataset.color).toBe("auto");
            expect(root.dataset.pattern).toBe("diagonal");
            expect(root.getAttribute("style")).toContain(`--cs-avatar-hue: ${seedHue};`);

            // unseeded auto falls back to base + no --cs-avatar-hue
            state.name = " ".repeat(3);
            state.seed = undefined;
            flushSync();
            expect(root.dataset.color).toBe("base");
            expect(root.dataset.pattern).toBe("diagonal");
            expect(root.getAttribute("style")).toBe("opacity: 0.9;");

            // explicit color suppresses --cs-avatar-hue even when seeded, and pattern="none" updates data-pattern
            state.name = "Ada Lovelace";
            state.color = "accent";
            state.pattern = "none";
            flushSync();
            expect(root.dataset.color).toBe("accent");
            expect(root.dataset.pattern).toBe("none");
            expect(root.getAttribute("style")).toBe("opacity: 0.9;");

            unmount(instance);
        });

        test("updates data-variant, data-size, data-status, and class merging reactively", () => {
            const state = $state<{
                variant: AvatarVariant;
                size: AvatarSize;
                status?: AvatarStatus;
            }>({
                variant: "soft",
                size: "xs",
                status: undefined,
            });

            const instance = mount(Avatar, {
                target: container,
                props: {
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                    get status() {
                        return state.status;
                    },
                    name: "Ada Lovelace",
                    class: "custom-avatar",
                },
            });
            flushSync();

            const root = getRequired<HTMLSpanElement>(container, ".cs-avatar");
            expect(root.classList.contains("custom-avatar")).toBe(true);
            expect(root.dataset.variant).toBe("soft");
            expect(root.dataset.size).toBe("xs");
            expect(root.dataset.status).toBeUndefined();
            expect(root.querySelector(".cs-avatar-status")).toBeNull();
            expect(getRequired(root, ".cs-avatar-content").textContent?.trim()).toBe("A");

            state.variant = "solid";
            state.size = "xl";
            state.status = "away";
            flushSync();

            expect(root.dataset.variant).toBe("solid");
            expect(root.dataset.size).toBe("xl");
            expect(root.dataset.status).toBe("away");
            expect(root.querySelector(".cs-avatar-status")).not.toBeNull();
            expect(getRequired(root, ".cs-avatar-content").textContent?.trim()).toBe("AL");

            unmount(instance);
        });
    });

    describe("6. Initials, Fallback SVG, Children Snippet & HitArea", () => {
        test("renders fallback SVG when name, initials, and children are absent", () => {
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                },
            });
            flushSync();

            const content = getRequired(container, ".cs-avatar-content");
            expect(content.querySelector("svg.cs-avatar-fallback")).not.toBeNull();

            unmount(instance);
        });

        test("children snippet replaces initials and fallback icon, and respects name/aria-label for decorative vs labelled semantics", () => {
            let capturedRef: AvatarRef | null = null;
            const state = $state<{ name?: string }>({ name: undefined });
            const instance = mount(AvatarTestHost, {
                target: container,
                props: {
                    mode: "snippet",
                    variant: "soft",
                    size: "md",
                    customText: "VIP",
                    get name() {
                        return state.name;
                    },
                    onAvatarRef: (el) => {
                        capturedRef = el;
                    },
                },
            });
            flushSync();

            const root = getRequired<HTMLSpanElement>(container, "span.cs-avatar");
            const content = getRequired(root, ".cs-avatar-content");
            expect(capturedRef).toBe(root);
            expect(content.querySelector("[data-testid='custom-child']")?.textContent).toBe("VIP");
            expect(content.querySelector("svg.cs-avatar-fallback")).toBeNull();
            expect(root.getAttribute("aria-hidden")).toBe("true");
            expect(root.hasAttribute("role")).toBe(false);

            state.name = "VIP Member";
            flushSync();
            expect(root.hasAttribute("aria-hidden")).toBe(false);
            expect(root.getAttribute("role")).toBe("img");
            expect(root.getAttribute("aria-label")).toBe("VIP Member");

            unmount(instance);
        });

        test("renders HitArea for standalone interactive sizes xs..lg and omits it at xl", () => {
            const state = $state<{ size: AvatarSize }>({ size: "md" });
            const instance = mount(Avatar, {
                target: container,
                props: {
                    variant: "soft",
                    get size() {
                        return state.size;
                    },
                    name: "Ada",
                    onclick: vi.fn(),
                },
            });
            flushSync();

            expect(container.querySelector(".cs-hit-area")).not.toBeNull();

            state.size = "lg";
            flushSync();
            expect(container.querySelector(".cs-hit-area")).not.toBeNull();

            state.size = "xl";
            flushSync();
            expect(container.querySelector(".cs-hit-area")).toBeNull();

            unmount(instance);
        });
    });

    describe("7. AvatarGroup Contracts", () => {
        test("inherits variant, size, and disabled into nested Avatars and supports local overrides", () => {
            const onClick = vi.fn();
            const state = $state<{
                variant: AvatarVariant;
                size: AvatarSize;
                disabled: boolean;
                overlap: boolean;
                items: TestAvatarItemConfig[];
            }>({
                variant: "soft",
                size: "sm",
                disabled: false,
                overlap: true,
                items: [
                    { id: "a", name: "Ada Lovelace", onclick: onClick },
                    { id: "b", name: "Grace Hopper", variant: "solid", size: "lg" },
                ],
            });

            let capturedGroupRef: HTMLDivElement | null = null;
            const instance = mount(AvatarTestHost, {
                target: container,
                props: {
                    mode: "group",
                    onGroupRef: (el): void => {
                        capturedGroupRef = el;
                    },
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                    get disabled() {
                        return state.disabled;
                    },
                    get overlap() {
                        return state.overlap;
                    },
                    get items() {
                        return state.items;
                    },
                },
            });
            flushSync();

            const group = getRequired<HTMLDivElement>(container, ".cs-avatar-group");
            const first = getRequired<HTMLButtonElement>(group, "[data-item-id='a']");
            const second = getRequired<HTMLSpanElement>(group, "[data-item-id='b']");

            expect(capturedGroupRef).toBe(group);
            expect(group.getAttribute("role")).toBe("group");
            expect(group.dataset.variant).toBe("soft");
            expect(group.dataset.size).toBe("sm");
            expect(group.dataset.overlap).toBe("");
            expect(group.dataset.disabled).toBeUndefined();

            expect(first.dataset.variant).toBe("soft");
            expect(first.dataset.size).toBe("sm");
            expect(first.disabled).toBe(false);
            // Overlapping group omits HitArea on interactive children
            expect(first.querySelector(".cs-hit-area")).toBeNull();

            // Local override wins over group context
            expect(second.dataset.variant).toBe("solid");
            expect(second.dataset.size).toBe("lg");

            // Group disabled propagates to children, and overlap=false restores HitArea
            state.disabled = true;
            state.overlap = false;
            flushSync();

            expect(group.dataset.disabled).toBe("");
            expect(group.getAttribute("aria-disabled")).toBe("true");
            expect(group.dataset.overlap).toBeUndefined();
            expect(first.disabled).toBe(true);
            expect(first.dataset.disabled).toBe("");
            expect(second.dataset.disabled).toBe("");
            expect(first.querySelector(".cs-hit-area")).not.toBeNull();

            first.click();
            expect(onClick).not.toHaveBeenCalled();

            // Updating group variant/size updates inheriting child
            state.variant = "solid";
            state.size = "md";
            state.disabled = false;
            flushSync();
            expect(first.dataset.variant).toBe("solid");
            expect(first.dataset.size).toBe("md");
            expect(first.disabled).toBe(false);

            first.click();
            expect(onClick).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("truncates items beyond max in DOM order, renders +N overflow squircle, and updates on dynamic changes", () => {
            const state = $state<{
                max?: number;
                items: TestAvatarItemConfig[];
            }>({
                max: 2,
                items: [
                    { id: "1", name: "Ada Lovelace" },
                    { id: "2", name: "Grace Hopper" },
                    { id: "3", name: "Margaret Hamilton" },
                    { id: "4", name: "Katherine Johnson" },
                ],
            });

            const instance = mount(AvatarTestHost, {
                target: container,
                props: {
                    mode: "group",
                    variant: "solid",
                    size: "md",
                    get max() {
                        return state.max;
                    },
                    get items() {
                        return state.items;
                    },
                },
            });
            flushSync();

            const group = getRequired<HTMLDivElement>(container, ".cs-avatar-group");
            const getItem = (id: string): HTMLElement => getRequired<HTMLElement>(group, `[data-item-id='${id}']`);

            expect(getItem("1").hidden).toBe(false);
            expect(getItem("2").hidden).toBe(false);
            expect(getItem("3").hidden).toBe(true);
            expect(getItem("3").dataset.overflowHidden).toBe("");
            expect(getItem("4").hidden).toBe(true);
            expect(getItem("4").dataset.overflowHidden).toBe("");

            let overflow = getRequired<HTMLSpanElement>(group, ".cs-avatar-overflow");
            expect(overflow.getAttribute("role")).toBe("img");
            expect(overflow.getAttribute("aria-label")).toBe("2 more");
            expect(overflow.dataset.variant).toBe("solid");
            expect(overflow.dataset.size).toBe("md");
            expect(overflow.dataset.color).toBe("base");
            expect(overflow.dataset.pattern).toBe("none");
            expect(getRequired(overflow, ".cs-avatar-content").textContent?.trim()).toBe("+2");

            // Removing an item updates overflow count to +1
            state.items = state.items.filter((item) => item.id !== "2");
            flushSync();
            expect(getItem("1").hidden).toBe(false);
            expect(getItem("3").hidden).toBe(false);
            expect(getItem("4").hidden).toBe(true);
            overflow = getRequired<HTMLSpanElement>(group, ".cs-avatar-overflow");
            expect(overflow.getAttribute("aria-label")).toBe("1 more");
            expect(getRequired(overflow, ".cs-avatar-content").textContent?.trim()).toBe("+1");

            // Increasing max >= items.length removes overflow squircle and unhides all
            state.max = 5;
            flushSync();
            expect(group.querySelector(".cs-avatar-overflow")).toBeNull();
            expect(getItem("4").hidden).toBe(false);

            // max=0 hides all items and shows +3
            state.max = 0;
            flushSync();
            expect(getItem("1").hidden).toBe(true);
            expect(getItem("3").hidden).toBe(true);
            expect(getItem("4").hidden).toBe(true);
            overflow = getRequired<HTMLSpanElement>(group, ".cs-avatar-overflow");
            expect(overflow.getAttribute("aria-label")).toBe("3 more");

            // max=undefined unhides all
            state.max = undefined;
            flushSync();
            expect(group.querySelector(".cs-avatar-overflow")).toBeNull();
            expect(getItem("1").hidden).toBe(false);
            expect(getItem("3").hidden).toBe(false);
            expect(getItem("4").hidden).toBe(false);

            unmount(instance);
        });

        test("re-registers item cleanly across polymorphic transitions (<span> -> <button> -> <a>) inside AvatarGroup", () => {
            const onClick = vi.fn();
            const state = $state<{
                items: TestAvatarItemConfig[];
            }>({
                items: [
                    { id: "poly", name: "Ada Lovelace" },
                    { id: "second", name: "Grace Hopper" },
                ],
            });

            const instance = mount(AvatarTestHost, {
                target: container,
                props: {
                    mode: "group",
                    variant: "soft",
                    size: "md",
                    max: 1,
                    get items() {
                        return state.items;
                    },
                },
            });
            flushSync();

            const group = getRequired<HTMLDivElement>(container, ".cs-avatar-group");
            expect(getRequired(group, "[data-item-id='poly']").tagName).toBe("SPAN");
            expect(getRequired<HTMLElement>(group, "[data-item-id='second']").hidden).toBe(true);

            // Transition <span> -> <button>
            state.items = [
                { id: "poly", name: "Ada Lovelace", onclick: onClick },
                { id: "second", name: "Grace Hopper" },
            ];
            flushSync();
            const buttonEl = getRequired<HTMLButtonElement>(group, "[data-item-id='poly']");
            expect(buttonEl.tagName).toBe("BUTTON");
            expect(buttonEl.hidden).toBe(false);
            expect(getRequired<HTMLElement>(group, "[data-item-id='second']").hidden).toBe(true);

            // Transition <button> -> <a>
            state.items = [
                { id: "poly", name: "Ada Lovelace", href: "/users/ada" },
                { id: "second", name: "Grace Hopper" },
            ];
            flushSync();
            const anchorEl = getRequired<HTMLAnchorElement>(group, "[data-item-id='poly']");
            expect(anchorEl.tagName).toBe("A");
            expect(anchorEl.hidden).toBe(false);
            expect(getRequired<HTMLElement>(group, "[data-item-id='second']").hidden).toBe(true);

            unmount(instance);
        });
    });
});
