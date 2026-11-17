import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { CloseButtonSize } from "../close-button/index.ts";
import {
    Modal,
    MODAL_ACTIONS_ALIGNS,
    MODAL_ACTIONS_ORIENTATIONS,
    MODAL_CLOSE_REASONS,
    MODAL_SIZES,
    MODAL_TITLE_ELEMENTS,
    ModalActions,
    ModalBody,
    ModalClose,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalSubtitle,
    ModalTitle,
    type ModalActionsAlign,
    type ModalActionsOrientation,
    type ModalCloseReason,
    type ModalSize,
    type ModalTitleElement,
} from "./index.ts";
import ModalTestHost from "./ModalTestHost.internal.svelte";

function dispatchKey(key: string, options: KeyboardEventInit = {}, target: EventTarget = document): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchBackdropClick(overlayEl: HTMLElement): { pointerDown: PointerEvent; click: MouseEvent } {
    const pointerDown = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    overlayEl.dispatchEvent(pointerDown);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    overlayEl.dispatchEvent(click);
    return { pointerDown, click };
}

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Expected element matching "${selector}"`);
    return el;
}

function mustGet<T>(value: T | null | undefined, label = "value"): T {
    if (value === null || value === undefined) throw new Error(`Expected ${label} to be defined`);
    return value;
}

describe("Modal Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
        vi.useFakeTimers();
    });

    afterEach(() => {
        container.remove();
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("Public exports & canonical option lists", () => {
        test("exports canonical option lists", () => {
            expect(MODAL_SIZES).toEqual(["sm", "md", "lg", "xl", "full"]);
            expect(MODAL_TITLE_ELEMENTS).toEqual(["h1", "h2", "h3", "h4", "h5", "h6", "div"]);
            expect(MODAL_ACTIONS_ALIGNS).toEqual(["start", "end", "stretch"]);
            expect(MODAL_ACTIONS_ORIENTATIONS).toEqual(["horizontal", "vertical"]);
            expect(MODAL_CLOSE_REASONS).toEqual(["escape", "outside-click", "close-button", "programmatic"]);
        });
    });

    describe("Semantics, A11y & Context", () => {
        test("renders div.cs-modal with role='dialog', aria-modal='true', custom class, rest props, and ref binding", () => {
            let modalRef: HTMLDivElement | null = null;

            const instance = mount(Modal, {
                target: container,
                props: {
                    size: "md",
                    class: "custom-modal",
                    id: "dialog-root",
                    tabindex: -1,
                    "data-testid": "my-modal",
                    get ref() {
                        return modalRef;
                    },
                    set ref(el: HTMLDivElement | null) {
                        modalRef = el;
                    },
                },
            });
            flushSync();

            const dialog = container.querySelector<HTMLDivElement>('div.cs-modal[role="dialog"]');
            expect(dialog).not.toBeNull();
            expect(dialog?.getAttribute("role")).toBe("dialog");
            expect(dialog?.getAttribute("aria-modal")).toBe("true");
            expect(dialog?.getAttribute("tabindex")).toBe("-1");
            expect(dialog?.getAttribute("id")).toBe("dialog-root");
            expect(dialog?.classList.contains("custom-modal")).toBe(true);
            expect(dialog?.dataset.size).toBe("md");
            expect(dialog?.dataset.testid).toBe("my-modal");
            expect(dialog?.hasAttribute("aria-labelledby")).toBe(false);
            expect(dialog?.hasAttribute("aria-describedby")).toBe(false);
            expect(modalRef).toBe(dialog);

            unmount(instance);
            flushSync();
            expect(modalRef).toBeNull();
        });

        test("assigns fallback tabindex='-1' and focuses dialog when no focusable children exist, cleaning up on close", () => {
            let open = $state(true);

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "sm",
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                },
            });
            flushSync();

            const dialog = container.querySelector<HTMLDivElement>('[role="dialog"]');
            expect(dialog).not.toBeNull();

            vi.advanceTimersByTime(20);
            expect(dialog?.getAttribute("tabindex")).toBe("-1");
            expect(document.activeElement).toBe(dialog);

            open = false;
            flushSync();
            expect(container.querySelector('[role="dialog"]')).toBeNull();

            unmount(instance);
        });

        test("automatically links aria-labelledby and aria-describedby and cleans up when ModalTitle / ModalDescription unmount", () => {
            let showTitle = $state(false);
            let showDescription = $state(false);
            let titleId = $state<string | undefined>(undefined);
            let descriptionId = $state<string | undefined>(undefined);

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showHeader: true,
                    get showTitle() {
                        return showTitle;
                    },
                    get showDescription() {
                        return showDescription;
                    },
                    get titleId() {
                        return titleId;
                    },
                    get descriptionId() {
                        return descriptionId;
                    },
                },
            });
            flushSync();

            const dialog = container.querySelector<HTMLDivElement>('[role="dialog"]');
            expect(dialog?.hasAttribute("aria-labelledby")).toBe(false);
            expect(dialog?.hasAttribute("aria-describedby")).toBe(false);

            // Mount ModalTitle -> aria-labelledby links to generated ID
            showTitle = true;
            flushSync();
            const titleEl = container.querySelector<HTMLElement>(".cs-modal-title");
            expect(titleEl?.id).toBeTruthy();
            expect(dialog?.getAttribute("aria-labelledby")).toBe(titleEl?.id);

            // Mount ModalDescription -> aria-describedby links to generated ID
            showDescription = true;
            flushSync();
            const descEl = container.querySelector<HTMLElement>(".cs-modal-description");
            expect(descEl?.id).toBeTruthy();
            expect(dialog?.getAttribute("aria-describedby")).toBe(descEl?.id);

            // Explicit id props on title/description propagate to dialog
            titleId = "custom-title-id";
            descriptionId = "custom-desc-id";
            flushSync();
            expect(dialog?.getAttribute("aria-labelledby")).toBe("custom-title-id");
            expect(dialog?.getAttribute("aria-describedby")).toBe("custom-desc-id");

            // Unmounting ModalTitle & ModalDescription clears aria-labelledby & aria-describedby
            showTitle = false;
            showDescription = false;
            flushSync();
            expect(dialog?.hasAttribute("aria-labelledby")).toBe(false);
            expect(dialog?.hasAttribute("aria-describedby")).toBe(false);

            // Re-mounting restores them
            showTitle = true;
            flushSync();
            expect(dialog?.getAttribute("aria-labelledby")).toBe("custom-title-id");

            unmount(instance);
        });

        test("explicit aria-labelledby and aria-describedby on Modal take precedence over ModalTitle / ModalDescription", () => {
            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showHeader: true,
                    showTitle: true,
                    showDescription: true,
                    titleId: "inner-title",
                    descriptionId: "inner-desc",
                    modalAttrs: {
                        "aria-labelledby": "external-label",
                        "aria-describedby": "external-desc",
                    },
                },
            });
            flushSync();

            const dialog = container.querySelector<HTMLDivElement>('[role="dialog"]');
            expect(dialog?.getAttribute("aria-labelledby")).toBe("external-label");
            expect(dialog?.getAttribute("aria-describedby")).toBe("external-desc");

            unmount(instance);
        });

        test("ModalTitle defaults to <h2> and supports all MODAL_TITLE_ELEMENTS, ref, class, and rest props", () => {
            let as = $state<ModalTitleElement | undefined>(undefined);
            let titleRef: HTMLHeadingElement | HTMLDivElement | null = null;

            const instance = mount(ModalTitle, {
                target: container,
                props: {
                    get as() {
                        return as;
                    },
                    class: "custom-title",
                    id: "modal-title-1",
                    "data-testid": "title-el",
                    get ref() {
                        return titleRef;
                    },
                    set ref(el: HTMLHeadingElement | HTMLDivElement | null) {
                        titleRef = el;
                    },
                },
            });
            flushSync();

            let el = container.querySelector<HTMLElement>(".cs-modal-title");
            expect(el).not.toBeNull();
            expect(el?.tagName).toBe("H2");
            expect(el?.classList.contains("custom-title")).toBe(true);
            expect(el?.getAttribute("id")).toBe("modal-title-1");
            expect(el?.dataset.testid).toBe("title-el");
            expect(titleRef).toBe(el);

            for (const tag of MODAL_TITLE_ELEMENTS) {
                as = tag;
                flushSync();
                el = container.querySelector<HTMLElement>(".cs-modal-title");
                expect(el?.tagName).toBe(tag.toUpperCase());
                expect(titleRef).toBe(el);
            }

            unmount(instance);
            expect(titleRef).toBeNull();
        });

        test("hasModalContext() and getModalContext() work inside Modal and throw outside", () => {
            const outside = mount(ModalTestHost, {
                target: container,
                props: { mode: "probe" },
            });
            flushSync();

            const outsideProbe = container.querySelector<HTMLDivElement>('[data-testid="context-probe"]');
            expect(outsideProbe?.dataset.hasContext).toBe("false");
            expect(outsideProbe?.dataset.threwOnGet).toBe("true");
            unmount(outside);

            let size = $state<ModalSize>("sm");
            let dismissible = $state(true);

            const inside = mount(ModalTestHost, {
                target: container,
                props: {
                    get size() {
                        return size;
                    },
                    get dismissible() {
                        return dismissible;
                    },
                    showHeader: true,
                    showTitle: true,
                    titleId: "ctx-title",
                    showDescription: true,
                    descriptionId: "ctx-desc",
                    showProbe: true,
                },
            });
            flushSync();

            const probe = container.querySelector<HTMLDivElement>('[data-testid="context-probe"]');
            expect(probe?.dataset.hasContext).toBe("true");
            expect(probe?.dataset.threwOnGet).toBe("false");
            expect(probe?.dataset.ctxSize).toBe("sm");
            expect(probe?.dataset.ctxDismissible).toBe("true");
            expect(probe?.dataset.ctxTitleId).toBe("ctx-title");
            expect(probe?.dataset.ctxDescriptionId).toBe("ctx-desc");

            size = "xl";
            dismissible = false;
            flushSync();

            expect(probe?.dataset.ctxSize).toBe("xl");
            expect(probe?.dataset.ctxDismissible).toBe("false");

            unmount(inside);
        });
    });

    describe("Sizes & Subcomponents", () => {
        test("updates data-size across all MODAL_SIZES", () => {
            let size = $state<ModalSize>("sm");

            const instance = mount(Modal, {
                target: container,
                props: {
                    get size() {
                        return size;
                    },
                },
            });
            flushSync();

            const dialog = container.querySelector<HTMLDivElement>(".cs-modal");
            for (const nextSize of MODAL_SIZES) {
                size = nextSize;
                flushSync();
                expect(dialog?.dataset.size).toBe(nextSize);
            }

            unmount(instance);
        });

        test("ModalHeader, ModalSubtitle, ModalBody, and ModalFooter render canonical elements, refs, classes, and rest props", () => {
            let headerRef: HTMLDivElement | null = null;
            let subtitleRef: HTMLParagraphElement | null = null;
            let bodyRef: HTMLDivElement | null = null;
            let footerRef: HTMLDivElement | null = null;

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showHeader: true,
                    headerAttrs: { class: "h-extra", "data-testid": "hdr" },
                    get headerRef() {
                        return headerRef;
                    },
                    set headerRef(el: HTMLDivElement | null) {
                        headerRef = el;
                    },
                    showSubtitle: true,
                    subtitleAttrs: { class: "s-extra", "data-testid": "sub" },
                    get subtitleRef() {
                        return subtitleRef;
                    },
                    set subtitleRef(el: HTMLParagraphElement | null) {
                        subtitleRef = el;
                    },
                    showBody: true,
                    bodyAttrs: { class: "b-extra", "data-testid": "bdy" },
                    get bodyRef() {
                        return bodyRef;
                    },
                    set bodyRef(el: HTMLDivElement | null) {
                        bodyRef = el;
                    },
                    showFooter: true,
                    footerAttrs: { class: "f-extra", "data-testid": "ftr" },
                    get footerRef() {
                        return footerRef;
                    },
                    set footerRef(el: HTMLDivElement | null) {
                        footerRef = el;
                    },
                },
            });
            flushSync();

            const header = container.querySelector<HTMLDivElement>("div.cs-modal-header");
            const subtitle = container.querySelector<HTMLParagraphElement>("p.cs-modal-subtitle");
            const body = container.querySelector<HTMLDivElement>("div.cs-modal-body");
            const footer = container.querySelector<HTMLDivElement>("div.cs-modal-footer");

            expect(header?.classList.contains("h-extra")).toBe(true);
            expect(header?.dataset.testid).toBe("hdr");
            expect(headerRef).toBe(header);

            expect(subtitle?.tagName).toBe("P");
            expect(subtitle?.classList.contains("s-extra")).toBe(true);
            expect(subtitle?.dataset.testid).toBe("sub");
            expect(subtitleRef).toBe(subtitle);

            expect(body?.classList.contains("b-extra")).toBe(true);
            expect(body?.dataset.testid).toBe("bdy");
            expect(bodyRef).toBe(body);

            expect(footer?.classList.contains("f-extra")).toBe(true);
            expect(footer?.dataset.testid).toBe("ftr");
            expect(footerRef).toBe(footer);

            unmount(instance);
            flushSync();
            expect(headerRef).toBeNull();
            expect(subtitleRef).toBeNull();
            expect(bodyRef).toBeNull();
            expect(footerRef).toBeNull();
        });

        test("standalone subcomponents (ModalHeader, ModalSubtitle, ModalDescription, ModalBody, ModalFooter) render outside Modal", () => {
            const h = mount(ModalHeader, { target: container });
            const s = mount(ModalSubtitle, { target: container });
            const d = mount(ModalDescription, { target: container });
            const b = mount(ModalBody, { target: container });
            const f = mount(ModalFooter, { target: container });
            flushSync();

            expect(container.querySelector(".cs-modal-header")).not.toBeNull();
            expect(container.querySelector("p.cs-modal-subtitle")).not.toBeNull();
            expect(container.querySelector("p.cs-modal-description")).not.toBeNull();
            expect(container.querySelector(".cs-modal-body")).not.toBeNull();
            expect(container.querySelector(".cs-modal-footer")).not.toBeNull();

            unmount(h);
            unmount(s);
            unmount(d);
            unmount(b);
            unmount(f);
        });

        test("ModalActions sets default and explicit data-align and data-orientation, ref, and rest props", () => {
            let align = $state<ModalActionsAlign | undefined>(undefined);
            let orientation = $state<ModalActionsOrientation | undefined>(undefined);
            let ref: HTMLDivElement | null = null;

            const instance = mount(ModalActions, {
                target: container,
                props: {
                    get align() {
                        return align;
                    },
                    get orientation() {
                        return orientation;
                    },
                    class: "custom-actions",
                    "data-testid": "actions",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const actions = container.querySelector<HTMLDivElement>("div.cs-modal-actions");
            expect(actions).not.toBeNull();
            expect(actions?.classList.contains("custom-actions")).toBe(true);
            expect(actions?.dataset.testid).toBe("actions");
            expect(actions?.dataset.align).toBe("end");
            expect(actions?.dataset.orientation).toBe("horizontal");
            expect(ref).toBe(actions);

            for (const nextAlign of MODAL_ACTIONS_ALIGNS) {
                align = nextAlign;
                flushSync();
                expect(actions?.dataset.align).toBe(nextAlign);
            }

            for (const nextOrientation of MODAL_ACTIONS_ORIENTATIONS) {
                orientation = nextOrientation;
                flushSync();
                expect(actions?.dataset.orientation).toBe(nextOrientation);
            }

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("ModalClose derives proportional CloseButton size from Modal size, respects explicit override, binds ref, and spreads props", () => {
            let modalSize = $state<ModalSize>("sm");
            let closeSize = $state<CloseButtonSize | undefined>(undefined);
            let closeRef: HTMLButtonElement | null = null;

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    get size() {
                        return modalSize;
                    },
                    showClose: true,
                    get closeSize() {
                        return closeSize;
                    },
                    get closeRef() {
                        return closeRef;
                    },
                    set closeRef(el: HTMLButtonElement | null) {
                        closeRef = el;
                    },
                    closeAttrs: {
                        class: "extra-close",
                        "aria-label": "Dismiss dialog",
                        "data-testid": "modal-close-btn",
                    },
                },
            });
            flushSync();

            const closeBtn = container.querySelector<HTMLButtonElement>("button.cs-modal-close");
            expect(closeBtn).not.toBeNull();
            expect(closeBtn?.classList.contains("extra-close")).toBe(true);
            expect(closeBtn?.getAttribute("aria-label")).toBe("Dismiss dialog");
            expect(closeBtn?.dataset.testid).toBe("modal-close-btn");
            expect(closeBtn?.dataset.variant).toBe("soft");
            expect(closeBtn?.dataset.size).toBe("sm");
            expect(closeBtn?.querySelector(".cs-hit-area")).not.toBeNull();
            expect(closeRef).toBe(closeBtn);

            const expectedSizes: Record<ModalSize, CloseButtonSize> = {
                sm: "sm",
                md: "sm",
                lg: "sm",
                xl: "md",
                full: "md",
            };

            for (const nextModalSize of MODAL_SIZES) {
                modalSize = nextModalSize;
                flushSync();
                expect(closeBtn?.dataset.size).toBe(expectedSizes[nextModalSize]);
            }

            // Explicit size override wins
            closeSize = "xl";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("xl");

            modalSize = "sm";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("xl");

            // Clearing override restores proportional mapping
            closeSize = undefined;
            flushSync();
            expect(closeBtn?.dataset.size).toBe("sm");

            unmount(instance);
            flushSync();
            expect(closeRef).toBeNull();
        });

        test("ModalClose defaults to size='md' and variant='soft' outside ModalContext", () => {
            let size = $state<CloseButtonSize | undefined>(undefined);

            const instance = mount(ModalClose, {
                target: container,
                props: {
                    get size() {
                        return size;
                    },
                },
            });
            flushSync();

            const closeBtn = container.querySelector<HTMLButtonElement>("button.cs-modal-close");
            expect(closeBtn?.dataset.variant).toBe("soft");
            expect(closeBtn?.dataset.size).toBe("md");

            size = "xs";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("xs");

            unmount(instance);
        });
    });

    describe("External <Overlay> + focusTrap + Dismiss Lifecycle", () => {
        test("ModalClose inside Overlay-wrapped Modal closes dialog, sets open=false, and fires onOpenChange + onClose('close-button')", () => {
            let open = $state(true);
            const onClose = vi.fn<(reason: ModalCloseReason) => void>();
            const onOpenChange = vi.fn<(nextOpen: boolean) => void>();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    overlayVariant: "blur",
                    size: "md",
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    onClose,
                    onOpenChange,
                },
            });
            flushSync();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl?.dataset.variant).toBe("blur");
            expect(container.querySelector('[role="dialog"]')).not.toBeNull();

            const closeBtn = container.querySelector<HTMLButtonElement>("button.cs-modal-close");
            closeBtn?.click();
            flushSync();

            expect(open).toBe(false);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenCalledWith(false);
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledWith("close-button");
            expect(container.querySelector('[role="dialog"]')).toBeNull();
            expect(container.querySelector(".cs-overlay")).toBeNull();

            unmount(instance);
        });

        test("ModalClose does not close when consumer onclick calls event.preventDefault()", () => {
            let open = $state(true);
            const onClose = vi.fn();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    onCloseClick: (e) => e.preventDefault(),
                    onClose,
                },
            });
            flushSync();

            container.querySelector<HTMLButtonElement>("button.cs-modal-close")?.click();
            flushSync();

            expect(open).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("Escape closes Modal when dismissible & closeOnEscape are true and fires onClose('escape')", () => {
            let open = $state(true);
            const onClose = vi.fn();
            const onOpenChange = vi.fn();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "md",
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    onClose,
                    onOpenChange,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            dispatchKey("Escape");
            flushSync();

            expect(open).toBe(false);
            expect(onOpenChange).toHaveBeenCalledWith(false);
            expect(onClose).toHaveBeenCalledWith("escape");
            expect(container.querySelector('[role="dialog"]')).toBeNull();

            unmount(instance);
        });

        test("focusTrap allows pointerdown/click on .cs-overlay backdrop so Overlay onclick closes Modal, while blocking outside elements", () => {
            let open = $state(true);
            const onClose = vi.fn();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    overlayVariant: "blur",
                    size: "md",
                    showClose: true,
                    showOutsideButton: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    onClose,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const outsideBtn = mustQuery<HTMLButtonElement>(container, '[data-testid="outside-btn"]');
            const outsidePointerDown = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
            outsideBtn.dispatchEvent(outsidePointerDown);
            expect(outsidePointerDown.defaultPrevented).toBe(true);
            expect(open).toBe(true);

            // Clicking .cs-overlay backdrop must NOT have pointerdown prevented by focusTrap
            const overlayEl = mustQuery<HTMLDivElement>(container, ".cs-overlay");
            const { pointerDown } = dispatchBackdropClick(overlayEl);
            flushSync();

            expect(pointerDown.defaultPrevented).toBe(false);
            expect(open).toBe(false);
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledWith("outside-click");

            unmount(instance);
        });

        test("focusTrap cyclically traps Tab and Shift+Tab within .cs-modal", () => {
            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "md",
                    showClose: true,
                    showBody: true,
                    showBodyButtons: true,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const closeBtn = mustQuery<HTMLButtonElement>(container, "button.cs-modal-close");
            const btn1 = mustQuery<HTMLButtonElement>(container, '[data-testid="body-btn-1"]');
            const btn2 = mustQuery<HTMLButtonElement>(container, '[data-testid="body-btn-2"]');

            expect(document.activeElement).toBe(closeBtn);

            // Shift+Tab from first wraps to last
            dispatchKey("Tab", { shiftKey: true }, closeBtn);
            expect(document.activeElement).toBe(btn2);

            // Tab from last wraps to first
            dispatchKey("Tab", {}, btn2);
            expect(document.activeElement).toBe(closeBtn);

            // Focus btn1 then Tab moves or stays trapped (focusTrap intercepts boundary Tab; manual focus + boundary wrap)
            btn1.focus();
            expect(document.activeElement).toBe(btn1);

            unmount(instance);
        });

        test("initialFocus supports 'first-focusable', custom selector, and false with child autoFocus()", () => {
            // 1. Default "first-focusable"
            const inst1 = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showClose: true,
                    showBody: true,
                    showInput: true,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);
            expect(document.activeElement).toBe(container.querySelector("button.cs-modal-close"));
            unmount(inst1);
            flushSync();

            // 2. Custom CSS selector
            const inst2 = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showClose: true,
                    showBody: true,
                    showInput: true,
                    initialFocus: '[data-testid="modal-input"]',
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);
            expect(document.activeElement).toBe(container.querySelector('[data-testid="modal-input"]'));
            unmount(inst2);
            flushSync();

            // 3. initialFocus={false} with {@attach autoFocus()} on child input
            const inst3 = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showClose: true,
                    showBody: true,
                    showInput: true,
                    useAutoFocusOnInput: true,
                    initialFocus: false,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);
            const input = mustQuery<HTMLInputElement>(container, '[data-testid="modal-input"]');
            expect(document.activeElement).toBe(input);

            // focusTrap still traps Tab (Shift+Tab from ModalClose wraps to input) and handles Escape
            const closeBtn = mustQuery<HTMLButtonElement>(container, "button.cs-modal-close");
            closeBtn.focus();
            dispatchKey("Tab", { shiftKey: true }, closeBtn);
            expect(document.activeElement).toBe(input);

            unmount(inst3);
        });

        test("focusTrap={false} disables focus trapping, initial focus, and Escape interception", () => {
            const trigger = document.createElement("button");
            container.append(trigger);
            trigger.focus();

            let open = $state(true);
            const onClose = vi.fn();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    focusTrap: false,
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    onClose,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const dialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');
            expect("focusTrapped" in dialog.dataset).toBe(false);
            expect(document.activeElement).toBe(trigger);

            dispatchKey("Escape");
            flushSync();
            expect(open).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("restoreFocus restores focus to trigger element immediately when open becomes false", () => {
            let open = $state(false);

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "md",
                    showTrigger: true,
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                },
            });
            flushSync();

            const trigger = mustQuery<HTMLButtonElement>(container, '[data-testid="trigger-btn"]');
            trigger.focus();
            expect(document.activeElement).toBe(trigger);

            trigger.click();
            flushSync();
            vi.advanceTimersByTime(20);

            const closeBtn = mustQuery<HTMLButtonElement>(container, "button.cs-modal-close");
            expect(document.activeElement).toBe(closeBtn);

            closeBtn.click();
            flushSync();

            expect(open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            unmount(instance);
        });

        test("strict controlled open + onClose works without mutating external state directly, and requestClose is idempotent when closed", async () => {
            let externalOpen = $state(true);
            const onClose = vi.fn();
            const onOpenChange = vi.fn((next: boolean) => {
                externalOpen = next;
            });
            const instance = mount(Modal, {
                target: container,
                props: {
                    size: "md",
                    get open() {
                        return externalOpen;
                    },
                    onOpenChange,
                    onClose,
                },
                // Capture instance via mount return (Svelte 5 exports component methods on mounted instance)
            });
            const modalInstance = instance as unknown as Modal;
            flushSync();

            expect(await modalInstance.requestClose("programmatic")).toBe(true);
            flushSync();
            expect(externalOpen).toBe(false);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);

            // Second call when already closed is a no-op returning false
            expect(await modalInstance.requestClose("programmatic")).toBe(false);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onClose).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("close -> reopen (open: true -> false -> true) re-activates focusTrap and re-registers aria-labelledby / aria-describedby", () => {
            let open = $state(true);

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "md",
                    showTrigger: true,
                    showClose: true,
                    showHeader: true,
                    showTitle: true,
                    showDescription: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const trigger = mustQuery<HTMLButtonElement>(container, '[data-testid="trigger-btn"]');
            const firstDialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');
            const firstTitle = mustQuery<HTMLElement>(container, ".cs-modal-title");
            const firstDesc = mustQuery<HTMLElement>(container, ".cs-modal-description");
            expect(firstDialog.getAttribute("aria-labelledby")).toBe(firstTitle.id);
            expect(firstDialog.getAttribute("aria-describedby")).toBe(firstDesc.id);
            expect(document.activeElement).toBe(mustQuery(container, "button.cs-modal-close"));

            // Close via Escape -> restores focus to trigger
            trigger.focus();
            open = false;
            flushSync();
            expect(container.querySelector('[role="dialog"]')).toBeNull();

            // Reopen via trigger click -> re-activates focusTrap and re-registers ARIA IDs
            trigger.click();
            flushSync();
            vi.advanceTimersByTime(20);

            const reopenedDialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');
            const reopenedTitle = mustQuery<HTMLElement>(container, ".cs-modal-title");
            const reopenedDesc = mustQuery<HTMLElement>(container, ".cs-modal-description");
            expect(reopenedDialog.getAttribute("aria-labelledby")).toBe(reopenedTitle.id);
            expect(reopenedDialog.getAttribute("aria-describedby")).toBe(reopenedDesc.id);
            expect("focusTrapped" in reopenedDialog.dataset).toBe(true);
            expect(document.activeElement).toBe(mustQuery(container, "button.cs-modal-close"));

            unmount(instance);
        });

        test("stacked Overlay + Modal instances: Escape closes only topmost modal and restores focus to inner trigger", () => {
            let outerOpen = $state(true);
            let innerOpen = $state(false);
            const onOuterClose = vi.fn();
            const onInnerClose = vi.fn();

            const outer = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "lg",
                    showClose: true,
                    showBody: true,
                    showBodyButtons: true,
                    modalAttrs: { "data-testid": "outer-modal" },
                    closeAttrs: { "data-testid": "outer-close" },
                    get open() {
                        return outerOpen;
                    },
                    set open(value: boolean) {
                        outerOpen = value;
                    },
                    onClose: onOuterClose,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const outerTrigger = mustQuery<HTMLButtonElement>(container, '[data-testid="body-btn-1"]');
            outerTrigger.focus();
            expect(document.activeElement).toBe(outerTrigger);

            // Open stacked inner modal
            innerOpen = true;
            const inner = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "sm",
                    showClose: true,
                    modalAttrs: { "data-testid": "inner-modal" },
                    closeAttrs: { "data-testid": "inner-close" },
                    get open() {
                        return innerOpen;
                    },
                    set open(value: boolean) {
                        innerOpen = value;
                    },
                    onClose: onInnerClose,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const outerDialog = mustQuery<HTMLDivElement>(container, '[data-testid="outer-modal"]');
            const innerClose = mustQuery<HTMLButtonElement>(container, '[data-testid="inner-close"]');
            expect("focusTrapPaused" in outerDialog.dataset).toBe(true);
            expect(document.activeElement).toBe(innerClose);

            // First Escape closes only the topmost (inner) modal and restores focus to outerTrigger
            dispatchKey("Escape");
            flushSync();

            expect(innerOpen).toBe(false);
            expect(outerOpen).toBe(true);
            expect(onInnerClose).toHaveBeenCalledWith("escape");
            expect(onOuterClose).not.toHaveBeenCalled();
            expect("focusTrapPaused" in outerDialog.dataset).toBe(false);
            expect(document.activeElement).toBe(outerTrigger);

            // Second Escape now closes the underlying (outer) modal
            dispatchKey("Escape");
            flushSync();

            expect(outerOpen).toBe(false);
            expect(onOuterClose).toHaveBeenCalledWith("escape");

            unmount(inner);
            unmount(outer);
        });
    });

    describe("Blocking, nudge() & onBeforeClose", () => {
        test("dismissible={false} blocks close-button, outside-click, and escape with data-blocked, while programmatic still closes", async () => {
            let open = $state(true);
            let modalInstance: Modal | undefined;
            const onClose = vi.fn();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "md",
                    dismissible: false,
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    get modalInstance() {
                        return modalInstance;
                    },
                    set modalInstance(m: Modal | undefined) {
                        modalInstance = m;
                    },
                    onClose,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const dialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');
            expect("blocked" in dialog.dataset).toBe(false);

            // 1. Close button blocked
            container.querySelector<HTMLButtonElement>("button.cs-modal-close")?.click();
            flushSync();
            expect(open).toBe(true);
            expect("blocked" in dialog.dataset).toBe(true);
            vi.advanceTimersByTime(320);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);

            // 2. Outside click blocked
            const overlayEl = mustQuery<HTMLDivElement>(container, ".cs-overlay");
            dispatchBackdropClick(overlayEl);
            flushSync();
            expect(open).toBe(true);
            expect("blocked" in dialog.dataset).toBe(true);
            vi.advanceTimersByTime(320);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);

            // 3. Escape blocked
            dispatchKey("Escape");
            flushSync();
            expect(open).toBe(true);
            expect("blocked" in dialog.dataset).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // 4. Programmatic close succeeds even when dismissible={false}
            const closed = await mustGet(modalInstance, "modalInstance").requestClose("programmatic");
            flushSync();
            expect(closed).toBe(true);
            expect(open).toBe(false);
            expect(onClose).toHaveBeenCalledWith("programmatic");

            unmount(instance);
        });

        test("closeOnEscape={false} blocks Escape independently of dismissible={true}", () => {
            let open = $state(true);
            const onClose = vi.fn();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "md",
                    dismissible: true,
                    closeOnEscape: false,
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    onClose,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            const dialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');

            // Escape blocked
            dispatchKey("Escape");
            flushSync();
            expect(open).toBe(true);
            expect("blocked" in dialog.dataset).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // ModalClose still works
            container.querySelector<HTMLButtonElement>("button.cs-modal-close")?.click();
            flushSync();
            expect(open).toBe(false);
            expect(onClose).toHaveBeenCalledWith("close-button");

            unmount(instance);
        });

        test("closeOnEscape={true} allows Escape even when dismissible={false}", () => {
            let open = $state(true);
            const onClose = vi.fn();

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    useOverlay: true,
                    size: "md",
                    dismissible: false,
                    closeOnEscape: true,
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    onClose,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);

            // Close button is blocked
            container.querySelector<HTMLButtonElement>("button.cs-modal-close")?.click();
            flushSync();
            expect(open).toBe(true);

            // Escape succeeds
            dispatchKey("Escape");
            flushSync();
            expect(open).toBe(false);
            expect(onClose).toHaveBeenCalledWith("escape");

            unmount(instance);
        });

        test("nudge() triggers data-blocked, resets timer on repeated calls, and clears on self animationend only", () => {
            let modalInstance: Modal | undefined;

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showHeader: true,
                    showTitle: true,
                    get modalInstance() {
                        return modalInstance;
                    },
                    set modalInstance(m: Modal | undefined) {
                        modalInstance = m;
                    },
                },
            });
            flushSync();

            const dialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');
            const title = mustQuery<HTMLElement>(container, ".cs-modal-title");

            mustGet(modalInstance, "modalInstance").nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Child animationend bubbling up must NOT clear data-blocked
            title.dispatchEvent(new Event("animationend", { bubbles: true }));
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Repeated nudge clears data-blocked synchronously, re-applies it on next rAF, and resets the 320ms timer
            vi.advanceTimersByTime(200);
            flushSync();
            mustGet(modalInstance, "modalInstance").nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);

            vi.advanceTimersByTime(20);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            vi.advanceTimersByTime(200);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Self animationend clears data-blocked immediately
            dialog.dispatchEvent(new Event("animationend", { bubbles: true }));
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);

            unmount(instance);
        });

        test("sync onBeforeClose(reason) returning false cancels close and triggers data-blocked; true/undefined allows close", async () => {
            let open = $state(true);
            let allowClose: boolean | undefined = false;
            const onBeforeClose = vi.fn(() => allowClose);
            const onClose = vi.fn();
            const onOpenChange = vi.fn();
            let modalInstance: Modal | undefined;

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    showClose: true,
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    get modalInstance() {
                        return modalInstance;
                    },
                    set modalInstance(m: Modal | undefined) {
                        modalInstance = m;
                    },
                    onBeforeClose,
                    onClose,
                    onOpenChange,
                },
            });
            flushSync();

            const dialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');

            // Returning false cancels close and triggers data-blocked
            expect(await mustGet(modalInstance, "modalInstance").requestClose("close-button")).toBe(false);
            flushSync();
            expect(onBeforeClose).toHaveBeenCalledWith("close-button");
            expect(open).toBe(true);
            expect("blocked" in dialog.dataset).toBe(true);
            expect(onClose).not.toHaveBeenCalled();
            expect(onOpenChange).not.toHaveBeenCalled();

            // Returning undefined allows close
            allowClose = undefined;
            expect(await mustGet(modalInstance, "modalInstance").requestClose("programmatic")).toBe(true);
            flushSync();
            expect(onBeforeClose).toHaveBeenCalledWith("programmatic");
            expect(open).toBe(false);
            expect(onOpenChange).toHaveBeenCalledWith(false);
            expect(onClose).toHaveBeenCalledWith("programmatic");

            unmount(instance);
        });

        test("async onBeforeClose(reason) guards concurrent calls and handles false vs true resolution", async () => {
            let open = $state(true);
            let resolveFirst!: (value: boolean) => void;
            let resolveSecond!: (value: boolean) => void;
            let callCount = 0;

            const onBeforeClose = vi.fn(
                () =>
                    new Promise<boolean>((resolve) => {
                        callCount += 1;
                        if (callCount === 1) resolveFirst = resolve;
                        else resolveSecond = resolve;
                    }),
            );
            const onClose = vi.fn();
            let modalInstance: Modal | undefined;

            const instance = mount(ModalTestHost, {
                target: container,
                props: {
                    size: "md",
                    get open() {
                        return open;
                    },
                    set open(value: boolean) {
                        open = value;
                    },
                    get modalInstance() {
                        return modalInstance;
                    },
                    set modalInstance(m: Modal | undefined) {
                        modalInstance = m;
                    },
                    onBeforeClose,
                    onClose,
                },
            });
            flushSync();

            const dialog = mustQuery<HTMLDivElement>(container, '[role="dialog"]');

            // Start first async close; concurrent second call should be ignored while pending
            const p1 = mustGet(modalInstance, "modalInstance").requestClose("escape");
            const p2 = mustGet(modalInstance, "modalInstance").requestClose("close-button");

            expect(await p2).toBe(false);
            expect(onBeforeClose).toHaveBeenCalledTimes(1);
            expect(onBeforeClose).toHaveBeenCalledWith("escape");

            // Resolve first with false -> stays open + data-blocked
            resolveFirst(false);
            expect(await p1).toBe(false);
            flushSync();
            expect(open).toBe(true);
            expect("blocked" in dialog.dataset).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // Next attempt resolves true -> closes cleanly
            const p3 = mustGet(modalInstance, "modalInstance").requestClose("outside-click");
            resolveSecond(true);
            expect(await p3).toBe(true);
            flushSync();
            expect(open).toBe(false);
            expect(onClose).toHaveBeenCalledWith("outside-click");

            unmount(instance);
        });
    });
});
