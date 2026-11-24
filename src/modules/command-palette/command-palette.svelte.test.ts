import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import CommandPaletteTestHost, {
    type TestPaletteItem,
    type TestPalettePage,
} from "./CommandPaletteTestHost.internal.svelte";
import {
    commandPaletteShortcut,
    createCommandPaletteRegistry,
    type CommandPalettePlugin,
} from "./index.ts";

const DEFAULT_ITEMS: TestPaletteItem[] = [
    { value: "new-file", label: "New File", keywords: ["create", "document"] },
    { value: "open-settings", label: "Open Settings", keywords: ["preferences", "config"] },
    { value: "disabled-cmd", label: "Disabled Action", disabled: true },
    { value: "toggle-theme", label: "Toggle Theme", keywords: ["dark", "light"] },
];

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Expected element matching "${selector}"`);
    return el;
}

function dispatchKeyDown(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchPointerMove(target: EventTarget, init: PointerEventInit = {}): PointerEvent {
    const event = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function typeIntoInput(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    flushSync();
}

function getVisibleOptionValues(root: ParentNode): string[] {
    return [...root.querySelectorAll<HTMLElement>('[role="option"]:not([hidden])')].map(
        (el) => el.dataset.value ?? ""
    );
}

describe("CommandPalette Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("ARIA 1.2 dialog, combobox, and listbox wiring", () => {
        test("wires dialog, combobox, listbox, option, and aria-activedescendant attributes", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    size: "md",
                    items: DEFAULT_ITEMS,
                    focusTrap: false,
                },
            });
            flushSync();

            const dialog = mustQuery<HTMLDivElement>(document.body, '[role="dialog"]');
            const input = mustQuery<HTMLInputElement>(dialog, '[role="combobox"]');
            const listbox = mustQuery<HTMLDivElement>(dialog, '[role="listbox"]');
            const firstOption = mustQuery<HTMLElement>(listbox, '[role="option"][data-value="new-file"]');
            const disabledOption = mustQuery<HTMLElement>(listbox, '[role="option"][data-value="disabled-cmd"]');

            expect(dialog.getAttribute("aria-modal")).toBe("true");
            expect(dialog.dataset.size).toBe("md");

            expect(input.getAttribute("aria-expanded")).toBe("true");
            expect(input.getAttribute("aria-controls")).toBe(listbox.id);
            expect(input.getAttribute("aria-autocomplete")).toBe("list");
            expect(input.getAttribute("aria-activedescendant")).toBe(firstOption.id);

            expect(firstOption.getAttribute("aria-selected")).toBe("true");
            expect(firstOption.dataset.highlighted).toBe("");
            expect(disabledOption.getAttribute("aria-disabled")).toBe("true");
            expect(disabledOption.getAttribute("aria-selected")).toBe("false");

            // When filter yields zero matches, aria-activedescendant clears.
            typeIntoInput(input, "no-match-xyz");
            expect(input.getAttribute("aria-activedescendant")).toBeNull();

            unmount(host);
        });
    });

    describe("Live filtering and empty state", () => {
        test("filters items live, shows CommandPaletteEmpty on zero matches, and suppresses empty when a widget is mounted", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    items: DEFAULT_ITEMS,
                    showEmpty: true,
                    emptyText: "Nothing found",
                    focusTrap: false,
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            expect(getVisibleOptionValues(document.body)).toEqual([
                "new-file",
                "open-settings",
                "disabled-cmd",
                "toggle-theme",
            ]);
            expect(document.body.querySelector(".cs-command-palette-empty")).toBeNull();

            typeIntoInput(input, "preferences");
            expect(getVisibleOptionValues(document.body)).toEqual(["open-settings"]);
            expect(host.getHighlightedValue()).toBe("open-settings");
            expect(document.body.querySelector(".cs-command-palette-empty")).toBeNull();

            typeIntoInput(input, "zzzzz");
            expect(getVisibleOptionValues(document.body)).toEqual([]);
            expect(host.getHighlightedValue()).toBeUndefined();
            const emptyEl = mustQuery<HTMLDivElement>(document.body, ".cs-command-palette-empty");
            expect(emptyEl.textContent?.trim()).toBe("Nothing found");

            unmount(host);

            // With a CommandPaletteWidget mounted, empty state must be suppressed even on zero item matches.
            const widgetHost = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    items: DEFAULT_ITEMS,
                    showEmpty: true,
                    showWidget: true,
                    focusTrap: false,
                },
            });
            flushSync();

            const widgetInput = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            typeIntoInput(widgetInput, "zzzzz");
            expect(getVisibleOptionValues(document.body)).toEqual([]);
            expect(document.body.querySelector(".cs-command-palette-empty")).toBeNull();
            expect(document.body.querySelector('[data-testid="test-widget"]')).not.toBeNull();

            unmount(widgetHost);
        });
    });

    describe("Keyboard navigation, pointer discipline, activation, and IME guard", () => {
        test("supports ArrowDown/ArrowUp with loop=true and loop=false, Ctrl+N/P, PageUp/PageDown, and data-nav toggle", () => {
            const hostLoop = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    loop: true,
                    items: DEFAULT_ITEMS,
                    focusTrap: false,
                },
            });
            flushSync();

            const dialog = mustQuery<HTMLDivElement>(document.body, ".cs-command-palette");
            const input = mustQuery<HTMLInputElement>(dialog, '[role="combobox"]');

            // Initial highlight is first enabled item; data-nav is not yet keyboard.
            expect(hostLoop.getHighlightedValue()).toBe("new-file");
            expect(dialog.dataset.nav).toBeUndefined();

            // ArrowDown moves to second item and activates keyboard nav mode.
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("open-settings");
            expect(dialog.dataset.nav).toBe("keyboard");

            // ArrowDown skips disabled-cmd and lands on toggle-theme.
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("toggle-theme");

            // With loop=true, ArrowDown wraps to first enabled item.
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("new-file");

            // With loop=true, ArrowUp wraps to last enabled item.
            dispatchKeyDown(input, "ArrowUp");
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("toggle-theme");

            // Ctrl+P moves up, Ctrl+N moves down.
            dispatchKeyDown(input, "p", { ctrlKey: true });
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("open-settings");

            dispatchKeyDown(input, "n", { ctrlKey: true });
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("toggle-theme");

            // PageUp jumps to first, PageDown jumps to last.
            dispatchKeyDown(input, "PageUp");
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("new-file");

            dispatchKeyDown(input, "PageDown");
            flushSync();
            expect(hostLoop.getHighlightedValue()).toBe("toggle-theme");

            // Mouse pointermove clears data-nav="keyboard" and updates highlight to hovered item.
            const settingsItem = mustQuery<HTMLElement>(dialog, '[data-value="open-settings"]');
            dispatchPointerMove(settingsItem);
            flushSync();
            expect(dialog.dataset.nav).toBeUndefined();
            expect(hostLoop.getHighlightedValue()).toBe("open-settings");

            unmount(hostLoop);

            // Verify loop=false clamps at first and last enabled items.
            const hostNoLoop = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    loop: false,
                    items: DEFAULT_ITEMS,
                    focusTrap: false,
                },
            });
            flushSync();

            const noLoopInput = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            expect(hostNoLoop.getHighlightedValue()).toBe("new-file");

            dispatchKeyDown(noLoopInput, "ArrowUp");
            flushSync();
            expect(hostNoLoop.getHighlightedValue()).toBe("new-file");

            dispatchKeyDown(noLoopInput, "PageDown");
            flushSync();
            expect(hostNoLoop.getHighlightedValue()).toBe("toggle-theme");

            dispatchKeyDown(noLoopInput, "ArrowDown");
            flushSync();
            expect(hostNoLoop.getHighlightedValue()).toBe("toggle-theme");

            unmount(hostNoLoop);
        });

        test("Enter activates highlighted item with closeOnSelect default true and false override", () => {
            const onStaySelect = vi.fn();
            const onCloseSelect = vi.fn();
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    onClose,
                    focusTrap: false,
                    items: [
                        { value: "stay", label: "Stay Open", closeOnSelect: false, onSelect: onStaySelect },
                        { value: "close", label: "Close Palette", onSelect: onCloseSelect },
                    ],
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');

            // Highlight is "stay" (closeOnSelect: false) -> fires onSelect and remains open.
            dispatchKeyDown(input, "Enter");
            flushSync();
            expect(onStaySelect).toHaveBeenCalledTimes(1);
            expect(host.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // Move to "close" (default closeOnSelect: true) -> fires onSelect and closes with reason "select".
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            dispatchKeyDown(input, "Enter");
            flushSync();
            expect(onCloseSelect).toHaveBeenCalledTimes(1);
            expect(host.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("select");

            unmount(host);
        });

        test("ignores Enter, Backspace, and Escape while IME composition is active (isComposing=true)", () => {
            const onSelect = vi.fn();
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    pages: ["sub"],
                    onClose,
                    focusTrap: true,
                    items: [{ value: "root-item", label: "Root Item", onSelect }],
                    customPages: [
                        {
                            value: "sub",
                            label: "Subpage",
                            items: [{ value: "sub-item", label: "Sub Item", onSelect }],
                        },
                    ],
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');

            dispatchKeyDown(input, "Enter", { isComposing: true });
            dispatchKeyDown(input, "Backspace", { isComposing: true });
            dispatchKeyDown(input, "Escape", { isComposing: true });
            flushSync();

            expect(onSelect).not.toHaveBeenCalled();
            expect(host.getPages()).toEqual(["sub"]);
            expect(host.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // Also verify Escape with isComposing at root does not close.
            host.resetPages();
            flushSync();
            dispatchKeyDown(input, "Escape", { isComposing: true });
            flushSync();
            expect(host.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            unmount(host);
        });

        test("snaps viewport.scrollTop to 0 for first item and bottom for last item on keyboard navigation", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    focusTrap: false,
                    groups: [
                        {
                            key: "g1",
                            label: "Primary",
                            items: [
                                { value: "first", label: "First" },
                                { value: "middle", label: "Middle" },
                                { value: "last", label: "Last" },
                            ],
                        },
                    ],
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            const viewport = mustQuery<HTMLElement>(document.body, ".cs-scroll-area-content");
            const middleEl = mustQuery<HTMLElement>(document.body, '[data-value="middle"]');
            const middleScrollIntoView = vi.spyOn(middleEl, "scrollIntoView");

            Object.defineProperties(viewport, {
                scrollHeight: { configurable: true, value: 500 },
                clientHeight: { configurable: true, value: 200 },
            });

            // Moving to a middle item delegates to scrollIntoView({ block: "nearest" }).
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(host.getHighlightedValue()).toBe("middle");
            expect(middleScrollIntoView).toHaveBeenCalledWith({ block: "nearest" });

            // Moving to the last item snaps viewport to the bottom (scrollHeight - clientHeight).
            viewport.scrollTop = 40;
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(host.getHighlightedValue()).toBe("last");
            expect(viewport.scrollTop).toBe(300);

            // Moving back to the first item via PageUp (or ArrowUp/Home) snaps viewport.scrollTop to 0.
            viewport.scrollTop = 120;
            dispatchKeyDown(input, "PageUp");
            flushSync();
            expect(host.getHighlightedValue()).toBe("first");
            expect(viewport.scrollTop).toBe(0);

            unmount(host);
        });
    });

    describe("Multi-page scope stack", () => {
        const PAGES: TestPalettePage[] = [
            {
                value: "themes",
                label: "Themes",
                items: [
                    { value: "dark", label: "Dark Theme" },
                    { value: "light", label: "Light Theme" },
                ],
            },
            {
                value: "accents",
                label: "Accents",
                items: [{ value: "blue", label: "Blue Accent" }],
            },
        ];

        test("pushPage auto-keeps palette open on select, renders scope chip, and restores parent query/highlight on popPage", () => {
            const onPagesChange = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    onPagesChange,
                    manualScope: true,
                    focusTrap: false,
                    items: [
                        { value: "first", label: "First Command" },
                        {
                            value: "choose-theme",
                            label: "Choose Theme",
                            pushPage: { id: "themes", options: { label: "Themes" } },
                        },
                    ],
                    customPages: PAGES,
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            input.focus();

            // Filter to "theme" so highlight is "choose-theme", then activate with Enter.
            typeIntoInput(input, "theme");
            expect(host.getHighlightedValue()).toBe("choose-theme");

            dispatchKeyDown(input, "Enter");
            flushSync();

            // Palette stays open even though closeOnSelect defaulted to true, because onSelect pushed a page.
            expect(host.getOpen()).toBe(true);
            expect(host.getPages()).toEqual(["themes"]);
            expect(onPagesChange).toHaveBeenCalledWith(["themes"]);
            expect(host.getInputValue()).toBe("");
            expect(getVisibleOptionValues(document.body)).toEqual(["dark", "light"]);

            // Scope chip renders label and clicking it pops the page and restores parent inputValue + highlightedValue.
            const scopeBtn = mustQuery<HTMLButtonElement>(document.body, ".cs-command-palette-scope");
            expect(scopeBtn.textContent?.trim()).toBe("Themes");

            scopeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();

            expect(host.getPages()).toEqual([]);
            expect(host.getInputValue()).toBe("theme");
            expect(host.getHighlightedValue()).toBe("choose-theme");
            expect(document.activeElement).toBe(input);

            unmount(host);
        });

        test("Backspace on empty input pops page, Escape pops one page vs closes at root, and Shift+Escape closes immediately", () => {
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    onClose,
                    focusTrap: true,
                    items: DEFAULT_ITEMS,
                    customPages: PAGES,
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            input.focus();

            // Push two nested pages: themes -> accents.
            host.pushPage("themes");
            flushSync();
            host.pushPage("accents");
            flushSync();
            expect(host.getPages()).toEqual(["themes", "accents"]);

            // Backspace when input is non-empty does NOT pop page.
            typeIntoInput(input, "blu");
            input.setSelectionRange(3, 3);
            dispatchKeyDown(input, "Backspace");
            flushSync();
            expect(host.getPages()).toEqual(["themes", "accents"]);

            // Backspace on empty input pops top page ("accents" -> "themes").
            typeIntoInput(input, "");
            input.setSelectionRange(0, 0);
            dispatchKeyDown(input, "Backspace");
            flushSync();
            expect(host.getPages()).toEqual(["themes"]);

            // Escape pops remaining page ("themes" -> []) instead of closing.
            dispatchKeyDown(input, "Escape");
            flushSync();
            expect(host.getPages()).toEqual([]);
            expect(host.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // Push again and verify Shift+Escape closes immediately from nested page.
            host.pushPage("themes");
            flushSync();
            expect(host.getPages()).toEqual(["themes"]);

            dispatchKeyDown(input, "Escape", { shiftKey: true });
            flushSync();
            expect(host.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("escape");

            unmount(host);
        });
    });

    describe("Mod+A background selection guard", () => {
        test("prevents default Mod+A on non-editable targets inside palette while allowing default in editable inputs", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    items: DEFAULT_ITEMS,
                    showWidget: true,
                    focusTrap: false,
                },
            });
            flushSync();

            const paletteInput = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            const widgetButton = mustQuery<HTMLButtonElement>(document.body, '[data-testid="widget-button"]');
            const widgetInput = mustQuery<HTMLInputElement>(document.body, '[data-testid="widget-input"]');

            // Non-editable target (widget button) -> default prevented for Ctrl+A and Meta+A.
            const ctrlOnBtn = dispatchKeyDown(widgetButton, "a", { ctrlKey: true });
            expect(ctrlOnBtn.defaultPrevented).toBe(true);

            const metaOnBtn = dispatchKeyDown(widgetButton, "a", { metaKey: true });
            expect(metaOnBtn.defaultPrevented).toBe(true);

            // CommandPaletteInput -> native select-all allowed.
            const ctrlOnPaletteInput = dispatchKeyDown(paletteInput, "a", { ctrlKey: true });
            expect(ctrlOnPaletteInput.defaultPrevented).toBe(false);

            // Editable widget input -> native select-all allowed.
            const ctrlOnWidgetInput = dispatchKeyDown(widgetInput, "a", { ctrlKey: true });
            expect(ctrlOnWidgetInput.defaultPrevented).toBe(false);

            unmount(host);
        });
    });

    describe("Global shortcut prop and commandPaletteShortcut attachment", () => {
        test("shortcut prop toggles open on Mod+K and ignores external editable inputs when ignoreInputs=true", () => {
            const onOpenChange = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: false,
                    onOpenChange,
                    shortcut: true,
                    externalInput: true,
                    items: DEFAULT_ITEMS,
                    focusTrap: false,
                },
            });
            flushSync();

            const externalInput = mustQuery<HTMLInputElement>(container, '[data-testid="external-input"]');

            // Mod+K while focused in external input is ignored by default (ignoreInputs: true).
            const ignoredEvent = dispatchKeyDown(externalInput, "k", { ctrlKey: true });
            flushSync();
            expect(ignoredEvent.defaultPrevented).toBe(false);
            expect(host.getOpen()).toBe(false);

            // Mod+K on window opens the palette.
            const openEvent = dispatchKeyDown(window, "k", { ctrlKey: true });
            flushSync();
            expect(openEvent.defaultPrevented).toBe(true);
            expect(host.getOpen()).toBe(true);
            expect(onOpenChange).toHaveBeenLastCalledWith(true);

            // Mod+K while open closes the palette even if target is CommandPaletteInput inside .cs-command-palette.
            const paletteInput = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            const closeEvent = dispatchKeyDown(paletteInput, "k", { ctrlKey: true });
            flushSync();
            expect(closeEvent.defaultPrevented).toBe(true);
            expect(host.getOpen()).toBe(false);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);

            unmount(host);
        });

        test("commandPaletteShortcut attachment respects enabled getter, ignoreInputs, and cleans up on detach", () => {
            let enabled = true;
            const onTrigger = vi.fn();

            const targetEl = document.createElement("div");
            container.append(targetEl);
            const cleanup = commandPaletteShortcut({
                key: "p",
                shiftKey: true,
                enabled: () => enabled,
                onTrigger,
            })(targetEl);

            // Wrong modifier -> does not trigger.
            dispatchKeyDown(window, "p", { ctrlKey: true });
            expect(onTrigger).not.toHaveBeenCalled();

            // Matching shortcut -> triggers and prevents default.
            const matched = dispatchKeyDown(window, "p", { ctrlKey: true, shiftKey: true });
            expect(matched.defaultPrevented).toBe(true);
            expect(onTrigger).toHaveBeenCalledTimes(1);

            // Disabled via getter -> does not trigger.
            enabled = false;
            dispatchKeyDown(window, "p", { ctrlKey: true, shiftKey: true });
            expect(onTrigger).toHaveBeenCalledTimes(1);

            // Cleanup removes window listener.
            enabled = true;
            cleanup?.();
            dispatchKeyDown(window, "p", { ctrlKey: true, shiftKey: true });
            expect(onTrigger).toHaveBeenCalledTimes(1);
        });
    });

    describe("CommandPaletteClear and resetOnClose", () => {
        test("CommandPaletteClear clears inputValue and keeps focus in CommandPaletteInput", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    items: DEFAULT_ITEMS,
                    showClear: true,
                    focusTrap: false,
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            const clearBtn = mustQuery<HTMLButtonElement>(document.body, ".cs-command-palette-clear");

            expect(clearBtn.dataset.visible).toBeUndefined();

            input.focus();
            typeIntoInput(input, "settings");
            expect(clearBtn.dataset.visible).toBe("");

            const pointerDown = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
            clearBtn.dispatchEvent(pointerDown);
            expect(pointerDown.defaultPrevented).toBe(true);

            clearBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();

            expect(host.getInputValue()).toBe("");
            expect(clearBtn.dataset.visible).toBeUndefined();
            expect(document.activeElement).toBe(input);

            unmount(host);
        });

        test("resetOnClose=true resets inputValue and pages on close, while resetOnClose=false preserves them", async () => {
            const pagesDef: TestPalettePage[] = [
                { value: "tools", label: "Tools", items: [{ value: "t1", label: "Tool 1" }] },
            ];

            const hostReset = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    resetOnClose: true,
                    items: DEFAULT_ITEMS,
                    customPages: pagesDef,
                    focusTrap: false,
                },
            });
            flushSync();

            hostReset.pushPage("tools", { inputValue: "tool" });
            flushSync();
            expect(hostReset.getPages()).toEqual(["tools"]);
            expect(hostReset.getInputValue()).toBe("tool");

            await hostReset.requestClose("programmatic");
            flushSync();
            expect(hostReset.getOpen()).toBe(false);
            expect(hostReset.getPages()).toEqual([]);
            expect(hostReset.getInputValue()).toBe("");

            unmount(hostReset);

            const hostPreserve = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    resetOnClose: false,
                    items: DEFAULT_ITEMS,
                    customPages: pagesDef,
                    focusTrap: false,
                },
            });
            flushSync();

            hostPreserve.pushPage("tools", { inputValue: "tool" });
            flushSync();

            await hostPreserve.requestClose("programmatic");
            flushSync();
            expect(hostPreserve.getOpen()).toBe(false);
            expect(hostPreserve.getPages()).toEqual(["tools"]);
            expect(hostPreserve.getInputValue()).toBe("tool");

            unmount(hostPreserve);
        });
    });

    describe("Anchor href items", () => {
        test("renders <a> with href, activates via Enter click(), and omits href / suppresses activation when disabled", () => {
            const onLinkSelect = vi.fn((event: MouseEvent | KeyboardEvent) => {
                // Prevent happy-dom navigation while testing close-on-select?
                // Note: calling preventDefault suppresses closeOnSelect, so we test without preventDefault on a hash href.
                void event;
            });
            const onDisabledSelect = vi.fn();
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    onClose,
                    focusTrap: false,
                    items: [
                        { value: "docs", label: "Documentation", href: "#docs", onSelect: onLinkSelect },
                        {
                            value: "disabled-docs",
                            label: "Disabled Docs",
                            href: "#disabled-docs",
                            disabled: true,
                            onSelect: onDisabledSelect,
                        },
                    ],
                },
            });
            flushSync();

            const enabledAnchor = mustQuery<HTMLAnchorElement>(document.body, 'a[data-value="docs"]');
            const disabledAnchor = mustQuery<HTMLAnchorElement>(document.body, 'a[data-value="disabled-docs"]');

            expect(enabledAnchor.tagName).toBe("A");
            expect(enabledAnchor.getAttribute("href")).toBe("#docs");

            expect(disabledAnchor.tagName).toBe("A");
            expect(disabledAnchor.hasAttribute("href")).toBe(false);
            expect(disabledAnchor.getAttribute("aria-disabled")).toBe("true");

            // Clicking disabled anchor does not trigger onSelect and prevents default.
            const disabledClick = new MouseEvent("click", { bubbles: true, cancelable: true });
            disabledAnchor.dispatchEvent(disabledClick);
            flushSync();
            expect(disabledClick.defaultPrevented).toBe(true);
            expect(onDisabledSelect).not.toHaveBeenCalled();
            expect(host.getOpen()).toBe(true);

            // Enter on highlighted enabled anchor invokes click() and closes palette.
            const clickSpy = vi.spyOn(enabledAnchor, "click");
            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            dispatchKeyDown(input, "Enter");
            flushSync();

            expect(clickSpy).toHaveBeenCalledTimes(1);
            expect(onLinkSelect).toHaveBeenCalledTimes(1);
            expect(host.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("select");

            unmount(host);
        });
    });

    describe("Pointer click activation and onSelect preventDefault", () => {
        test("clicking enabled item closes palette, clicking disabled item does nothing, and preventDefault keeps palette open", () => {
            const onPreventSelect = vi.fn((event: MouseEvent | KeyboardEvent) => {
                event.preventDefault();
            });
            const onNormalSelect = vi.fn();
            const onDisabledSelect = vi.fn();
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    onClose,
                    focusTrap: false,
                    items: [
                        { value: "prevent", label: "Prevent Close", onSelect: onPreventSelect },
                        { value: "disabled", label: "Disabled", disabled: true, onSelect: onDisabledSelect },
                        { value: "normal", label: "Normal Action", onSelect: onNormalSelect },
                    ],
                },
            });
            flushSync();

            const preventItem = mustQuery<HTMLElement>(document.body, '[data-value="prevent"]');
            const disabledItem = mustQuery<HTMLElement>(document.body, '[data-value="disabled"]');
            const normalItem = mustQuery<HTMLElement>(document.body, '[data-value="normal"]');

            // Disabled item click does nothing.
            disabledItem.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(onDisabledSelect).not.toHaveBeenCalled();
            expect(host.getOpen()).toBe(true);

            // onSelect calling event.preventDefault() keeps palette open.
            preventItem.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(onPreventSelect).toHaveBeenCalledTimes(1);
            expect(host.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // Normal item click triggers onSelect and closes with reason "select".
            normalItem.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(onNormalSelect).toHaveBeenCalledTimes(1);
            expect(host.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("select");

            unmount(host);
        });
    });

    describe("onBeforeClose guard", () => {
        test("sync false and async Promise<false> block closing without calling onClose or resetOnClose, while true/undefined allow closing", async () => {
            let nextResult: boolean | undefined | Promise<boolean | undefined> = false;
            const onBeforeClose = vi.fn(() => nextResult);
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    resetOnClose: true,
                    onBeforeClose,
                    onClose,
                    focusTrap: false,
                    items: DEFAULT_ITEMS,
                    customPages: [{ value: "sub", label: "Sub", items: [{ value: "s1", label: "S1" }] }],
                },
            });
            flushSync();

            host.pushPage("sub", { inputValue: "keep-me" });
            flushSync();

            // Sync false blocks close and preserves inputValue/pages.
            const syncBlocked = await host.requestClose("escape");
            flushSync();
            expect(syncBlocked).toBe(false);
            expect(onBeforeClose).toHaveBeenCalledWith("escape");
            expect(host.getOpen()).toBe(true);
            expect(host.getPages()).toEqual(["sub"]);
            expect(host.getInputValue()).toBe("keep-me");
            expect(onClose).not.toHaveBeenCalled();

            // Async Promise<false> blocks close and preserves inputValue/pages.
            nextResult = Promise.resolve(false);
            const asyncBlocked = await host.requestClose("outside-click");
            flushSync();
            expect(asyncBlocked).toBe(false);
            expect(onBeforeClose).toHaveBeenLastCalledWith("outside-click");
            expect(host.getOpen()).toBe(true);
            expect(host.getPages()).toEqual(["sub"]);
            expect(host.getInputValue()).toBe("keep-me");
            expect(onClose).not.toHaveBeenCalled();

            // Returning undefined allows closing and triggers resetOnClose.
            nextResult = undefined;
            const allowedUndefined = await host.requestClose("programmatic");
            flushSync();
            expect(allowedUndefined).toBe(true);
            expect(host.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("programmatic");
            expect(host.getPages()).toEqual([]);
            expect(host.getInputValue()).toBe("");

            unmount(host);

            // Returning Promise<true> also allows closing.
            const onCloseTrue = vi.fn();
            const hostTrue = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    onBeforeClose: async () => true,
                    onClose: onCloseTrue,
                    focusTrap: false,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const allowedTrue = await hostTrue.requestClose("programmatic");
            flushSync();
            expect(allowedTrue).toBe(true);
            expect(hostTrue.getOpen()).toBe(false);
            expect(onCloseTrue).toHaveBeenCalledWith("programmatic");

            unmount(hostTrue);
        });
    });

    describe("Backdrop outside-click, dismissible, closeOnEscape, and focusTrap=false Escape", () => {
        test("clicking overlay closes with outside-click when dismissible=true and stays open when dismissible=false", () => {
            const onClose = vi.fn();

            const hostLocked = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    dismissible: false,
                    onClose,
                    focusTrap: false,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const lockedOverlay = mustQuery<HTMLElement>(document.body, ".cs-command-palette-overlay");
            lockedOverlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            lockedOverlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(hostLocked.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            unmount(hostLocked);

            const hostDismissible = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    dismissible: true,
                    onClose,
                    focusTrap: false,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const dismissibleOverlay = mustQuery<HTMLElement>(document.body, ".cs-command-palette-overlay");
            dismissibleOverlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            dismissibleOverlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(hostDismissible.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("outside-click");

            unmount(hostDismissible);
        });

        test("closeOnEscape=false blocks Escape dismissal even when dismissible=true", () => {
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    dismissible: true,
                    closeOnEscape: false,
                    onClose,
                    focusTrap: true,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            dispatchKeyDown(input, "Escape");
            flushSync();

            expect(host.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            unmount(host);
        });

        test("focusTrap=false still pops pages and closes palette on Escape", () => {
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    focusTrap: false,
                    onClose,
                    items: DEFAULT_ITEMS,
                    customPages: [{ value: "sub", label: "Sub", items: [{ value: "s1", label: "S1" }] }],
                },
            });
            flushSync();

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            host.pushPage("sub");
            flushSync();
            expect(host.getPages()).toEqual(["sub"]);

            // Escape on nested page pops page when focusTrap=false.
            dispatchKeyDown(input, "Escape");
            flushSync();
            expect(host.getPages()).toEqual([]);
            expect(host.getOpen()).toBe(true);
            expect(onClose).not.toHaveBeenCalled();

            // Escape at root closes palette when focusTrap=false.
            dispatchKeyDown(input, "Escape");
            flushSync();
            expect(host.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("escape");

            unmount(host);
        });
    });

    describe("Auto-scope chip (CommandPaletteBar showScope) and prefix-mode clearScope", () => {
        const PREFIX_PLUGIN: CommandPalettePlugin = {
            id: "cmd-prefix",
            label: "Commands",
            prefix: ">",
            items: [
                { value: "reload", label: "Reload Window" },
                { value: "hello", label: "Say Hello" },
            ],
        };

        test("auto-scope chip renders for pages and prefix plugins, clears scope on click, and respects showScope=false", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    manualScope: false,
                    barShowScope: true,
                    focusTrap: false,
                    plugins: [PREFIX_PLUGIN],
                    items: DEFAULT_ITEMS,
                    customPages: [{ value: "themes", label: "Themes", items: [{ value: "dark", label: "Dark" }] }],
                },
            });
            flushSync();

            // Initially at root with empty input -> no auto-scope chip.
            expect(document.body.querySelector("[data-auto-scope]")).toBeNull();

            // Push page -> auto-scope chip shows page label, clicking it pops page.
            host.pushPage("themes");
            flushSync();
            const pageScope = mustQuery<HTMLButtonElement>(document.body, "[data-auto-scope]");
            expect(pageScope.textContent?.trim()).toBe("Themes");

            pageScope.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(host.getPages()).toEqual([]);
            expect(document.body.querySelector("[data-auto-scope]")).toBeNull();

            // Type prefix query ">hello" -> auto-scope chip shows plugin label, clicking it strips prefix.
            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            input.focus();
            typeIntoInput(input, ">hello");

            const prefixScope = mustQuery<HTMLButtonElement>(document.body, "[data-auto-scope]");
            expect(prefixScope.textContent?.trim()).toBe("Commands");
            expect(getVisibleOptionValues(document.body)).toEqual(["hello"]);

            prefixScope.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(host.getInputValue()).toBe("hello");
            expect(document.body.querySelector("[data-auto-scope]")).toBeNull();
            expect(document.activeElement).toBe(input);

            unmount(host);

            // barShowScope=false hides auto-scope chip for both pages and prefix mode.
            const hostHidden = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    manualScope: false,
                    barShowScope: false,
                    focusTrap: false,
                    plugins: [PREFIX_PLUGIN],
                    items: DEFAULT_ITEMS,
                    customPages: [{ value: "themes", label: "Themes", items: [{ value: "dark", label: "Dark" }] }],
                },
            });
            flushSync();

            hostHidden.pushPage("themes");
            flushSync();
            expect(document.body.querySelector("[data-auto-scope]")).toBeNull();

            hostHidden.popPage();
            flushSync();
            const hiddenInput = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            typeIntoInput(hiddenInput, ">hello");
            expect(document.body.querySelector("[data-auto-scope]")).toBeNull();

            unmount(hostHidden);
        });
    });

    describe("CommandPaletteGroup and CommandPaletteGroupLabel", () => {
        test("wires role=group aria-labelledby and matches items via groupLabel", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    focusTrap: false,
                    groups: [
                        {
                            key: "nav",
                            label: "Navigation",
                            items: [
                                { value: "go-home", label: "Home" },
                                { value: "go-docs", label: "Docs" },
                            ],
                        },
                        {
                            key: "edit",
                            label: "Editing",
                            items: [{ value: "undo", label: "Undo" }],
                        },
                    ],
                },
            });
            flushSync();

            const groups = [...document.body.querySelectorAll<HTMLElement>('[role="group"]')];
            expect(groups).toHaveLength(2);

            const [navGroup] = groups;
            if (!navGroup) throw new Error("Expected navigation group");
            const navLabel = mustQuery<HTMLElement>(navGroup, ".cs-command-palette-group-label");
            expect(navLabel.textContent?.trim()).toBe("Navigation");
            expect(navGroup.getAttribute("aria-labelledby")).toBe(navLabel.id);

            // Filtering by groupLabel "Navigation" matches items in that group even though item labels are "Home" / "Docs".
            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            typeIntoInput(input, "Navigation");
            expect(getVisibleOptionValues(document.body)).toEqual(["go-home", "go-docs"]);

            unmount(host);
        });
    });

    describe("External CommandPalettePage, Preview, Footer, and Plugin widget/pageView/onOpen", () => {
        test("renders external CommandPalettePage, CommandPalettePreview, and CommandPaletteFooter", () => {
            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    focusTrap: false,
                    showPreview: true,
                    previewText: "Custom Preview",
                    showFooter: true,
                    footerText: "Press Enter",
                    items: DEFAULT_ITEMS,
                    customPages: [{ value: "ext-view", label: "External", external: true }],
                },
            });
            flushSync();

            expect(mustQuery(document.body, '[data-testid="test-preview"]').textContent?.trim()).toBe("Custom Preview");
            expect(mustQuery(document.body, '[data-testid="test-footer"]').textContent?.trim()).toBe("Press Enter");

            const listScroll = mustQuery<HTMLElement>(document.body, ".cs-command-palette-list-scroll");
            expect(listScroll.hidden).toBe(false);
            expect(document.body.querySelector('[data-testid="external-page-widget-ext-view"]')).toBeNull();

            host.pushPage("ext-view");
            flushSync();
            expect(listScroll.hidden).toBe(true);
            expect(document.body.querySelector('.cs-command-palette-page[data-page="ext-view"]')).not.toBeNull();
            expect(document.body.querySelector('[data-testid="external-page-widget-ext-view"]')).not.toBeNull();

            host.popPage();
            flushSync();
            expect(listScroll.hidden).toBe(false);
            expect(document.body.querySelector('[data-testid="external-page-widget-ext-view"]')).toBeNull();

            unmount(host);
        });

        test("renders plugin widget and pageView snippets and runs onOpen setup/cleanup lifecycle", () => {
            const widgetCleanup = vi.fn();
            const widgetSetup = vi.fn(() => widgetCleanup);
            const pageCleanup = vi.fn();
            const pageSetup = vi.fn(() => pageCleanup);

            const widgetSnippet = createRawSnippet<[unknown]>((getCtx) => {
                const ctx = getCtx() as { query: string };
                return {
                    render: () => `<div data-testid="plugin-widget">Widget: ${ctx.query}</div>`,
                };
            });

            const pageViewSnippet = createRawSnippet<[unknown]>((getCtx) => {
                const ctx = getCtx() as { activePage: string };
                return {
                    render: () => `<div data-testid="plugin-pageview">PageView: ${ctx.activePage}</div>`,
                };
            });

            const registry = createCommandPaletteRegistry();
            registry.register({
                id: "widget-plugin",
                widget: widgetSnippet,
                onOpen: widgetSetup,
            });
            registry.register({
                id: "view-plugin",
                page: "custom-view",
                pageView: pageViewSnippet,
                items: [{ value: "hidden-by-pageview", label: "Hidden Item" }],
            });

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: false,
                    registry,
                    focusTrap: false,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            // Closed initially -> onOpen not called yet.
            expect(widgetSetup).not.toHaveBeenCalled();

            // Open -> onOpen runs and widget renders.
            host.setOpen(true);
            flushSync();
            expect(widgetSetup).toHaveBeenCalledTimes(1);
            expect(widgetCleanup).not.toHaveBeenCalled();
            expect(mustQuery(document.body, '[data-testid="plugin-widget"]').textContent).toBe("Widget: ");

            // Dynamically register another plugin while open -> its onOpen runs.
            const disposeDynamic = registry.register({
                id: "dynamic-plugin",
                onOpen: pageSetup,
            });
            flushSync();
            expect(pageSetup).toHaveBeenCalledTimes(1);

            // Navigate to pageView plugin's page -> pageView renders and suppresses regular items.
            host.pushPage("custom-view");
            flushSync();
            expect(mustQuery(document.body, '[data-testid="plugin-pageview"]').textContent).toBe(
                "PageView: custom-view"
            );
            expect(getVisibleOptionValues(document.body)).toEqual([]);

            // Close palette -> cleanups run.
            host.setOpen(false);
            flushSync();
            expect(widgetCleanup).toHaveBeenCalled();
            expect(pageCleanup).toHaveBeenCalled();

            disposeDynamic();
            unmount(host);
        });
    });

    describe("Custom filter fn, filter=false, popPageOnEscape=false, and popPageOnBackspace=false", () => {
        test("supports custom filter function and filter=false", () => {
            const customFilter = vi.fn((candidate: { value: string }, query: string) => {
                if (!query) return true;
                return candidate.value.startsWith(query);
            });

            const hostCustom = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    filter: customFilter,
                    focusTrap: false,
                    items: [
                        { value: "alpha", label: "First" },
                        { value: "beta", label: "Second Alpha" },
                    ],
                },
            });
            flushSync();

            const inputCustom = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            typeIntoInput(inputCustom, "al");
            expect(getVisibleOptionValues(document.body)).toEqual(["alpha"]);
            expect(customFilter).toHaveBeenCalled();

            unmount(hostCustom);

            // filter=false keeps all items visible regardless of query.
            const hostNoFilter = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    filter: false,
                    focusTrap: false,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const inputNoFilter = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            typeIntoInput(inputNoFilter, "zzzz-no-match");
            expect(getVisibleOptionValues(document.body)).toEqual([
                "new-file",
                "open-settings",
                "disabled-cmd",
                "toggle-theme",
            ]);

            unmount(hostNoFilter);
        });

        test("popPageOnBackspace=false prevents Backspace from popping page and popPageOnEscape=false closes palette from sub-page", () => {
            const onClose = vi.fn();

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    popPageOnBackspace: false,
                    popPageOnEscape: false,
                    onClose,
                    focusTrap: true,
                    items: DEFAULT_ITEMS,
                    customPages: [{ value: "sub", label: "Sub", items: [{ value: "s1", label: "S1" }] }],
                },
            });
            flushSync();

            host.pushPage("sub");
            flushSync();
            expect(host.getPages()).toEqual(["sub"]);

            const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
            input.focus();
            input.setSelectionRange(0, 0);

            // Backspace on empty input does NOT pop page when popPageOnBackspace=false.
            dispatchKeyDown(input, "Backspace");
            flushSync();
            expect(host.getPages()).toEqual(["sub"]);
            expect(host.getOpen()).toBe(true);

            // Escape closes palette directly instead of popping page when popPageOnEscape=false.
            dispatchKeyDown(input, "Escape");
            flushSync();
            expect(host.getOpen()).toBe(false);
            expect(onClose).toHaveBeenCalledWith("escape");

            unmount(host);
        });
    });
});
