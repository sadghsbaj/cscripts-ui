import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Popover, type PopoverPlacement, popoverTrigger } from "../popover";
import Tooltip from "./Tooltip.svelte";
import TooltipCompoundHost from "./TooltipCompoundHost.internal.svelte";
import TooltipReactiveHost from "./TooltipReactiveHost.internal.svelte";
import TooltipTestIcon from "./TooltipTestIcon.internal.svelte";
import type { TooltipIconConfig } from "./index.ts";
import { tooltip } from "./tooltip.attach.svelte";

const openPopovers = new WeakSet<HTMLElement>();
const stubbedElements = new WeakSet<HTMLElement>();

function ensurePopoverStub(el: HTMLElement): HTMLElement {
    if (stubbedElements.has(el)) return el;
    stubbedElements.add(el);

    const originalMatches = el.matches.bind(el);
    el.matches = ((selector: string) =>
        selector === ":popover-open" ? openPopovers.has(el) : originalMatches(selector)) as typeof el.matches;

    Object.defineProperties(el, {
        showPopover: {
            configurable: true,
            value: () => {
                openPopovers.add(el);
            },
        },
        hidePopover: {
            configurable: true,
            value: () => {
                openPopovers.delete(el);
            },
        },
        togglePopover: {
            configurable: true,
            value: (options?: boolean | { force?: boolean }) => {
                const force = typeof options === "boolean" ? options : options?.force;
                const next = typeof force === "boolean" ? force : !openPopovers.has(el);
                if (next) {
                    openPopovers.add(el);
                } else {
                    openPopovers.delete(el);
                }
                return next;
            },
        },
    });

    return el;
}

function pointerEnter(node: HTMLElement): void {
    node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false, pointerType: "mouse" }));
}

function pointerLeave(node: HTMLElement): void {
    node.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false, pointerType: "mouse" }));
}

function pointerDown(node: HTMLElement): void {
    node.dispatchEvent(
        new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            pointerType: "mouse",
            button: 0,
        })
    );
}

describe("Tooltip & Popover Integration", () => {
    let container: HTMLDivElement;
    const cleanups: Array<() => void> = [];
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        vi.useFakeTimers();

        const origGetById = document.getElementById.bind(document);
        vi.spyOn(document, "getElementById").mockImplementation((id: string) => {
            const el = origGetById(id);
            return el ? ensurePopoverStub(el) : null;
        });

        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        for (const cleanup of cleanups) cleanup();
        cleanups.length = 0;

        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;

        // Flush microtask cleanup for mountedTooltips in tooltip.attach.svelte.ts
        await Promise.resolve();
        vi.advanceTimersByTime(500);

        container.remove();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    test("<Popover /> defaults to popover='auto' and supports popover='manual'", () => {
        const autoInst = mount(Popover, {
            target: container,
            props: { id: "pop-auto", placement: "bottom", width: "content" },
        });
        const manualInst = mount(Popover, {
            target: container,
            props: { id: "pop-manual", placement: "top", width: "anchor", popover: "manual" },
        });
        instances.push(autoInst, manualInst);
        flushSync();

        const autoEl = document.getElementById("pop-auto");
        const manualEl = document.getElementById("pop-manual");

        expect(autoEl?.getAttribute("popover")).toBe("auto");
        expect(autoEl?.dataset.placement).toBe("bottom");
        expect(autoEl?.dataset.width).toBe("content");
        expect(autoEl?.dataset.animate).toBe("");

        expect(manualEl?.getAttribute("popover")).toBe("manual");
        expect(manualEl?.dataset.placement).toBe("top");
        expect(manualEl?.dataset.width).toBe("anchor");
    });

    test("<Tooltip /> renders popover='manual' (never 'hint') and role='tooltip'", () => {
        const inst = mount(Tooltip, {
            target: container,
            props: { id: "tip-1", text: "Copy" },
        });
        instances.push(inst);
        flushSync();

        const tipEl = document.getElementById("tip-1");
        expect(tipEl).not.toBeNull();
        expect(tipEl?.getAttribute("popover")).toBe("manual");
        expect(tipEl?.getAttribute("popover")).not.toBe("hint");
        expect(tipEl?.getAttribute("role")).toBe("tooltip");
        expect(tipEl?.dataset.width).toBe("content");
        expect(tipEl?.dataset.placement).toBe("top");
        expect(tipEl?.textContent).toContain("Copy");
    });

    test("<Tooltip /> supports compound children with TooltipText and KbdGroup", () => {
        const inst = mount(TooltipCompoundHost, {
            target: container,
            props: { id: "tip-compound" },
        });
        instances.push(inst);
        flushSync();

        const tipEl = document.getElementById("tip-compound");
        expect(tipEl).not.toBeNull();
        expect(tipEl?.getAttribute("popover")).toBe("manual");
        expect(tipEl?.getAttribute("role")).toBe("tooltip");

        const textEl = tipEl?.querySelector<HTMLSpanElement>(".cs-tooltip-text");
        expect(textEl?.textContent).toBe("Copy");

        const kbdGroup = tipEl?.querySelector<HTMLSpanElement>(".cs-kbd-group");
        expect(kbdGroup?.dataset.variant).toBe("soft");
        expect(kbdGroup?.dataset.size).toBe("sm");

        const kbds = [...(kbdGroup?.querySelectorAll<HTMLElement>("kbd.cs-kbd") ?? [])];
        expect(kbds).toHaveLength(2);
        expect(kbds[0]?.dataset.variant).toBe("soft");
        expect(kbds[0]?.dataset.size).toBe("sm");
        expect(kbds[0]?.getAttribute("aria-label")).toBe("Control");
        expect(kbds[0]?.textContent?.trim()).toBe("Ctrl");
        expect(kbdGroup?.querySelector(".cs-kbd-separator")).not.toBeNull();
        expect(kbds[1]?.dataset.variant).toBe("soft");
        expect(kbds[1]?.dataset.size).toBe("sm");
        expect(kbds[1]?.textContent?.trim()).toBe("C");
    });

    test("tooltip() wires aria-describedby and delegates hover, custom delay, and warmup to popoverTrigger", async () => {
        const btn1 = document.createElement("button");
        const btn2 = document.createElement("button");
        container.append(btn1, btn2);

        const cleanup1 = tooltip({ text: "First tooltip", delay: [100, 50], placement: "bottom", offset: "12px" })(btn1);
        const cleanup2 = tooltip({ text: "Second tooltip", delay: [200, 50] })(btn2);
        if (typeof cleanup1 === "function") cleanups.push(cleanup1);
        if (typeof cleanup2 === "function") cleanups.push(cleanup2);
        flushSync();

        const tipId1 = btn1.getAttribute("aria-describedby");
        const tipId2 = btn2.getAttribute("aria-describedby");
        expect(tipId1).toMatch(/^tooltip-/);
        expect(tipId2).toMatch(/^tooltip-/);

        const tipEl1 = document.getElementById(tipId1 ?? "");
        const tipEl2 = document.getElementById(tipId2 ?? "");
        expect(tipEl1?.getAttribute("popover")).toBe("manual");
        expect(tipEl1?.getAttribute("role")).toBe("tooltip");
        expect(tipEl1?.dataset.placement).toBe("bottom");
        expect(tipEl1?.style.getPropertyValue("--cs-popover-offset")).toBe("12px");
        expect(btn1.style.getPropertyValue("anchor-name")).toBe(`--anchor-${tipId1}`);

        // Respects custom 100ms open delay
        pointerEnter(btn1);
        vi.advanceTimersByTime(99);
        expect(tipEl1?.matches(":popover-open")).toBe(false);

        vi.advanceTimersByTime(1);
        expect(tipEl1?.matches(":popover-open")).toBe(true);
        expect(tipEl1?.hasAttribute("data-warm")).toBe(false);

        // Moving to second tooltip while warm opens at 0ms with data-warm and closes first with data-instant
        pointerLeave(btn1);
        pointerEnter(btn2);

        expect(tipEl2?.matches(":popover-open")).toBe(true);
        expect(tipEl2?.dataset.warm).toBe("");
        expect(tipEl1?.matches(":popover-open")).toBe(false);
        expect(tipEl1?.dataset.instant).toBe("");

        // Teardown removes aria-describedby and unmounts the dynamically mounted tooltip
        if (typeof cleanup1 === "function") cleanup1();
        if (typeof cleanup2 === "function") cleanup2();
        await Promise.resolve();

        expect(btn1.hasAttribute("aria-describedby")).toBe(false);
        expect(document.getElementById(tipId1 ?? "")).toBeNull();
        expect(document.getElementById(tipId2 ?? "")).toBeNull();
    });

    test("hovering a tooltip while a popover='auto' menu is open keeps the auto popover open", () => {
        const menuTrigger = document.createElement("button");
        const tipTrigger = document.createElement("button");
        container.append(menuTrigger, tipTrigger);

        const menuInst = mount(Popover, {
            target: container,
            props: { id: "menu-pop", placement: "bottom-start", width: "content" },
        });
        const tipInst = mount(Tooltip, {
            target: container,
            props: { id: "target-tip", text: "Help" },
        });
        instances.push(menuInst, tipInst);
        flushSync();

        const menuEl = document.getElementById("menu-pop") as HTMLElement;
        const tipEl = document.getElementById("target-tip") as HTMLElement;
        const hideMenuSpy = vi.spyOn(menuEl as HTMLElement & { hidePopover: () => void }, "hidePopover");

        const cleanupMenu = popoverTrigger({ target: "menu-pop", triggerOn: "pointerdown" })(menuTrigger);
        const cleanupTip = tooltip({ target: "target-tip" })(tipTrigger);
        if (typeof cleanupMenu === "function") cleanups.push(cleanupMenu);
        if (typeof cleanupTip === "function") cleanups.push(cleanupTip);

        expect(tipTrigger.getAttribute("aria-describedby")).toBe("target-tip");

        // Open the auto menu popover
        pointerDown(menuTrigger);
        expect(menuEl.matches(":popover-open")).toBe(true);

        // Hover the tooltip trigger -> tooltip opens, auto menu remains open
        pointerEnter(tipTrigger);
        vi.advanceTimersByTime(400);

        expect(tipEl.matches(":popover-open")).toBe(true);
        expect(menuEl.matches(":popover-open")).toBe(true);
        expect(hideMenuSpy).not.toHaveBeenCalled();
    });

    test("tooltip({ enabled: false }) wires nothing", () => {
        const btn = document.createElement("button");
        container.append(btn);

        const cleanup = tooltip({ text: "Disabled", enabled: false })(btn);
        if (typeof cleanup === "function") cleanups.push(cleanup);

        expect(btn.hasAttribute("aria-describedby")).toBe(false);
        expect(btn.style.getPropertyValue("anchor-name")).toBe("");
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    test("reactive tooltip() updates text, icon, and placement without duplicating or breaking hover", async () => {
        const props = $state<{
            text: string;
            icon?: TooltipIconConfig;
            placement: PopoverPlacement;
        }>({
            text: "Initial tip",
            placement: "top",
        });

        const inst = mount(TooltipReactiveHost, {
            target: container,
            props,
        });
        instances.push(inst);
        flushSync();

        const btn = container.querySelector("button");
        if (!btn) throw new Error("Expected button element");
        const initialId = btn.getAttribute("aria-describedby") ?? "";
        expect(initialId).toMatch(/^tooltip-/);
        expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
        expect(document.getElementById(initialId)?.textContent).toContain("Initial tip");
        expect(document.getElementById(initialId)?.dataset.placement).toBe("top");
        expect(document.getElementById(initialId)?.querySelector('[data-testid="tooltip-test-icon"]')).toBeNull();

        props.text = "Updated tip";
        props.icon = { component: TooltipTestIcon, position: "end" };
        props.placement = "bottom";
        flushSync();
        await Promise.resolve();

        expect(btn.getAttribute("aria-describedby")).toBe(initialId);
        expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

        const updatedTipEl = document.getElementById(initialId);
        expect(updatedTipEl?.textContent).toContain("Updated tip");
        expect(updatedTipEl?.textContent).not.toContain("Initial tip");
        expect(updatedTipEl?.dataset.placement).toBe("bottom");
        expect(updatedTipEl?.querySelector('[data-testid="tooltip-test-icon"]')).not.toBeNull();

        pointerEnter(btn);
        vi.advanceTimersByTime(100);
        expect(updatedTipEl?.matches(":popover-open")).toBe(true);
    });

    test("reactive enabled toggle (true -> false -> true) unmounts and re-mounts tooltip cleanly", async () => {
        const props = $state<{ enabled: boolean; text: string }>({
            enabled: true,
            text: "Toggleable tip",
        });

        const inst = mount(TooltipReactiveHost, {
            target: container,
            props,
        });
        instances.push(inst);
        flushSync();

        const btn = container.querySelector("button");
        if (!btn) throw new Error("Expected button element");
        const firstId = btn.getAttribute("aria-describedby") ?? "";
        expect(firstId).toMatch(/^tooltip-/);
        expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

        props.enabled = false;
        flushSync();
        await Promise.resolve();

        expect(btn.hasAttribute("aria-describedby")).toBe(false);
        expect(document.getElementById(firstId)).toBeNull();
        expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(0);

        props.enabled = true;
        flushSync();
        await Promise.resolve();

        const secondId = btn.getAttribute("aria-describedby") ?? "";
        expect(secondId).toMatch(/^tooltip-/);
        expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

        const remountedEl = document.getElementById(secondId);
        expect(remountedEl?.textContent).toContain("Toggleable tip");

        pointerEnter(btn);
        vi.advanceTimersByTime(100);
        expect(remountedEl?.matches(":popover-open")).toBe(true);
    });

    test("reactive switch from text mode to target mode unmounts inline Tooltip cleanly", async () => {
        const targetInst = mount(Tooltip, {
            target: container,
            props: { id: "external-tip", text: "External target tip" },
        });
        instances.push(targetInst);

        const props = $state<{ text: string; target?: string }>({
            text: "Inline tip",
            target: undefined,
        });

        const hostInst = mount(TooltipReactiveHost, {
            target: container,
            props,
        });
        instances.push(hostInst);
        flushSync();

        const btn = container.querySelector("button");
        if (!btn) throw new Error("Expected button element");
        const inlineId = btn.getAttribute("aria-describedby") ?? "";
        expect(inlineId).toMatch(/^tooltip-/);
        expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(2);
        expect(document.getElementById(inlineId)).not.toBeNull();

        props.target = "external-tip";
        flushSync();
        await Promise.resolve();

        expect(btn.getAttribute("aria-describedby")).toBe("external-tip");
        expect(document.getElementById(inlineId)).toBeNull();

        const tooltips = [...document.querySelectorAll('[role="tooltip"]')];
        expect(tooltips).toHaveLength(1);
        expect(tooltips[0]?.id).toBe("external-tip");

        pointerEnter(btn);
        vi.advanceTimersByTime(100);
        expect(document.getElementById("external-tip")?.matches(":popover-open")).toBe(true);
    });
});
