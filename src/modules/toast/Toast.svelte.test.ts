import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import {
    TOAST_COLORS,
    TOAST_PLACEMENTS,
    Toaster,
    toast,
    toastState,
    type ToastColor,
    type ToastPlacement,
} from "./index.ts";
import ToastTestHost from "./ToastTestHost.internal.svelte";

const openPopovers = new WeakSet<HTMLElement>();

function stubPopoverMethods(el: HTMLElement): { showPopover: Mock<() => void>; hidePopover: Mock<() => void> } {
    const originalMatches = el.matches.bind(el);
    el.matches = ((selector: string) =>
        selector === ":popover-open" ? openPopovers.has(el) : originalMatches(selector)) as typeof el.matches;

    const showPopover = vi.fn(() => {
        openPopovers.add(el);
    });
    const hidePopover = vi.fn(() => {
        openPopovers.delete(el);
    });

    Object.defineProperties(el, {
        showPopover: { configurable: true, value: showPopover },
        hidePopover: { configurable: true, value: hidePopover },
    });

    return { showPopover, hidePopover };
}

function resetToastStore(): void {
    for (const item of toastState.toasts) {
        toastState.remove(item.id);
    }
}

function pointerEnter(node: Element, pointerType: "mouse" | "touch" = "mouse"): void {
    node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false, pointerType }));
}

function pointerLeave(node: Element): void {
    node.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false, pointerType: "mouse" }));
}

function dispatchPointer(
    node: Element,
    type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
    init: { clientY?: number; button?: number; pointerId?: number; bubbles?: boolean } = {}
): void {
    node.dispatchEvent(
        new PointerEvent(type, {
            bubbles: init.bubbles ?? true,
            button: init.button ?? 0,
            clientY: init.clientY ?? 0,
            pointerId: init.pointerId ?? 1,
            pointerType: "mouse",
        })
    );
}

function dispatchMiddleClick(node: Element): void {
    node.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 1 }));
    node.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 1 }));
    node.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }));
}

function queryRequired<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return el;
}

function hasDataAttr(el: HTMLElement, key: string): boolean {
    return el.dataset[key] !== undefined;
}

describe("toast module", () => {
    let container: HTMLDivElement;
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement("div");
        document.body.append(container);
        resetToastStore();
    });

    afterEach(() => {
        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;
        resetToastStore();
        container.remove();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    function mountToaster(props: Record<string, unknown> = {}): {
        inst: Record<string, unknown>;
        section: HTMLElement;
        list: HTMLOListElement;
    } {
        const inst = mount(Toaster, { target: container, props });
        instances.push(inst);
        flushSync();
        const section = queryRequired<HTMLElement>(container, ".cs-toaster");
        const list = queryRequired<HTMLOListElement>(container, ".cs-toaster-list");
        return { inst, section, list };
    }

    function mountHost(props: Record<string, unknown> = {}): Record<string, unknown> & {
        getRefs: () => Record<string, HTMLElement | null>;
        triggerCustomToast: (color?: ToastColor, dismissible?: boolean) => string;
    } {
        const inst = mount(ToastTestHost, { target: container, props }) as Record<string, unknown> & {
            getRefs: () => Record<string, HTMLElement | null>;
            triggerCustomToast: (color?: ToastColor, dismissible?: boolean) => string;
        };
        instances.push(inst);
        flushSync();
        return inst;
    }

    describe("1. toast store & imperative API", () => {
        test("toast() prepends newest toast, generates id, and sets default flags", () => {
            const id1 = toast({ title: "First", color: "base" });
            const id2 = toast({ title: "Second", color: "accent", dismissible: false });

            expect(id1).toBeTruthy();
            expect(id2).toBeTruthy();
            expect(id1).not.toBe(id2);
            expect(toastState.toasts.map((t) => t.id)).toEqual([id2, id1]);
            expect(toastState.toasts[0]).toMatchObject({
                id: id2,
                title: "Second",
                color: "accent",
                dismissible: false,
                mounted: false,
                removed: false,
            });
            expect(toastState.toasts[1]?.dismissible).toBe(true);
        });

        test("color shorthands (base/accent/positive/caution/negative) support string and object forms", () => {
            const ids = [
                toast.base("Base title"),
                toast.accent("Accent title", { description: "Accent desc" }),
                toast.positive({ title: "Positive title", duration: 1500 }),
                toast.caution("Caution title"),
                toast.negative("Negative title"),
            ];

            expect(ids).toHaveLength(5);
            expect(toastState.toasts.map((t) => t.color)).toEqual(TOAST_COLORS.toReversed());
            expect(toastState.toasts.find((t) => t.id === ids[1])?.description).toBe("Accent desc");
            expect(toastState.toasts.find((t) => t.id === ids[2])?.duration).toBe(1500);
        });

        test("reusing an existing id updates toast in-place without duplicating or resetting mounted", () => {
            const id = toast({ id: "save-op", title: "Saving...", color: "base" });
            toastState.markMounted(id);
            toast.dismiss(id);
            expect(toastState.toasts[0]?.removed).toBe(true);

            const updatedId = toast({ id: "save-op", title: "Saved!", color: "positive", description: "Done" });
            expect(updatedId).toBe("save-op");
            expect(toastState.toasts).toHaveLength(1);
            expect(toastState.toasts[0]).toMatchObject({
                id: "save-op",
                title: "Saved!",
                description: "Done",
                color: "positive",
                mounted: true,
                removed: false,
            });
        });

        test("toast.custom() enqueues custom snippet toast and in-place update clears standard fields", () => {
            const host = mountHost();
            const id = toast({ id: "shared-id", title: "Plain", description: "Desc", color: "base" });
            flushSync();
            expect(container.querySelector(".cs-toast-title")?.textContent).toBe("Plain");

            const customId = toast.custom((() => {}) as never, {
                id: "shared-id",
                color: "caution",
                dismissible: false,
            });
            expect(customId).toBe(id);
            expect(toastState.toasts).toHaveLength(1);
            expect(toastState.toasts[0]?.title).toBeUndefined();
            expect(toastState.toasts[0]?.description).toBeUndefined();
            expect(toastState.toasts[0]?.dismissible).toBe(false);

            const customRealId = host.triggerCustomToast("positive", true);
            flushSync();
            const customEl = container.querySelector<HTMLElement>(`[data-toast-id="${CSS.escape(customRealId)}"]`);
            expect(customEl).not.toBeNull();
            expect(customEl?.dataset.color).toBe("positive");
            expect(container.querySelector('[data-testid="custom-title"]')?.textContent).toBe("Custom Compound");
        });

        test("toast.promise() creates persistent base toast and updates in-place on resolve", async () => {
            const { promise: p, resolve: resolveFn } = Promise.withResolvers<{ count: number }>();

            const pendingPromise = toast.promise(p, {
                loading: "Uploading...",
                success: (data) => ({ title: `Uploaded ${data.count} files`, description: "All good" }),
                error: "Upload failed",
            });

            expect(toastState.toasts).toHaveLength(1);
            const toastId = toastState.toasts[0]?.id;
            expect(toastState.toasts[0]).toMatchObject({
                title: "Uploading...",
                color: "base",
                duration: Infinity,
            });

            resolveFn({ count: 3 });
            const result = await pendingPromise;
            expect(result).toEqual({ count: 3 });

            expect(toastState.toasts).toHaveLength(1);
            expect(toastState.toasts[0]).toMatchObject({
                id: toastId,
                title: "Uploaded 3 files",
                description: "All good",
                color: "positive",
            });
            expect(toastState.toasts[0]?.duration).toBeUndefined();
        });

        test("toast.promise() updates in-place to negative on reject and rethrows error", async () => {
            const { promise: p, reject: rejectFn } = Promise.withResolvers<string>();

            const pendingPromise = toast.promise(() => p, {
                loading: "Deleting...",
                success: "Deleted",
                error: (err) => `Failed: ${(err as Error).message}`,
            });

            const toastId = toastState.toasts[0]?.id;
            rejectFn(new Error("Permission denied"));

            await expect(pendingPromise).rejects.toThrow("Permission denied");
            expect(toastState.toasts).toHaveLength(1);
            expect(toastState.toasts[0]).toMatchObject({
                id: toastId,
                title: "Failed: Permission denied",
                color: "negative",
            });
        });

        test("toast.dismiss(id) and toast.dismiss() mark removed and fire onDismiss idempotently", () => {
            const onDismiss1 = vi.fn();
            const onDismiss2 = vi.fn();
            const id1 = toast.base("One", { onDismiss: onDismiss1 });
            const id2 = toast.base("Two", { onDismiss: onDismiss2 });

            toast.dismiss(id1);
            toast.dismiss(id1);
            expect(onDismiss1).toHaveBeenCalledTimes(1);
            expect(toastState.toasts.find((t) => t.id === id1)?.removed).toBe(true);
            expect(toastState.toasts.find((t) => t.id === id2)?.removed).toBe(false);

            toast.dismiss();
            expect(onDismiss1).toHaveBeenCalledTimes(1);
            expect(onDismiss2).toHaveBeenCalledTimes(1);
            expect(toastState.toasts.every((t) => t.removed)).toBe(true);
        });
    });

    describe("2. <Toaster /> rendering, placements, stacking & timers", () => {
        test("renders popover='manual', defaults to bottom-right, and toggles topLayer on 0 <-> 1 toasts", () => {
            const { section } = mountToaster();
            const { showPopover, hidePopover } = stubPopoverMethods(section);

            expect(section.getAttribute("popover")).toBe("manual");
            expect(section.dataset.placement).toBe("bottom-right");
            expect(section.style.getPropertyValue("--cs-toast-lift")).toBe("-1");
            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(0);
            expect(showPopover).not.toHaveBeenCalled();

            const id = toast.positive("Hello");
            flushSync();
            expect(showPopover).toHaveBeenCalledTimes(1);
            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(1);

            toast.dismiss(id);
            flushSync();
            vi.advanceTimersByTime(350);
            flushSync();
            expect(hidePopover).toHaveBeenCalledTimes(1);
            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(0);
        });

        test.each(TOAST_PLACEMENTS)(
            "supports placement=%s with correct data-placement and --cs-toast-lift",
            (placement: ToastPlacement) => {
                const { section } = mountToaster({ placement });
                expect(section.dataset.placement).toBe(placement);
                const expectedLift = placement.startsWith("top-") ? "1" : "-1";
                expect(section.style.getPropertyValue("--cs-toast-lift")).toBe(expectedLift);
            }
        );

        test("maxVisible gates data-visible and promotes rear toasts when front dismisses", () => {
            const { section } = mountToaster({ maxVisible: 2 });
            const id1 = toast.base("1");
            const id2 = toast.base("2");
            const id3 = toast.base("3");
            const id4 = toast.base("4");
            flushSync();

            const items = (): HTMLLIElement[] => [...section.querySelectorAll<HTMLLIElement>("li.cs-toast-item")];
            expect(items().map((el) => hasDataAttr(el, "front"))).toEqual([true, false, false, false]);
            expect(items().map((el) => hasDataAttr(el, "visible"))).toEqual([true, true, false, false]);

            toast.dismiss(id4);
            flushSync();
            expect(items().map((el) => hasDataAttr(el, "removed"))).toEqual([true, false, false, false]);
            expect(items().map((el) => hasDataAttr(el, "front"))).toEqual([false, true, false, false]);
            expect(items().map((el) => hasDataAttr(el, "visible"))).toEqual([false, true, true, false]);

            vi.advanceTimersByTime(350);
            flushSync();
            expect(items()).toHaveLength(3);
            expect(items().map((el) => hasDataAttr(el, "visible"))).toEqual([true, true, false]);
            expect(toastState.toasts.map((t) => t.id)).toEqual([id3, id2, id1]);
        });

        test("sets data-mounted after double rAF and cleans up data-removed after 350ms", () => {
            const { section } = mountToaster();
            const id = toast.base("Animated");
            flushSync();

            const item = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
            expect(hasDataAttr(item, "mounted")).toBe(false);

            vi.advanceTimersByTime(50);
            flushSync();
            expect(hasDataAttr(item, "mounted")).toBe(true);

            toast.dismiss(id);
            flushSync();
            expect(hasDataAttr(item, "removed")).toBe(true);

            vi.advanceTimersByTime(349);
            flushSync();
            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(1);

            vi.advanceTimersByTime(1);
            flushSync();
            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(0);
        });

        test("unmounts immediately via microtask when prefers-reduced-motion: reduce is active", async () => {
            vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
                matches: query === "(prefers-reduced-motion: reduce)",
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { section } = mountToaster();
            const id = toast.base("Reduced motion");
            flushSync();
            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(1);

            toast.dismiss(id);
            flushSync();
            await Promise.resolve();
            flushSync();
            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(0);
        });

        test("auto-dismisses after duration, fires onAutoClose (not onDismiss), and keeps duration: Infinity persistent", () => {
            const onAutoClose = vi.fn();
            const onDismiss = vi.fn();
            mountToaster({ duration: 4000 });

            const transientId = toast.base("Transient", { onAutoClose, onDismiss });
            const persistentId = toast.accent("Persistent", { duration: Infinity });
            flushSync();

            vi.advanceTimersByTime(3999);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();
            expect(toastState.toasts.find((t) => t.id === transientId)?.removed).toBe(false);

            vi.advanceTimersByTime(1);
            flushSync();
            expect(onAutoClose).toHaveBeenCalledTimes(1);
            expect(onDismiss).not.toHaveBeenCalled();
            expect(toastState.toasts.find((t) => t.id === transientId)?.removed).toBe(true);

            vi.advanceTimersByTime(60_000);
            flushSync();
            expect(toastState.toasts.map((t) => t.id)).toEqual([persistentId]);
            expect(toastState.toasts[0]?.removed).toBe(false);
        });

        test("pauses timer on mouse hover and focusin, preserves remaining time, and ignores touch pointerenter", () => {
            const onAutoClose = vi.fn();
            const { section, list } = mountToaster({ duration: 4000 });
            toast.base("Hoverable", { onAutoClose });
            flushSync();

            pointerEnter(list, "touch");
            flushSync();
            expect(hasDataAttr(section, "expanded")).toBe(false);

            const closeBtn = queryRequired<HTMLButtonElement>(section, "button.cs-toast-close");
            const originalMatches = closeBtn.matches.bind(closeBtn);
            let isFocusVisible = false;
            vi.spyOn(closeBtn, "matches").mockImplementation((selector: string) =>
                selector === ":focus-visible" ? isFocusVisible : originalMatches(selector)
            );

            // Non-:focus-visible focusin (e.g. touch tap on <ToastClose />) must not expand the stack
            closeBtn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
            flushSync();
            expect(hasDataAttr(section, "expanded")).toBe(false);
            expect(list.dataset.expanded).toBeUndefined();

            vi.advanceTimersByTime(1500);
            pointerEnter(list, "mouse");
            flushSync();
            expect(hasDataAttr(section, "expanded")).toBe(true);
            const firstItem = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
            expect(hasDataAttr(firstItem, "expanded")).toBe(true);

            vi.advanceTimersByTime(10_000);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();

            isFocusVisible = true;
            closeBtn.focus();
            closeBtn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
            flushSync();
            pointerLeave(list);
            flushSync();
            expect(hasDataAttr(section, "expanded")).toBe(true);

            vi.advanceTimersByTime(10_000);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();

            closeBtn.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
            flushSync();
            expect(hasDataAttr(section, "expanded")).toBe(false);

            vi.advanceTimersByTime(2499);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1);
            flushSync();
            expect(onAutoClose).toHaveBeenCalledTimes(1);
        });

        test("clears focusWithin and expanded when focused toast is dismissed and removed from DOM without focusout, resuming remaining toast timer", () => {
            const onAutoCloseSecond = vi.fn();
            const { section, list } = mountToaster({ duration: 4000 });

            toast.base("First", { dismissible: true });
            toast.base("Second", { onAutoClose: onAutoCloseSecond });
            flushSync();

            const firstItem = [...section.querySelectorAll<HTMLLIElement>("li.cs-toast-item")].find((item) =>
                item.textContent?.includes("First")
            );
            expect(firstItem).toBeDefined();
            if (!firstItem) {
                return;
            }

            const closeBtn = queryRequired<HTMLButtonElement>(firstItem, "button.cs-toast-close");
            const originalMatches = closeBtn.matches.bind(closeBtn);
            vi.spyOn(closeBtn, "matches").mockImplementation((selector: string) =>
                selector === ":focus-visible" ? true : originalMatches(selector)
            );
            closeBtn.focus();
            closeBtn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
            flushSync();

            expect(list.dataset.expanded).toBe("");
            expect(hasDataAttr(section, "expanded")).toBe(true);

            vi.advanceTimersByTime(10_000);
            flushSync();
            expect(onAutoCloseSecond).not.toHaveBeenCalled();

            closeBtn.click();
            flushSync();

            // Wait for 350ms exit animation + DOM removal without dispatching focusout
            vi.advanceTimersByTime(350);
            flushSync();

            expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(1);
            expect(list.dataset.expanded).toBeUndefined();
            expect(hasDataAttr(section, "expanded")).toBe(false);

            vi.advanceTimersByTime(3999);
            flushSync();
            expect(onAutoCloseSecond).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1);
            flushSync();
            expect(onAutoCloseSecond).toHaveBeenCalledTimes(1);
        });

        test("supports gap, numeric/string offset, and ariaLabel props", () => {
            const { section: defaultSection } = mountToaster();
            expect(defaultSection.style.getPropertyValue("--cs-toast-gap")).toBe("12px");
            expect(defaultSection.style.getPropertyValue("--cs-toast-viewport-offset")).toBe("");
            expect(defaultSection.getAttribute("aria-label")).toBeTruthy();

            mountToaster({
                gap: 20,
                offset: 24,
                ariaLabel: "System alerts",
            });
            mountToaster({
                offset: "2rem",
            });
            const sections = [...container.querySelectorAll<HTMLElement>(".cs-toaster")];
            const numericSection = sections[1];
            const stringSection = sections[2];
            expect(numericSection).toBeDefined();
            expect(stringSection).toBeDefined();
            if (!numericSection || !stringSection) {
                return;
            }
            expect(numericSection.style.getPropertyValue("--cs-toast-gap")).toBe("20px");
            expect(numericSection.style.getPropertyValue("--cs-toast-viewport-offset")).toBe("24px");
            expect(numericSection.getAttribute("aria-label")).toBe("System alerts");
            expect(stringSection.style.getPropertyValue("--cs-toast-viewport-offset")).toBe("2rem");
        });

        test("toast.promise() starts 4000ms auto-dismiss timer after settlement and fires onAutoClose", async () => {
            const onAutoClose = vi.fn();
            mountToaster({ duration: 4000 });
            const { promise: p, resolve: resolveFn } = Promise.withResolvers<string>();

            const pending = toast.promise(p, {
                loading: "Saving...",
                success: (value) => ({ title: value, onAutoClose }),
                error: "Failed",
            });
            flushSync();

            // Loading state uses duration: Infinity and must stay open indefinitely
            vi.advanceTimersByTime(20_000);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();
            expect(toastState.toasts[0]?.removed).toBe(false);

            resolveFn("Saved!");
            await pending;
            flushSync();

            vi.advanceTimersByTime(3999);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();
            expect(toastState.toasts[0]?.removed).toBe(false);

            vi.advanceTimersByTime(1);
            flushSync();
            expect(onAutoClose).toHaveBeenCalledTimes(1);
            expect(toastState.toasts[0]?.removed).toBe(true);
        });

        test("reusing an existing id resets the auto-dismiss timer", () => {
            const onAutoClose = vi.fn();
            mountToaster({ duration: 4000 });

            toast({ id: "sync-status", color: "base", title: "Step 1", onAutoClose });
            flushSync();

            vi.advanceTimersByTime(2000);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();

            toast({ id: "sync-status", color: "base", title: "Step 2", onAutoClose });
            flushSync();

            // 2000ms after update (4000ms after initial create) must NOT auto-close yet
            vi.advanceTimersByTime(2000);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();
            expect(toastState.toasts[0]?.removed).toBe(false);

            vi.advanceTimersByTime(1999);
            flushSync();
            expect(onAutoClose).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1);
            flushSync();
            expect(onAutoClose).toHaveBeenCalledTimes(1);
            expect(toastState.toasts[0]?.removed).toBe(true);
        });
    });

    describe("3. Close button, action button & compound subcomponents", () => {
        test("dismissible controls data-dismissible and CloseButton rendering, and CloseButton dismisses toast", () => {
            const onDismiss = vi.fn();
            const { section } = mountToaster();

            toast.base("Non-dismissible", { dismissible: false });
            toast.positive("Dismissible", { dismissible: true, onDismiss });
            flushSync();

            const toasts = [...section.querySelectorAll<HTMLDivElement>(".cs-toast")];
            const firstToast = toasts[0];
            const secondToast = toasts[1];
            expect(firstToast).toBeDefined();
            expect(secondToast).toBeDefined();
            if (!firstToast || !secondToast) {
                return;
            }

            expect(hasDataAttr(firstToast, "dismissible")).toBe(true);
            expect(firstToast.querySelector("button.cs-toast-close")).not.toBeNull();

            expect(hasDataAttr(secondToast, "dismissible")).toBe(false);
            expect(secondToast.querySelector("button.cs-toast-close")).toBeNull();

            queryRequired<HTMLButtonElement>(firstToast, "button.cs-toast-close").click();
            flushSync();
            expect(onDismiss).toHaveBeenCalledTimes(1);
            const firstItem = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
            expect(hasDataAttr(firstItem, "removed")).toBe(true);
        });

        test("action button renders label and invokes onClick callback, and icon: false omits icon plate", () => {
            const onAction = vi.fn();
            const { section } = mountToaster();

            toast.accent("Updated", {
                icon: false,
                action: { label: "Undo", onClick: onAction, variant: "tertiary" },
            });
            flushSync();

            expect(section.querySelector(".cs-toast-icon")).toBeNull();
            const actionBtn = queryRequired<HTMLButtonElement>(section, "button.cs-toast-action");
            expect(actionBtn.textContent.trim()).toBe("Undo");

            actionBtn.click();
            expect(onAction).toHaveBeenCalledTimes(1);
        });

        test("standalone compound <Toast> binds refs, forwards rest attrs, and <ToastClose> triggers onDismiss + onclick", () => {
            const onStandaloneDismiss = vi.fn();
            const onCustomAction = vi.fn();
            const onCloseClick = vi.fn();

            const host = mountHost({
                renderStandalone: true,
                standaloneColor: "caution",
                onStandaloneDismiss,
                onCustomAction,
                onCloseClick,
            });

            const refs = host.getRefs();
            expect(refs.toasterRef).toBeInstanceOf(HTMLElement);
            expect(refs.toastRef).toBeInstanceOf(HTMLDivElement);
            expect(refs.iconRef).toBeInstanceOf(HTMLSpanElement);
            expect(refs.titleRef).toBeInstanceOf(HTMLDivElement);
            expect(refs.descriptionRef).toBeInstanceOf(HTMLDivElement);
            expect(refs.actionRef).toBeInstanceOf(HTMLButtonElement);
            expect(refs.closeRef).toBeInstanceOf(HTMLButtonElement);

            const standaloneToast = queryRequired<HTMLElement>(container, '[data-testid="standalone-toast"]');
            expect(standaloneToast.dataset.color).toBe("caution");

            (refs.actionRef as HTMLButtonElement).click();
            expect(onCustomAction).toHaveBeenCalledTimes(1);

            (refs.closeRef as HTMLButtonElement).click();
            expect(onStandaloneDismiss).toHaveBeenCalledTimes(1);
            expect(onCloseClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("4. Accessibility & keyboard behavior", () => {
        test("negative uses role='alert' + aria-live='assertive'; other colors use role='status' + aria-live='polite'", () => {
            const { section } = mountToaster();

            for (const color of TOAST_COLORS) {
                toast({ title: `Color ${color}`, color });
            }
            flushSync();

            for (const color of TOAST_COLORS) {
                const el = queryRequired<HTMLDivElement>(section, `.cs-toast[data-color="${CSS.escape(color)}"]`);
                expect(el.getAttribute("aria-atomic")).toBe("true");
                if (color === "negative") {
                    expect(el.getAttribute("role")).toBe("alert");
                    expect(el.getAttribute("aria-live")).toBe("assertive");
                } else {
                    expect(el.getAttribute("role")).toBe("status");
                    expect(el.getAttribute("aria-live")).toBe("polite");
                }
            }
        });

        test("Escape on focused toast dismisses dismissible toast and ignores non-dismissible toast", () => {
            const onDismiss1 = vi.fn();
            const onDismiss2 = vi.fn();
            const { section } = mountToaster();

            const nonDismissibleId = toast.base("Locked", { dismissible: false, onDismiss: onDismiss1 });
            const dismissibleId = toast.positive("Closable", { dismissible: true, onDismiss: onDismiss2 });
            flushSync();

            const items = [...section.querySelectorAll<HTMLLIElement>("li.cs-toast-item")];
            const firstItem = items[0];
            const secondItem = items[1];
            expect(firstItem).toBeDefined();
            expect(secondItem).toBeDefined();
            if (!firstItem || !secondItem) {
                return;
            }

            const escEvent1 = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
            const stopPropSpy1 = vi.spyOn(escEvent1, "stopPropagation");
            firstItem.dispatchEvent(escEvent1);
            flushSync();

            expect(stopPropSpy1).toHaveBeenCalledTimes(1);
            expect(onDismiss2).toHaveBeenCalledTimes(1);
            expect(toastState.toasts.find((t) => t.id === dismissibleId)?.removed).toBe(true);

            const escEvent2 = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
            secondItem.dispatchEvent(escEvent2);
            flushSync();

            expect(onDismiss1).not.toHaveBeenCalled();
            expect(toastState.toasts.find((t) => t.id === nonDismissibleId)?.removed).toBe(false);
        });
    });

    describe("5. Swipe-to-dismiss", () => {
        test.each<{ placement: ToastPlacement; deltaY: number }>([
            { placement: "bottom-right", deltaY: 28 },
            { placement: "top-right", deltaY: -28 },
        ])(
            "swiping >= 28px in dismiss direction on $placement sets data-swiping, data-swipe-out, data-removed, calls onDismiss, and removes after 200ms",
            ({ placement, deltaY }) => {
                const onDismiss = vi.fn();
                const onAutoClose = vi.fn();
                const { section } = mountToaster({ placement });

                toast.base("Swipeable", { onDismiss, onAutoClose });
                flushSync();

                const item = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
                dispatchPointer(item, "pointerdown", { clientY: 100 });
                flushSync();

                expect(hasDataAttr(item, "swiping")).toBe(true);
                expect(item.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");

                dispatchPointer(item, "pointermove", { clientY: 100 + deltaY });
                flushSync();

                expect(hasDataAttr(item, "swiping")).toBe(true);
                expect(item.style.getPropertyValue("--cs-toast-swipe-y")).toBe(`${deltaY}px`);

                dispatchPointer(item, "pointerup", { clientY: 100 + deltaY });
                flushSync();

                expect(hasDataAttr(item, "swiping")).toBe(false);
                expect(hasDataAttr(item, "swipeOut")).toBe(true);
                expect(hasDataAttr(item, "removed")).toBe(true);
                expect(item.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");
                expect(onDismiss).toHaveBeenCalledTimes(1);
                expect(onAutoClose).not.toHaveBeenCalled();

                vi.advanceTimersByTime(199);
                flushSync();
                expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(1);

                vi.advanceTimersByTime(1);
                flushSync();
                expect(section.querySelectorAll("li.cs-toast-item")).toHaveLength(0);
                expect(toastState.toasts).toHaveLength(0);
            }
        );

        test("snaps back without dismissing when dragged < 28px slowly or in opposite direction", () => {
            const onDismiss = vi.fn();
            const { section: bottomSection } = mountToaster({ placement: "bottom-right" });

            toast.base("Snap back", { onDismiss });
            flushSync();

            const bottomItem = queryRequired<HTMLLIElement>(bottomSection, "li.cs-toast-item");

            // < 28px slow drag in dismiss direction (+20px over 150ms on bottom-right)
            dispatchPointer(bottomItem, "pointerdown", { clientY: 100 });
            vi.advanceTimersByTime(150);
            dispatchPointer(bottomItem, "pointermove", { clientY: 120 });
            flushSync();
            expect(hasDataAttr(bottomItem, "swiping")).toBe(true);
            expect(bottomItem.style.getPropertyValue("--cs-toast-swipe-y")).toBe("20px");

            dispatchPointer(bottomItem, "pointerup", { clientY: 120 });
            flushSync();
            expect(hasDataAttr(bottomItem, "swiping")).toBe(false);
            expect(hasDataAttr(bottomItem, "swipeOut")).toBe(false);
            expect(hasDataAttr(bottomItem, "removed")).toBe(false);
            expect(bottomItem.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");
            expect(onDismiss).not.toHaveBeenCalled();

            // Just below threshold (27px slow drag) must also snap back (>= 28 required without flick velocity)
            dispatchPointer(bottomItem, "pointerdown", { clientY: 100 });
            vi.advanceTimersByTime(150);
            dispatchPointer(bottomItem, "pointermove", { clientY: 127 });
            dispatchPointer(bottomItem, "pointerup", { clientY: 127 });
            flushSync();
            expect(hasDataAttr(bottomItem, "removed")).toBe(false);
            expect(onDismiss).not.toHaveBeenCalled();

            // Opposite direction (-60px on bottom-right) clamps swipe-y to 0px and does not dismiss
            dispatchPointer(bottomItem, "pointerdown", { clientY: 100 });
            dispatchPointer(bottomItem, "pointermove", { clientY: 40 });
            flushSync();
            expect(bottomItem.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");

            dispatchPointer(bottomItem, "pointerup", { clientY: 40 });
            flushSync();
            expect(hasDataAttr(bottomItem, "removed")).toBe(false);
            expect(onDismiss).not.toHaveBeenCalled();

            // Opposite direction (+60px on top-right) clamps swipe-y to 0px and does not dismiss
            mountToaster({ placement: "top-right" });
            flushSync();
            const topSection = [...container.querySelectorAll<HTMLElement>(".cs-toaster")][1];
            expect(topSection).toBeDefined();
            if (!topSection) {
                return;
            }
            const topItem = queryRequired<HTMLLIElement>(topSection, "li.cs-toast-item");
            dispatchPointer(topItem, "pointerdown", { clientY: 100 });
            dispatchPointer(topItem, "pointermove", { clientY: 160 });
            flushSync();
            expect(topItem.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");

            dispatchPointer(topItem, "pointerup", { clientY: 160 });
            flushSync();
            expect(hasDataAttr(topItem, "removed")).toBe(false);
            expect(onDismiss).not.toHaveBeenCalled();
        });

        test("quick flick (>= 12px with >= 0.3 px/ms velocity) dismisses while slow small drag (< 28px, < 0.3 px/ms) snaps back", () => {
            const onSlowDismiss = vi.fn();
            const onFlickDismiss = vi.fn();
            const { section } = mountToaster({ placement: "bottom-right" });

            toast.base("Slow small drag", { onDismiss: onSlowDismiss });
            flushSync();

            const slowItem = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
            // 16px over 80ms = 0.2 px/ms (< 0.3 px/ms) and < 28px -> snaps back
            dispatchPointer(slowItem, "pointerdown", { clientY: 100 });
            vi.advanceTimersByTime(80);
            dispatchPointer(slowItem, "pointermove", { clientY: 116 });
            dispatchPointer(slowItem, "pointerup", { clientY: 116 });
            flushSync();

            expect(hasDataAttr(slowItem, "swipeOut")).toBe(false);
            expect(hasDataAttr(slowItem, "removed")).toBe(false);
            expect(slowItem.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");
            expect(onSlowDismiss).not.toHaveBeenCalled();

            // 12px over 20ms = 0.6 px/ms (>= 12px and >= 0.3 px/ms) -> dismisses
            toast.base("Quick flick", { onDismiss: onFlickDismiss });
            flushSync();
            const flickItem = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
            dispatchPointer(flickItem, "pointerdown", { clientY: 100 });
            vi.advanceTimersByTime(20);
            dispatchPointer(flickItem, "pointermove", { clientY: 112 });
            dispatchPointer(flickItem, "pointerup", { clientY: 112 });
            flushSync();

            expect(hasDataAttr(flickItem, "swipeOut")).toBe(true);
            expect(hasDataAttr(flickItem, "removed")).toBe(true);
            expect(onFlickDismiss).toHaveBeenCalledTimes(1);
        });

        test("pointercancel aborts swipe without dismissing even beyond 28px", () => {
            const onDismiss = vi.fn();
            const { section } = mountToaster({ placement: "bottom-right" });

            toast.base("Cancelable swipe", { onDismiss });
            flushSync();

            const item = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
            dispatchPointer(item, "pointerdown", { clientY: 100 });
            dispatchPointer(item, "pointermove", { clientY: 180 });
            flushSync();

            expect(hasDataAttr(item, "swiping")).toBe(true);
            expect(item.style.getPropertyValue("--cs-toast-swipe-y")).toBe("80px");

            dispatchPointer(item, "pointercancel", { clientY: 180 });
            flushSync();

            expect(hasDataAttr(item, "swiping")).toBe(false);
            expect(hasDataAttr(item, "swipeOut")).toBe(false);
            expect(hasDataAttr(item, "removed")).toBe(false);
            expect(item.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");
            expect(onDismiss).not.toHaveBeenCalled();
        });

        test("ignores swipe when dismissible is false or pointerdown starts on interactive children (button, a)", () => {
            const onLockedDismiss = vi.fn();
            const onInteractiveDismiss = vi.fn();
            const { section } = mountToaster({ placement: "bottom-right" });

            const lockedId = toast.base("Locked", { dismissible: false, onDismiss: onLockedDismiss });
            const interactiveId = toast.positive("Interactive", {
                dismissible: true,
                action: { label: "Undo", onClick: vi.fn() },
                onDismiss: onInteractiveDismiss,
            });
            flushSync();

            const items = [...section.querySelectorAll<HTMLLIElement>("li.cs-toast-item")];
            const interactiveItem = items[0];
            const lockedItem = items[1];
            expect(interactiveItem).toBeDefined();
            expect(lockedItem).toBeDefined();
            if (!interactiveItem || !lockedItem) {
                return;
            }

            // Guard 1: dismissible: false
            dispatchPointer(lockedItem, "pointerdown", { clientY: 100 });
            dispatchPointer(lockedItem, "pointermove", { clientY: 180 });
            flushSync();
            expect(hasDataAttr(lockedItem, "swiping")).toBe(false);
            expect(lockedItem.style.getPropertyValue("--cs-toast-swipe-y")).toBe("0px");
            dispatchPointer(lockedItem, "pointerup", { clientY: 180 });
            flushSync();
            expect(onLockedDismiss).not.toHaveBeenCalled();
            expect(toastState.toasts.find((t) => t.id === lockedId)?.removed).toBe(false);

            // Guard 2: pointerdown on interactive children (button.cs-toast-action, button.cs-toast-close, a)
            const link = document.createElement("a");
            link.href = "#details";
            link.textContent = "Details";
            queryRequired(interactiveItem, ".cs-toast").append(link);

            const interactiveTargets = [
                queryRequired(interactiveItem, "button.cs-toast-action"),
                queryRequired(interactiveItem, "button.cs-toast-close"),
                link,
            ];

            for (const target of interactiveTargets) {
                dispatchPointer(target, "pointerdown", { clientY: 100, bubbles: true });
                dispatchPointer(interactiveItem, "pointermove", { clientY: 180 });
                flushSync();
                expect(hasDataAttr(interactiveItem, "swiping")).toBe(false);
                dispatchPointer(interactiveItem, "pointerup", { clientY: 180 });
                flushSync();
            }

            // Guard 3: non-primary mouse button
            dispatchPointer(interactiveItem, "pointerdown", { clientY: 100, button: 2 });
            dispatchPointer(interactiveItem, "pointermove", { clientY: 180 });
            flushSync();
            expect(hasDataAttr(interactiveItem, "swiping")).toBe(false);
            dispatchPointer(interactiveItem, "pointerup", { clientY: 180 });
            flushSync();

            expect(onInteractiveDismiss).not.toHaveBeenCalled();
            expect(toastState.toasts.find((t) => t.id === interactiveId)?.removed).toBe(false);
        });
    });

    describe("6. Middle-click-to-dismiss", () => {
        test("middle-clicking a dismissible toast dismisses it and sets data-removed, but ignores dismissible: false", () => {
            const onDismissible = vi.fn();
            const onLocked = vi.fn();
            const { section } = mountToaster();

            const lockedId = toast.base("Locked", { dismissible: false, onDismiss: onLocked });
            const dismissibleId = toast.positive("Dismissible", { dismissible: true, onDismiss: onDismissible });
            flushSync();

            const items = [...section.querySelectorAll<HTMLLIElement>("li.cs-toast-item")];
            const dismissibleItem = items[0];
            const lockedItem = items[1];
            expect(dismissibleItem).toBeDefined();
            expect(lockedItem).toBeDefined();
            if (!dismissibleItem || !lockedItem) {
                return;
            }

            dispatchMiddleClick(lockedItem);
            flushSync();
            expect(onLocked).not.toHaveBeenCalled();
            expect(hasDataAttr(lockedItem, "removed")).toBe(false);
            expect(toastState.toasts.find((t) => t.id === lockedId)?.removed).toBe(false);

            dispatchMiddleClick(dismissibleItem);
            flushSync();
            expect(onDismissible).toHaveBeenCalledTimes(1);
            expect(hasDataAttr(dismissibleItem, "removed")).toBe(true);
            expect(toastState.toasts.find((t) => t.id === dismissibleId)?.removed).toBe(true);
        });

        test("ignores middle-click on .cs-toast-action, other buttons, and a[href], while middle-clicking .cs-toast-close dismisses", () => {
            const onDismiss = vi.fn();
            const onActionClick = vi.fn();
            const { section } = mountToaster();

            const id = toast.accent("Interactive", {
                dismissible: true,
                action: { label: "Undo", onClick: onActionClick },
                onDismiss,
            });
            flushSync();

            const item = queryRequired<HTMLLIElement>(section, "li.cs-toast-item");
            const toastEl = queryRequired(item, ".cs-toast");

            const link = document.createElement("a");
            link.href = "#details";
            link.textContent = "Details";
            const extraBtn = document.createElement("button");
            extraBtn.type = "button";
            extraBtn.textContent = "Extra";
            toastEl.append(link, extraBtn);

            const ignoredTargets = [
                queryRequired(item, "button.cs-toast-action"),
                extraBtn,
                link,
            ];

            for (const target of ignoredTargets) {
                dispatchMiddleClick(target);
                flushSync();
                expect(onDismiss).not.toHaveBeenCalled();
                expect(hasDataAttr(item, "removed")).toBe(false);
                expect(toastState.toasts.find((t) => t.id === id)?.removed).toBe(false);
            }
            expect(onActionClick).not.toHaveBeenCalled();

            dispatchMiddleClick(queryRequired(item, "button.cs-toast-close"));
            flushSync();
            expect(onDismiss).toHaveBeenCalledTimes(1);
            expect(hasDataAttr(item, "removed")).toBe(true);
            expect(toastState.toasts.find((t) => t.id === id)?.removed).toBe(true);
        });
    });
});
